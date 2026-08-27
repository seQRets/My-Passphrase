# Passphrase

A modern, self-contained passphrase generator in a single HTML file. No build,
no dependencies, no network requests — save `index.html`, open it in a browser,
done. Works offline, and tells the browser (via CSP) to refuse if anything on
the page ever tried to phone home.

**Features**

- Random passphrases of 3–12 words, drawn with `crypto.getRandomValues`
  (rejection-sampled, so every word is exactly as likely as every other)
- Three generation pools: the EFF large wordlist (7,776 words, the diceware
  list), a common-English list (7,459 words), or the 94 printable ASCII
  characters for a classic random password
- Approximate crack time via zxcvbn, assuming 10,000 guesses/second — edit the
  box to test any password of your own
- Show the secret as a plain-text QR code — blurred until revealed — for
  wallets that scan a passphrase in (e.g. Krux) instead of typing it on-device
- Generated secrets arrive blurred, with in-field eye/copy/QR controls
- Light and dark themes, following the OS until you pin one

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
- Design adapted from
  [seQRets/BIP-39_Checksum](https://github.com/seQRets/BIP-39_Checksum)

## License

[MIT](LICENSE) © Toothjockey LLC
