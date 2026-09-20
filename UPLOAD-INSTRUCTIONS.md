# Waviq static website

Serve this folder with any static web host. Keep the directory structure intact: the root pages, `logo.png`, `assets/`, `services/`, `blog/` and `ca/` are all required. Links are relative and also work under a subdirectory.

For a local preview, run `python3 -m http.server 8000` from this folder and open `http://localhost:8000`.

The existing logo was recovered without image modification from `https://waviqtech.com/logo.png` because it was missing from the supplied folder. The existing phone number and email address are preserved. Contact actions open the visitor’s email, phone or SMS application; there is no submission backend.

## Checks

Run `python3 scripts/check_site.py` to check local links, assets, fragments, page metadata and required legal links. For HTML validation, install `html-validate` in a temporary tools directory, then run its executable with the included `.htmlvalidate.json` configuration against `*.html`, `services/*.html`, `blog/*.html` and `ca/*.html`.

## Adding an article

Copy `blog/article-template.html` to a descriptive new filename under `blog/`. Replace the title, meta description, H1, summary and article sections with original, reviewed content. Remove the draft label and the `noindex, nofollow` meta tag only when the article is ready. Add a linked article card to `blog/index.html` and run both checks again. The template is deliberately excluded from the public navigation and marked noindex.

The three existing Canada legal pages retain their original main content and URLs. Their shared navigation and footer now match the rest of the site. `ca/legal.css` is retained for reference; all pages use `assets/site.css`.

This work does not deploy the site. No environment file is needed for the static website.
