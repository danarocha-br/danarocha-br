#!/usr/bin/env node
// Render the profile README's cards as animated SVGs into cards/, once per theme,
// then rewrite the card block in README.md and a local preview.html.
//
// Copy, links and colours come from profile.config.mjs; numbers come from
// data/profile.json (written by fetch-data.mjs). Run with STATIC=1 to render every
// animation at its end state.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import config from '../profile.config.mjs';
import {
  ROOT,
  W,
  GAP,
  THIRD,
  RADIUS,
  esc,
  n,
  fmt,
  clean,
  measure,
  wrap,
  truncate,
  text,
  label,
  labelWidth,
  maskedLine,
  delay,
  arrowNE,
  arrowDown,
  surface,
  doc,
} from './lib/svg.mjs';
import { ditherFrames } from './lib/dither.mjs';
import { logo } from './lib/logo.mjs';
import { computeStats, unitFor, monthName, shortDate } from './lib/stats.mjs';

const OUT = path.join(ROOT, 'cards');
const data = JSON.parse(readFileSync(path.join(ROOT, 'data', 'profile.json'), 'utf8'));
const stats = computeStats(data.days);
const ALL = [400, 500, 600];
const introLines = [].concat(config.hero.intro); // a string, or one entry per line
const introText = introLines.join(' ');

// The page plays top to bottom: each card starts a little after the one above it.
const START = { hero: 0, year: 0.9, stars: 1.7, tiles: 2.4, toolkit: 2.9, title: 3.4, repos: 3.5, contact: 3.9, links: 4.3 };

// ---- 1 · hero -------------------------------------------------------------------

function hero(t) {
  const H = 456;
  const c = config.hero;
  const defs = [];
  const el = [surface(W, H, t)];

  // Header row: mark, three columns of small labels, link button.
  el.push(`<g class="f" ${delay(0)}><g transform="translate(32 26) scale(.6)">${logo(t.ink, t.paper)}</g></g>`);
  const columnOf = (x, lines, at, mutedFrom = Infinity) =>
    `<g class="f" ${delay(at)}>${lines
      .map((s, i) => label(x, 44 + i * 16, s, t, i >= mutedFrom ? { fill: t.muted } : {}))
      .join('')}</g>`;
  el.push(columnOf(96, [c.name, `@${config.login}`], 0.08, 1));
  el.push(columnOf(292, c.roles, 0.16));
  el.push(columnOf(560, c.location, 0.24));

  const cta = clean(c.cta).toUpperCase();
  const ctaW = 12 + measure(cta, 10.5, 600, 0.03) + 6 + 7 + 12;
  const ctaX = W - 32 - ctaW;
  el.push(
    `<g class="f" ${delay(0.32)}><rect x="${n(ctaX)}" y="30" width="${n(ctaW)}" height="24" rx="${RADIUS}" fill="${t.ink}"/>` +
      text(ctaX + 12, 45.8, cta, { size: 10.5, weight: 600, fill: t.paper, tracking: 0.03 }) +
      `<g class="nu">${arrowNE(ctaX + ctaW - 19, 38.5, 7, t.paper)}</g></g>`,
  );

  // First headline, top left.
  c.headlineA.forEach((s, i) => {
    const line = maskedLine(`a${i}`, 28, 180 + i * 60, s, { size: 68, fill: t.ink, delay: 0.15 + i * 0.12 });
    defs.push(line.def);
    el.push(line.el);
  });

  // Intro paragraph, with one underlined word.
  const introX = 470;
  const lines = introLines.flatMap((s) => wrap(s, 378, 15));
  let underline = '';
  lines.forEach((s, i) => {
    const at = c.underline ? s.indexOf(c.underline) : -1;
    if (at < 0 || underline) return;
    const x = introX + measure(s.slice(0, at), 15);
    underline = `<rect x="${n(x)}" y="${143 + i * 23 + 3}" width="${n(measure(c.underline, 15))}" height="1" fill="${t.soft}"/>`;
  });
  el.push(
    `<g class="r" ${delay(0.5)}>${lines.map((s, i) => text(introX, 143 + i * 23, s, { size: 15, fill: t.soft })).join('')}${underline}</g>`,
  );

  // Dithered ring: eight 1-bit frames on a loop.
  const frames = ditherFrames({ cols: 48, rows: 48, frames: 8 });
  el.push(
    `<g class="f" ${delay(0.7)}><g transform="translate(206 264) scale(4)" fill="${t.accent}" shape-rendering="crispEdges">${frames
      .map((d, i) => `<path class="fr${i ? '' : ' fr0'}" style="animation-delay:${n(i * 0.2)}s" d="${d}"/>`)
      .join('')}</g></g>`,
  );

  // Second headline, bottom right.
  c.headlineB.forEach((s, i) => {
    const line = maskedLine(`b${i}`, W - 28, 372 + i * 60, s, {
      size: 68,
      fill: t.ink,
      anchor: 'end',
      delay: 0.6 + i * 0.12,
    });
    defs.push(line.def);
    el.push(line.el);
  });

  el.push(`<g class="f" ${delay(1.1)}><g class="bo">${arrowDown(42, 392, 36, t.ink)}</g></g>`);

  return doc({
    w: W,
    h: H,
    body: el.join(''),
    defs: defs.join(''),
    weights: ALL,
    theme: t,
    title: `${c.name}. ${c.headlineA.join(' ')} and ${c.headlineB.join(' ').toLowerCase()}. ${introText}`,
  });
}

