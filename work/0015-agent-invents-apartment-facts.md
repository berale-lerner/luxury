---
status: todo
opened: 2026-09-30
---

# The agent invents facts about apartments that no tool gave it

## The problem

Staging, conversation `e77729ef`, 2026-09-29 (prompt version 2, Gemini). A
guest asked whether DUBAI suits three people and what beds it has. The agent
answered with a king/queen bed plus a single bed, and sent an Instagram
Highlight link for the apartment.

Neither came from us:

- `check_availability` returns three fields per apartment — name, total price,
  currency (MINIHOTEL.md, the whitelist). Never beds, capacity or links. The
  log line for that reply confirms the call: `ok=true`, and the prices it
  quoted match.
- The published prompt (17k characters) never mentions DUBAI, has no bed
  descriptions, and does not contain that link. Its own rules forbid exactly
  this: "לעולם אל תמציא … מספר מיטות … קישור".

So the model filled the gap with something plausible, twice, in the one place
where the prompt is most emphatic. A prompt instruction is not a mechanism —
"a prompt document is never a security mechanism" (CLAUDE.md) applies to
correctness too. The guest cannot tell an invented bed from a real one, and
the invented link was sent as if it were the hotel's.

Scope: staging only, but production runs the same prompt version.

## The fix

Facts about apartments come from tools, not from the model and not duplicated
into prompt text (CLAUDE.md, "Editable content"). Options, cheapest first:

1. **An apartment-facts tool** — beds, capacity, features, photo links — over
   a table the owner edits in the admin interface. Same shape as
   `check_availability`: validate, look up, return a fixed field set.
2. **MiniHotel's Content API** (`getRoomTypes`, `getRooms`, the
   `/content/agents/ws/...` endpoints Base44 used). Worth reading first: if it
   already holds descriptions and occupancy, it avoids a second source of
   truth. It is a different endpoint, so the IP allowlist has to be confirmed
   for it.
3. **Until either exists**, the prompt should tell the agent to say it will
   check with the team rather than describe an apartment — a weaker fix,
   because it is the instruction that just failed.

Whatever is built, the test is the one in CLAUDE.md: if the guest saw exactly
what the function returns, would that be fine?

## Decided for now (2026-09-30): a table in the prompt

The owner chose to keep apartment facts in the prompt, as a table document
(the agents page, [0016](0016-agents-page-and-document-editor.md)), rather
than build the tool first. This departs from CLAUDE.md's "facts come from
tools", knowingly, and the costs stay true:

- Every row is sent with every guest message, on top of ~17k characters
- The model can still misread a row of a long table; a tool that returns one
  apartment's facts cannot put another apartment's beds in the answer
- Prices and availability must never be copied into that table: those come
  from `check_availability`, and a copy goes stale silently

Revisit when the table grows past what fits comfortably in every message, or
the agent is seen reading the wrong row. The tool (option 1) is the way out,
and the table's columns become its field set.

## Open

- Does the hotel have the apartment facts written down anywhere already
  (a sheet, the Base44 app, MiniHotel's content), or does the owner enter them?
- Are the Instagram Highlight links real and worth storing per apartment?
