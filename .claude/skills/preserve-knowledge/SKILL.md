---
name: preserve-knowledge
description: End-of-session knowledge capture for this repo. Reviews what was decided, discovered, fixed or learned in the current session and writes it into the right shared place — updating existing docs in place, adding runtime lessons to the doc they belong in, updating or opening work/ task files — so the next session and every other developer starts with it. Use whenever the user is wrapping up or leaving a session ("I'm done for today", "wrap up", "before I go", "save what we learned", "סיימנו", "אני יוצא", "לשמר ידע", "סכם את הסשן"), when they ask to preserve or document what was learned, or at the end of a long session with incidents, decisions or corrections nobody has written down yet. Knowledge left only in the chat is lost when the session closes.
---

# Preserve knowledge

The chat is disposable; the repository is the memory. Other developers and every future session see only what is committed. Personal memory is per user and per machine, so project knowledge must never live only there.

## 1. Collect candidates

Scan the whole session, including corrections and dead ends. Look for:

- **Places where a document is now wrong** — the most valuable find. A doc that misleads is worse than a missing one
- Decisions and their reasons, including options rejected and why
- Facts learned by running things: production behaviour, vendor quirks, limits, what an error actually meant
- Incidents: what broke, the root cause, the fix, how to prevent it next time
- Traps someone would walk into again
- Task progress, verification results and their limits, follow-ups discovered
- Working rules the owner stated
- Personal preferences about how to work with this user

Write each candidate as one sentence before routing it. If it can't be said in a sentence, it isn't understood well enough to record yet.

## 2. Drop what belongs nowhere

- **Already recorded** — grep the docs and `git log --oneline -30` first
- Derivable from the code or from a commit message
- Transient: debugging paths that led nowhere, one-off commands
- Guesses — record them only marked as unverified, with what would verify them
- **Secrets and personal data, ever.** No tokens, keys, passwords, credentialed connection strings, guest messages or guest details — not even redacted copies of real ones

## 3. Route

| Knowledge | Destination |
|---|---|
| A rule every session and developer must follow (architecture, security, operations) | `CLAUDE.md` — short, the rule and its reason. **Propose new ❌ boundaries to the owner rather than adding them**: those lines are the owner's decisions |
| What the system does; product and system decisions with their reasoning | `DESIGN.md` |
| How code is written | `STANDARDS.md` |
| Testing policy and mandatory test categories | `TESTING.md`, and `.claude/skills/writing-tests` if the change-to-tests mapping moved |
| Environments, Railway, deploy runbooks, URLs, settings that live only in Railway, operational incidents | `DEPLOY.md` |
| MiniHotel API facts and quirks | `MINIHOTEL.md` |
| Local setup, running locally, troubleshooting | `SETUP.md` |
| Progress, findings or decisions inside a task; newly discovered work | `work/NNNN-*.md` — update status and body. New work gets a new file from `work/TEMPLATE.md`; `git pull` first, because two people can pick the same number |
| Why a specific piece of code is the way it is | A comment at that code, only if this session changed it |
| How this user personally likes to work (language, tone, habits) | Personal memory — and nothing another developer would need |

When two destinations fit, write it where a newcomer looks first and link to it from the other. Don't keep two copies.

## 4. Write

- **Read the target section before editing** (`grep -n '^#' FILE` finds it). Update in place, and fix or remove text the session contradicted rather than appending a second version of the same fact
- **Match the document's language and voice.** English: `CLAUDE.md`, `DEPLOY.md`, `SETUP.md`, `README.md`, `work/`. Hebrew: `DESIGN.md`, `STANDARDS.md`, `TESTING.md`, `MINIHOTEL.md`. Don't translate a document as a side effect
- Give the reason, not just the fact. The reason is what stops the next person from undoing it
- Date anything that changes outside git ("as of 2026-09-15") and say where to check it
- Say how something was verified, and state the limit plainly when it wasn't

## 5. Commit and report

Make one commit for all documentation changes, with a message saying what was preserved and why. **Don't push**: a push to `main` deploys production (CLAUDE.md, Operations). Ask the user.

Then report in the user's language:

| What | Where | Change |
|---|---|---|

Follow the table with what was deliberately not saved and why, and anything that needs the owner's decision — a proposed ❌ rule, or a follow-up task to prioritise.

If the session produced nothing worth keeping, say so. Filler in the docs is a cost, not a contribution.
