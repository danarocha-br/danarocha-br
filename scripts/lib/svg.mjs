// Shared SVG building blocks: fonts, text measuring, the card wrapper and animation CSS.
//
// Every card is a standalone SVG shown through <img>, so it can only use what GitHub
// allows there: inline CSS animations and fonts embedded as data URIs. No JavaScript,
// no external requests.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = path.join(ROOT, 'fonts');
const METRICS = JSON.parse(readFileSync(path.join(FONT_DIR, 'metrics.json'), 'utf8'));

export const W = 880; // GitHub's README column at 100%
export const GAP = 12; // space between cards, baked into the SVGs so rows tile exactly
export const THIRD = W / 3 - (GAP * 2) / 3; // a card in a row of three
export const RADIUS = 2;
export const FAMILY = 'Instrument Sans';
const STACK = `'${FAMILY}','Helvetica Neue',Helvetica,Arial,sans-serif`;
const STATIC = Boolean(process.env.STATIC); // render every animation at its end state

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const n = (v) => +(+v).toFixed(2);
export const fmt = (v) => v.toLocaleString('en-US');

// ---- text ---------------------------------------------------------------------

/** Drop characters the embedded font has no glyph for (emoji, mostly). */
export function clean(s) {
  const have = METRICS[400].advance;
  return [...String(s ?? '')].filter((ch) => ch in have).join('').replace(/\s+/g, ' ').trim();
}

/** Width of `str` in px. `tracking` is letter-spacing in em. Kerning is ignored. */
export function measure(str, size, weight = 400, tracking = 0) {
  const m = METRICS[weight];
  let units = 0;
  let count = 0;
  for (const ch of str) {
    units += m.advance[ch] ?? m.advance.n;
    count += 1;
  }
  return (units / m.unitsPerEm) * size + tracking * size * count;
}

/** Greedy word wrap to `width` px. Past `maxLines` the last line ends in an ellipsis. */
export function wrap(str, width, size, weight = 400, tracking = 0, maxLines = Infinity) {
  const fits = (s) => measure(s, size, weight, tracking) <= width;
  const lines = [];
  let line = '';
  for (const word of clean(str).split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (!line || fits(next)) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  let last = lines[maxLines - 1];
  while (last && !fits(`${last}…`)) last = last.slice(0, -1).trimEnd();
  return [...lines.slice(0, maxLines - 1), `${last.replace(/[.,;:]$/, '')}…`];
}

/** Shorten one line to `width` px, ending in an ellipsis if anything was cut. */
export function truncate(str, width, size, weight = 400, tracking = 0) {
  let out = clean(str);
  if (measure(out, size, weight, tracking) <= width) return out;
  while (out && measure(`${out}…`, size, weight, tracking) > width) out = out.slice(0, -1).trimEnd();
  return `${out}…`;
}

export function text(x, y, str, o = {}) {
  const { size = 12, weight = 400, fill, tracking = 0, anchor, cls, style, opacity } = o;
  const attrs = [
    `x="${n(x)}"`,
    `y="${n(y)}"`,
    `font-size="${size}"`,
    weight !== 400 && `font-weight="${weight}"`,
    tracking && `letter-spacing="${n(tracking * size)}"`,
    anchor && `text-anchor="${anchor}"`,
    `fill="${fill}"`,
    opacity != null && `opacity="${opacity}"`,
    cls && `class="${cls}"`,
    style && `style="${style}"`,
  ].filter(Boolean);
  return `<text ${attrs.join(' ')}>${esc(str)}</text>`;
}

/** Small uppercase label, the workhorse of the layout. */
export function label(x, y, str, t, o = {}) {
  return text(x, y, clean(str).toUpperCase(), { size: 10.5, weight: 500, fill: t.ink, tracking: 0.03, ...o });
}
export const labelWidth = (str, size = 10.5, weight = 500) => measure(clean(str).toUpperCase(), size, weight, 0.03);

/**
 * A line of big uppercase text that slides up from behind a mask, like the headlines
 * on danarocha.com. Returns the clip definition and the element separately.
 */
export function maskedLine(id, x, baseline, str, o) {
  const { size, weight = 600, fill, tracking = -0.02, anchor, delay = 0, width = W } = o;
  const top = baseline - size * 0.8;
  const el = text(x, baseline, clean(str).toUpperCase(), {
    size,
    weight,
    fill,
    tracking,
    anchor,
    cls: 'u',
    style: `--y:${n(size)}px;animation-delay:${n(delay)}s`,
  });
  return {
    def: `<clipPath id="${id}"><rect x="0" y="${n(top)}" width="${n(width)}" height="${n(size * 0.92)}"/></clipPath>`,
    el: `<g clip-path="url(#${id})">${el}</g>`,
  };
}

// ---- shapes -------------------------------------------------------------------

export const delay = (s) => `style="animation-delay:${n(s)}s"`;

/** Thin north-east arrow, drawn because the font has no arrow glyphs. */
export function arrowNE(x, y, size, stroke, width = 1.25) {
  const s = n(size);
  return `<path transform="translate(${n(x)} ${n(y)})" d="M0 ${s}L${s} 0M${n(s * 0.25)} 0H${s}V${n(s * 0.75)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="square"/>`;
}

export function arrowDown(x, y, height, stroke, width = 1.5) {
  const h = n(height);
  const a = n(height * 0.3);
  return `<path transform="translate(${n(x)} ${n(y)})" d="M0 0V${h}M${-a} ${n(h - a)}L0 ${h}L${a} ${n(h - a)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
}

// ---- grain --------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tiled speckle pattern standing in for the paper grain of the site. Cheap to paint. */
function grainPattern(t) {
  const size = 96;
  const rand = mulberry32(29);
  const specks = (count) => {
    let d = '';
    for (let i = 0; i < count; i += 1) d += `M${Math.floor(rand() * size)} ${Math.floor(rand() * size)}h1v1h-1z`;
    return d;
  };
  const dark = t.name === 'dark';
  return (
    `<pattern id="grain" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
    `<path d="${specks(150)}" fill="#000" opacity="${dark ? 0.3 : 0.09}"/>` +
    `<path d="${specks(150)}" fill="#fff" opacity="${dark ? 0.045 : 0.2}"/></pattern>`
  );
}

