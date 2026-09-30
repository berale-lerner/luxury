---
status: done
opened: 2026-09-30
---

# The prompt screen shows every document at once, as plain text only

## The problem

[PromptPage.tsx](../apps/admin/web/src/pages/prompt/PromptPage.tsx) lists
every document of the one agent it knows (`const AGENT = 'guest'`) on a single
page, each as a `<textarea>`. With a handful of long documents the manager
scrolls through all of them to reach the one they want, and the only format
is raw text: no headings or lists without typing Markdown by hand, and no way
to keep tabular content (a policy per season, a FAQ, a list per apartment) as
a table.

The owner's original need was "a Google Sheet, because a table is easy for a
person to maintain". Discussed 2026-09-30 and decided against Sheets: an
embedded or synced sheet bypasses draft/publish, puts Google credentials in
the system, and lets anyone with edit access to the sheet change what every
guest is told. An editable table inside the admin gives the same ease with
none of that.

## The fix

**1. The page becomes "סוכנים" (agents).** `/agents` lists the rows of
`public.agents` (already served — `listAgents` in
[queries.ts](../apps/admin/server/src/prompts/queries.ts)); `/agents/:key`
opens one. Every prompt endpoint already takes an agent key, so the server
side of this part is routing, not new queries. `/prompt` redirects to
`/agents/guest` so existing links keep working.

**2. One document at a time.** Inside an agent: a list of the documents'
titles (order, on/off state, a mark on the ones changed since the last
publish) and "new document". Selecting one opens only that one in the editor.
The document is in the URL (`/agents/:key/:documentId`) so a reload or a
shared link lands on it. On a phone, the list and the document are two
screens, the way conversations already work. Publish, preview and history
belong to the agent, not to a document, and stay visible from every document.

**3. Two kinds of document**, chosen when creating one:

- **Text** — a structured editor (headings, lists, bold) instead of a
  textarea, stored as Markdown, which is what the model reads anyway.
  TipTap (MIT) is the likely choice; RTL and Hebrew must be checked before
  committing to it, since that is where these editors usually break
- **Table** — columns defined by the manager (add, rename, reorder, delete);
  nothing about the columns is in code. Cells edited in place. Pasting cells
  copied from Sheets or Excel (tab-separated on the clipboard) fills rows and
  columns, which is how existing content gets in. Stored as JSON (`columns`,
  `rows`); **rendered to a Markdown table at assembly**

**What does not change:** the bot still reads one row of `prompt_versions`.
Assembly (`assemblePrompt` in `packages/shared/src/prompt.ts`) learns to
render a table document, and preview and publish keep calling the same
function, so they stay byte-identical. No new GRANT for `bot_user`, no new
tool. Draft, publish, history and revert cover tables too, because the
version snapshot holds the whole set.

## Decided while building (2026-09-30)

- **Text is Markdown with a toolbar, not WYSIWYG.** A WYSIWYG editor keeps its
  own model and writes Markdown back out, so opening and saving a document
  could change characters nobody touched — in text that goes to every guest.
  The rendered view is `react-markdown`, which never injects HTML
- **A table is rendered under its title** (`## <title>`), unlike a text
  document whose title is not sent. A table has nowhere else to say what it
  is. Empty rows are dropped; a table with none left sends nothing
- **The kind is fixed at creation.** A write of the other kind's content is
  refused (`wrong_kind`), not ignored
- **"Changed since published"** compares each document with its counterpart in
  the serving snapshot by id. A version seeded by `scripts/deploy.mjs` has no
  ids, so its documents are matched by position
- **A pasted line break inside a cell becomes a space**: a cell is a one-line
  input, which would otherwise glue the two lines together

## Still open

- **Apartment facts in a table.** A table document makes it easy to put beds,
  capacity and links into the prompt. CLAUDE.md says facts about apartments
  come from tools, and [0015](0015-agent-invents-apartment-facts.md) has not
  decided between a table in the prompt and a tool. Each row is sent with
  every guest message on top of today's ~17k characters. **Decided
  2026-09-30: a table in the prompt, for now** — recorded in 0015
- **Creating an agent from the screen.** Out of scope: an agent is only
  useful when code resolves its key (today only `guest`). Selecting among
  existing agents is in scope; adding one is a code change plus a migration

## Tests

- Preview and publish produce identical text for a set that mixes text and
  table documents
- A table renders to the same Markdown every time for the same JSON (column
  order, empty cells, a `|` or newline inside a cell escaped)
- Revert restores a table document's JSON, not only its rendered text
- Pasting tab-separated text produces the expected rows and columns
- `bot_user` still cannot select from `prompt_documents`