// ---- 2 · the year as a ring -------------------------------------------------------
// One line per day, clockwise from the oldest day. Length is that day's contributions.
// The busiest month is drawn in the accent colour; the busiest day is the longest line,
// which sets the scale, and carries a dot on its tip so it reads apart from that month.

function year(t) {
  const at = START.year;
  const H = 392;
  const cx = 222;
  const cy = 196;
  const base = 78; // radius of the ring the lines stand on
  const reach = 72; // length of the busiest day's line
  const { days } = data;
  const max = Math.max(stats.best.count, 1);
  const point = (i, r) => {
    const a = (i / days.length) * Math.PI * 2 - Math.PI / 2;
    return `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
  };
  const spoke = (i, from, to) => `M${point(i, from)}L${point(i, to)}`;

  const weeks = []; // lines grouped by week, so the ring can build clockwise
  const hotWeeks = []; // the same, for the busiest month
  let busiest = '';
  let tip = '';
  let ticks = '';
  const months = [];
  days.forEach((d, i) => {
    const inBestMonth = d.date.startsWith(stats.bestMonth.key);
    if (d.date.endsWith('-01')) {
      ticks += spoke(i, base - 6, base - 1);
      months.push({ i, name: monthName(d.date), hot: inBestMonth });
    }
    if (!d.count) return;
    const length = Math.max(2.5, (d.count / max) * reach);
    const line = spoke(i + 0.5, base, base + length);
    const group = inBestMonth ? hotWeeks : weeks;
    const w = Math.floor(i / 7);
    if (d.date === stats.best.date) {
      busiest = line;
      tip = point(i + 0.5, base + length);
    } else group[w] = (group[w] ?? '') + line;
  });

  const el = [surface(W, H, t)];
  el.push(
    `<g class="f" ${delay(at)}><circle cx="${cx}" cy="${cy}" r="${base}" fill="none" stroke="${t.muted}" opacity=".55"/>` +
      `<path d="${ticks}" fill="none" stroke="${t.muted}"/>` +
      months
        .map((m) => {
          const [x, y] = point(m.i, base + reach + 20).split(' ').map(Number);
          return label(x, y + 3.2, m.name, t, { size: 9, anchor: 'middle', ...(m.hot ? { weight: 600 } : { fill: t.muted }) });
        })
        .join('') +
      `</g>`,
  );
  const built = (groups, stroke) =>
    `<g fill="none" stroke="${stroke}" stroke-width="1.2">${groups
      .map((d, w) => (d ? `<path class="bu" ${delay(at + 0.2 + w * 0.028)} d="${d}"/>` : ''))
      .join('')}</g>`;
  el.push(built(weeks, t.ink), built(hotWeeks, t.accent));
  if (busiest) {
    const last = at + 0.3 + Math.ceil(days.length / 7) * 0.028;
    const [tx, ty] = tip.split(' ');
    el.push(
      `<path class="bu" ${delay(last)} d="${busiest}" fill="none" stroke="${t.accent}" stroke-width="2"/>` +
        `<circle class="p" ${delay(last + 0.35)} cx="${tx}" cy="${ty}" r="4" fill="${t.accent}" stroke="${t.paper}" stroke-width="2"/>`,
    );
  }
  el.push(
    `<g class="r" ${delay(at + 0.3)}>` +
      text(cx, cy + 7, fmt(stats.total), { size: 36, weight: 600, fill: t.ink, tracking: -0.02, anchor: 'middle' }) +
      label(cx, cy + 25, 'contributions', t, { size: 9, fill: t.muted, anchor: 'middle' }) +
      `</g>`,
  );

  // A ledger of the year's figures on the right.
  const x0 = 440;
  const x1 = W - 32;
  const plural = (v, one, many) => (v === 1 ? one : many);
  const rows = [
    { name: 'Active days', note: `out of ${stats.totalDays}`, value: stats.activeDays },
    { name: 'Busiest month', note: `${stats.bestMonth.name} ${stats.bestMonth.year}`, value: stats.bestMonth.total, key: 'bar' },
    { name: 'Busiest day', note: shortDate(stats.best.date), value: stats.best.count, key: 'dot' },
    { name: 'Longest streak', note: plural(stats.longest, 'day', 'days in a row'), value: stats.longest },
    { name: 'Current streak', note: plural(stats.current, 'day', 'days in a row'), value: stats.current },
  ];
  const rule = (y, when) => `<rect class="sx" ${delay(when)} x="${x0}" y="${y}" width="${x1 - x0}" height="1" fill="${t.rule}"/>`;
  el.push(
    `<g class="f" ${delay(at)}>` +
      label(x0, 44, 'The last 12 months', t) +
      label(x1, 44, 'One line per day, clockwise', t, { fill: t.muted, anchor: 'end' }) +
      `</g>`,
  );
  rows.forEach((row, i) => {
    const y = 72 + i * 58;
    const when = at + 0.35 + i * 0.09;
    el.push(
      rule(y, when) +
        `<g class="r" ${delay(when + 0.1)}>` +
        (row.key === 'bar' ? `<rect x="${x0}" y="${y + 19.5}" width="8" height="8" rx="1" fill="${t.accent}"/>` : '') +
        (row.key === 'dot' ? `<circle cx="${x0 + 4}" cy="${y + 23.5}" r="4" fill="${t.accent}"/>` : '') +
        label(x0 + (row.key ? 14 : 0), y + 27, row.name, t) +
        label(x0, y + 43, row.note, t, { size: 9.5, fill: t.muted }) +
        text(x1 + 1, y + 42, fmt(row.value), { size: 30, weight: 600, fill: t.ink, tracking: -0.02, anchor: 'end' }) +
        `</g>`,
    );
  });
  el.push(rule(72 + rows.length * 58, at + 0.35 + rows.length * 0.09));

  return doc({
    w: W,
    h: H,
    body: el.join(''),
    css: `.bu{transform-origin:${cx}px ${cy}px}`,
    weights: [500, 600],
    theme: t,
    title: `${fmt(stats.total)} contributions in the last 12 months, drawn as one line per day around a ring. ${stats.activeDays} active days out of ${stats.totalDays}. Busiest month ${stats.bestMonth.name} with ${fmt(stats.bestMonth.total)}, highlighted; busiest day ${shortDate(stats.best.date)} with ${fmt(stats.best.count)}, marked with a dot. Longest streak ${stats.longest} days.`,
  });
}

// ---- 3 · stars: one mark per star ---------------------------------------------------

/** A four-point sparkle, 7.2px across, centred on (x, y). */
const sparkle = (x, y) => `M${n(x)} ${n(y - 3.6)}l1.25 2.35 2.35 1.25-2.35 1.25-1.25 2.35-1.25-2.35-2.35-1.25 2.35-1.25z`;

function stars(t) {
  const at = START.stars;
  const H = 288;
  const s = data.stars;
  const x0 = 32;
  const x1 = 548;
  const pitch = 9.6;
  const capacity = Math.floor((x1 - x0) / pitch);

  // Up to five rows; a longer tail is folded into the last one.
  let rows = s.top.slice(0, 5);
  if (s.top.length > 5) {
    const rest = s.top.slice(4);
    rows = [...s.top.slice(0, 4), { name: `${rest.length} more repositories`, stars: rest.reduce((sum, r) => sum + r.stars, 0) }];
  }
  const unit = unitFor(Math.max(1, ...rows.map((r) => r.stars)), capacity);

  const el = [surface(W, H, t)];
  const heading = unit === 1 ? 'Stars by repository' : `Stars by repository · one mark = ${unit} stars`;
  el.push(`<g class="f" ${delay(at)}>${label(x0, 44, heading, t)}</g>`);

  let marks = '';
  let k = 0;
  rows.forEach((row, i) => {
    const y = 80 + i * 40;
    const name = truncate(row.name.toUpperCase(), x1 - x0 - 48, 10.5, 500, 0.03);
    el.push(
      `<g class="r" ${delay(at + 0.15 + i * 0.08)}>` +
        label(x0, y, name, t) +
        label(x1, y, fmt(row.stars), t, { anchor: 'end', weight: 600 }) +
        `</g>`,
    );
    const count = Math.max(1, Math.round(row.stars / unit));
    for (let j = 0; j < count; j += 1, k += 1) {
      const twinkles = k % 7 === 3;
      const delays = `${n(at + 0.3 + k * 0.012)}s${twinkles ? `,${n(at + 2.2 + (k % 5) * 0.5)}s` : ''}`;
      marks += `<path class="p${twinkles ? ' tw' : ''}" style="animation-delay:${delays}" d="${sparkle(x0 + 3.6 + j * pitch, y + 15)}"/>`;
    }
  });
  el.push(`<g fill="${t.accent}">${marks}</g>`);

  // The total, as large as its slot allows.
  const total = fmt(s.total);
  const size = Math.min(176, 250 / measure(total, 1, 600, -0.03));
  const baseline = 86 + (127 + size * 0.72) / 2;
  const numeral = maskedLine('n', W - 27, baseline, total, { size, fill: t.ink, anchor: 'end', tracking: -0.03, delay: at + 0.2 });
  const across = `Across ${s.repositories} public ${s.repositories === 1 ? 'repository' : 'repositories'}`;
  el.push(
    `<g class="f" ${delay(at)}>${label(W - 32, 44, 'Total stars earned', t, { anchor: 'end' })}</g>` +
      numeral.el +
      `<g class="f" ${delay(at + 0.6)}>${label(W - 32, 246, across, t, { anchor: 'end', fill: t.muted })}</g>`,
  );

  return doc({
    w: W,
    h: H,
    body: el.join(''),
    defs: numeral.def,
    weights: [500, 600],
    theme: t,
    title: `${total} stars earned across ${s.repositories} public repositories: ${rows.map((r) => `${r.name} ${fmt(r.stars)}`).join(', ')}.`,
  });
}

// ---- 4 · three tiles ------------------------------------------------------------

function glyph(kind, x, y, fill) {
  if (kind === 'grid') {
    let dots = '';
    for (let i = 0; i < 9; i += 1) {
      dots += `<circle class="pu" style="animation-delay:${n(i * 0.2)}s" cx="${n(x + 4 + (i % 3) * 9)}" cy="${n(y + 1 + Math.floor(i / 3) * 9)}" r="2.2" fill="${fill}"/>`;
    }
    return dots;
  }
  if (kind === 'caret') {
    return (
      `<path d="M${n(x + 1)} ${n(y + 2)}l7 6.5-7 6.5" fill="none" stroke="${fill}" stroke-width="1.5"/>` +
      `<rect class="bl" x="${n(x + 15)}" y="${n(y + 1)}" width="8" height="15" fill="${fill}"/>`
    );
  }
  return (
    `<rect x="${n(x - 8)}" y="${n(y + 8)}" width="34" height="1.5" fill="${fill}" opacity=".45"/>` +
    `<circle class="gl" style="--x:24px" cx="${n(x - 3)}" cy="${n(y + 8.75)}" r="5" fill="${fill}"/>`
  );
}

function tile(t, cfg, i) {
  const H = 208;
  const w = THIRD;
  const at = START.tiles + i * 0.12;
  const look = [
    { bg: t.block, fg: t.onBlock },
    { bg: t.flood, fg: t.onFlood },
    { bg: t.paper, fg: t.ink },
  ][i % 3];
  const defs = [];
  const index = String(i + 1).padStart(2, '0');
  const titleLines = cfg.title.map((s, k) => {
    const line = maskedLine(`t${k}`, 22.5, 116 + k * 32, s, {
      size: 32,
      fill: look.fg,
      delay: at + 0.2 + k * 0.1,
      width: w,
    });
    defs.push(line.def);
    return line.el;
  });
  const blurb = wrap(cfg.blurb, w - 48, 13, 400, 0, 2);
  const body =
    `<g class="r" ${delay(at)}>` +
    surface(w, H, t, look.bg) +
    label(24, 39, index, t, { fill: look.fg, opacity: 0.6 }) +
    label(24 + labelWidth(index) + 8, 39, cfg.label, t, { fill: look.fg }) +
    glyph(cfg.glyph, w - 24 - 26, 26, look.fg) +
    titleLines.join('') +
    blurb.map((s, k) => text(24, 172 + k * 18, s, { size: 13, fill: look.fg, opacity: 0.86 })).join('') +
    `</g>`;
  return doc({
    w,
    h: H,
    body,
    defs: defs.join(''),
    weights: ALL,
    theme: t,
    left: (GAP / 3) * i,
    right: (GAP / 3) * (2 - i),
    title: `${cfg.label}: ${cfg.title.join(' ')}. ${cfg.blurb}`,
  });
}

// ---- 5 · toolkit ------------------------------------------------------------------
// Each group is a small label on the left and its items set large, run together with
// slashes, wrapped only between items. Every line slides up from behind its own mask.

/**
 * Split `items` into the fewest lines that fit `max`, then, among the splits with that
 * many lines, pick the one whose lines are closest in length (no orphaned short line).
 */
function balance(items, widthOf, space, max) {
  const lineWidth = (line) => line.reduce((sum, item) => sum + widthOf(item), 0) + space * (line.length - 1);
  let best = null;
  const search = (start, lines) => {
    if (best && lines.length >= best.lines.length && start < items.length) return;
    if (start === items.length) {
      const widths = lines.map(lineWidth);
      const spread = Math.max(...widths) - Math.min(...widths);
      if (!best || lines.length < best.lines.length || spread < best.spread) best = { lines, spread };
      return;
    }
    for (let end = start + 1; end <= items.length; end += 1) {
      const line = items.slice(start, end);
      if (end > start + 1 && lineWidth(line) > max) break;
      search(end, [...lines, line]);
    }
  };
  search(0, []);
  return best.lines;
}

function toolkit(t) {
  const at = START.toolkit;
  const c = config.toolkit;
  const size = 26;
  const step = 32;
  const tracking = -0.01;
  const textX = 232;
  const textW = W - 32 - textX;
  const width = (s) => measure(s, size, 600, tracking);
  const rule = (y, when) => `<rect class="sx" ${delay(when)} x="32" y="${y}" width="${W - 64}" height="1" fill="${t.rule}"/>`;
  const defs = [];
  const el = [`<g class="f" ${delay(at)}>${label(32, 44, c.title, t)}</g>`];
  let y = 72;
  let lineNo = 0;

  c.groups.forEach((group, g) => {
    // Pack whole items into lines; every item but the last carries a trailing slash.
    const tokens = group.items.map((item, k) => ({ text: clean(item).toUpperCase(), slash: k < group.items.length - 1 }));
    const lines = balance(tokens, (token) => width(token.text) + (token.slash ? width(' /') : 0), width(' '), textW);

    const when = at + 0.1 + g * 0.25;
    const index = String(g + 1).padStart(2, '0');
    el.push(
      rule(y, when) +
        `<g class="f" ${delay(when + 0.1)}>` +
        label(32, y + 30, index, t, { fill: t.muted }) +
        label(32 + labelWidth(index) + 8, y + 30, group.label, t) +
        `</g>`,
    );
    lines.forEach((line, i) => {
      const baseline = y + 41 + i * step;
      const id = `k${lineNo}`;
      lineNo += 1;
      const markup = line
        .map((token) => esc(token.text) + (token.slash ? `<tspan fill="${t.muted}"> /</tspan>` : ''))
        .join(' ');
      defs.push(`<clipPath id="${id}"><rect x="0" y="${n(baseline - size * 0.8)}" width="${W}" height="${n(size * 0.92)}"/></clipPath>`);
      el.push(
        `<g clip-path="url(#${id})"><text class="u" style="--y:${size}px;animation-delay:${n(when + 0.15 + i * 0.08)}s" xml:space="preserve" ` +
          `x="${textX}" y="${baseline}" font-size="${size}" font-weight="600" letter-spacing="${n(tracking * size)}" fill="${t.ink}">${markup}</text></g>`,
      );
    });
    y += 41 + (lines.length - 1) * step + 27;
  });
  el.push(rule(y, at + 0.1 + c.groups.length * 0.25));

  const H = y + 32;
  return doc({
    w: W,
    h: H,
    body: surface(W, H, t) + el.join(''),
    defs: defs.join(''),
    weights: [500, 600],
    theme: t,
    title: `${c.title}. ${c.groups.map((group) => `${group.label}: ${group.items.join(', ')}`).join('. ')}.`,
  });
}

// ---- 6 · section title and repo cards -------------------------------------------

function sectionTitle(t) {
  const s = config.reposTitle;
  const width = labelWidth(s, 11, 600);
  const body =
    `<g class="f" ${delay(START.title)}>` +
    label(1, 29, s, t, { size: 11, weight: 600, fill: t.pageInk }) +
    `<rect x="${n(width + 16)}" y="25" width="${n(W - width - 16)}" height="1" fill="${t.pageInk}" opacity=".2"/></g>`;
  return doc({ w: W, h: 46, body, weights: [600], theme: t, bottom: 0, grain: false, title: s });
}

function repoCard(t, cfg, i) {
  const H = 168;
  const w = THIRD;
  const live = data.repos[cfg.name] ?? {};
  const description = cfg.description ?? live.description ?? '';
  const meta = [live.language, live.stars ? `${fmt(live.stars)} ${live.stars === 1 ? 'star' : 'stars'}` : '']
    .filter(Boolean)
    .join(' · ');
  const body =
    surface(w, H, t) +
    `<g class="r" ${delay(START.repos + i * 0.1)}>` +
    label(24, 41, cfg.name, t, { size: 12.5, weight: 600 }) +
    `<g class="nu">${arrowNE(w - 24 - 9, 31, 9, t.ink)}</g>` +
    wrap(description, w - 48, 13, 400, 0, 3)
      .map((s, k) => text(24, 70 + k * 19, s, { size: 13, fill: t.soft }))
      .join('') +
    (meta
      ? `<rect x="24" y="${H - 31}" width="7" height="7" rx="1" fill="${t.ink}"/>` +
        label(38, H - 24, meta, t, { size: 9.5, fill: t.muted })
      : '') +
    `</g>`;
  return doc({
    w,
    h: H,
    body,
    weights: ALL,
    theme: t,
    left: (GAP / 3) * i,
    right: (GAP / 3) * (2 - i),
    title: `${cfg.name}: ${clean(description)}`,
  });
}

// ---- 7 · contact ------------------------------------------------------------------

/** Geometry of card `i` in a row of `count`, padded so the row tiles with the full-width cards. */
const cell = (count, i) => ({
  w: (W - GAP * (count - 1)) / count,
  left: (GAP / count) * i,
  right: (GAP / count) * (count - 1 - i),
});

function contact(t) {
  const at = START.contact;
  const c = config.contact;
  const fg = t.onBlock;
  const size = Math.min(96, (W - 60) / measure(clean(c.headline).toUpperCase(), 1, 600, -0.02));
  const baseline = 82 + size * 0.72;
  const H = Math.round(baseline + 90);
  const headline = maskedLine('c', 28, baseline, c.headline, { size, fill: fg, delay: at + 0.15 });

  const email = clean(c.email).toUpperCase();
  const buttonW = 14 + measure(email, 11, 600, 0.03) + 8 + 8 + 14;
  const buttonY = baseline + 30;
  const channels = ['Email', ...c.links.map((l) => l.label)].join(' · ');
  const body =
    surface(W, H, t, t.block) +
    `<g class="f" ${delay(at)}>` +
    label(32, 44, c.label, t, { fill: fg }) +
    label(W - 32, 44, channels, t, { fill: fg, opacity: 0.6, anchor: 'end' }) +
    `</g>` +
    headline.el +
    `<g class="r" ${delay(at + 0.5)}>` +
    `<rect x="32" y="${n(buttonY)}" width="${n(buttonW)}" height="30" rx="${RADIUS}" fill="${fg}"/>` +
    text(46, buttonY + 19, email, { size: 11, weight: 600, fill: t.block, tracking: 0.03 }) +
    `<g class="nu">${arrowNE(32 + buttonW - 22, buttonY + 11, 8, t.block)}</g>` +
    `</g>`;
  return doc({
    w: W,
    h: H,
    body,
    defs: headline.def,
    weights: [500, 600],
    theme: t,
    title: `${c.headline}. Email ${c.email}.`,
  });
}

function linkCard(t, cfg, i, count) {
  const H = 88;
  const { w, left, right } = cell(count, i);
  const body =
    surface(w, H, t) +
    `<g class="r" ${delay(START.links + i * 0.08)}>` +
    label(24, 39, cfg.label, t, { size: 12.5, weight: 600 }) +
    `<g class="nu">${arrowNE(w - 24 - 9, 29, 9, t.ink)}</g>` +
    text(24, 62, truncate(cfg.handle, w - 48, 13), { size: 13, fill: t.soft }) +
    `</g>`;
  return doc({ w, h: H, body, weights: [400, 600], theme: t, left, right, title: `${cfg.label}: ${cfg.handle}` });
}

// ---- write everything -----------------------------------------------------------

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) if (file.endsWith('.svg')) rmSync(path.join(OUT, file));

let bytes = 0;
for (const [name, tokens] of Object.entries(config.themes)) {
  const t = { name, ...tokens };
  const cards = {
    hero: hero(t),
    year: year(t),
    stars: stars(t),
  };
  config.tiles.forEach((cfg, i) => {
    cards[`tile-${cfg.id}`] = tile(t, cfg, i);
  });
  cards.toolkit = toolkit(t);
  if (config.showRepos) {
    cards.title = sectionTitle(t);
    config.repos.forEach((cfg, i) => {
      cards[`repo-${cfg.name}`] = repoCard(t, cfg, i);
    });
  }
  cards.contact = contact(t);
  config.contact.links.forEach((cfg, i) => {
    cards[`link-${cfg.id}`] = linkCard(t, cfg, i, config.contact.links.length);
  });
  for (const [card, svg] of Object.entries(cards)) {
    writeFileSync(path.join(OUT, `${card}-${name}.svg`), svg);
    bytes += svg.length;
  }
}

// ---- README block and local preview ----------------------------------------------

const rows = [
  [{ card: 'hero', href: config.site, alt: `${config.hero.name}. ${config.hero.headlineA.join(' ')} and ${config.hero.headlineB.join(' ').toLowerCase()}. ${introText}` }],
  [{ card: 'year', alt: `${fmt(stats.total)} contributions in the last 12 months, drawn as one line per day around a ring. Busiest month: ${stats.bestMonth.name}, ${fmt(stats.bestMonth.total)}. Refreshed daily.` }],
  [{ card: 'stars', alt: `${fmt(data.stars.total)} stars earned across ${data.stars.repositories} public repositories.` }],
  config.tiles.map((c) => ({ card: `tile-${c.id}`, href: c.href, alt: `${c.label}: ${c.title.join(' ')}. ${c.blurb}` })),
  [{ card: 'toolkit', alt: `${config.toolkit.title}. ${config.toolkit.groups.map((g) => `${g.label}: ${g.items.join(', ')}`).join('. ')}.` }],
  ...(config.showRepos
    ? [
        [{ card: 'title', alt: config.reposTitle }],
        config.repos.map((c) => ({
          card: `repo-${c.name}`,
          href: data.repos[c.name]?.url ?? `https://github.com/${config.login}/${c.name}`,
          alt: `${c.name}: ${clean(c.description ?? data.repos[c.name]?.description ?? '')}`,
        })),
      ]
    : []),
  [{ card: 'contact', href: `mailto:${config.contact.email}`, alt: `${config.contact.headline}. Email ${config.contact.email}.` }],
  config.contact.links.map((c) => ({ card: `link-${c.id}`, href: c.href, alt: `${c.label}: ${c.handle}` })),
];
const widthOf = (row) => `${(100 / row.length).toFixed(3).replace(/\.?0+$/, '')}%`;

