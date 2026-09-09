import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api';
import { shortDate } from '../../format';
import type { AdminRole, AdminUser, Me } from '../../types';

const ROLE_LABEL: Record<AdminRole, string> = {
  viewer: 'צפייה',
  manager: 'ניהול שיחות',
  owner: 'בעלים',
};

const ROLE_HELP: Record<AdminRole, string> = {
  viewer: 'רואה שיחות. לא שולח הודעות',
  manager: 'רואה, שולח הודעות ומשתיק את הסוכן',
  owner: 'הכול, כולל ניהול המשתמשים הזה',
};

/** What the server refused, in words the reader can act on. */
const REFUSAL: Record<string, string> = {
  already_exists: 'הכתובת כבר ברשימה',
  last_owner: 'חייב להישאר בעלים אחד לפחות',
  self: 'אי אפשר לשנות או למחוק את ההרשאה של עצמך',
  not_found: 'המשתמש כבר לא קיים',
  bad_request: 'כתובת לא תקינה',
  insufficient_role: 'אין לך הרשאה לפעולה הזו',
};

function explain(cause: unknown): string {
  if (cause instanceof ApiError && cause.code && REFUSAL[cause.code]) return REFUSAL[cause.code]!;
  return cause instanceof Error ? cause.message : 'משהו השתבש';
}

interface Props {
  readonly me: Me;
}

/**
 * Who may enter the admin interface, and what they may do once inside.
 *
 * Everything this screen offers is enforced again on the server. The controls
 * that are missing or disabled here — your own row, the last owner — are a
 * courtesy so the reader is not invited to do something that will fail; they
 * are not the rule. The rule is in users/queries.ts, under a lock.
 */
export function UsersPage({ me }: Props) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { users: rows } = await api.users();
      setUsers(rows);
    } catch (cause) {
      setError(explain(cause));
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const owners = (users ?? []).filter((user) => user.role === 'owner').length;

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await load();
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="head">
        <h1>משתמשים</h1>
        {users && <span className="sub">{users.length}</span>}
      </header>

      <div className="page-body">
        <form
          className="card add-user"
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.trim()) return;
            void act(async () => {
              await api.addUser(email.trim(), role);
              setEmail('');
              setRole('viewer');
            });
          }}
        >
          <div className="add-user-fields">
            <input
              className="field"
              type="email"
              required
              dir="ltr"
              placeholder="name@example.com"
              aria-label="כתובת אימייל"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <select
              className="field role-select"
              aria-label="הרשאה"
              value={role}
              onChange={(event) => setRole(event.target.value as AdminRole)}
            >
              {(Object.keys(ROLE_LABEL) as AdminRole[]).map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABEL[value]}
                </option>
              ))}
            </select>
            <button className="primary" type="submit" disabled={busy}>
              הוספה
            </button>
          </div>
          <p className="hint">{ROLE_HELP[role]}</p>
        </form>

        {error && <p className="notice error">{error}</p>}

        {users === null ? (
          <p className="hint">טוען…</p>
        ) : (
          <ul className="card user-list">
            {users.map((user) => {
              const isMe = user.id === me.id;
              const isLastOwner = user.role === 'owner' && owners === 1;
              const locked = isMe || isLastOwner;

              return (
                <li className="user-row" key={user.id}>
                  <div className="user-main">
                    <span className="user-email" dir="ltr">
                      {user.email}
                    </span>
                    <span className="hint">
                      {isMe && 'זה אתה · '}
                      {user.roleChangedBy
                        ? `${user.roleChangedBy} · ${shortDate(user.roleChangedAt ?? user.createdAt)}`
                        : `נוסף ${shortDate(user.createdAt)}`}
                    </span>
                  </div>

                  <select
                    className="field role-select"
                    aria-label={`הרשאה של ${user.email}`}
                    value={user.role}
                    disabled={busy || locked}
                    title={
                      isMe
                        ? 'אי אפשר לשנות את ההרשאה של עצמך'
                        : isLastOwner
                          ? 'חייב להישאר בעלים אחד לפחות'
                          : undefined
                    }
                    onChange={(event) =>
                      void act(() => api.changeRole(user.id, event.target.value as AdminRole))
                    }
                  >
                    {(Object.keys(ROLE_LABEL) as AdminRole[]).map((value) => (
                      <option key={value} value={value}>
                        {ROLE_LABEL[value]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="danger-btn"
                    disabled={busy || locked}
                    aria-label={`הסרת ${user.email}`}
                    title={locked ? 'לא ניתן להסיר' : 'הסרה'}
                    onClick={() => {
                      if (!confirm(`להסיר את ${user.email}?`)) return;
                      void act(() => api.removeUser(user.id));
                    }}
                  >
                    הסרה
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
