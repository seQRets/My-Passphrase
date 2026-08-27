# My Passphrase

A passphrase and password generator in **one self-contained HTML file**. No
build, no dependencies, no network requests — save `index.html`, open it in a
browser, done. It works with the Wi-Fi off, and a Content-Security-Policy tells
the browser to refuse if anything on the page ever tried to phone home.

> **Truly random. Centuries to crack.** Humans are terrible at inventing
> passwords. A passphrase — a handful of words chosen truly at random — is
> easier to remember than `Tr0ub4dor&3` and far harder to guess.

## Features

- **Three generation pools**
  - The **EFF large wordlist** — 7,776 words curated by the Electronic Frontier
    Foundation for passphrases; the same list diceware uses
  - **Common English** — 7,459 everyday words from a frequency corpus, for
    phrases that read a little more naturally
  - **ASCII characters** — all 94 printable ASCII symbols, for a classic
    `ipz2!az8k%0h`-style password where a manager autofills or a length limit
    bites
- **Real randomness** — every draw comes from `crypto.getRandomValues` with
  rejection sampling, so each word and character is exactly as likely as every
  other; `Math.random` appears nowhere in the file
- **Honest strength accounting** — generated secrets show their true entropy
  (words × bits per word), not an estimate; crack time via
  [zxcvbn](https://github.com/dropbox/zxcvbn) at 10,000 guesses/second. Edit
  the box to test any password of your own
- **Blurred by default** — a generated secret arrives as smudges, with in-field
  eye, copy, and QR controls; the eye is a sticky per-session preference
- **QR export** — show the secret as a plain-text QR (blurred until revealed)
  for wallets that scan a passphrase in, such as
  [Krux](https://selfcustody.github.io/krux/), instead of making you type it
  on-device
- **No secret before you ask** — nothing is generated on page load
- **Light and dark themes**, following the OS until you pin one

## Use it

1. Download `index.html` from the
   [latest release](https://github.com/seQRets/My-Passphrase/releases/latest)
   (or clone the repo — the file is the app).
2. Optionally verify the download — each release publishes the SHA-256 of its
   attached file:

   ```
   shasum -a 256 index.html
   ```

3. For a passphrase that will guard something important: **go offline first.**
   Turn off Wi-Fi, open the saved file in a browser profile with no extensions,
   generate, and store the result in a password manager (or memory) before
   reconnecting. The page's badge shows whether you are offline.

There is no build step. The file you download is the source, readable in any
text editor — the wordlists, the RNG, the strength meter, and the two embedded
libraries are all in plain sight.

## Security

The page makes zero network calls — no images, no fonts, no scripts — and its
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
