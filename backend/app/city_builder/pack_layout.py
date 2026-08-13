"""
Packs buildings into a zone, growing from the road-adjacent edge. 
Applies real ROAD_CLEARANCE on ANY edge that borders a road based on 
explicit flags, safely preventing buildings from swallowing roads in grids >=3x3.
Dynamically keeps packing rows until zone depth is exhausted.
"""

EPSILON = 0.05
ROAD_CLEARANCE = 1.0


def pack_quadrant(assets: list[dict], bounds: dict, road_side: str, rotation_y: int, start_offset: int = 0) -> list[dict]:
    # Use explicit flags if present; otherwise, fall back to legacy parity guesses
    has_road_x_min = bounds.get("has_road_x_min", bounds.get("vert_side") == "x_min")
    has_road_x_max = bounds.get("has_road_x_max", bounds.get("vert_side") == "x_max")
    has_road_z_min = bounds.get("has_road_z_min", road_side != "south")
    has_road_z_max = bounds.get("has_road_z_max", road_side == "south")

    # Apply appropriate clearance per edge
    x_min = bounds["x_min"] + (ROAD_CLEARANCE if has_road_x_min else EPSILON)
    x_max = bounds["x_max"] - (ROAD_CLEARANCE if has_road_x_max else EPSILON)
    z_min = bounds["z_min"] + (ROAD_CLEARANCE if has_road_z_min else EPSILON)
    z_max = bounds["z_max"] - (ROAD_CLEARANCE if has_road_z_max else EPSILON)

    width = x_max - x_min
    zone_depth = z_max - z_min

    # Failsafe for tiny sliver zones
    if width <= 0 or zone_depth <= 0:
        return []

    current_x = 0.0
    row_offset = 0.0
    row_height = 0.0
    i = 0
    placed = []

    # Pack indefinitely until real depth is used up
    while True:
        remaining = width - current_x

        fit_index = None
        for j in range(len(assets)):
            candidate = assets[(i + j + start_offset) % len(assets)]
            candidate_width = candidate["width"] * candidate["scale_correction"]
            candidate_depth = candidate["depth"] * candidate["scale_correction"]
            
            if candidate_width <= remaining and (row_offset + candidate_depth) <= zone_depth + EPSILON:
                fit_index = j
                break

        if fit_index is None:
            # Prevent infinite loops if nothing fits even on a fresh row
            if current_x == 0.0 and row_height == 0.0:
                break
            
            # Advance to the next row
            current_x = 0.0
            row_offset += row_height
            row_height = 0.0
            continue

        source = assets[(i + fit_index + start_offset) % len(assets)]
        scale = source["scale_correction"]
        scaled_width = round(source["width"] * scale, 3)
        scaled_depth = round(source["depth"] * scale, 3)

        z_pos = (z_max - row_offset - scaled_depth) if road_side == "south" else (z_min + row_offset)

        placed.append({
            **source, "scaled_width": scaled_width, "scaled_depth": scaled_depth,
            "position_x": round(x_min + current_x, 3), "position_z": round(z_pos, 3),
            "rotation_y": rotation_y, "is_clone": i >= len(assets),
        })

        current_x += scaled_width
        row_height = max(row_height, scaled_depth)
        i += 1

    return placed