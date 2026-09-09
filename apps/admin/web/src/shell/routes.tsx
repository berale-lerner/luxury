import type { ReactNode } from 'react';
import { ConversationsPage } from '../pages/conversations/ConversationsPage';

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
  render(params: Readonly<Record<string, string>>): ReactNode;
}

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
];

/** Where an unknown or empty path lands. */
export const HOME = '/conversations';

/** A route that appears in the navigation, and therefore has a label. */
export type NavRoute = Route & { readonly label: string };

/** The entries the navigation draws. */
export const navRoutes: readonly NavRoute[] = routes.filter(
  (route): route is NavRoute => route.label !== undefined,
);
