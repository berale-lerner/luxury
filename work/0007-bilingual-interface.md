---
status: todo
opened: 2026-09-10
---

# The interface speaks Hebrew only, in markup that assumes it

## Two questions that look like one

**What language the interface is in** and **what direction a piece of text
runs** are different questions, and treating them as one is the mistake this
task exists to avoid. A manager reading an English interface still receives
Hebrew messages from guests; a Hebrew interface still shows
`daniel@example.com` and `14:00`.

The content half is already right: `unicode-bidi: plaintext` on every element
that renders a guest's words, a name, or a preview, so each string takes its
direction from its own first strong character. That work stays as it is and
must not be swept into a global `dir` switch.

What is not right is the interface half. `index.html` hardcodes
`lang="he" dir="rtl"`, and every visible string is a Hebrew literal in the
component that renders it — roughly 78 of them across ten files, with
`UsersPage.tsx` (27) and `Thread.tsx` (12) the densest.

## What is already done, and worth not breaking

The stylesheet has **no physical direction properties at all** — no
`margin-left`, no `border-right`, no `text-align: left`. It uses
`border-inline-end`, `inset-inline-start`, `padding-inline-start`,
`border-start-start-radius`, and `text-align: start` throughout. Flexbox
`flex-start` / `flex-end` follow the writing mode too, so the message bubbles
swap sides on their own.

That means flipping `dir` on the root is expected to *just work* visually.
The verification below exists because "expected to" is not the same as
verified, and because the SVG icons are the one place where a physical
direction is baked into a path — an arrow that points the way back points the
wrong way in the other direction.

## The work

**1. A catalogue, not literals.** One module per language, keyed. The keys are
the contract; a missing key must be a type error, not a blank space at
runtime. Structure so that `t('users.add')` cannot compile if `en` has a key
`he` does not.

**2. `lang` and `dir` on the root, set from the chosen language.** `index.html`
gets neutral defaults and the app sets both on `document.documentElement`.
Setting `dir` alone is not enough — `lang` is what hyphenation, font
selection and screen readers use.

**3. `format.ts` stops hardcoding `he-IL`.** The three `Intl.DateTimeFormat`
instances are module-level constants today, so the locale is fixed at import
time and cannot follow a change. They have to be built per locale and cached
by it — `Intl` object construction is not free enough to do per render.

**4. The strings that are not in components.** `<title>` in `index.html`, the
platform names in `ChannelIcon.tsx`, and the `aria-label`s — which are the
ones most likely to be missed, because nothing looks wrong when they are
wrong.

**5. `confirm()` in `UsersPage.tsx`.** Its buttons come from the browser's
language, not the application's. Either accept the mismatch deliberately or
replace it with a dialog of our own; do not pretend it is translated.

## Where the preference lives

Three options, and the decision is genuinely open:

| | |
|---|---|
| `navigator.language` only | No storage, no UI. Wrong for anyone whose browser is in a language they do not want the tool in |
| `localStorage` | One line. Does not follow the person to their phone |
| A column on `admin_allowlist` | Follows the person. Costs a migration and an endpoint |

**Recommended: the column, defaulting from `navigator.language` on first
sign-in.** The allowlist already holds one row per person and just grew a
`role` column, so per-person preference has an obvious home; and a manager who
sets the language on a laptop and finds English again on a phone will simply
report it as a bug.

## Out of scope, deliberately

**The bot.** The agent answers in whatever language the guest wrote in, and
that behaviour comes from prompt documents in the database — not from strings
in the repository. Adding a translation catalogue to `apps/bot` would create a
second source of truth for what the agent says, which is the thing
[0006](0006-prompt-editing-page.md) and CLAUDE.md both warn about. If the
agent's language handling needs work, that is a prompt document, not this
task.

**Server messages.** The API answers with codes (`last_owner`,
`insufficient_role`), and the interface maps them to words. That is already
the right shape and does not change.

## Verification

Layout is not something tests are kept for (TESTING.md, frontend at 0-5%), so
this is checked in the browser, in both directions, on both screen sizes:

- The navigation rail sits on the correct edge, and moves when the language does
- The back arrow and every other directional icon point the right way
- An English message inside a Hebrew interface still reads correctly, and the
  reverse — this is the case that regresses silently
- No horizontal scroll at either width in either direction

## Tests

Two that are worth having, and both are structural rather than visual:

- **The catalogues agree.** Every key in one exists in the other. A type-level
  guarantee is better than a test here; if the shape does not give one, the
  test does
- **No bare user-facing literals.** A scan of the web sources for text that
  reaches the screen without going through the catalogue, in the manner of the
  existing `tests/structure/` suite. Without it the second language decays one
  hurried commit at a time
