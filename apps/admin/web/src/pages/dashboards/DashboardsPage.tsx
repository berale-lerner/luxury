import type { ReactNode } from 'react';
import { Link } from '../../shell/router';
import { AvailabilityBoard } from './AvailabilityBoard';
import { TodayBoard } from './TodayBoard';

/**
 * Every dashboard, in tab order. Adding one is an entry here: a key for the
 * URL, a label for the tab, and the component that draws it.
 */
export const BOARDS: readonly { key: string; label: string; render: () => ReactNode }[] = [
  { key: 'today', label: 'היום', render: () => <TodayBoard /> },
  { key: 'availability', label: 'זמינות', render: () => <AvailabilityBoard /> },
];

/**
 * One page, several dashboards, switched by tabs.
 *
 * The open dashboard is in the URL (/dashboards/<key>), so a tab can be
 * linked to, reloaded and reached with the back button. An unknown key shows
 * the first dashboard rather than an empty page.
 */
export function DashboardsPage({ board }: { readonly board: string | null }) {
  const current = BOARDS.find((entry) => entry.key === board) ?? BOARDS[0]!;

  return (
    <div className="page">
      <header className="head">
        <h1>דשבורד</h1>
      </header>

      <div className="page-body dashboards">
        <nav className="tabs" aria-label="דשבורדים">
          {BOARDS.map((entry) => (
            <Link
              key={entry.key}
              to={`/dashboards/${entry.key}`}
              className="tab"
              aria-current={entry.key === current.key ? 'page' : undefined}
            >
              {entry.label}
            </Link>
          ))}
        </nav>

        {/* Keyed, so switching tabs starts the next dashboard from scratch
            rather than carrying the previous one's state. */}
        <div key={current.key} className="dashboard-body">
          {current.render()}
        </div>
      </div>
    </div>
  );
}
