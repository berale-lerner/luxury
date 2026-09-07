/**
 * The two screens that stand in for the app when the visitor may not see it.
 *
 * They are deliberately plain and say little: someone who is not allowed in
 * should not learn from this page whose system it is or who runs it.
 */

export function SignIn() {
  return (
    <div className="empty">
      <div style={{ maxWidth: 320 }}>
        <div className="big" style={{ fontSize: 18, marginBottom: 10 }}>
          ניהול שיחות
        </div>
        <p style={{ marginBottom: 20 }}>נדרשת התחברות כדי להמשיך.</p>
        <a
          href="/api/auth/sign-in/social?provider=google"
          className="icon-btn"
          style={{ width: 'auto', padding: '0 18px', height: 42, textDecoration: 'none', gap: 10 }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.16a5.3 5.3 0 0 1-2.28 3.47v2.89h3.7C21.72 18.8 23 15.8 23 12.27Z" />
            <path fill="#34A853" d="M12 23.5c3.08 0 5.67-1.02 7.56-2.77l-3.7-2.87c-1.02.69-2.33 1.1-3.86 1.1-2.97 0-5.49-2-6.39-4.7H1.78v2.95A11.44 11.44 0 0 0 12 23.5Z" />
            <path fill="#FBBC05" d="M5.61 14.26a6.87 6.87 0 0 1 0-4.4V6.91H1.78a11.46 11.46 0 0 0 0 10.3l3.83-2.95Z" />
            <path fill="#EA4335" d="M12 5.16c1.68 0 3.18.58 4.36 1.71l3.27-3.27C17.66 1.72 15.07.5 12 .5A11.44 11.44 0 0 0 1.78 6.91l3.83 2.95c.9-2.7 3.42-4.7 6.39-4.7Z" />
          </svg>
          התחברות עם Google
        </a>
      </div>
    </div>
  );
}

export function NotAllowed() {
  return (
    <div className="empty">
      <div style={{ maxWidth: 340 }}>
        <div className="big" style={{ fontSize: 18, marginBottom: 8 }}>
          אין הרשאה
        </div>
        <p>
          החשבון שאיתו התחברת אינו מורשה. פנה למי שמנהל את המערכת כדי שיוסיף אותו.
        </p>
        <p style={{ marginTop: 16 }}>
          <a href="/api/auth/sign-out" style={{ color: 'var(--accent)' }}>
            התנתקות
          </a>
        </p>
      </div>
    </div>
  );
}