/** The card background: flat surface colour plus grain. */
export function surface(w, h, t, fill = t.paper) {
  return (
    `<rect width="${n(w)}" height="${n(h)}" rx="${RADIUS}" fill="${fill}"/>` +
    (fill === t.paper ? `<rect width="${n(w)}" height="${n(h)}" rx="${RADIUS}" fill="url(#grain)"/>` : '')
  );
}

// ---- document -----------------------------------------------------------------

const fontCache = new Map();
function fontFace(weights) {
  return weights
    .map((w) => {
      if (!fontCache.has(w)) {
        const b64 = readFileSync(path.join(FONT_DIR, `instrument-sans-${w}.woff2`)).toString('base64');
        fontCache.set(
          w,
          `@font-face{font-family:'${FAMILY}';font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2')}`,
        );
      }
      return fontCache.get(w);
    })
    .join('');
}

const BASE_CSS = `
@keyframes up{from{transform:translateY(var(--y,40px))}to{transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@keyframes burst{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
@keyframes spread{from{transform:scaleX(0)}to{transform:none}}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes nudge{0%,100%{transform:none}50%{transform:translate(2px,-2px)}}
@keyframes bob{0%,100%{transform:none}50%{transform:translateY(5px)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes pulse{0%,100%{opacity:.28}35%{opacity:1}}
@keyframes glide{0%,100%{transform:none}50%{transform:translateX(var(--x,20px))}}
@keyframes frame{0%{opacity:1}12.5%,100%{opacity:0}}
.u{animation:up .9s cubic-bezier(.16,1,.3,1) both}
.f{animation:fade .7s ease-out both}
.r{animation:rise .7s cubic-bezier(.16,1,.3,1) both}
.p{transform-box:fill-box;transform-origin:center;animation:pop .4s cubic-bezier(.2,.9,.3,1.2) both}
.bu{animation:burst .7s cubic-bezier(.16,1,.3,1) both}
.sx{transform-box:fill-box;transform-origin:0 50%;animation:spread .8s cubic-bezier(.16,1,.3,1) both}
.tw{animation:pop .4s cubic-bezier(.2,.9,.3,1.2) both,twinkle 2.6s ease-in-out infinite}
.nu{animation:nudge 2.2s ease-in-out infinite}
.bo{animation:bob 2.2s ease-in-out infinite}
.bl{animation:blink 1.1s step-end infinite}
.pu{animation:pulse 1.8s ease-in-out infinite}
.gl{animation:glide 3.2s cubic-bezier(.65,0,.35,1) infinite}
.fr{opacity:0;animation:frame 1.6s step-end infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.fr0{opacity:1}}
`.replace(/\n/g, '');

/**
 * Wrap a card body into a complete SVG. The card is `w` x `h`; `left`, `right` and
 * `bottom` add transparent padding so cards in a row of three, each shown at 33.333%,
 * line up with the full-width cards above them.
 */
export function doc({ w, h, body, defs = '', css: extra = '', weights, title, theme, left = 0, right = 0, bottom = GAP, grain = true }) {
  const fullW = n(w + left + right);
  const fullH = n(h + bottom);
  let css = fontFace(weights) + BASE_CSS + extra;
  if (STATIC) css += '*{animation:none!important}.fr0{opacity:1!important}';
  const inner = left ? `<g transform="translate(${n(left)} 0)">${body}</g>` : body;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" viewBox="0 0 ${fullW} ${fullH}" ` +
    `role="img" aria-label="${esc(title)}" font-family="${STACK}" text-rendering="geometricPrecision">` +
    `<title>${esc(title)}</title><style>${css}</style>` +
    `<defs>${grain ? grainPattern(theme) : ''}${defs}</defs>${inner}</svg>\n`
  );
}
