#!/usr/bin/env node
/* Prove the two embedded wordlists are what the credits say they are.
 *
 *   EFF large wordlist   https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
 *                        7,776 words, column two of the dice table, same order.
 *   Common English       first20hours/google-10000-english,
 *                        google-10000-english-usa-no-swears.txt, keeping the
 *                        words of 4 to 9 lowercase letters, deduplicated and
 *                        sorted: 7,459 words. (Derived here from the upstream
 *                        file, not asserted — change the recipe and this fails.)
 *
 * Fetches both upstream files, derives, and compares byte for byte against
 * index.html. Zero dependencies, by the same rule as the page. Run it after
 * touching either list, and CI runs it on every push.
 *
 * Also prints the SHA-256 of each embedded list (words joined by "\n" plus a
 * trailing "\n", the form the upstream files take), so the README can quote
 * a value a reader checks without this script.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'index.html'), 'utf8');
const list = name => {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*"([^"]*)"`));
  if (!m) { console.error(`check-wordlists: ${name} not found in index.html`); process.exit(1); }
  return m[1].split(' ');
};
const sha = words => createHash('sha256').update(words.join('\n') + '\n').digest('hex');
const same = (a, b) => a.length === b.length && a.every((w, i) => w === b[i]);

const EFF_URL = 'https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt';
const G10K_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt';

const eff = list('EFF_WORDS'), common = list('COMMON_WORDS');
console.log(`EFF_WORDS     ${eff.length} words  sha256 ${sha(eff)}`);
console.log(`COMMON_WORDS  ${common.length} words  sha256 ${sha(common)}`);

let failed = 0;
const fetchText = async url => (await fetch(url)).text();

const effUp = (await fetchText(EFF_URL)).trim().split('\n').map(l => l.split('\t')[1]);
if (same(eff, effUp)) console.log('ok    EFF_WORDS is the EFF large wordlist, verbatim and in order');
else { failed++; console.error(`FAIL  EFF_WORDS differs from ${EFF_URL} (upstream ${effUp.length} words)`); }

const g10k = (await fetchText(G10K_URL)).split('\n').map(s => s.trim()).filter(Boolean);
const derived = [...new Set(g10k.filter(w => /^[a-z]{4,9}$/.test(w)))].sort();
if (same(common, derived)) console.log('ok    COMMON_WORDS is google-10000-english-usa-no-swears, 4–9 letters, deduplicated, sorted');
else {
  failed++;
  const d = new Set(derived), c = new Set(common);
  console.error(`FAIL  COMMON_WORDS differs from the recipe (derived ${derived.length}, embedded ${common.length})`);
  console.error(`      only embedded: ${common.filter(w => !d.has(w)).slice(0, 10).join(' ')}`);
  console.error(`      only derived:  ${derived.filter(w => !c.has(w)).slice(0, 10).join(' ')}`);
}

if (failed) { console.error('\ncheck-wordlists: FAILED'); process.exit(1); }
console.log('\nBoth embedded wordlists match their stated sources.');
