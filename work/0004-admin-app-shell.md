---
status: todo
opened: 2026-09-09
---

# The admin side has no shell to hang a second page on

## The problem

`App.tsx` is two things at once: the application shell and the conversations
screen. `.shell` in `styles.css` is not a layout — it is the conversations
two-pane grid, and the component holds `conversations`, `selectedId`,
`thread`, the poll cursor and the send handler directly. There is no
navigation chrome, so there is nowhere to put a link to a second page even if
one existed.

More pages are coming and they are not optional: CLAUDE.md requires prompt
documents with versions, the admin allowlist, message templates, prices and
settings each to have a screen, because the owner has to change them without a
deploy. Every one of them lands in the same file today.

The related gap is the URL. `selectedId` is state, so a conversation cannot be
linked to, a refresh loses it, and the browser's back button does nothing —
`Thread` carries a hand-written back button to compensate. With one screen
that is a small annoyance; with five it is the navigation model.

## Already in place

The server does the SPA history fallback: `setNotFoundHandler` returns
`index.html` for anything that is not `/api`
([app.ts:35](../apps/admin/server/src/app.ts:35)). Client-side routes will
survive a refresh without a server change.

## The approach

Separate the shell from the pages, in this order:

1. **The shell owns access, the page owns everything else.** `checking` /
   `signed-out` / `not-allowed` replace the entire screen today and should
   keep doing so — above the router, not inside a page. The error banner is
   the opposite: it belongs to whichever page raised it
2. **Move the conversations screen into its own component**, taking its state
   with it. What is left in `App.tsx` is the shell
3. **Then** add the navigation, with a route per page and the conversation id
   in the URL

Doing 3 first means untangling the same state under time pressure.

## What the layout has to survive

- **The 860px breakpoint already carries meaning.** Below it the conversations
  screen shows one pane at a time and swaps on `data-view`. A navigation rail
  adds a second axis to that, and three columns at 861px is not enough room —
  so the desktop rail probably has to be narrow, or collapsible, and the
  conversations screen keeps its own breakpoint rather than inheriting one
- **Logical properties.** The existing CSS uses `border-inline-end`, not
  `border-right`, because the interface is Hebrew. Navigation written with
  physical directions will sit on the wrong side
- **No data access in the web layer** (CLAUDE.md). A page is a route plus
  calls through `api.ts` — the shell adds no new way to reach the server

## Open

- Router or hand-rolled? Five pages with no nested routing may not justify a
  dependency, but `history` handling written by hand is the kind of thing that
  is fine until the back button is not
- Where navigation goes on mobile. A bottom bar is the obvious answer and it
  competes with the composer, which is already sticky against the visual
  viewport for the reason in `4de5f3e`

## Tests

TESTING.md puts frontend at 0-5% deliberately, and layout is exactly what it
excludes. Nothing here needs a test — with one exception: if the shell ends up
deciding what is reachable, that is authorization in the UI and it must be a
server-side check with a test, not a hidden link.
