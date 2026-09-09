import { Link } from './router';
import { navRoutes } from './routes';

interface Props {
  /** The section of the route currently open. */
  readonly current: string;
  readonly admin: { email: string; name: string | null } | null;
}

/**
 * The application navigation: a rail beside the page on a wide screen, a bar
 * along the bottom on a phone.
 *
 * One element, two shapes, decided in CSS — a JS breakpoint would be wrong
 * before the first paint and would have to be kept in step with a media query
 * anyway.
 *
 * Entries are links with real hrefs, so the destination is visible on hover
 * and a middle click opens it in a tab.
 */
export function Nav({ current, admin }: Props) {
  return (
    <nav className="nav" aria-label="ניווט ראשי">
      <div className="nav-items">
        {navRoutes.map((route) => (
          <Link
            key={route.path}
            to={route.path}
            className="nav-item"
            aria-current={route.section === current ? 'page' : undefined}
            aria-label={route.label}
            title={route.label}
          >
            {route.icon}
            <span className="nav-label">{route.label}</span>
          </Link>
        ))}
      </div>

      {admin && (
        <div className="nav-account">
          {/* Signing out existed only on the "not allowed" screen, which is
              the one place a signed-in manager never sees. */}
          <button
            type="button"
            className="nav-item"
            title={admin.email}
            aria-label={`התנתקות (${admin.email})`}
            onClick={() => {
              // A POST, like sign-in: the endpoint does not answer GET.
              void fetch('/api/auth/sign-out', { method: 'POST' }).then(() => {
                window.location.href = '/';
              });
            }}
          >
            <span className="nav-avatar" aria-hidden="true">
              {(admin.name ?? admin.email).trim().charAt(0).toUpperCase()}
            </span>
            <span className="nav-label">יציאה</span>
          </button>
        </div>
      )}
    </nav>
  );
}
