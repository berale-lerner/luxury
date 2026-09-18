---
status: todo
opened: 2026-09-08
---

# `check_availability` — the first agent tool

## What it is

The slice that turns the bot from a conversationalist into something useful:
a guest asks whether there is room for four people over a weekend, and the
answer comes from MiniHotel rather than from the prompt.

## The shape

Input from the model: dates and party size, nothing else. Never a unit id,
never a price, never a free-form query (CLAUDE.md, "Agent tools"). Both
validated in code before the call, regardless of what the prompt says.

Output: a whitelist, built by naming the fields that may cross rather than by
removing the ones that may not. The test is the one in CLAUDE.md — if the
guest saw exactly what the function returns, would that be fine?

`Allocation` and `maxavail` are excluded, and the reason is subtle enough to
write down: together they give exact current occupancy. That is a business
fact about how full the hotel is, and it does not belong in a guest's chat
window even indirectly, because whatever the tool returns can end up quoted
back by the model.

## A prerequisite, now met

The model resolves "this weekend" into the dates this tool receives, and until
[0009](0009-agent-unavailable-notice.md) it had no way to: a model has no
clock, and neither provider injects one through the API. It would have inferred
a date from its training data — plausible, confidently stated, and very likely
in the wrong year.

The agent is now told the current local time on every call, so the translation
has something to stand on. Worth remembering when the validation is written:
checking that a date parses is not checking that it is the date the guest
meant, and a wrong year passes both.

## Credentials

MiniHotel's credentials are monolithic: the same key that reads availability
also calls `processCreditCard()` (MINIHOTEL.md). They are read from env on the
server side and never enter the model's context. The narrowness of the tool is
the only boundary here, since the vendor does not offer a read-only key.

## Also required

Rate limit and timeout on the call — inside the tool, so every caller gets
them — and a log line per invocation with the parameters but not the response
body.

## Open

What the bot answers when MiniHotel is down. Silence is wrong and a raw error
is worse; the fallback text is a product decision, and it probably belongs in
a prompt document rather than in code.

---

# The plan

Written 2026-09-18, before any code. What follows is the shape agreed on, and
the reasoning behind the parts that could plausibly have gone another way.

## The blocker nobody had noticed

This task reads as "call an API and whitelist the response". It is not. The
model port cannot make a tool call at all: `ModelClient.complete()` returns
text or a refusal, and `ConversationTurn` is `{ role, text }`. There is no way
to express "the model asked for something", no way to hand an answer back, and
no loop that would carry the second call.

So the first slice of this task is a change to `agent/model.ts` and
`agent/generate.ts`, and it has nothing to do with MiniHotel. Worth knowing
before estimating.

And it lands in **both** adapters. `MODEL_PROVIDER` defaults to `gemini` in
`.env.example`, and the two vendors represent a tool call about as differently
as they represent everything else (providers/gemini.ts already says so). An
implementation in one adapter leaves the configured provider unable to answer.

## Credentials: none yet

Decided 2026-09-18: there is no MiniHotel account to develop against. Phases 1
to 3 are built against HTTP-level fixtures, and the first real call happens
later, once a key and the IP allowlist exist. Phase 4 is therefore blocked on
something outside this repo, and the task is not "done" when the tests pass.

This also defers the open question about staging holding a key that can charge
credit cards: staging runs against a mock, so for now it holds nothing.

## Phase 0 — verify the vendor docs

MINIHOTEL.md says of itself that it is a summary and not a source of truth.
Before fixtures are written, `Immediate ARI` needs confirming against
minihotel.readme.io: whether the wire format is XML or JSON, the exact field
names, and the shape of an error response.

This is not ceremony. TESTING.md requires fixtures taken from real responses;
without the docs check, the fixtures are an invention, and a test suite that
agrees with an invention is worse than no suite — it reports confidence it
has not earned.

The static egress addresses belong here too. They exist only in the Railway
console today, they are not secrets, and an incomplete allowlist is exactly
what error codes `863` / `A01` report. They go in DEPLOY.md, and the allowlist
requirement goes in MINIHOTEL.md.

## Phase 1 — tool calls in the port, the loop in generate.ts

`ConversationTurn` becomes a union: a guest message, an assistant's text, an
assistant turn carrying tool calls, and a turn carrying their results. Each
adapter translates that into its own representation — which is the whole point
of the port, and is enforced: `tests/structure` forbids `model.ts` from
containing the word "anthropic" or "gemini" at all. The vocabulary here has to
be neutral because the test reads it.

`generate.ts` grows the loop: call, and if tool calls come back, run them,
hand the results over, call again. Three limits, each for a different failure:

- **A round ceiling (2).** This is the hard stop against a model that calls
  availability in a loop — cheaper and more reliable than a rate limit,
  because it cannot be exhausted by an attacker paying with our quota.
- **A deadline for the whole reply**, not only a timeout per call. Today's
  `15s × 2 attempts` is already thirty seconds; a tool round doubles it, and
  a guest watching a typing indicator is the one paying.
- **A tool the registry does not know is refused in code**, not thrown. The
  model requests; the code decides. A name it invented must produce an
  ordinary "no such tool" result, not a stack trace.

