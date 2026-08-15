"""
Poor-man's migration: diffs the live database against the SQLAlchemy
models and ADDs any columns that exist in the model but not in the DB.

Why this exists: `Base.metadata.create_all()` (called on every backend
startup, see main.py's on_startup) only creates tables that are missing
entirely -- it never alters a table that already exists to add a new
column. Every time a model gains a field on a table the DB already has
(exactly what happened with QuestCompletion.quest_type), that column
silently never shows up in the real database until something crashes
trying to read/write it. There's no real alembic setup in this repo yet
(alembic is in requirements.txt but there's no alembic.ini or migrations
folder) -- this script is the stopgap until that's set up properly.

Usage:
    cd backend
    python -m app.sync_schema           # shows + applies missing columns
    python -m app.sync_schema --dry-run  # shows what it WOULD do, no changes

Safe to run any time, including with nothing missing -- it's a no-op
when the DB already matches the models. Does NOT drop or alter existing
columns, and does NOT touch data -- purely additive.
"""

import sys

from sqlalchemy import inspect, text

from app.db import Base, engine
from app import models  # noqa: F401 -- import registers all models on Base.metadata


def _column_ddl_type(column) -> str:
    """Renders a column's type as DDL text for the engine's dialect."""
    return column.type.compile(dialect=engine.dialect)


def find_missing_columns():
    """Returns [(table_name, column_name, ddl_type, nullable)] for every
    column declared on a model whose table already exists in the DB but
    is missing that specific column."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    missing = []

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            # Whole table is missing -- create_all() already handles this
            # case correctly, nothing for this script to do here.
            continue
        existing_columns = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name not in existing_columns:
                missing.append((table.name, column.name, _column_ddl_type(column), column.nullable))

    return missing


def main():
    dry_run = "--dry-run" in sys.argv

    # Make sure any BRAND NEW tables (like advisory_choices, page_task_timing,
    # login_events) exist first -- create_all() handles that part correctly,
    # this script only needs to cover the ADD COLUMN gap on top of it.
    Base.metadata.create_all(bind=engine)

    missing = find_missing_columns()
    if not missing:
        print("Schema is already in sync -- nothing to do.")
        return

    print(f"Found {len(missing)} missing column(s):")
    for table_name, column_name, ddl_type, nullable in missing:
        print(f"  {table_name}.{column_name} ({ddl_type})")

    if dry_run:
        print("\n--dry-run passed, no changes made.")
        return

    with engine.begin() as conn:
        for table_name, column_name, ddl_type, nullable in missing:
            # Deliberately never adds a NOT NULL constraint here even if the
            # model declares nullable=False -- an ADD COLUMN NOT NULL on a
            # table that already has rows fails outright unless a DEFAULT is
            # also given, and guessing a default per-column is exactly the
            # kind of silent data decision a real migration tool should make
            # explicitly, not this script. Columns land nullable; tighten
            # them by hand (with an explicit default) once real data exists.
            ddl = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl_type}'
            print(f"Running: {ddl}")
            conn.execute(text(ddl))

    print(f"\nDone -- added {len(missing)} column(s).")


if __name__ == "__main__":
    main()