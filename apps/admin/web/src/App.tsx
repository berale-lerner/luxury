import { useEffect, useState } from 'react';
import { api, onAuthFailure } from './api';
import { Nav } from './shell/Nav';
import { SignIn, NotAllowed } from './shell/SignIn';
import { matchRoute, navigate, usePath } from './shell/router';
import { HOME, routes } from './shell/routes';

type Access = 'checking' | 'ok' | 'signed-out' | 'not-allowed';

interface Admin {
  email: string;
  name: string | null;
}

/**
 * The application shell.
 *
 * It answers two questions and nothing else: may this person be here, and
 * which page are they on. Everything a page knows about itself lives in the
 * page — this file does not grow when one is added.
 *
 * Access is decided above the router on purpose. Not being signed in is not a
 * state a page renders inside; it replaces the screen, so no page has to
 * remember to handle it and no page can leak what it had already loaded.
 */
export function App() {
  const [access, setAccess] = useState<Access>('checking');
  const [admin, setAdmin] = useState<Admin | null>(null);
  const path = usePath();

  // Any request, on any page, that comes back 401 or 403 lands here — the
  // session ended or the address left the allowlist while the tab was open.
  useEffect(() => onAuthFailure(setAccess), []);

  // The root is where Google's callback returns to, so it has to lead
  // somewhere. replace, so back does not bounce off it.
  useEffect(() => {
    if (path === '/' || path === '') navigate(HOME, { replace: true });
  }, [path]);

  useEffect(() => {
    api
      .me()
      .then(({ admin: identity }) => {
        setAdmin(identity);
        setAccess('ok');
      })
      // The failure has already been announced by the client; anything else
      // is a server that is down, which is not a reason to claim the person
      // is signed out.
      .catch(() => {});
  }, []);

  if (access === 'checking') return <div className="empty">טוען…</div>;
  if (access === 'signed-out') return <SignIn />;
  if (access === 'not-allowed') return <NotAllowed />;

  const match = matchRoute(routes, path);

  if (!match) {
    return (
      <div className="empty">
        <div>
          <div className="big">הדף לא נמצא</div>
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate(HOME, { replace: true })}
          >
            חזרה לשיחות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-nav-on-narrow={match.route.navOnNarrow !== false}>
      <Nav current={match.route.section} admin={admin} />
      <main className="app-main">{match.route.render(match.params)}</main>
    </div>
  );
}
