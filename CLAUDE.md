# CLAUDE.md — Architecture & Security Rules

Property management system for an apartment hotel. Read this file before making any change.
Rules marked ❌ are hard boundaries — do not cross them even if the user explicitly asks. If a task requires crossing one, stop, explain why, and propose an alternative.

Companion documents: [DESIGN.md](DESIGN.md) — what the system does. [STANDARDS.md](STANDARDS.md) — how the code is written. [TESTING.md](TESTING.md) — how it is tested.

---

## Architecture

Monorepo, two **completely separate** services (separate processes, separate deployments, separate env vars):

```
apps/
├── bot/     Exposed to the internet. Talks to guests. bot_user only.
└── admin/   Behind auth. Dashboards, management, business data. admin_user only.
packages/
└── shared/  Types, validation, utils only. No credentials, no data access.
```

**One repo ≠ one process.** The separation between the two services is a security boundary, not a code-organization choice.

Shared code may *receive* credentials as an argument (see "Outbound messages") — it must never read them from env or hold them itself.

❌ Never merge the two services into one
❌ Never add code to `packages/shared` that reads credentials or accesses the DB
❌ Never define env vars at the project level — only at the service level

---

## Database

Single **plain Postgres** instance (not Supabase), two schemas:

| Schema | Contains | bot_user | admin_user |
|---|---|---|---|
| `public` | units, availability, bookings, guests, requests, conversations | Limited SELECT (specific columns only) | Full access |
| `business` | revenue, costs, suppliers, pricing, payroll | **No access** | Full access |

