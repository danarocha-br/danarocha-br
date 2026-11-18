// A 1-bit ordered-dither animation: a wobbling ring, drawn as a few looping frames.
// Deterministic, so the hero file only changes when this code or the config changes.

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/** Brightness of the field at cell (x, y) and phase `t`, from 0 to 1. */
function field(x, y, cols, rows, t) {
  const zoom = 1.3; // leaves room around the ring so its soft edge never hits the box
  const px = ((x + 0.5 - cols / 2) / (cols / 2)) * zoom;
  const py = ((y + 0.5 - rows / 2) / (cols / 2)) * zoom;
  const angle = Math.atan2(py, px);
  const r = Math.hypot(px, py);
  const radius = 0.68 + 0.14 * Math.sin(2 * angle + t) + 0.07 * Math.sin(3 * angle - 2 * t + 1);
  const width = 0.25 + 0.06 * Math.sin(angle - t);
  return 1.08 * Math.exp(-(((r - radius) / width) ** 2));
}

/**
 * Returns `frames` SVG path strings in cell units (scale them up with a transform).
 * Lit cells on the same row are merged into single rectangles to keep the file small.
 */
export function ditherFrames({ cols, rows, frames }) {
  const paths = [];
  for (let k = 0; k < frames; k += 1) {
    const t = (k / frames) * Math.PI * 2;
    let d = '';
    for (let y = 0; y < rows; y += 1) {
      let run = -1;
      for (let x = 0; x <= cols; x += 1) {
        const on = x < cols && field(x, y, cols, rows, t) > (BAYER8[y % 8][x % 8] + 0.5) / 64;
        if (on && run < 0) run = x;
        if (!on && run >= 0) {
          d += `M${run} ${y}h${x - run}v1h${run - x}z`;
          run = -1;
        }
      }
    }
    paths.push(d);
  }
  return paths;
}
