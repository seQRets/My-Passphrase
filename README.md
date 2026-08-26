# Passphrase

A modern, self-contained passphrase generator in a single HTML file. No build,
no dependencies, no network requests — save `index.html`, open it in a browser,
done. Works offline, and tells the browser (via CSP) to refuse if anything on
the page ever tried to phone home.

**Features**

- Random passphrases of 3–12 words, drawn with `crypto.getRandomValues`
  (rejection-sampled, so every word is exactly as likely as every other)
- Two wordlists: the EFF large wordlist (7,776 words, the diceware list) or a
  common-English list (7,459 words)
- Approximate crack time via zxcvbn, assuming 10,000 guesses/second — edit the
  box to test any password of your own
- Light and dark themes, following the OS until you pin one

## Credits

- Generator and crack-time code adapted from
  [mike-hearn/useapassphrase](https://github.com/mike-hearn/useapassphrase) (MIT)
- Strength estimation by [zxcvbn](https://github.com/dropbox/zxcvbn), created at
  Dropbox by Dan Wheeler (MIT), embedded verbatim
- [EFF large wordlist](https://www.eff.org/dice) (CC-BY 3.0)
- Common-English list derived from
  [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english)
- Design adapted from
  [seQRets/BIP-39_Checksum](https://github.com/seQRets/BIP-39_Checksum)

## License

MIT