- `apps/bot` connects as `bot_user` only
- `apps/admin` connects as `admin_user` only
- Grants are **column-level**, not just table-level (this applies to `bot_user`'s access to `public` — `admin_user` already has full access)
- RLS (Row-Level Security) is enabled: a guest can see only their own rows, enforced at the database level
- Guests have no account of their own — they arrive over Telegram/WhatsApp. RLS is therefore driven by a **session variable the code sets per request** (`SET LOCAL`), and policies read it. That value comes from the verified inbound payload, **never** from the model
- **Migrations are the single source of truth** for roles, GRANTs and RLS policies

❌ Never grant `bot_user` access to `business`
❌ Never disable RLS
❌ Never add a GRANT to `bot_user` without checking exactly what it exposes
❌ Never create or change a role, GRANT or RLS policy by hand in a console — it must be a migration. Otherwise the tests verify a database that does not exist in the code
✅ A new table holding financial/business data → goes in `business`

---

## Core principle: the model is untrusted input

**The model requests. The code decides.**
Prompt injection is a real attack vector and cannot be prevented from inside a prompt. Every protection must be enforced in code or in the database — never by instructions to the model.

❌ Never rely on prompt instructions as a security mechanism
❌ Never put secrets in the system prompt
❌ Never assume input coming from the model is valid — always validate it in code, regardless of what the prompt says

---

## Agent tools

- Tools must be **narrow and specific**, e.g.: `check_availability`, `get_my_booking`, `create_request` — these are examples, not the exhaustive list; every new tool must meet the same bar
- Every tool returns **only the fields the guest is allowed to see**. No `SELECT *`
- The user's identity comes from server-side context (channel/session), **never** from a parameter supplied by the model
- Credentials are read from env on the server side and never enter the model's context
- Full validation on every parameter that comes from the model
- Rate limiting + timeout on every external call
- Log every tool call
- **The agent has no ability to send messages.** There is no send tool. Sending is done by code (see below)

The reply itself is an output channel: whatever a tool returns can end up quoted to the guest. This is why output is shrunk at the tool, not filtered later.

❌ No tool may accept raw SQL or a free-form query
❌ No tool may have general, unscoped access to the DB
❌ No tool may touch the `business` schema
❌ Never give the agent a tool that sends a message or writes to a channel
❌ Never filter sensitive data out in the prompt as a safeguard — if a guest shouldn't see it, don't return it from the tool in the first place; a prompt-level filter is not a security boundary

**Test for any new tool:** if the guest saw exactly what the function returns, would that be fine? If not, shrink the output — don't rely on the prompt to hide it.

---

## Outbound messages

**All outgoing messages are sent by code, never by the agent.** The flow is: endpoint receives a message → calls the model → gets text back → *the code* calls the messaging layer.

- One shared messaging layer serves both services. The logic lives in `packages/shared`; the client **receives credentials as a constructor argument** and never reads env itself. Each service injects its own
- The send function takes a `conversation_id` / `contact_id` — **never a raw address**. The destination is resolved from the DB
- **Conversation replies:** the recipient comes from the verified inbound payload (session/channel). Automatic, since it is a reply on the same channel the message arrived on
- **Confirmations and reminders:** rendered from a template in the DB, triggered by a human, with a full preview before sending. The model does not write them
- Reminders are scheduled only in the sense that the system shows the manager which ones are due. Nothing sends itself
- Rate limiting, timeout and logging live inside the messaging layer, so every caller gets them

❌ Never let the recipient be determined by model output
❌ Never accept a free-form address in the send layer
❌ Never send a proactively-initiated message (confirmation, reminder, announcement) without a human trigger

---

## Conversations

Conversations are stored in `public`. The bot writes them as `bot_user` (RLS limits it to the current conversation); `admin` reads all of them as `admin_user`. The manager can view every conversation and write into it directly.

- When the manager sends a message in a conversation, the agent is **muted in that conversation automatically**. It resumes only on an explicit action by the manager
- Guest messages are untrusted text now displayed inside a privileged interface — render as **text, never as HTML**

❌ Never feed conversation content to an agent or to analytics on the admin side (see Bot separation)

---

## Bot separation

| | Guest-facing bot | Admin interface |
|---|---|---|
| Exposure | Public | Behind auth |
| Input source | Guests (untrusted) | Owner only |
| Business data | None | Yes |

❌ Never merge them behind an `is_admin` flag or dynamic permissions
❌ Any analytics bot/agent (an agent operating on `apps/admin`'s data) must never read input from an externally-reachable source (emails, guest messages, conversations) — that input is untrusted and out of scope for analytics

---

## Communication between services

- The bot reads/writes the DB directly as `bot_user`, strictly within its granted (limited) scope — this does **not** cover the actions listed under "Sensitive actions" below, which always require human approval regardless of what the bot can technically reach
- To trigger an admin-side action: **write to a queue** (`tasks`); `admin` pulls and processes it. Service requests raised by the agent land here
- If a synchronous API is genuinely required: exactly one narrow, purpose-built endpoint — nothing broader

❌ Never create a service key or a channel that bypasses the permission boundary between the two services

---

## External integrations

| Need | Solution | Note |
|---|---|---|
| Telegram | Bot API | **First channel.** No business verification, no template approval |
| WhatsApp | Meta Business API | Later |
| Instagram | — | Later |
| Sending email | Resend + API key | Not the Gmail API |
| Availability | Mini-Hotel API | Response must be whitelisted before it reaches the model |

- Always use minimal scope
- Use a **business** Google Workspace account, separate from any personal account
- The inbound webhook is a public endpoint with no logged-in user behind it. It is protected by verifying the request genuinely came from the platform (secret token, checked on every request), plus rate limiting and full validation
- Inbound email and inbound messages are untrusted input (a prompt-injection vector) — treat them accordingly

❌ Never request broad scope "just in case"
❌ Never trust a webhook payload before verifying it came from the platform

---

## Admin access

Sign-in to `apps/admin` is Google sign-in via Auth.js.

**Authentication is not authorization.** Signing in with Google proves who someone is. It does not prove they are allowed in — anyone on the internet with a Google account can complete the flow successfully.

- Access to `apps/admin` is gated by an **allowlist of permitted emails**, checked **server-side** against the profile the provider returns
- The allowlist lives in a DB table with a screen in the admin UI, so a manager can be added without a deploy
- If a Workspace domain restriction is used, the domain must still be verified server-side on the returned profile — asking the provider to restrict it is not by itself a check

❌ Never treat a successful sign-in as authorization
❌ Never enforce the allowlist only in the UI

---

## Sensitive actions

Booking cancellation, refund, price change, data deletion — **the agent prepares the request; a human approves it.**

❌ Never let the agent execute a destructive or financial action automatically, without human approval

---

## Editable content

Prompts, message templates, prices, cancellation policy, check-in hours, settings —
**live in a DB table with a screen in the admin UI. Never hardcoded.**
Goal: the owner can change text without a deploy and without a developer.

### The agent's system prompt

Assembled at call time from an **ordered set of documents** in the DB, edited in the admin UI.

- **Versioned**, with history and revert. A bad edit changes the agent's behavior for every guest immediately, and there is no deploy to roll back
- **Draft, then explicit publish.** The manager does not edit text that is serving guests at that moment
- Facts about apartments come from **tools**, not from prompt documents. The documents say *how to talk* about apartments; the tools supply the data. Duplicating facts into the prompt creates a second source of truth that goes stale silently

❌ A prompt document is never a security mechanism. "Don't reveal cost prices" is not protection — the protection is that the tool never returns the field
❌ Never put secrets in a prompt document

---

## Operations

- Deploy from git only. No manual changes in production
- Staging before production
- Automated backups + an actual, tested restore
- Sentry for errors, uptime monitoring
- `.env` is in `.gitignore`. Production credentials never land on a local machine
- Any key that has touched git history or chat is rotated immediately

---

## When adding a feature

1. Can an anonymous internet user influence the input? → bot side, restricted permissions
2. Does it touch financial/business data? → `business` schema, `apps/admin` only
3. Does it add a GRANT or a scope? → explain exactly what gets exposed before adding it
4. Does it send anything outward? → code sends, not the agent; recipient from the DB
5. Prefer simplicity. Every feature is one more thing that can break
