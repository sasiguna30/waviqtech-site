# Unified enquiry form

All Submit Request links lead to `contact.html#request`. India WhatsApp and
Canada SMS remain separate real-bot contact options. USA uses the form.
The business email remains in the footer; form submission never opens mailto.

**Production submission is disabled pending owner configuration and testing.**
`assets/enquiry-config.json` intentionally contains `enabled: false` and a blank
`apiBaseUrl`. Do not guess the backend URL or enable this before setup is complete.
The form displays an unavailable notice, keeps its fields/button disabled, and
cannot report success while unconfigured. JavaScript/spam-provider failures also
fail closed. No submission data is saved to localStorage, logged, or sent to Sheets.

The companion backend is `~/Documents/waviq-admin-api`.
Follow its `ENQUIRIES.md` for all exact Railway variables, verified Resend sender,
Redis and Turnstile setup, rollout order, and offline tests. The required variables
are `ENQUIRY_ENABLED`, `ENQUIRY_RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`,
`ENQUIRY_REDIS_URL`, `ENQUIRY_HASH_SECRET`, `ENQUIRY_ALLOWED_ORIGINS`,
`ENQUIRY_TURNSTILE_SITE_KEY`, and `ENQUIRY_TURNSTILE_SECRET_KEY`.

After the owner confirms the real public HTTPS backend origin and completes an
explicitly authorized end-to-end email test, set the public `apiBaseUrl` to that
origin and `enabled` to true in `assets/enquiry-config.json`, validate, commit and
publish. Only this URL/enable flag belongs in website configuration; never keys.
The backend supplies the public Turnstile site key through its readiness endpoint.
No `.env` file is required. Production secrets are entered by the owner in Railway.

Success means the email provider accepted the notification, not that inbox
receipt or a reply is guaranteed. A rejected, timed-out or malformed response
shows an error and retains entered values. The browser disables duplicate clicks
while sending; retries of unchanged fields reuse the same request identifier.

Manual production verification requires explicit approval to send an email.
Implementation tests use only mocked email and spam-verification providers.

## Website checks

Run `python3 scripts/check_site.py`, HTML validation, and `git diff --check`.
With local headless Chrome exposing a debugging port, run
`CHROME_DEBUG_URL=http://127.0.0.1:9223 node scripts/check_enquiry_browser.mjs`.
The script serves this checkout on an ephemeral loopback port, opens its own
browser tab, and intercepts all email/spam/config calls with test doubles.
It checks disabled configuration, validation, accepted-only success, retained
input on provider/spam/rate/network failures, duplicate clicks, idempotent
retries and phone/tablet/desktop layouts. It does not send real messages.
