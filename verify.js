#!/usr/bin/env node
'use strict';
/*
 * verify.js — drives index.html in headless Chrome and asserts on it.
 *
 * Needs Node 22+ (global fetch and WebSocket) and Google Chrome or Chromium.
 * Set CHROME to point at the binary if it is somewhere unusual. Nothing else:
 * no install step, no dependencies, the same rule as the page.
 *
 *     node verify.js
 *
 * The same shape as the sister project's harness (seQRets/My-Seed-Phrase),
 * trimmed to what this page promises:
 *
 *   - the file is what it says: CSP pins recomputed from the inline scripts,
 *     no 'unsafe-inline' for script, no network source, SHA256SUMS.txt current,
 *     no inline event handler, no Math.random, both wordlists the right size;
 *   - over file:// and over http the page loads with no CSP violation, no
 *     exception and no request but itself, and Generate works in both;
 *   - randomness: randomIndex() is uniform (chi-square at p < .001) for the
 *     list sizes the page actually draws from, and never lands past the end;
 *   - every pool draws what it claims: word count, membership, alphabet;
 *   - the meter counts a generated secret exactly and never flatters typed
 *     text past the word-list ceiling; a generated secret is born blurred;
 *   - 💪 adds exactly what it says it adds, from the same RNG;
 *   - encode/decode round-trip in all seven alphabets, with the five simple
 *     ones cross-checked against Node rather than against the page itself;
 *   - the QR opens blurred; the frame guard withholds the tool; nothing
 *     scrolls sideways between 320px and 1440px.
 *
 * Every check here was confirmed to fail against deliberately broken code
 * before being kept.
 */
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const http = require('http'), crypto = require('crypto');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const PAGE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(PAGE, 'utf8');

let count = 0, fails = 0;
const chk = (name, ok, extra = '') => {
  count++; if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  — ' + extra : ''}`);
};
const section = t => console.log(`\n--- ${t} ---`);

/* ---- chrome ---------------------------------------------------------- */
function findChrome() {
  const candidates = [process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const c of candidates) { try { fs.accessSync(c, fs.constants.X_OK); return c } catch {} }
  return null;
}

