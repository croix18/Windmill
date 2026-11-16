"""Read the straight strokes and the text of a free drawing off the state's page (a first look at a shape, before its
   corners are snapped): shapes.py <doc> <page> x0 y0 x1 y1 [shortest stroke, points]      (OpenCV and scikit-image)"""
import sys
import numpy as np, cv2
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import page as study
from skimage.morphology import skeletonize
def segments(doc, page, box, thr=110, minlen=5.0):
    """the straight strokes inside box: (x1, y1, x2, y2, weight) in page points, from the strokes' centre lines"""
    im, items, s = study.load(doc, page); x0, y0, x1, y1 = [int(v * s) for v in box]; m = (im[y0:y1, x0:x1] < thr)
    for x, y, w, size, t, f in study.text(items, box):        # text is not a stroke
        m[max(0, int((y - 0.85 * size - box[1]) * s)):int((y + 0.3 * size - box[1]) * s), max(0, int((x - 1 - box[0]) * s)):int((x + w + 1 - box[0]) * s)] = False
    sk = skeletonize(m).astype(np.uint8) * 255
    L = cv2.HoughLinesP(sk, 1, np.pi / 720, threshold=int(minlen * s * 0.6), minLineLength=int(minlen * s), maxLineGap=int(1.2 * s))
    out = []
    dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    for l in ([] if L is None else np.asarray(L).reshape(-1, 4)):
        xa, ya, xb, yb = l; n = max(2, int(np.hypot(xb - xa, yb - ya)))
        xs = np.linspace(xa, xb, n).astype(int); ys = np.linspace(ya, yb, n).astype(int); w = 2 * np.median(dt[ys, xs]) / s
        out.append((round(box[0] + (xa + 0.5) / s, 2), round(box[1] + (ya + 0.5) / s, 2), round(box[0] + (xb + 0.5) / s, 2), round(box[1] + (yb + 0.5) / s, 2), round(float(w), 2)))
    # merge duplicates: same line (direction and offset), overlapping
    out.sort(key=lambda t: -np.hypot(t[2] - t[0], t[3] - t[1])); keep = []
    for sg in out:
        a, b = np.array(sg[:2]), np.array(sg[2:4]); u = (b - a) / np.hypot(*(b - a)); dup = False
        for k in keep:
            ka, kb = np.array(k[:2]), np.array(k[2:4]); ku = (kb - ka) / np.hypot(*(kb - ka))
            if abs(abs(np.dot(u, ku)) - 1) < 0.002 and abs(ku[0] * (a - ka)[1] - ku[1] * (a - ka)[0]) < 0.6 and abs(ku[0] * (b - ka)[1] - ku[1] * (b - ka)[0]) < 0.6:
                ta, tb = np.dot(a - ka, ku), np.dot(b - ka, ku); L0 = np.hypot(*(kb - ka))
                if min(ta, tb) > -1 and max(ta, tb) < L0 + 1: dup = True; break
        if not dup: keep.append(sg)
    return keep, study.text(items, box)
if __name__ == "__main__":
    doc, page = sys.argv[1], int(sys.argv[2]); box = [float(v) for v in sys.argv[3:7]]
    segs, texts = segments(doc, page, box, minlen=float(sys.argv[7]) if len(sys.argv) > 7 else 5.0)
    for sg in sorted(segs, key=lambda t: (round(min(t[1], t[3]) / 3), min(t[0], t[2]))): print("  seg (%.2f, %.2f) -> (%.2f, %.2f)  w %.2f  len %.1f" % (sg + (np.hypot(sg[2] - sg[0], sg[3] - sg[1]),)))
    for t in texts: print("  text", t[:5])
