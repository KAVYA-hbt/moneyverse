import json

with open('../frontend/public/layout.json') as f:
    layout = json.load(f)

roads = layout['roads']
buildings = layout['buildings']


def signed_overlap(bx, bz, bw, bd, rx, rz, rw, rd):
    """Positive = real overlap amount. Negative = real gap (safe)."""
    overlap_x = min(bx + bw, rx + rw) - max(bx, rx)
    overlap_z = min(bz + bd, rz + rd) - max(bz, rz)
    if overlap_x > 0 and overlap_z > 0:
        return min(overlap_x, overlap_z)  # genuinely overlapping
    return -1  # no overlap, safe


scored = []
for b in buildings:
    worst = -999
    for r in roads:
        ov = signed_overlap(
            b['position_x'], b['position_z'], b['scaled_width'], b['scaled_depth'],
            r['position_x'], r['position_z'], r['scaled_width'], r['scaled_depth'],
        )
        worst = max(worst, ov)
    scored.append((worst, b))

scored.sort(key=lambda pair: -pair[0])

print('Buildings with REAL road overlap (positive = actually overlapping):')
for ov, b in scored[:10]:
    status = 'OVERLAP' if ov > 0 else 'safe'
    print('  filename=%-20s overlap=%.3f [%s] quest_id=%s' % (
        b['filename'], ov, status, b.get('quest_id')
    ))