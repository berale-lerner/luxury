---
status: done
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

## Resolved

**Hand-rolled, in `shell/router.tsx`.** What made this safe is that the risk
was never the matching — it was the history API, so that part is not
improvised: `popstate` drives a `useSyncExternalStore` subscription, and
`navigate` announces its own pushes because `pushState` deliberately fires
nothing. Links are real anchors with real hrefs, so a middle click still
opens a tab. The note stands: nested layouts or a route that suspends means
replacing it, not growing it.

**The bottom bar hides inside a thread.** A view that fills the phone and
carries its own way back does not also need the bar, and that is exactly the
collision with the composer — so it never happens. The rule is one field on
the route (`navOnNarrow: false`), not a special case in the shell.

**The breakpoint became a container query.** The conversations panes now
measure the space the page was given rather than the window, which is what
the open question was really about: the navigation takes a strip the panes
never see, and any window-based number is wrong by exactly its width. The
same applies in JavaScript — the auto-open effect measures the pane element,
because `window.innerWidth` was wrong for the same reason and by the same
amount.

## Beyond what was asked

Signing out existed only on the "not allowed" screen, which is the one screen
a signed-in manager never reaches. It is now in the navigation.

## Tests

TESTING.md puts frontend at 0-5% deliberately, and layout is exactly what it
excludes. The shell decides nothing about what is reachable — that stayed with
the server guard — so no test was owed for it.

The one test that changed is the auth-endpoint check, which now covers the
navigation too: sign-out moved there, and it is the same endpoint that shipped
broken as an `<a href>` once already.

Verified in the browser instead, since that is where layout is true: back and
forward move between conversations with the header following, a deep link
survives a full page load, the bar hides inside a thread on a phone and
returns on the list, and the rail sits on the inline-start edge in Hebrew.
