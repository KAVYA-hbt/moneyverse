"""
Place vehicles only on green spaces beside buildings and roads.

Rules:
- Vehicles are parked only in the green strip between a building and its road.
- Vehicles never overlap road tiles.
- Vehicles never overlap buildings.
- Vehicles never overlap other parked vehicles.
- A vehicle is placed beside every 3rd building.
"""
import math

def place_vehicles_in_gaps(vehicle_assets, buildings, road_tiles, rng=None):
    if not vehicle_assets or not buildings:
        return []

    # -------------------------------------------------
    # Build road bounding boxes
    # -------------------------------------------------
    road_boxes = []

    for r in road_tiles:
        road_boxes.append(
            (
                r["position_x"],
                r["position_z"],
                r["position_x"] + r["scaled_width"],
                r["position_z"] + r["scaled_depth"],
            )
        )

    # -------------------------------------------------
    # Build building bounding boxes
    # -------------------------------------------------
    building_boxes = []

    for b in buildings:
        building_boxes.append(
            (
                b["position_x"],
                b["position_z"],
                b["position_x"] + b["scaled_width"],
                b["position_z"] + b["scaled_depth"],
            )
        )

    placed = []

    # -------------------------------------------------
    # Rectangle overlap test
    # -------------------------------------------------
    def overlaps(box1, box2):
        ax1, az1, ax2, az2 = box1
        bx1, bz1, bx2, bz2 = box2

        return not (
            ax2 <= bx1
            or ax1 >= bx2
            or az2 <= bz1
            or az1 >= bz2
        )

    # -------------------------------------------------
    # Try parking beside every 3rd building
    # -------------------------------------------------
    for i, building in enumerate(buildings):

        if i % 3 != 0:
            continue

        asset = vehicle_assets[i % len(vehicle_assets)]

        scale = asset.get("scale_correction", 1.0)

        vehicle_w = asset["width"] * scale
        vehicle_d = asset["depth"] * scale

        # Width of green strip between road and building
        green_gap = 1.0

        # Center vehicle along building width
        x = (
            building["position_x"]
            + building["scaled_width"] / 2
            - vehicle_w / 2
        )

        if building.get("rotation_y", 0) == 0:
            # Building is above road
            z = (
                building["position_z"]
                + building["scaled_depth"]
                + green_gap
            )
            rot = 0
        else:
            # Building is below road
            z = (
                building["position_z"]
                - vehicle_d
                - green_gap
            )
            rot = 180

        vehicle_box = (
            x,
            z,
            x + vehicle_w,
            z + vehicle_d,
        )

        # -------------------------------------------------
        # Skip if vehicle touches a road
        # -------------------------------------------------
        blocked = False

        for road_box in road_boxes:
            if overlaps(vehicle_box, road_box):
                blocked = True
                break

        if blocked:
            continue

        # -------------------------------------------------
        # Skip if vehicle touches a building
        # -------------------------------------------------
        for building_box in building_boxes:
            if overlaps(vehicle_box, building_box):
                blocked = True
                break

        if blocked:
            continue

        # -------------------------------------------------
        # Skip if vehicle touches another parked vehicle
        # -------------------------------------------------
        for parked in placed:
            parked_box = (
                parked["position_x"],
                parked["position_z"],
                parked["position_x"] + parked["scaled_width"],
                parked["position_z"] + parked["scaled_depth"],
            )

            if overlaps(vehicle_box, parked_box):
                blocked = True
                break

        if blocked:
            continue

        # -------------------------------------------------
        # Add parked vehicle
        # -------------------------------------------------
        placed.append(
            {
                **asset,
                "scaled_width": round(vehicle_w, 3),
                "scaled_depth": round(vehicle_d, 3),
                "position_x": round(x, 3),
                "position_z": round(z, 3),
                "rotation_y": rot,
            }
        )

    print(f"Placed {len(placed)} vehicles on green spaces")

    return placed