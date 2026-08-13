"""
Final assembly: seeded per-user city generation. Grid size (rows/cols of
roads, chosen so rows*cols always lands in 10-15 intersections) and
plot dimensions all vary based on a deterministic seed derived from the
user's email - same user always gets the same city back, different
users get genuinely different ones. Quest buildings (Bank, Municipality/
Aadhaar, PAN, Workplace) stay in a dedicated reserved row for guaranteed
road adjacency and spacing, but WHICH road-adjacent row hosts them now
varies per seed. Writes layout.json when run as a script (default/
unseeded); returns the dict directly when called from the API with a
real user_identifier.
"""

import json
import random
from pathlib import Path

from app.city_builder.measure_assets import (
    apply_render_offset,
    compute_scale_corrections,
    measure_all_models,
)
from app.city_builder.pack_layout import pack_quadrant
from app.city_builder.road_layout import place_grid_roads
from app.city_builder.vehicle_layout import place_vehicles_in_gaps
from app.city_builder.quest_generator import get_user_seed

OUTPUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "frontend"
    / "public"
    / "layout.json"
)

CELL_SIZE = 16.0  # base unit; plot dimensions scale with grid size from this

# (rows, cols) pairs chosen so rows*cols always lands in 10-15
# intersections - a genuinely bigger city than the old fixed 2x2, with
# real shape variety (tall-narrow vs wide-short) per seed.
GRID_OPTIONS = [
    (2, 5), (2, 6), (2, 7),
    (3, 4), (3, 5),
    (4, 3),
    (5, 2), (5, 3),
    (6, 2),
    (7, 2),
]

QUEST_SLOT_ASSETS = {
    "bank": "bank.glb",
    "aadhaar": "office.glb",
    "pan": "lb.glb",
    "salary_slip": "large-building.glb",
}
QUEST_SLOT_SPACING = 5.0


