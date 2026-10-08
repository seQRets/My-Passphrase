# My Passphrase

A passphrase and password generator in **one self-contained HTML file**. No
build, no dependencies, nothing ever sent over the internet: download one file, open it in a
browser, done. It works with the Wi-Fi off, and a Content-Security-Policy tells
the browser to refuse if anything on the page ever tried to phone home.

> **Truly random. Centuries to crack.** Humans are terrible at inventing
> passwords. A passphrase, a handful of words chosen truly at random, is
> easier to remember than `Tr0ub4dor&3` and far harder to guess.

## Features

- **Five generation pools**
  - The **EFF large wordlist**: 7,776 words curated by the Electronic Frontier
    Foundation for passphrases, the same list diceware uses
  - **Common English**: 7,459 everyday words from a frequency corpus, for
    phrases that read a little more naturally
  - **ASCII characters**: all 94 printable ASCII symbols, for a classic
    `ipz2!az8k%0h`-style password where a manager autofills or a length limit
    bites
  - **Hex digits**: 16 to 64 random hex digits, four bits each, for wallet
    entropy and anything else that wants its randomness machine-shaped; 64
    digits are exactly 256 bits, counted rather than estimated
  - **PIN digits**: 4 to 12 random digits for the PINs hardware wallets ask
    you to set; drawn per digit, so leading zeros are as likely as anything
    else (`0042` is a valid PIN, which range-style generators cannot produce)
- **Roll your own randomness**: a folded card under the generator takes dice
  rolls, five per word, and reads the words straight off the EFF table (the
  list is 7,776 = 6⁵ entries in dice order, so `index = Σ (dᵢ−1)·6⁴⁻ⁱ`, no
  hashing, no bias) — anyone with the same rolls and the printed list gets the
  same words. Typed rolls can be invented, so the sister project's roll-quality
  check runs on them before anything is made: one number, a repeating block, a
  run, a missing face or a loaded die are named, and the first press writes
  nothing until a separate *Make it anyway* is pressed. Thresholds are
  re-calibrated for this page's shorter strings (20–60 rolls): on 20,000 fair
  sequences per length, false alarms are 0.04% at 20 rolls, 0.01% at 30, 0.6%
  at 40 and 0.01% at 60, and every faked pattern tried is caught. The rolls
  field is blurred under the same eye as the passphrase, because the rolls
  *are* the passphrase one step earlier
- **Real randomness**: every draw comes from `crypto.getRandomValues` with
  rejection sampling, so each word and character is exactly as likely as every
  other; `Math.random` appears nowhere in the file
- **Entropy first**: the meter measures randomness in bits and says so in the
  headline, because that is a property of the secret itself. Crack time is a
  consequence of it and rides underneath. The bar runs 0 to 128 bits, linear,
  with a 💪 mark at 78 bits, which is six words and the point past which
  offline guessing stops being a threat, and 🌱 at 128, as much randomness as
  the 12-word seed phrase behind a bitcoin wallet. Everything right of 💪 is
  green: 128 is a comparison, not a bar to clear