const picture = ({ card, href, alt }, width) => {
  const img =
    `<picture><source media="(prefers-color-scheme: dark)" srcset="./cards/${card}-dark.svg">` +
    `<img src="./cards/${card}-light.svg" width="${width}" alt="${esc(alt)}"></picture>`;
  return href ? `<a href="${esc(href)}">${img}</a>` : img;
};

const START_MARK = '<!-- profile-cards:start -->';
const END_MARK = '<!-- profile-cards:end -->';
const block = `${START_MARK}
<!-- Generated by scripts/render-cards.mjs from profile.config.mjs. Edit those, not this block.
     Spacing is baked into the SVGs: keep each row on one line with nothing between the images. -->
<div align="center">
${rows.map((row) => row.map((item) => picture(item, widthOf(row))).join('')).join('<br>\n')}
</div>
${END_MARK}`;

const readmePath = path.join(ROOT, 'README.md');
const current = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';
const hasBlock = current.includes(START_MARK) && current.includes(END_MARK);
writeFileSync(
  readmePath,
  hasBlock
    ? current.slice(0, current.indexOf(START_MARK)) + block + current.slice(current.indexOf(END_MARK) + END_MARK.length)
    : `${block}\n`,
);

const previewOf = (theme) =>
  rows
    .map((row) =>
      row.map((item) => `<img src="./cards/${item.card}-${theme}.svg" width="${widthOf(row)}" alt="">`).join(''),
    )
    .join('<br>\n');
writeFileSync(
  path.join(ROOT, 'preview.html'),
  `<!doctype html>
<meta charset="utf-8">
<title>Profile cards preview</title>
<style>
  body { margin: 0; font: 16px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  section { padding: 32px 0 48px; }
  .column { width: 880px; max-width: 100%; margin: 0 auto; text-align: center; }
  img { max-width: 100%; }
  h2 { width: 880px; max-width: 100%; margin: 0 auto 16px; font-size: 13px; font-weight: 600; }
</style>
<section style="background:${config.themes.light.page};color:#1f2328"><h2>GitHub light</h2><div class="column">
${previewOf('light')}
</div></section>
<section style="background:${config.themes.dark.page};color:#f0f6fc"><h2>GitHub dark</h2><div class="column">
${previewOf('dark')}
</div></section>
`,
);

console.log(`wrote ${readdirSync(OUT).filter((f) => f.endsWith('.svg')).length} cards (${Math.round(bytes / 1024)} KB), README.md and preview.html`);
