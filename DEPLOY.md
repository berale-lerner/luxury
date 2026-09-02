# DEPLOY.md — פריסה ב-Railway

מסמך תפעולי. הכללים שמאחורי ההחלטות כאן נמצאים ב-[CLAUDE.md](CLAUDE.md) (Operations) וב-[DESIGN.md](DESIGN.md) (תשתית).

**הפרויקט מוגדר כקוד ב-[.railway/railway.ts](.railway/railway.ts).** אותו היגיון כמו המיגרציות: תשתית שמוגדרת בקונסולה היא תשתית שאף אחד לא יכול לסקור, והיא נפרדת בשקט ממה שכתוב בריפו. `railway config plan` מראה את ההפרש, `railway config apply` מחיל אותו.

---

## ⚠️ הכלל שהכי קל להפר ב-Railway

ל-Railway יש **Shared Variables ברמת הפרויקט**. הם נוחים, והם סותרים ישירות כלל ב-CLAUDE.md.

**כל משתנה מוגדר ברמת השירות בלבד.** אם `TELEGRAM_BOT_TOKEN` מוגדר פעם אחת ברמת הפרויקט, שני השירותים מקבלים אותו — וההפרדה שכל המבנה קיים בשבילה נעלמת בקליק אחד. לכן הטוקן מופיע פעמיים בקובץ ה-IaC, אחת בכל שירות, ולא כמשתנה משותף.

משתני הפניה (`${{Postgres.RAILWAY_PRIVATE_DOMAIN}}`) הם בסדר — הם מוגדרים על השירות הצורך.

---

## מבנה: ארבעה שירותים בכל סביבה

| שירות | תפקיד ב-DB | חשוף לאינטרנט |
|---|---|---|
| `Postgres` | — | לא |
| `migrator` | בעלים | לא |
| `bot` | `bot_user` | **כן** — webhook של טלגרם |
| `admin` | `admin_user` | כן, מאחורי auth + allowlist |

### למה `migrator` הוא שירות נפרד

המיגרציות רצות כתפקיד בעלים — התפקיד היחיד שרשאי ליצור roles, GRANTs ו-RLS. אילו `apps/admin` היה מריץ אותן ב-pre-deploy, השירות שממילא מגיע לכל ה-schemas היה מחזיק גם את פרטי הבעלים.

שירות נפרד שרץ ויוצא (`restartPolicyType: NEVER`) פותר גם כלל שני: **פרטי פרודקשן לא נוחתים על מחשב מקומי** — אף אחד לא מריץ מיגרציות מהלפטופ. הרצה חוזרת אינה מסוכנת: קובץ שכבר רץ מסונן דרך `migrations.applied`.

---

## הקמה

**staging לפני production.** אותם צעדים בשתי סביבות, כל אחת עם ה-Postgres והמשתנים שלה.

### 1. התחברות וקישור — בדפדפן, פעם אחת

```bash
railway login
```

צריך גם ש-Railway תקבל גישה לריפו ב-GitHub (התקנת ה-GitHub App על `berale-lerner/luxury`) — גם זה אישור חד-פעמי בדפדפן.

פרויקט חדש:

```bash
railway init --name luxury
```

פרויקט קיים:

```bash
railway link
```

### 2. תוכנית לפני החלה

```bash
railway config plan
```

**לקרוא את הפלט לפני `apply`.** אם הפרויקט כבר קיים ויש בו שירותים שאינם מופיעים ב-`.railway/railway.ts`, התוכנית תציע למחוק אותם — הקובץ הוא ההגדרה המלאה, לא תוספת. מחיקה דורשת `--confirm-destructive` בנפרד, וזו הסיבה.

```bash
railway config apply
```

בסוף השלב הזה קיימים ארבעת השירותים. ה-`migrator` ירוץ ויחיל את ארבע המיגרציות; `bot` ו-`admin` **ייכשלו בהפעלה** — עדיין אין להם סיסמת DB. זה הצפוי, והם יעלו בסוף שלב 4.

