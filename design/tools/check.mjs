#!/usr/bin/env node
/* ==========================================================================
   check.mjs — the gate. Zero dependencies.

     node design/tools/check.mjs

   Fails (exit 1) on the things a machine can catch. The rest is the squint
   test in STYLE.md.

     1  undefined tokens      var(--x) with no definition and no fallback
     2  colour literals       hex / rgb() / hsl() / oklch()... outside tokens/color*.css
     3  the AI tells          gradients, blur, blurred shadows, text-shadow, default fonts
     4  the line and shape    literal border widths, radii outside the three roles
     5  the gate order        transitions and keyframes before gate 4 opens
     6  layering              components/ must not reach for .wf-* or --grey-*
     7  doc drift             tokens and classes named in the .md files that don't exist
     8  markup                classes used in index.html that no CSS defines
     9  contrast              the colour file's role pairs, against WCAG AA

   sheet.css is exempt from 2–5: the "not this" specimen breaks them on purpose.
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = join(ROOT, "css");

/* Flip a gate to true when it opens. Motion opens at gate 4. */
const GATES = { motion: false };

/* ---- files ----------------------------------------------------------------- */

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const rel = (p) => relative(ROOT, p);
const read = (p) => readFileSync(p, "utf8");
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const stripUrls = (s) => s.replace(/url\([^)]*\)/g, "url()");
const lineOf = (s, i) => s.slice(0, i).split("\n").length;

const cssFiles = walk(CSS).filter((p) => p.endsWith(".css"));
const isColourFile = (p) => /tokens[\\/]color[^\\/]*\.css$/.test(p);
const isSheet = (p) => basename(p) === "sheet.css";
const isWire = (p) => basename(p) === "wire.css";
const isComponent = (p) => /components[\\/]/.test(p);
const shipped = cssFiles.filter((p) => !isSheet(p));

const files = Object.fromEntries(cssFiles.map((p) => [p, stripComments(read(p))]));
const html = read(join(ROOT, "index.html"));

/* ---- results --------------------------------------------------------------- */

const results = [];
function check(name, problems, note = "") {
  results.push({ name, problems, note });
}

/* ---- definitions ------------------------------------------------------------ */

