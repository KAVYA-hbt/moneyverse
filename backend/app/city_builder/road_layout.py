"""
Dynamically calculates a grid road network based on plot size and building
block requirements. Road spacing is IRREGULAR when a seeded rng is
provided - each row/column gets a randomized size (weighted random split
of the available space, clamped to a sensible minimum) instead of
uniform even spacing - producing genuinely different-shaped zones per
user (some square, some rectangular, some larger/smaller) rather than a
uniform grid that just scales up.
"""
import math


def _tile_line(road_size: float, start: float, end: float) -> list[float]:
    length = end - start
    count = max(1, math.ceil(length / road_size))
    return [start + i * road_size for i in range(count)]


def _make_tile(x, z, road_asset, road_size, rotation_y, role):
    return {
        "filename": road_asset["filename"], "category": "road",
        "scale_correction": road_asset["scale_correction"],
        "min_x": road_asset["min_x"], "min_y": road_asset["min_y"], "min_z": road_asset["min_z"],
        "scaled_width": round(road_size, 3), "scaled_depth": round(road_size, 3),
        "position_x": round(x, 3), "position_z": round(z, 3),
        "rotation_y": rotation_y, "role": role,
    }


def _random_split(count: int, total: float, rng, min_size: float) -> list[float]:
    """Splits `total` into `count` positive chunks, weighted randomly
    (each roughly 0.7x-1.3x the even share) so zones come out genuinely
    different sizes, while guaranteeing every chunk stays at least
    min_size (real buildings need real room, not a sliver zone)."""
    if rng is None or count == 1:
        return [total / count] * count

    weights = [rng.uniform(0.7, 1.3) for _ in range(count)]
    total_w = sum(weights)
    sizes = [total * w / total_w for w in weights]
    sizes = [max(min_size, s) for s in sizes]

    excess = sum(sizes) - total
    if excess > 0:
        adjustable = [i for i, s in enumerate(sizes) if s > min_size + 1e-6]
        adjustable_total = sum(sizes[i] for i in adjustable) or 1.0
        for i in adjustable:
            sizes[i] -= excess * (sizes[i] / adjustable_total)

    return sizes


def _generate_road_coins(h_road_positions: list[float], v_road_positions: list[float], 
                         plot_width: float, plot_depth: float, road_size: float) -> list[dict]:
    """Generates coin coordinates strictly along road tile centers, 
    skipping intersections to prevent duplicate coins."""
    coins = []
    coin_id = 0

    # 1. Place coins along horizontal roads
    for z_pos in h_road_positions:
        center_z = z_pos + (road_size / 2.0)
        for x_pos in _tile_line(road_size, 0, plot_width):
            center_x = x_pos + (road_size / 2.0)
            coins.append({
                "id": f"coin_{coin_id}",
                "x": round(center_x, 3),
                "y": 0.7,  # Floating height above road
                "z": round(center_z, 3),
                "value": 10
            })
            coin_id += 1

    # 2. Place coins along vertical roads (skip horizontal intersection overlaps)
    for x_pos in v_road_positions:
        center_x = x_pos + (road_size / 2.0)
        for z_pos in _tile_line(road_size, 0, plot_depth):
            # Check if this segment overlaps an intersection with a horizontal road
            is_intersection = any(abs(z_pos - hz) < 0.01 for hz in h_road_positions)
            if is_intersection:
                continue

            center_z = z_pos + (road_size / 2.0)
            coins.append({
                "id": f"coin_{coin_id}",
                "x": round(center_x, 3),
                "y": 0.7,
                "z": round(center_z, 3),
                "value": 10
            })
            coin_id += 1

    return coins


def place_grid_roads(base_cell_size: float, road_asset: dict, target_rows_z: int = 2, target_cols_x: int = 2, rng=None) -> dict:
    """Generates horizontal/vertical roads with irregular (seeded) or
    uniform (rng=None) spacing between them, dividing the city into
    zones for building placement."""
    road_size = road_asset["width"] * road_asset["scale_correction"]
    min_zone_size = base_cell_size * 0.6

    zone_depths = _random_split(target_rows_z + 1, base_cell_size * (target_rows_z + 1), rng, min_zone_size)
    zone_widths = _random_split(target_cols_x + 1, base_cell_size * (target_cols_x + 1), rng, min_zone_size)

    plot_depth = sum(zone_depths) + road_size * target_rows_z
    plot_width = sum(zone_widths) + road_size * target_cols_x

    # Calculate horizontal road positions and exact zone Z boundaries
    h_road_positions = []
    z_zone_bounds = []
    cursor = 0.0
    for i, depth in enumerate(zone_depths):
        z_zone_bounds.append((cursor, cursor + depth))
        cursor += depth
        if i < target_rows_z:
            h_road_positions.append(cursor)
            cursor += road_size

    # Calculate vertical road positions and exact zone X boundaries
    v_road_positions = []
    x_zone_bounds = []
    cursor = 0.0
    for i, width in enumerate(zone_widths):
        x_zone_bounds.append((cursor, cursor + width))
        cursor += width
        if i < target_cols_x:
            v_road_positions.append(cursor)
            cursor += road_size

    h_tiles = []
    for z_pos in h_road_positions:
        h_tiles.extend([
            _make_tile(x, z_pos, road_asset, road_size, 90, "main_road")
            for x in _tile_line(road_size, 0, plot_width)
        ])

    v_tiles = []
    for x_pos in v_road_positions:
        v_tiles.extend([
            _make_tile(x_pos, z, road_asset, road_size, 0, "side_road")
            for z in _tile_line(road_size, 0, plot_depth)
        ])

    zones = {}
    for r in range(len(zone_depths)):
        for c in range(len(zone_widths)):
            z_min, z_max = z_zone_bounds[r]
            x_min, x_max = x_zone_bounds[c]

            # Legacy fallback flags
            road_side = "south" if r % 2 == 0 else "north"
            vert_side = "x_max" if c % 2 == 0 else "x_min"

            zones[f"zone_r{r}_c{c}"] = {
                "x_min": round(x_min, 3), "x_max": round(x_max, 3),
                "z_min": round(z_min, 3), "z_max": round(z_max, 3),
                "road_side": road_side, "vert_side": vert_side,
                # Explicit road adjacency for pack_layout
                "has_road_z_min": r > 0,
                "has_road_z_max": r < len(zone_depths) - 1,
                "has_road_x_min": c > 0,
                "has_road_x_max": c < len(zone_widths) - 1,
            }

    # Generate road coins metadata
    coins = _generate_road_coins(h_road_positions, v_road_positions, plot_width, plot_depth, road_size)

    return {
        "tiles": h_tiles + v_tiles,
        "road_size": road_size,
        "vert_x": v_road_positions[0] if v_road_positions else plot_width / 2,
        "plot_width": plot_width,
        "plot_depth": plot_depth,
        "zones": zones,
        "coins": coins,  # <--- Exported coin dataset
    }


def place_two_cross_roads(plot_width: float, plot_depth: float, road_asset: dict) -> dict:
    """Legacy signature, kept for backward compatibility - uniform
    spacing, fixed 2x2 grid, no randomization."""
    base_cell = min(plot_width, plot_depth) / 3
    return place_grid_roads(base_cell, road_asset, target_rows_z=2, target_cols_x=2, rng=None)