**The intermediate turns are not persisted.** The tool call and its result
live inside one request and are gone when it ends; only the final text reaches
`conversations`. The model therefore will not remember on the next message
that it looked something up — but its own answer, which carries the substance,
is in the history. The alternative is storing a machine-readable transcript in
a table the manager reads as a conversation, and inventing a rendering for it
on the admin side. The log line covers what actually needs answering later:
what was asked, and when.

## Phase 2 — the MiniHotel client

Transport only, in `apps/bot/src/minihotel/`.

**On placement.** Superseded (2026-09-18): the owner decided that `apps/admin`
will access MiniHotel too, so both services get static egress IPs on the vendor
allowlist and both need a client. That favours a shared `packages/minihotel` in
the `packages/messaging` shape: credentials passed in, never read from env. The
final placement is decided in the new plan document.

Credentials are read from env on the server side. They never appear in the
value the tool returns and never in a log line — the same rule the Telegram
sender already follows for a body that can echo the request.

A timeout on the call, via `AbortController`. Their error codes are mapped to
our own reason codes here, so that no vendor string can travel any further.

New service-level variables: `MINIHOTEL_BASE_URL`, `_USERNAME`, `_PASSWORD`,
`_HOTEL_ID`, `_RATE_CODE`, and optionally `_AGENT_ID` and `_AREA`.

`rateCode` and `Agent id` are configuration, never parameters. A guest who
could name a rate code could ask for agent pricing. They are not in the tool's
schema, and a test asserts that they are not.

**When the variables are absent** the tool is not registered, so a laptop with
no vendor account still runs the bot. But absent *in a deployed environment*
is a boot failure, on the same condition that already decides whether to
register a webhook (`RAILWAY_PUBLIC_DOMAIN`). The failure mode being avoided
is a production deploy that looks healthy and has quietly lost the feature —
the same reasoning config.ts already applies to the webhook secret.

## Phase 3 — the tool

`apps/bot/src/tools/check-availability.ts`.

**Input:** the date range and the party composition. Nothing else. Validated
in zod: a strict `YYYY-MM-DD`, a real calendar date, check-out after check-in,
not in the past in `Asia/Jerusalem`, a twelve-month horizon, a ceiling on
nights, and ceilings on adults, children and babies as well as on their sum.

On the wrong-year problem this file already flags: the horizon does not catch
it. "This weekend" resolved into 2027 passes every check above. The defence
that does work is cheap — **the tool echoes the range it received back, with
the weekday spelled out** ("Fri 19 Jun 2027"). That reaches the guest, and the
guest corrects it. The only clock the model has is `describeMoment`, which has
been supplying the current local time since [0009](0009-agent-unavailable-notice.md).

zod is on 3.x here, so there is no `z.toJSONSchema()`. The schema the model
sees is written by hand, and a test asserts its field set matches the zod
schema's. Two hand-maintained descriptions of the same input drift silently
otherwise, and the drift shows up as a validation error the guest experiences
as the bot refusing to understand a date.

**Output:** built by naming each field, with no spread. Room type id, name,
the prices (`board`, `boardDesc`, `value`, `value_nrf`), currency,
cancellation policy, and the echoed dates and party. `Allocation` and
`maxavail` are not touched by the mapping code at all — not filtered out of
it, never in it.

**Rate limit** per conversation, plus a process-wide ceiling. In memory, with
the limitation stated plainly: it does not survive a restart and does not span
two instances. The round ceiling in phase 1 is the limit that actually holds.

**A log line per invocation** with the parameters and not the response body.

**What the bot says when MiniHotel is down** — the open question this file
opened with. The tool returns a reason code (`unavailable`, `rate_limited`,
`invalid_dates`); how each is phrased to a guest lives in a prompt document,
`prompts/guest/040-availability.md`, where the owner can change the wording
without a deploy. A vendor error code is never quoted to a guest.

## Phase 4 — tests

Per TESTING.md's mandatory categories:

- Every model-supplied parameter, valid and invalid: reversed ranges, decades,
  malformed formats, negative and enormous party sizes, and the ceilings
  actually holding.
- **The exact returned field set**, asserted against a fixture that contains
  `Allocation`, `maxavail`, and an unknown field of the kind the vendor will
  add one day without telling us. This is what makes CLAUDE.md's question —
  "if the guest saw exactly what this returns, would that be fine?" — a thing
  the CI can answer.
- Mocking at the HTTP level, never at the function level, so parsing and
  response validation are under test too.
- The loop: a tool round completing, the round ceiling holding, and an unknown
  tool name producing a refusal rather than an exception.
- `tests/structure/layer-boundaries.test.ts` extended — `tools/` imports
  neither `@luxury/messaging` nor `channels/`. The agent gained a tool in this
  task, which is precisely when "the agent cannot send" stops being obvious
  from the directory listing.

**No migration.** The tool touches no table, adds no GRANT and no RLS policy,
and needs no guest identity — the input is dates and a party size, and nothing
about the answer is per-guest. That removes the most expensive category in
this repo from the task.

## What is still open

- Which room type name crosses: `Name_h`, `Name_e`, or both. Returning both
  is still a whitelist and lets the model match the conversation's language;
  it costs tokens on every call. Related to [0007](0007-bilingual-interface.md).
- Phase 4's E2E against staging waits on a vendor account.