def generate_full_layout(user_identifier: str = None, scenario: str = "student") -> dict:
    seed = get_user_seed(user_identifier) if user_identifier else 0
    rng = random.Random(seed)

    target_rows_z, target_cols_x = rng.choice(GRID_OPTIONS)

    raw = measure_all_models()
    corrected = compute_scale_corrections(raw)

    road_asset = next(a for a in corrected if a["category"] == "road")
    road_result = place_grid_roads(
        CELL_SIZE, road_asset,
        target_rows_z=target_rows_z, target_cols_x=target_cols_x, rng=rng,
    )
    plot_width = road_result["plot_width"]
    plot_depth = road_result["plot_depth"]

    buildings_only = [
        a for a in corrected
        if a["category"] == "building" and not a["is_outlier"]
    ]
    # Shuffle per-seed so different users see different building variety
    # in the same zone - deterministic per user, varied across users.
    shuffled_pool = buildings_only.copy()
    rng.shuffle(shuffled_pool)

    all_buildings = []
    zone_items = list(road_result["zones"].items())

    for idx, (name, zone) in enumerate(zone_items):
        rotation = 0 if zone["road_side"] == "south" else 180
        offset = rng.randint(0, max(1, len(shuffled_pool) - 1))

        all_buildings += pack_quadrant(
            shuffled_pool,
            zone,
            zone["road_side"],
            rotation,
            start_offset=offset,
        )

    # ------------------ Quest buildings (reserved, road-adjacent slot, seeded position) ------------------

    quest_zone_name, quest_zone = rng.choice(zone_items)
    quest_row_rotation = 0 if quest_zone["road_side"] == "south" else 180

    ROAD_CLEARANCE = 1.0
    max_quest_depth = max(
        (a["depth"] * a["scale_correction"] for a in corrected if a["filename"] in QUEST_SLOT_ASSETS.values()),
        default=4.0,
    )

    if quest_row_rotation == 0:
        quest_row_z = quest_zone["z_max"] - max_quest_depth - ROAD_CLEARANCE
    else:
        quest_row_z = quest_zone["z_min"] + ROAD_CLEARANCE

    # All vertical road x-ranges (there can be more than one now that
    # the grid is variable) - a quest building must clear every one of
    # them, not just the first, or it can end up placed on a second
    # vertical road that a single vert_x check would never see.
    vert_road_size = road_result["road_size"]
    vertical_road_xs = sorted({
        t["position_x"] for t in road_result["tiles"] if t["role"] == "side_road"
    })
    VERT_ROAD_GAP_MARGIN = 1.0

    def _advance_past_all_vertical_roads(x_pos, width):
        moved = True
        while moved:
            moved = False
            for vx in vertical_road_xs:
                if x_pos + width > vx - VERT_ROAD_GAP_MARGIN and x_pos < vx + vert_road_size + VERT_ROAD_GAP_MARGIN:
                    x_pos = vx + vert_road_size + VERT_ROAD_GAP_MARGIN
                    moved = True
        return x_pos

    quest_start_x = quest_zone["x_min"] + ROAD_CLEARANCE
    quest_placements = []
    cursor_x = quest_start_x
    for quest_id, filename in QUEST_SLOT_ASSETS.items():
        asset = next((a for a in corrected if a["filename"] == filename), None)
        if not asset:
            continue
        scaled_width = round(asset["width"] * asset["scale_correction"], 3)
        scaled_depth = round(asset["depth"] * asset["scale_correction"], 3)

        cursor_x = _advance_past_all_vertical_roads(cursor_x, scaled_width)

        quest_placements.append({
            **asset,
            "scaled_width": scaled_width,
            "scaled_depth": scaled_depth,
            "position_x": round(cursor_x, 3),
            "position_z": round(quest_row_z, 3),
            "rotation_y": quest_row_rotation,
            "quest_id": quest_id,
        })
        cursor_x += scaled_width + QUEST_SLOT_SPACING

    def _overlaps(a_x, a_z, a_w, a_d, b_x, b_z, b_w, b_d):
        return not (a_x + a_w <= b_x or a_x >= b_x + b_w or a_z + a_d <= b_z or a_z >= b_z + b_d)

    kept_buildings = []
    for b in all_buildings:
        overlaps_quest_row = any(
            _overlaps(
                b["position_x"], b["position_z"], b["scaled_width"], b["scaled_depth"],
                q["position_x"], q["position_z"], q["scaled_width"], q["scaled_depth"],
            )
            for q in quest_placements
        )
        if not overlaps_quest_row:
            kept_buildings.append(b)
    all_buildings = kept_buildings
    all_buildings += quest_placements

    # ------------------ ATM (paired with the bank) ------------------

    bank_placement = next((b for b in all_buildings if b["filename"] == "bank.glb"), None)
    atm_asset = next((a for a in corrected if a["filename"] == "atm.glb"), None)
    atm_placement = []

    if bank_placement and atm_asset:
        atm_placement.append({
            **atm_asset,
            "scaled_width": round(atm_asset["width"] * atm_asset["scale_correction"], 3),
            "scaled_depth": round(atm_asset["depth"] * atm_asset["scale_correction"], 3),
            "position_x": round(bank_placement["position_x"] + bank_placement["scaled_width"] + 0.3, 3),
            "position_z": bank_placement["position_z"],
            "rotation_y": bank_placement["rotation_y"],
        })

    # ------------------ Vehicles ------------------

    vehicles_only = [a for a in corrected if a["category"] == "vehicle"]
    vehicles = place_vehicles_in_gaps(vehicles_only, all_buildings, road_result["tiles"])

    # ------------------ Traffic Light (placed at a seeded junction) ------------------

    horizontal_zs = sorted({t["position_z"] for t in road_result["tiles"] if t["role"] == "main_road"})
    traffic_light = next((a for a in corrected if "traffic" in a["filename"]), None)
    junction_items = []

    if traffic_light and vertical_road_xs and horizontal_zs:
        junction_items.append({
            **traffic_light,
            "scaled_width": round(traffic_light["width"] * traffic_light["scale_correction"], 3),
            "scaled_depth": round(traffic_light["depth"] * traffic_light["scale_correction"], 3),
            "position_x": round(rng.choice(vertical_road_xs), 3),
            "position_z": round(rng.choice(horizontal_zs), 3),
            "rotation_y": 0,
        })

    # ------------------ Render offsets ------------------

    all_buildings = apply_render_offset(all_buildings)
    road_tiles = apply_render_offset(road_result["tiles"])
    vehicles = apply_render_offset(vehicles)
    junction_items = apply_render_offset(junction_items)
    atm_placement = apply_render_offset(atm_placement)

    return {
        "seed": seed,
        "scenario": scenario,
        "buildings": all_buildings,
        "roads": road_tiles,
        "parking": vehicles + junction_items + atm_placement,
    }


if __name__ == "__main__":
    layout = generate_full_layout()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(layout, indent=2))

    print(
        f"Wrote layout.json: {len(layout['buildings'])} buildings, "
        f"{len(layout['roads'])} roads, {len(layout['parking'])} vehicles/props"
    )