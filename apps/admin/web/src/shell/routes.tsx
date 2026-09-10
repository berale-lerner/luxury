import type { ReactNode } from 'react';
import { ConversationsPage } from '../pages/conversations/ConversationsPage';
import { PromptPage } from '../pages/prompt/PromptPage';
import { UsersPage } from '../pages/users/UsersPage';
import type { AdminRole, Me } from '../types';

const RANK: Record<AdminRole, number> = { viewer: 0, manager: 1, owner: 2 };

/**
 * Every page in the admin interface, in the order they appear in the
 * navigation.
 *
 * A route is a page plus what the shell needs to know about it. Adding a page
 * is an entry here — not an edit to the shell, which is the whole point of
 * there being a shell.
 */
export interface Route {
  /** Segments are literal or `:name`. */
  readonly path: string;
  /**
   * Which navigation entry is current while this route is open, so a detail
   * view keeps its section highlighted.
   */
  readonly section: string;
  readonly title: string;
  /** Entries without a label are reachable but not listed — detail views. */
  readonly label?: string;
  readonly icon?: ReactNode;
  /**
   * Whether the navigation bar shows on a narrow screen. False for a screen
   * that fills the phone and has its own way back, the way a pushed view
   * hides the tab bar: the bar would otherwise sit under the composer.
   */
  readonly navOnNarrow?: boolean;
  /**
   * The role below which this page is not offered. A courtesy, not the
   * boundary: the server refuses the requests behind it either way, and a
   * page that relied on this to keep data away from a viewer would be
   * enforcing authorization in the UI (CLAUDE.md, "Admin access").
   */
  readonly minRole?: AdminRole;
  render(params: Readonly<Record<string, string>>, me: Me): ReactNode;
}

const PromptIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M13 2.5H7a2.5 2.5 0 0 0-2.5 2.5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V9M13 2.5 19.5 9M13 2.5V9h6.5M8.5 13.5h7M8.5 17h4.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UsersIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M16 20v-1.6a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20M9.25 10.9a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4ZM21.5 20v-1.6a4 4 0 0 0-3-3.87M16.5 3.63a4 4 0 0 1 0 7.15"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ConversationsIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const routes: readonly Route[] = [
  {
    path: '/conversations',
    section: 'conversations',
    title: 'שיחות',
    label: 'שיחות',
    icon: ConversationsIcon,
    render: () => <ConversationsPage selectedId={null} />,
  },
  {
    path: '/conversations/:id',
    section: 'conversations',
    title: 'שיחות',
    // A thread fills a phone screen and carries its own back button.
    navOnNarrow: false,
    render: (params) => <ConversationsPage selectedId={params.id ?? null} />,
  },
  {
    path: '/prompt',
    section: 'prompt',
    title: 'פרומפט',
    label: 'פרומפט',
    icon: PromptIcon,
    // Reading is a manager's; every change behind this page is an owner's,
    // enforced on the endpoints rather than by which link is drawn.
    minRole: 'manager',
    render: () => <PromptPage />,
  },
  {
    path: '/users',
    section: 'users',
    title: 'משתמשים',
    label: 'משתמשים',
    icon: UsersIcon,
    minRole: 'owner',
    render: (_params, me) => <UsersPage me={me} />,
  },
];

export function permits(route: Route, role: AdminRole): boolean {
  return route.minRole === undefined || RANK[role] >= RANK[route.minRole];
}

/** Where an unknown or empty path lands. */
export const HOME = '/conversations';

/** A route that appears in the navigation, and therefore has a label. */
export type NavRoute = Route & { readonly label: string };

/** The entries the navigation draws for someone with this role. */
export function navRoutesFor(role: AdminRole): readonly NavRoute[] {
  return routes.filter((route): route is NavRoute => route.label !== undefined && permits(route, role));
}