בלוג של ה-`migrator` צריכות להופיע ארבע שורות `applying`:

```bash
railway logs --service migrator
```

### 3. סיסמאות התפקידים — צעד שאתה מבצע, לא הקוד

המיגרציה יוצרת את `bot_user` ו-`admin_user` **בלי סיסמה**, כלומר אי אפשר להתחבר איתם. הסיסמאות אינן חלק מהמיגרציות ולא נכנסות לגיט:

```bash
railway connect Postgres --ssh
```

```sql
ALTER ROLE bot_user   PASSWORD '<סיסמה ממנהל הסיסמאות>';
ALTER ROLE admin_user PASSWORD '<סיסמה אחרת>';
```

שתי סיסמאות שונות, אחת לכל תפקיד, שונות בין staging לפרודקשן, ולא נכתבות בצ'אט או בקובץ.

### 4. הסודות — דרך stdin, לא כארגומנט

`--stdin` שומר על הערך מחוץ להיסטוריית הפקודות:

```bash
echo -n '<סיסמת bot_user>' | railway variable set BOT_DB_PASSWORD   --stdin --service bot
echo -n '<טוקן טלגרם>'      | railway variable set TELEGRAM_BOT_TOKEN --stdin --service bot
openssl rand -hex 32        | railway variable set TELEGRAM_WEBHOOK_SECRET --stdin --service bot

echo -n '<סיסמת admin_user>' | railway variable set ADMIN_DB_PASSWORD    --stdin --service admin
echo -n '<google client id>' | railway variable set GOOGLE_CLIENT_ID     --stdin --service admin
echo -n '<google secret>'    | railway variable set GOOGLE_CLIENT_SECRET --stdin --service admin
openssl rand -hex 32         | railway variable set BETTER_AUTH_SECRET   --stdin --service admin
echo -n '<טוקן טלגרם>'       | railway variable set TELEGRAM_BOT_TOKEN   --stdin --service admin
```

`DATABASE_URL` עצמו כבר מוגדר ב-IaC ומרכיב את עצמו מהסיסמה הזו ומכתובת הרשת הפנימית של Postgres — **שם התפקיד** (`bot_user` / `admin_user`) נמצא בקוד ונסקר בקוד, כי זה החלק שקובע מה השירות רשאי לראות.

הרצה חוזרת של `railway config apply` לא דורסת את הערכים האלה: הם מסומנים `preserve()`.

### 5. דומיינים

```bash
railway domain --service bot
railway domain --service admin
```

`bot` הוא השירות היחיד שנחשף בכוונה — בשביל ה-webhook. `admin` מאחורי auth ו-allowlist.

### 6. השורה הראשונה ב-allowlist

התחברות עם גוגל אינה הרשאה. עד שיש שורה בטבלה אף אחד לא נכנס, כולל אתה:

```sql
INSERT INTO public.admin_allowlist (email, added_by) VALUES ('<המייל שלך>', 'bootstrap');
```

---

## דיפלוי שוטף

- **פריסה מגיט בלבד.** אין שינוי ידני בפרודקשן
- push ל-`main` → נבנים רק השירותים שה-`watchPatterns` שלהם נגעו
- **שינוי בתשתית** (משתנה, פקודת הפעלה, שירות חדש): עורכים את `.railway/railway.ts`, `railway config plan`, ואז `apply`
- **מיגרציה חדשה:** `railway redeploy --service migrator` לפני שהקוד שתלוי בה עולה
- CI מריץ typecheck וטסטים על כל PR ([.github/workflows/ci.yml](.github/workflows/ci.yml)). זו האכיפה — לא ה-Skill

---

## מה עוד חייב להיסגר לפני פרודקשן

- **גיבויים אוטומטיים + שחזור שנבדק בפועל.** גיבוי שלא שוחזר אף פעם אינו גיבוי
- **Sentry וניטור uptime** בשני השירותים
- **סיבוב מפתחות:** כל מפתח שעבר בגיט או בצ'אט מוחלף מיד
