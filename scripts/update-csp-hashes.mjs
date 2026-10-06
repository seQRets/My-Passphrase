#!/usr/bin/env node
/* Recompute the SHA-256 pins for index.html's inline scripts, rewrite the CSP
   meta tag in place, and regenerate SHA256SUMS.txt.
 *
 * Ported from the sister project, seQRets/My-Seed-Phrase, which has pinned its
 * scripts this way since v1.6; the two pages share one rule set.
 *
 * RUN THIS AFTER ANY EDIT TO index.html. The page pins each inline <script> by
 * hash instead of allowing 'unsafe-inline', so a single changed character
 * inside a script block makes the browser refuse to run that block. The failure
 * looks like nothing at all: the page draws, and the tool does nothing. That is
 * why this is a script rather than a line in a checklist.
 *
 *   node scripts/update-csp-hashes.mjs            rewrite the pins and the sums
 *   node scripts/update-csp-hashes.mjs --check    report staleness, write nothing
 *
 * No dependencies, by the same rule as the page itself.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE  = join(ROOT, 'index.html');
const SUMS  = join(ROOT, 'SHA256SUMS.txt');
const CHECK = process.argv.includes('--check');

const die = m => { console.error('update-csp-hashes: ' + m); process.exit(1); };
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

/* ---- the page ---------------------------------------------------------- */
const bytes = readFileSync(PAGE);
const src   = bytes.toString('utf8');
// A hash covers the exact bytes between the tags. Slicing a decoded string only
// reproduces those bytes if the file is valid UTF-8 that round-trips, and this
// page carries emoji, so check rather than assume.
if (!Buffer.from(src, 'utf8').equals(bytes)) die('index.html is not valid UTF-8');

/* ---- inline scripts ---------------------------------------------------- */
// An HTML comment hides everything up to its "-->", so a literal "<script>"
// written inside one (say, in a note explaining this very policy) is not a
// block. Treating it as one would hash the wrong bytes and pin a hash the
// browser never matches — and the page would quietly do nothing.
const comments = [...src.matchAll(/<!--[\s\S]*?-->/g)].map(m => [m.index, m.index + m[0].length]);
const inComment = i => comments.some(([a, b]) => i >= a && i < b);
const blocks = [...src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(b => !inComment(b.index));
if (!blocks.length) die('no inline <script> block found');
for (const b of blocks) {
  if (/\bsrc\s*=/i.test(b[1])) die(`a <script> at line ${lineOf(src, b.index)} has a src attribute; this page loads nothing`);
}
const hashes = blocks.map(b => createHash('sha256').update(b[2], 'utf8').digest('base64'));

/* ---- nothing a hash cannot cover --------------------------------------- */
// A hash CSP covers script BLOCKS. It does not cover onclick="…" and friends,
// which would need 'unsafe-hashes' or 'unsafe-inline' and would hand back what
// the pinning is for. So the markup must carry none.
const markup = src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<!--[\s\S]*?-->/g, '');
const handler = markup.match(/<[a-zA-Z][^>]*?\s(on[a-z]+)\s*=/);
if (handler) die(`inline event handler ${handler[1]}= in the markup; a hash CSP cannot cover it, so move it into addEventListener`);
const proto = markup.match(/(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:/i);
if (proto) die('a javascript: URL in the markup; a hash CSP cannot cover it');

/* ---- the policy -------------------------------------------------------- */
const meta = src.match(/(<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?content=")([^"]*)(")/i);
if (!meta) die('no Content-Security-Policy meta tag');
const csp = meta[2];
if (!/script-src/i.test(csp)) die('the CSP has no script-src directive');
const pins = hashes.map(h => `'sha256-${h}'`).join(' ');
const next = csp.replace(/script-src[^;]*/i, `script-src ${pins}`);

// Everything the page's first invariant asks of the policy, checked here too, so
// a hand-edit that drops a directive is caught by the tool that rewrites it.
for (const d of ["default-src 'none'", "style-src 'unsafe-inline'", 'img-src data:',
                 "connect-src 'none'", "form-action 'none'", "base-uri 'none'"]) {
  if (!next.includes(d)) die(`the CSP is missing ${d}`);
}
// base64 carries / and +, so the pins are stripped before looking for anything
// that could reach the network.
const bare = next.replace(/'sha256-[A-Za-z0-9+/=]+'/g, '');
if (/https?:|\/\/|\*/.test(bare)) die('the CSP names a network source: ' + next);

const updated = src.slice(0, meta.index) + meta[1] + next + meta[3]
              + src.slice(meta.index + meta[0].length);

/* ---- write, or report -------------------------------------------------- */
const pageHash = createHash('sha256').update(Buffer.from(updated, 'utf8')).digest('hex');
// Both names for the same bytes: the repo file, and the release asset README
// tells people to download — so `shasum -c` works against either.
const sums = `${pageHash}  index.html\n${pageHash}  mypassphrase.html\n`;
const sumsNow = existsSync(SUMS) ? readFileSync(SUMS, 'utf8') : '';
const cspStale = updated !== src, sumsStale = sums !== sumsNow;

blocks.forEach((b, i) => console.log(`  script at line ${String(lineOf(src, b.index)).padStart(5)}  sha256-${hashes[i]}`));

if (CHECK) {
  if (cspStale)  console.error('update-csp-hashes: the CSP pins do not match the inline scripts');
  if (sumsStale) console.error('update-csp-hashes: SHA256SUMS.txt does not match index.html');
  if (cspStale || sumsStale) { console.error('  run: node scripts/update-csp-hashes.mjs'); process.exit(1); }
  console.log('\nPins and SHA256SUMS.txt are current.');
} else {
  if (cspStale) writeFileSync(PAGE, updated);
  if (sumsStale) writeFileSync(SUMS, sums);
  console.log(`\nCSP script-src   ${cspStale ? 'rewritten' : 'already current'}`);
  console.log(`SHA256SUMS.txt   ${sumsStale ? 'rewritten' : 'already current'}  ${pageHash}`);
  if (cspStale) console.log('\nindex.html changed, so it needs a release with the new hash.');
}
