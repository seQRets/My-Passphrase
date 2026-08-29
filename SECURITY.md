# Security Policy

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Report it privately:

1. **[Open a private security advisory](https://github.com/seQRets/My-Passphrase/security/advisories/new)** — preferred
2. Or email **security@seqrets.app**

Include what you did, what happened, what you expected instead, and your
browser and version. For a randomness or strength-meter fault, the exact
settings (pool, count) and an example of the output are the most useful thing
you can send.

You should get an acknowledgement within a week.

## Before you report

Check that the copy you loaded matches what was published: every
[release](https://github.com/seQRets/My-Passphrase/releases) states the SHA-256 of
its attached `index.html`, and

```
shasum -a 256 index.html
```

must reproduce it. If it doesn't, include that — a mismatch is significant on
its own, and tells us whether the fault is in the project or in an altered
copy.

## Scope

This project is one self-contained HTML file. There is no backend, no database,
no accounts, no cookies and no internet calls, so the surface is narrow and the
things that matter are specific.

**In scope**

- Anything weakening the randomness behind generation — bias between words or
  characters, use of a non-cryptographic source, or the rejection sampling
  being avoidable
- Anything that causes the page to make an internet request
- Anything that causes a generated or typed secret to be stored, logged, or
  leave the page
- The QR code encoding a different string than the one in the box
- A generated secret being readable while the blur shield reports it hidden
  (beyond the documented limits below)
- Wrong results from the strength meter that overstate a secret's strength —
  claiming true entropy for text that was not generated, or inflating the
  entropy arithmetic
- Alteration of the embedded wordlists
- Injection through the input field

**Out of scope**

- Browser extensions being able to read the page. This is documented, is true
  of every web page, and cannot be fixed from inside one — it's why the
  guidance is to run the file offline in a browser profile with no extensions
  installed.
- A compromised machine, keylogger, or screen recorder
- The clipboard being readable by other programs after Copy is pressed — the
  page warns about this every time
- The blur shield against determined optics: it is a shoulder-surfing
  mitigation (smudges instead of words), not encryption; someone who controls
  the rendering can always recover the text
- zxcvbn's crack-time figure being an estimate — it is labelled as such, and
  the honest entropy count for generated secrets is the authoritative number
- Scanner output about headers that don't apply to a static page under
  `default-src 'none'`
- Missing features that would require a backend
- Denial of service against GitHub

## Supported versions

The [latest release](https://github.com/seQRets/My-Passphrase/releases/latest)
and the current `main` branch. Older releases stay available for download but
are not patched — a fix ships as a new release with a new checksum.