- **Honest accounting**: generated secrets show their true entropy
  (words × bits per word), never an estimate. Typed text is
  [zxcvbn](https://github.com/dropbox/zxcvbn)'s estimate and is labelled
  `est.`, held under two ceilings the page can prove: a word on one of the
  lists cannot be worth more than the list it came from, since anyone who knows
  the recipe simply tries all 7,776, and text written entirely in a small
  alphabet, such as 32 hex digits, cannot be worth more than that alphabet
  carries per character. Both only ever lower a figure and credit none. Edit
  the box to test any password of your own
- **Make it stronger (💪)**: one press capitalises a random letter anywhere in
  a generated phrase and adds a random digit or symbol at a word's edge,
  taking turns, so two presses cover the capital, digit and symbol that many
  sites ask for. The same RNG makes every choice, so the gain is counted, not
  estimated, and priced as if an attacker knows the button exists; the button
  shows what the next press is worth. Symbols that appear in the word lists,
  or that sites often refuse (quotes, backtick, backslash, angle brackets),
  are never used
- **Encode and decode**: a separate card spells the exact secret in another
  alphabet for the sites and devices that demand one: hex, Base64, Base32,
  Base58, binary, octal, or decimal bytes, with its own reveal, copy and QR
  controls. Its Encode field follows the passphrase box until you type your
  own text into it. Below it, Decode takes a pasted string and reads back the
  text it holds; if the alphabet you picked is wrong, it names the ones the
  string does read in, and one press sends the decoded text to the meter. A
  conversion adds zero bits and decoding needs no key, because anyone who
  knows the alphabet reads it straight back, so a string deserves the same
  care as the phrase itself
- **One headline attack speed, three in the detail**: the crack time assumes a
  trillion guesses a second, the pessimistic end, since you never get to choose
  how well a site guards what you gave it. Details costs the same secret at
  three speeds, because they span nine orders of magnitude and which one you
  face is a property of what holds the secret rather than of the secret: a
  login that throttles at 1,000 a second, a stolen wallet backup at 10 million
  (BIP-39 puts every guess through 2,048 rounds of work), and a stolen password
  file at a trillion
- **Blurred by default**: a generated secret arrives as smudges, with in-field
  eye, copy, and QR controls; the eye is a sticky per-session preference
- **QR export**: show the secret as a plain-text QR (blurred until revealed)
  for wallets that scan a passphrase in, such as
  [Krux](https://selfcustody.github.io/krux/), instead of making you type it
  on-device
- **No secret before you ask**: nothing is generated on page load
- **A sentence gets a warning**: the estimator prices words one at a time and
  cannot see that grammar makes the next one easy to guess, so a sentence
  scores like a passphrase while being nothing of the kind. Sentence-shaped
  text says so plainly rather than being quietly flattered
- **Light and dark themes**: light is the default for everyone, deliberately,
  rather than following the OS. The choice you make is remembered

## Use it

### Step 1: Download the file, while still online

Download `mypassphrase.html` from the
[latest release](https://github.com/seQRets/My-Passphrase/releases/latest).
Every release publishes the SHA-256 of the file alongside it. Check the one you
downloaded against it before you open it:

```bash
# macOS
shasum -a 256 ~/Downloads/mypassphrase.html

# Linux
sha256sum ~/Downloads/mypassphrase.html
```

```powershell
# Windows (PowerShell)
Get-FileHash $HOME\Downloads\mypassphrase.html -Algorithm SHA256
```

If what you get is not the value published on the release page, stop. Do not
open the file.

That tells you the file is the one published. It cannot tell you the published
one is honest; reading it is what checks that, and it is written to be read.

Cloning the repo works too: `index.html` there is the same file, named for the
web server that has to serve it at the domain root. `SHA256SUMS.txt` beside it
records its SHA-256; the release asset is the same bytes under its download
name, so one value checks either. With a clone:

```bash
shasum -a 256 -c SHA256SUMS.txt   # macOS;  sha256sum -c SHA256SUMS.txt on Linux
```

Be clear about what that proves: `SHA256SUMS.txt` travels in the same
repository as the page, so whoever could change one could change the other. It
tells you the file you hold is the file that was published, nothing more.

One check does not share that weakness. Each release is signed, through
[Sigstore](https://www.sigstore.dev/), by the GitHub Actions run that built it
— a signature the repository's contents cannot forge. With the
[GitHub CLI](https://cli.github.com/):

```bash
gh attestation verify ~/Downloads/mypassphrase.html -R seQRets/My-Passphrase
```

It names the workflow, the commit and the tag the file came from. Releases
before this was added have no attestation; for those, the checksum is what
there is.

### Step 2: Go offline for anything that matters

For a passphrase that will guard something important: **go offline first.**
Turn off Wi-Fi, open the downloaded file in a browser profile with no
extensions, generate, and store the result in a password manager (or memory)
before reconnecting. The page's badge shows whether you are offline.

There is no build step. The file you download is the source, readable in any
text editor: the wordlists, the RNG, the strength meter, and the two embedded
libraries are all in plain sight.

## Security

The page never touches the internet (no images, no fonts, no scripts) and its
CSP (`default-src 'none'`) makes the browser enforce that. Nothing typed or
generated is stored, logged, or sent. What a web page *cannot* defend against
(browser extensions, a compromised machine, clipboard snooping) is documented
in the page's own Q&A and in [SECURITY.md](SECURITY.md), which also explains
how to report a vulnerability. Machine-readable contact details are at
[`/.well-known/security.txt`](https://mypassphrase.app/.well-known/security.txt)
([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)).

The page does not permit inline script in general. Its Content-Security-Policy
names each of its four `<script>` blocks by the SHA-256 of its own text, so a
block the policy was not expecting does not run — including one you meant to
change. It also refuses to be framed: if another site embeds it, the tool is
withheld and a notice says so.

## Development

There is no build step. Edit `index.html` and reload.

### After any edit to `index.html`

```bash
node scripts/update-csp-hashes.mjs
```

Alter a single character inside a script block and the browser refuses the
whole block, which looks like the page loading normally and the tool doing
nothing whatsoever. This script recomputes the four hashes, rewrites the policy
in place, and regenerates `SHA256SUMS.txt`. Plain Node, no dependencies, like
everything else here. It also refuses to write if the markup has grown an inline
event handler (`onclick="…"`), because a hash cannot cover one and making it run
would take `'unsafe-hashes'`, which hands back what the pinning is for.

```bash
node scripts/update-csp-hashes.mjs --check
```

writes nothing and reports whether the pins and the sums are current; CI runs
this on every push and pull request. The same script, and the same rule, as the
sister project [seQRets/My-Seed-Phrase](https://github.com/seQRets/My-Seed-Phrase).

### Checking a change

```bash
node verify.js
```

`verify.js` drives the page in headless Chrome and asserts on it: 53 checks,
no dependencies, Node 22+ and Chrome (set `CHROME` if the binary is somewhere
unusual). It recomputes the CSP pins itself rather than trusting the script that
wrote them, loads the page over `file://` and over http and fails on any CSP
violation, exception or request other than the page itself; measures
`randomIndex()` for uniformity (chi-square, p < .001) at the list sizes the page
draws from and confirms it never lands past the end; generates from every pool
and checks membership and alphabet; confirms a generated secret is counted
exactly and born blurred, and that typed words zxcvbn overrates are still held
under the list ceiling; checks that 💪 adds what it says; round-trips all seven
encodings, five of them against Node's own encoder and the other two against
published vectors; opens the QR and checks it is blurred until revealed; frames
the page from another origin and checks the tool is withheld; and checks nothing
scrolls sideways at 320, 390 and 1440px. Every check was confirmed to fail
against deliberately broken code before being kept: a biased `randomIndex`, a
meter without its ceiling, a removed frame gate, a stale CSP pin and an
unblurred secret each trip at least one. CI runs it on every push.

## Credits

- Generator and crack-time code adapted from
  [mike-hearn/useapassphrase](https://github.com/mike-hearn/useapassphrase) (ISC)
- Strength estimation by [zxcvbn](https://github.com/dropbox/zxcvbn), created at
  Dropbox by Dan Wheeler (MIT). The embedded copy is the build that
  `useapassphrase` ships as
  [`js/zxcvbn.js`](https://github.com/mike-hearn/useapassphrase/blob/master/js/zxcvbn.js),
  byte for byte (SHA-256
  `0a3d6a34bc9757c5c469b98b77ad8acb500b847a7b57cfe62d8ba8a9206ce41e`), a
  pre-4.0 Closure-compiled build with the original `entropy` /
  `match_sequence` API the meter is written against. It does not correspond
  to any `zxcvbn` release on npm, so check it against that file, not against
  the npm package
- QR encoding by
  [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
  (Kazuhiko Arase, MIT), embedded verbatim
- [EFF large wordlist](https://www.eff.org/dice) (CC-BY 3.0), embedded
  verbatim and in order (7,776 words; SHA-256 of the list, one word per line,
  `6d557f0693958fb5e650b68b5bee585eb82cf4da32965505c789e924743bc522`)
- Common-English list derived from
  [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english):
  `google-10000-english-usa-no-swears.txt`, keeping the words of 4 to 9
  lowercase letters, deduplicated and sorted — 7,459 words, SHA-256
  `57970da208e266b4df7c52f7599138c10930602a936571c70cbc108aade43de3`.
  `node scripts/check-wordlists.mjs` re-derives both lists from their upstream
  files and fails if either embedded list differs; CI runs it on every push
- Design adapted from the sister project,
  [seQRets/My-Seed-Phrase](https://github.com/seQRets/My-Seed-Phrase)

## License

[MIT](LICENSE) © Toothjockey LLC
