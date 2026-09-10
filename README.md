# My Passphrase

A passphrase and password generator in **one self-contained HTML file**. No
build, no dependencies, nothing ever sent over the internet: download one file, open it in a
browser, done. It works with the Wi-Fi off, and a Content-Security-Policy tells
the browser to refuse if anything on the page ever tried to phone home.

> **Truly random. Centuries to crack.** Humans are terrible at inventing
> passwords. A passphrase, a handful of words chosen truly at random, is
> easier to remember than `Tr0ub4dor&3` and far harder to guess.

## Features

- **Four generation pools**
  - The **EFF large wordlist**: 7,776 words curated by the Electronic Frontier
    Foundation for passphrases, the same list diceware uses
  - **Common English**: 7,459 everyday words from a frequency corpus, for
    phrases that read a little more naturally
  - **ASCII characters**: all 94 printable ASCII symbols, for a classic
    `ipz2!az8k%0h`-style password where a manager autofills or a length limit
    bites
  - **PIN digits**: 4 to 12 random digits for the PINs hardware wallets ask
    you to set; drawn per digit, so leading zeros are as likely as anything
    else (`0042` is a valid PIN, which range-style generators cannot produce)
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
  `est.`, held under a ceiling the word lists can prove: a word on one of the
  lists cannot be worth more than the list it came from, since anyone who knows
  the recipe simply tries all 7,776. That only ever lowers a figure and credits
  none. Edit the box to test any password of your own
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
web server that has to serve it at the domain root.

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
how to report a vulnerability.

## Credits

- Generator and crack-time code adapted from
  [mike-hearn/useapassphrase](https://github.com/mike-hearn/useapassphrase) (ISC)
- Strength estimation by [zxcvbn](https://github.com/dropbox/zxcvbn), created at
  Dropbox by Dan Wheeler (MIT), embedded verbatim
- QR encoding by
  [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
  (Kazuhiko Arase, MIT), embedded verbatim
- [EFF large wordlist](https://www.eff.org/dice) (CC-BY 3.0)
- Common-English list derived from
  [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english)
- Design adapted from the sister project,
  [seQRets/My-Seed-Phrase](https://github.com/seQRets/My-Seed-Phrase)

## License

[MIT](LICENSE) © Toothjockey LLC