async function launch(bin, port = 9334) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'passphrase-verify-'));
  const proc = spawn(bin, ['--headless=new', `--remote-debugging-port=${port}`,
    `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--disable-extensions', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-pings',
    '--window-size=1280,900', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = ''; proc.stderr.on('data', d => err += d);
  for (let i = 0; i < 100; i++) {
    try {
      const v = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json());
      return { proc, wsUrl: v.webSocketDebuggerUrl, version: v.Browser };
    } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  proc.kill(); throw new Error('Chrome did not start.\n' + err);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map(), listeners = [];
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    } else if (m.method) listeners.forEach(f => f(m));
  };
  const send = async (method, params = {}, sessionId) => {
    await ready; const mid = ++id;
    return new Promise((res, rej) => {
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  };
  return { send, on: f => listeners.push(f) };
}

async function openPage(browser, url) {
  const cdp = connect(browser.wsUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p, sid) => cdp.send(m, p, sid || sessionId);
  const requests = [], exceptions = [];
  const childSessions = new Set();
  cdp.on(m => {
    if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'iframe') {
      childSessions.add(m.params.sessionId);
      cdp.send('Runtime.enable', {}, m.params.sessionId).catch(() => {});
    }
    if (m.method === 'Target.detachedFromTarget') childSessions.delete(m.params.sessionId);
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown')
      exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  });
  await S('Runtime.enable'); await S('Network.enable'); await S('Page.enable');
  // A blocked script is reported by the browser, not by the page, so it reaches
  // no console the page can see. Ask the document instead; installing the
  // listener through the debugger is also the only way to run script on a page
  // that pins its scripts by hash.
  await S('Page.addScriptToEvaluateOnNewDocument', { source:
    "window.__csp=[];addEventListener('securitypolicyviolation',"
    + "e=>window.__csp.push(e.violatedDirective+' blocked '+(e.blockedURI||'inline')));" });
  await S('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  const goto = async u => {
    await S('Page.navigate', { url: u });
    for (let i = 0; i < 200; i++) {
      const r = await S('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
      if (r.result.value === 'complete') break;
      await new Promise(r2 => setTimeout(r2, 50));
    }
  };
  await goto(url);
  const evalIn = async (expr, sid) => {
    const r = await S('Runtime.evaluate',
      { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }, sid);
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    requests, exceptions, S, goto, childSessions, evalIn,
    evaluate: expr => evalIn(expr),
    setViewport: (width, height) => S('Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false }),
    close: () => cdp.send('Target.closeTarget', { targetId }),
  };
}

/* ---- static: the file is what it says ------------------------------- */
function staticChecks() {
  section('the file');
  const comments = [...SRC.matchAll(/<!--[\s\S]*?-->/g)].map(m => [m.index, m.index + m[0].length]);
  const inComment = i => comments.some(([a, b]) => i >= a && i < b);
  const blocks = [...SRC.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(b => !inComment(b.index));
  const want = blocks.map(b => `'sha256-${crypto.createHash('sha256').update(b[2], 'utf8').digest('base64')}'`);
  const meta = SRC.match(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]*)"/i);
  const csp = meta ? meta[1] : '';
  const scriptSrc = (csp.match(/script-src([^;]*)/) || [, ''])[1].trim().split(/\s+/).filter(Boolean);
  chk('CSP pins equal the SHA-256 of each inline script, recomputed here',
      scriptSrc.length === want.length && want.every(h => scriptSrc.includes(h)),
      `${blocks.length} block(s)`);
  chk("script-src carries no 'unsafe-inline'", !/script-src[^;]*unsafe-inline/.test(csp));
  const bare = csp.replace(/'sha256-[A-Za-z0-9+/=]+'/g, '');
  chk('the CSP names no network source', !/https?:|\/\/|\*/.test(bare) && /default-src 'none'/.test(csp)
      && /connect-src 'none'/.test(csp), bare.replace(/\s+/g, ' ').trim());
  const sums = fs.existsSync(path.join(ROOT, 'SHA256SUMS.txt')) ? fs.readFileSync(path.join(ROOT, 'SHA256SUMS.txt'), 'utf8') : '';
  const pageHash = crypto.createHash('sha256').update(fs.readFileSync(PAGE)).digest('hex');
  chk('SHA256SUMS.txt matches index.html', sums.includes(`${pageHash}  index.html`), pageHash.slice(0, 16) + '…');
  const markup = SRC.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<!--[\s\S]*?-->/g, '');
  chk('no inline event handler in the markup', !/<[a-zA-Z][^>]*?\s(on[a-z]+)\s*=/.test(markup));
  chk('no Math.random( anywhere', !/Math\.random\s*\(/.test(SRC));
  chk('every <script> is inline (nothing is loaded from anywhere)', blocks.every(b => !/\bsrc\s*=/i.test(b[1])));
  const eff = (SRC.match(/const EFF_WORDS\s*=\s*"([^"]*)"/) || [, ''])[1].split(' ');
  const common = (SRC.match(/const COMMON_WORDS\s*=\s*"([^"]*)"/) || [, ''])[1].split(' ');
  chk('EFF list is 7,776 distinct words', eff.length === 7776 && new Set(eff).size === 7776);
  chk('common-English list is 7,459 distinct words, sorted', common.length === 7459 && new Set(common).size === 7459
      && JSON.stringify(common) === JSON.stringify([...common].sort()));
  chk('the page refuses to be framed (pre-paint guard + FRAMED gate)',
      /window\.top!==window\.self/.test(SRC) && /if \(FRAMED\) return;/.test(SRC) && /id="framed"/.test(SRC));
  return { eff, common };
}

/* ---- an independent encoder, so the page is not its own judge --------- */
const ENC = {
  hex: b => Buffer.from(b).toString('hex'),
  base64: b => Buffer.from(b).toString('base64'),
  binary: b => [...b].map(x => x.toString(2).padStart(8, '0')).join(' '),
  octal: b => [...b].map(x => x.toString(8).padStart(3, '0')).join(' '),
  decimal: b => [...b].join(' '),
};
// Known vectors for the two alphabets Node has no built-in for.
const B32_HELLO = 'NBSWY3DP', B58_HELLO = 'Cn8eVZg';

// chi-square critical values at p = .001, so a genuine RNG trips this about
// once in a thousand runs rather than once in a hundred
const CHI_P001 = { 16: 37.70, 94: 140.0, 7776: 7775 + 3.09 * Math.sqrt(2 * 7775) };

/* ---- the page --------------------------------------------------------- */
async function pageChecks(browser, url, label, lists) {
  section(`${label}`);
  const p = await openPage(browser, url);
  try {
    const first = await p.evaluate(`return {
      csp: window.__csp, framed: FRAMED, hasGen: typeof generate === 'function',
      hasCrypto: !!(crypto && crypto.getRandomValues), title: document.title }`);
    chk('loads with no CSP violation', first.csp.length === 0, first.csp.join('; '));
    chk('every script block ran (generate is defined)', first.hasGen && first.framed === false);
    chk('no exception on load', p.exceptions.length === 0, p.exceptions.join(' | '));
    const foreign = p.requests.filter(u => !u.startsWith(url.split('#')[0]) && !u.startsWith('data:'));
    chk('requests nothing but itself', foreign.length === 0, foreign.join(', '));

    // Generate, in this origin
    const g = await p.evaluate(`
      $('wordcount').value = '6'; $('wordlist').value = 'eff';
      $('gen').click(); await new Promise(r => setTimeout(r, 50));
      return { v: $('passphrase').value, shield: $('passphrase').classList.contains('shield'),
               mval: $('mval').textContent, meterShown: $('meter').style.display !== 'none' }`);
    const words = g.v.split(' ');
    chk('Generate draws 6 EFF words', words.length === 6 && words.every(w => lists.eff.includes(w)), g.v.replace(/\S/g, '•'));
    chk('a generated secret is born blurred', g.shield);
    chk('the meter counts a generated secret exactly, with no "est."',
        g.meterShown && g.mval === `${Math.round(6 * Math.log2(7776))} bits`, g.mval);
    if (p.evaluate) {
      const later = await p.evaluate(`return { csp: window.__csp.length, ex: 0 }`);
      chk('still no CSP violation after use', later.csp === 0);
    }
  } finally { await p.close(); }
}

async function behaviourChecks(browser, url, lists) {
  section('randomness');
  const p = await openPage(browser, url);
  try {
    const rng = await p.evaluate(`
      const out = {};
      for (const [n, draws] of [[16, 160000], [94, 188000], [7776, 400000]]) {
        const bins = new Array(n).fill(0); let over = 0;
        for (let i = 0; i < draws; i++) { const v = randomIndex(n); if (v >= n || v < 0) over++; else bins[v]++; }
        const e = draws / n; let chi = 0; for (const b of bins) chi += (b - e) * (b - e) / e;
        out[n] = { chi: +chi.toFixed(1), over, min: Math.min(...bins), max: Math.max(...bins) };
      }
      let pinOver = 0; for (let i = 0; i < 100000; i++) if (randomIndex(10) >= 10) pinOver++;
      out.pinOver = pinOver;
      return out;`);
    for (const n of [16, 94, 7776])
      chk(`randomIndex(${n}) is uniform (chi² ${rng[n].chi} < ${CHI_P001[n].toFixed(1)}, p<.001) and in range`,
          rng[n].chi < CHI_P001[n] && rng[n].over === 0, `bins ${rng[n].min}–${rng[n].max}`);
    chk('randomIndex(10) never lands past the end (rejection sampling holds)', rng.pinOver === 0);

    section('the pools');
    const pools = await p.evaluate(`
      const r = {};
      for (const [list, count] of [['eff', 8], ['common', 7], ['ascii', 16], ['hex', 64], ['pin', 6]]) {
        $('wordcount').value = String(count);
        if ($('wordcount').value !== String(count)) {           // the count menu changes per pool
          $('wordlist').value = list; $('wordlist').dispatchEvent(new Event('change'));
          $('wordcount').value = String(count);
        }
        $('wordlist').value = list; $('wordlist').dispatchEvent(new Event('change'));
        $('wordcount').value = String(count); $('wordcount').dispatchEvent(new Event('change'));
        $('gen').click(); await new Promise(r2 => setTimeout(r2, 30));
        r[list] = { v: $('passphrase').value, mval: $('mval').textContent, count: +$('wordcount').value };
      }
      return r;`);
    const effW = pools.eff.v.split(' ');
    chk('EFF pool: every word is on the list', effW.length === pools.eff.count && effW.every(w => lists.eff.includes(w)),
        `${effW.length} words`);
    const comW = pools.common.v.split(' ');
    chk('common pool: every word is on the list', comW.length === pools.common.count && comW.every(w => lists.common.includes(w)),
        `${comW.length} words`);
    chk('ASCII pool: only the 94 printable non-space characters',
        pools.ascii.v.length === pools.ascii.count && /^[!-~]+$/.test(pools.ascii.v), `${pools.ascii.v.length} chars`);
    chk('hex pool: lowercase hex digits only', pools.hex.v.length === pools.hex.count && /^[0-9a-f]+$/.test(pools.hex.v),
        `${pools.hex.v.length} digits`);
    chk('PIN pool: digits only, leading zero allowed', pools.pin.v.length === pools.pin.count && /^[0-9]+$/.test(pools.pin.v));
    chk('hex: 64 digits read exactly 256 bits', pools.hex.count === 64 ? pools.hex.mval === '256 bits' : true, pools.hex.mval);

    section('the meter');
    // Six EFF words typed back in — ones zxcvbn OVERRATES (it shreds them into
    // fragments it charges for separately: raw estimate ~230 bits against a
    // true 77.5), so the list ceiling has to engage for this to pass. Words
    // the estimator already underrates would pass with the ceiling deleted.
    const typed = await p.evaluate(`
      const six = 'curvature bodacious demystify baguette deodorize deprecate';
      const raw = estimateBits(zxcvbn(six));
      $('passphrase').value = six; $('passphrase').dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 80));
      const a = $('mval').textContent;
      $('passphrase').value = 'the quick brown fox jumps over the lazy dog';
      $('passphrase').dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 80));
      const b = { mval: $('mval').textContent, note: document.querySelector('#meter').textContent };
      return { a, b, raw }`);
    const typedBits = parseInt(typed.a, 10);
    chk('typed EFF words are marked "est." and capped at the list ceiling (≤ 78 bits)',
        /est\./.test(typed.a) && typedBits <= Math.ceil(6 * Math.log2(7776)) && typed.raw > 100,
        `${typed.a}, raw estimate ${Math.round(typed.raw)}`);
    chk('a sentence is called out as sentence-shaped', /sentence/i.test(typed.b.note), typed.b.mval);

    section('💪 make it stronger');
    const bump = await p.evaluate(`
      $('wordlist').value = 'eff'; $('wordlist').dispatchEvent(new Event('change'));
      $('wordcount').value = '6'; $('wordcount').dispatchEvent(new Event('change'));
      $('gen').click(); await new Promise(r => setTimeout(r, 30));
      const before = $('passphrase').value, b0 = lastGenerated.bits;
      const out = [];
      for (let k = 0; k < 2; k++) {
        $('bump').click(); await new Promise(r => setTimeout(r, 30));
        out.push({ v: $('passphrase').value, bits: lastGenerated.bits, mval: $('mval').textContent });
      }
      return { before, b0, out }`);
    // A press capitalises one drawn letter, so compare case-insensitively: the
    // drawn characters must all survive, in order, as the page's own bound requires.
    const sub = (hay, needle) => { let i = 0; hay = hay.toLowerCase(); for (const c of hay) if (c === needle[i]) i++; return i === needle.length; };
    const [b1, b2] = bump.out;
    chk('one press adds a capital and a digit, and the drawn text survives in order',
        sub(b1.v, bump.before) && /[A-Z]/.test(b1.v) && /[0-9]/.test(b1.v) && b1.bits > bump.b0,
        `+${(b1.bits - bump.b0).toFixed(1)} bits`);
    chk('a second press adds a symbol; the count is exact, not "est."',
        sub(b2.v, bump.before) && /[!-\/:-@[-\`{-~]/.test(b2.v) && b2.bits > b1.bits && !/est\./.test(b2.mval),
        b2.mval);

    section('encode and decode');
    const conv = await p.evaluate(`
      const text = 'hello';
      const bytes = new TextEncoder().encode(text);
      const enc = ENCODINGS.map(f => f(bytes));
      const back = enc.map((s, i) => decodeText(s, i));
      const roundTrip = ENCODINGS.map((f, i) => decodeText(f(new TextEncoder().encode('Zürich ✓ 🔐 — all 7')), i));
      return { enc, back, roundTrip }`);
    const hello = Buffer.from('hello');
    chk('hex, base64, binary, octal, decimal match an independent encoder',
        conv.enc[0] === ENC.hex(hello) && conv.enc[1] === ENC.base64(hello) && conv.enc[4] === ENC.binary(hello)
        && conv.enc[5] === ENC.octal(hello) && conv.enc[6] === ENC.decimal(hello));
    chk('base32 and base58 match their published vectors for "hello"',
        conv.enc[2] === B32_HELLO && conv.enc[3] === B58_HELLO, `${conv.enc[2]} ${conv.enc[3]}`);
    chk('all seven alphabets decode back to the text', conv.back.every(s => s === 'hello'));
    chk('all seven round-trip non-ASCII text (umlaut, emoji, dash)',
        conv.roundTrip.every(s => s === 'Zürich ✓ 🔐 — all 7'));

    section('the QR');
    const qr = await p.evaluate(`
      $('gen').click(); await new Promise(r => setTimeout(r, 30));
      $('inqr').click(); await new Promise(r => setTimeout(r, 80));
      const veil = $('qrveil'), c = $('qrcanvas');
      const open = { shown: getComputedStyle(veil).display !== 'none', w: c.width,
                     pressed: $('qrpeek').getAttribute('aria-pressed'),
                     blurred: getComputedStyle($('qrbox')).filter !== 'none' || $('qrbox').className.includes('shield') };
      $('qrclose').click(); await new Promise(r => setTimeout(r, 50));
      const closed = { shown: getComputedStyle(veil).display !== 'none', w: $('qrcanvas').width };
      return { open, closed }`);
    chk('the QR opens, drawn, and blurred until revealed',
        qr.open.shown && qr.open.w > 1 && qr.open.pressed === 'false' && qr.open.blurred, JSON.stringify(qr.open));
    chk('closing the QR wipes the drawing', !qr.closed.shown && qr.closed.w <= 1, `canvas ${qr.closed.w}px`);

    section('layout');
    for (const w of [320, 390, 1440]) {
      await p.setViewport(w, 800);
      const r = await p.evaluate(`await new Promise(r => setTimeout(r, 100));
        return { sw: document.documentElement.scrollWidth, iw: innerWidth }`);
      chk(`${w}px — no sideways scroll`, r.sw <= r.iw, `scrollWidth ${r.sw} of ${r.iw}`);
    }
    await p.setViewport(1280, 900);
    chk('no exception during any of the above', p.exceptions.length === 0, p.exceptions.join(' | '));
  } finally { await p.close(); }
}

/* ---- the frame guard --------------------------------------------------- */
async function guardChecks(browser, pageOrigin, framerOrigin) {
  section('the frame guard');
  const p = await openPage(browser, `${framerOrigin}/frame`);
  try {
    let sid = null;
    for (let i = 0; i < 60 && !sid; i++) { await new Promise(r => setTimeout(r, 100)); sid = [...p.childSessions][0]; }
    chk('a cross-origin frame of the page exists for the test', !!sid);
    if (sid) {
      let r = null;
      for (let i = 0; i < 40 && !r; i++) {
        try {
          r = await p.evalIn(`if (document.readyState !== 'complete' || typeof FRAMED === 'undefined') return null;
            return { framed: FRAMED, notice: getComputedStyle(document.getElementById('framed')).display,
                     main: getComputedStyle(document.querySelector('main')).display,
                     before: document.getElementById('passphrase').value,
                     after: (generate(), document.getElementById('passphrase').value) }`, sid);
        } catch { r = null; }
        if (!r) await new Promise(r2 => setTimeout(r2, 100));
      }
      chk('framed: the notice shows and the tool is hidden', !!r && r.framed && r.notice === 'block' && r.main === 'none', JSON.stringify(r));
      chk('framed: generate() is a no-op even if the CSS were defeated', !!r && r.before === '' && r.after === '');
    }
  } finally { await p.close(); }
}

/* ---- run ------------------------------------------------------------- */
(async () => {
  const bin = findChrome();
  if (!bin) { console.error('Could not find Chrome. Install it, or set CHROME to the binary.'); process.exit(2); }

  const lists = staticChecks();

  // Two tiny servers: the page on one origin, a framing page on another, so
  // the frame is genuinely cross-origin as a hostile wrapper's would be.
  const serve = handler => new Promise(res => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => res(s)); });
  const pageServer = await serve((req, res) => {
    fs.readFile(PAGE, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(data);
    });
  });
  const pageOrigin = `http://127.0.0.1:${pageServer.address().port}`;
  const framer = await serve((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>framer</title><iframe src="${pageOrigin}/" width="900" height="700"></iframe>`);
  });
  const framerOrigin = `http://localhost:${framer.address().port}`;

  const browser = await launch(bin);
  console.log(`\n${browser.version}`);
  try {
    await pageChecks(browser, pathToFileURL(PAGE).href, 'over file://', lists);
    await pageChecks(browser, `${pageOrigin}/`, 'over http', lists);
    await behaviourChecks(browser, `${pageOrigin}/`, lists);
    await guardChecks(browser, pageOrigin, framerOrigin);
  } finally {
    browser.proc.kill(); pageServer.close(); framer.close();
  }
  console.log(`\n${fails === 0 ? `all ${count} checks passed` : `${fails} of ${count} checks FAILED`}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('\nverify.js could not run:', e.message); process.exit(2); });
