# MiniHotel fixtures

Real responses, recorded on 2026-09-28. Trimmed to fewer room types and days;
nothing else was edited, including the vendor's spacing (`ExtraAdultFee ="…"`)
and the space before the first line break.

| file | request |
|---|---|
| `bulk-ari-sandbox.xml` | Bulk ARI against `sandbox.minihotel.cloud` with the public test user |
| `err-202-unknown-hotel.txt` | Bulk ARI to the sandbox with a hotel code that does not exist |
| `err-210-wrong-user.txt` | Bulk ARI to production with a made-up username, from a machine not on the allowlist |

Errors arrive as **HTTP 200 with a plain-text body**, not XML and not an HTTP
error status.

Not yet recorded: the answer to an address missing from the allowlist
(codes `863` / `A01`). A made-up user gets `210` first, so recording it needs
real credentials from an address that is not allowlisted. The tests for it use
a constructed body until then.

The sandbox accepted a wrong password on 2026-09-28, so a sandbox success says
nothing about whether the password is right.