const defined = new Set();
const hooks = new Set(); // used as var(--x, fallback): an override hook, not a bug
for (const [p, s] of Object.entries(files)) {
  for (const m of s.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
  for (const m of s.matchAll(/@property\s+(--[a-z0-9-]+)/gi)) defined.add(m[1]);
  for (const m of s.matchAll(/var\(\s*(--[a-z0-9-]+)\s*,/gi)) hooks.add(m[1]);
}
/* custom properties set inline in the sheet's own markup */
for (const m of html.matchAll(/style="([^"]*)"/g)) {
  for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(d[1]);
}
const known = new Set([...defined, ...hooks]);

/* ---- 1 undefined tokens ------------------------------------------------------ */
{
  const problems = [];
  for (const [p, s] of Object.entries(files)) {
    for (const m of s.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
      if (!known.has(m[1])) problems.push(`${rel(p)}:${lineOf(s, m.index)} ${m[1]} is not defined`);
    }
  }
  check("undefined tokens", problems);
}

/* ---- 2 colour literals ------------------------------------------------------- */
{
  const problems = [];
  const re = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
  for (const p of shipped) {
    if (isColourFile(p)) continue;
    const s = stripUrls(files[p]);
    for (const m of s.matchAll(re)) {
      problems.push(`${rel(p)}:${lineOf(s, m.index)} colour literal "${m[0]}": read a role instead`);
    }
  }
  check("colour literals outside tokens/color*.css", problems);
}

/* ---- 3 the AI tells ---------------------------------------------------------- */
function balanced(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return s.slice(open + 1, i);
  }
  return "";
}
function splitTop(s, sep) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && (sep === "," ? ch === "," : /\s/.test(ch))) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
{
  const problems = [];
  const BAD_FONTS = /^(inter|roboto|open sans|lato|poppins|space grotesk|dm sans|plus jakarta sans|manrope|montserrat|geist|system-ui|ui-sans-serif|arial|helvetica(?: neue)?)$/i;
  for (const p of shipped) {
    const s = stripUrls(files[p]);
    const at = (i) => `${rel(p)}:${lineOf(s, i)}`;

    for (const m of s.matchAll(/\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/g)) {
      const inner = balanced(s, m.index + m[0].length - 1);
      const args = splitTop(inner, ",");
      const flat = args.length === 2 && args[0] === args[1]; // two identical stops: a flat fill, not a gradient
      if (!isWire(p) && !flat) problems.push(`${at(m.index)} gradient outside wire.css`);
    }
    for (const m of s.matchAll(/backdrop-filter|\bblur\(|text-shadow/g)) {
      problems.push(`${at(m.index)} "${m[0]}" is banned (flat, no glass, no glow)`);
    }
    for (const m of s.matchAll(/(box-shadow|--shadow-[a-z-]+)\s*:\s*([^;]+);/g)) {
      for (const shadow of splitTop(m[2], ",")) {
        const t = splitTop(shadow, " ").filter((x) => x !== "inset");
        if (t.length >= 4 && !/^0(px)?$/.test(t[2])) {
          problems.push(`${at(m.index)} shadow with blur "${t[2]}": shadows are hard-edged`);
        }
      }
    }
    for (const m of s.matchAll(/--font-sans\s*:\s*([^;]+);/g)) {
      const first = splitTop(m[1], ",")[0].replace(/["']/g, "").trim();
      if (BAD_FONTS.test(first)) problems.push(`${at(m.index)} "${first}" as the first family is a default, not a choice`);
    }
    if (basename(p) !== "fonts.css") {
      for (const m of s.matchAll(/(?<![@\w-])font-family\s*:\s*([^;]+);/g)) {
        if (!/^var\(/.test(m[1].trim())) problems.push(`${at(m.index)} font-family must come from a token`);
      }
    }
  }
  check("AI tells: gradients, blur, glow, default fonts", problems);
}

/* ---- 4 line and shape -------------------------------------------------------- */
{
  const problems = [];
  const ROLES = /^(0|inherit|var\(--radius-(card|tile|ctl|pill)\)|var\(--card-radius\))$/;
  for (const p of shipped) {
    if (p.includes(`tokens${"/"}`) || p.includes(`tokens\\`)) continue;
    const s = files[p];
    const at = (i) => `${rel(p)}:${lineOf(s, i)}`;
    for (const m of s.matchAll(/\b(border(?!-radius)[\w-]*|outline|outline-width)\s*:\s*([^;]+);/g)) {
      const v = stripUrls(m[2]);
      for (const w of v.matchAll(/(?<![\w.-])(\d*\.?\d+)px\b/g)) {
        if (+w[1] !== 0) problems.push(`${at(m.index)} literal ${w[0]} in ${m[1]}: use --bw, --bw-thin, --bw-heavy or --ring`);
      }
    }
    if (isComponent(p) || isWire(p)) {
      for (const m of s.matchAll(/(?<![\w-])border-radius\s*:\s*([^;]+);/g)) {
        if (!ROLES.test(m[1].trim())) problems.push(`${at(m.index)} border-radius "${m[1].trim()}": use --radius-card, -tile, -ctl or -pill`);
      }
    }
  }
  check("line weights and radii come from tokens", problems);
}

/* ---- 5 the gate order -------------------------------------------------------- */
{
  const problems = [];
  if (!GATES.motion) {
    for (const p of shipped) {
      if (!isComponent(p) && !isWire(p)) continue;
      const s = files[p];
      for (const m of s.matchAll(/(?<![\w-])(transition|animation)(-[a-z-]+)?\s*:|@keyframes/g)) {
        problems.push(`${rel(p)}:${lineOf(s, m.index)} "${m[0].replace(/\s*:$/, "")}": motion is gate 4, and it isn't open`);
      }
    }
  }
  check("motion waits for gate 4", problems, GATES.motion ? "gate 4 is open" : "");
}

/* ---- 6 layering -------------------------------------------------------------- */
{
  const problems = [];
  for (const p of shipped) {
    const s = files[p];
    const at = (i) => `${rel(p)}:${lineOf(s, i)}`;
    if (isComponent(p)) {
      for (const m of s.matchAll(/\.wf-[\w-]+/g)) problems.push(`${at(m.index)} ${m[0]}: a component must work without the wireframe kit`);
    }
    if (!isColourFile(p)) {
      for (const m of s.matchAll(/var\(\s*--grey-\d+/g)) problems.push(`${at(m.index)} ${m[0]}): read a role, not a primitive`);
    }
  }
  check("components stand alone, primitives stay in the colour file", problems);
}

/* ---- 7 doc drift ------------------------------------------------------------- */
const classes = new Set();
for (const s of Object.values(files)) {
  for (const m of stripUrls(s).matchAll(/\.([a-z][\w-]*)/gi)) classes.add(m[1]);
}
/* the docs may name the app's own classes (the migration note does); the sheet's markup may not use them */
const appClasses = new Set();
try {
  for (const m of stripUrls(stripComments(read(join(ROOT, "..", "styles.css")))).matchAll(/\.([a-z][\w-]*)/gi)) appClasses.add(m[1]);
} catch {}
{
  const problems = [];
  for (const name of ["STYLE.md", "README.md"]) {
    const md = read(join(ROOT, name));
    const code = [...md.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
    for (const c of code) {
      if (/^--[a-z0-9-]+$/.test(c) && !known.has(c)) problems.push(`${name}: token \`${c}\` is not in the CSS`);
      const cls = c.match(/^\.([a-z][\w-]*)$/i);
      if (cls && !classes.has(cls[1]) && !appClasses.has(cls[1])) problems.push(`${name}: class \`${c}\` is not in the CSS`);
    }
  }
  check("STYLE.md and README.md name only real tokens and classes", [...new Set(problems)]);
}

/* ---- 8 markup ---------------------------------------------------------------- */
{
  const problems = [];
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) {
      if (!classes.has(c)) problems.push(`index.html:${lineOf(html, m.index)} class "${c}" has no CSS`);
    }
  }
  check("every class in index.html is defined", [...new Set(problems)]);
}

/* ---- 9 contrast -------------------------------------------------------------- */
function parseColour(v) {
  v = v.trim();
  let m;
  if ((m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i))) return [+m[1], +m[2], +m[3]];
  if ((m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i))) {
    const L = +m[1] / (m[2] ? 100 : 1), C = +m[3], h = (+m[4] * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s];
    return lin.map((c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))));
  }
  return null;
}
const lum = (c) => c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, pa) => a.map((v, i) => Math.round(v * pa + b[i] * (1 - pa)));

{
  const problems = [];
  const skipped = [];
  const decl = {};
  for (const p of cssFiles.filter(isColourFile)) {
    for (const m of files[p].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) decl[m[1]] = m[2].trim();
  }
  const resolve = (name, depth = 0) => {
    const v = decl[name];
    if (v === undefined || depth > 8) return null;
    const ref = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
    return ref ? resolve(ref[1], depth + 1) : parseColour(v);
  };
  const pair = (fg, bg, min, label) => {
    const f = Array.isArray(fg) ? fg : resolve(fg);
    const b = Array.isArray(bg) ? bg : resolve(bg);
    if (!f || !b) { skipped.push(label); return; }
    const r = ratio(f, b);
    if (r < min) problems.push(`${label}: ${r.toFixed(2)}:1, needs ${min}:1`);
  };

  pair("--ink", "--paper", 7, "ink on paper");
  pair("--ink", "--canvas", 7, "ink on canvas");
  pair("--ink-soft", "--paper", 4.5, "ink-soft on paper");
  pair("--ink-soft", "--canvas", 4.5, "ink-soft on canvas");
  pair("--ink-faint", "--paper", 3, "ink-faint on paper (disabled, 3:1)");
  pair("--paper", "--ink", 7, "paper on ink (inverted tone)");
  pair("--on-accent", "--accent", 4.5, "on-accent on accent");
  pair("--focus", "--canvas", 3, "focus ring on canvas (3:1)");
  pair("--line", "--canvas", 3, "frame line on canvas (3:1)");
  const ink = resolve("--ink");
  for (let n = 1; n <= 6; n++) {
    const bg = resolve(`--tone-${n}`);
    const fg = resolve(`--on-tone-${n}`);
    pair(fg, bg, 4.5, `on-tone-${n} on tone-${n}`);
    if (fg && bg) pair(mix(fg, bg, 0.72), bg, 4.5, `soft text (72% mix) on tone-${n}`);
  }
  check("contrast", problems, skipped.length ? `skipped ${skipped.length} pair(s) it can't parse: check the live swatches in index.html` : "");
}

/* ---- report ------------------------------------------------------------------ */
let failed = 0;
for (const r of results) {
  const ok = r.problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${r.name}${r.note ? `  (${r.note})` : ""}`);
  for (const p of r.problems.slice(0, 12)) console.log(`        ${p}`);
  if (r.problems.length > 12) console.log(`        … and ${r.problems.length - 12} more`);
}
console.log(failed ? `\n${failed} of ${results.length} checks failed.` : `\nAll ${results.length} checks pass.`);
process.exit(failed ? 1 : 0);
