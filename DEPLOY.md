# DEPLOY.md — פריסה ב-Railway

מסמך תפעולי. הכללים שמאחורי ההחלטות כאן נמצאים ב-[CLAUDE.md](CLAUDE.md) (Operations, Communication between services) וב-[DESIGN.md](DESIGN.md) (תשתית).

---

## ⚠️ הכלל שהכי קל להפר ב-Railway

ב-Railway יש **Shared Variables ברמת הפרויקט**. הם נוחים, והם סותרים ישירות כלל ב-CLAUDE.md.

**כל משתנה מוגדר ברמת השירות בלבד.** אם `TELEGRAM_BOT_TOKEN` מוגדר פעם אחת ברמת הפרויקט, שני השירותים מקבלים אותו — וההפרדה שכל המבנה הזה קיים בשבילה נעלמת בקליק אחד. משתנה שנראה "משותף ממילא" מוגדר פעמיים, אחת בכל שירות.

משתני הפניה כמו `${{Postgres.RAILWAY_PRIVATE_DOMAIN}}` הם בסדר — הם מוגדרים על השירות הצורך, לא ברמת הפרויקט.

---

## מבנה: ארבעה שירותים בכל סביבה

| שירות | תפקיד ב-DB | קובץ קונפיג | חשוף לאינטרנט |
|---|---|---|---|
| `Postgres` | — | תוסף של Railway | לא |
| `bot` | `bot_user` | `apps/bot/railway.json` | **כן** — webhook של טלגרם |
| `admin` | `admin_user` | `apps/admin/railway.json` | כן, מאחורי auth + allowlist |
| `migrator` | בעלים | `ops/railway/migrator.json` | לא |

לכל שלושת שירותי הקוד **Root Directory הוא שורש הריפו** (`/`), כי pnpm צריך את ה-workspace כדי להתקין. מה שמבדיל ביניהם הוא נתיב ה-Config as code בהגדרות השירות, ו-`watchPatterns` שבתוכו — כך ששינוי ב-`apps/admin` לא מפיל דיפלוי של הבוט.

### למה `migrator` הוא שירות נפרד

המיגרציות רצות כתפקיד בעלים — התפקיד היחיד שמותר לו ליצור roles, GRANTs ו-RLS. אם `apps/admin` היה מריץ אותן ב-pre-deploy, השירות שחשוף לניהול היה מחזיק את פרטי הבעלים, וההפרדה בין התפקידים הייתה קיימת רק על הנייר.

שירות נפרד שמריץ `node scripts/migrate.mjs` ויוצא (`restartPolicyType: NEVER`) פותר גם כלל שני: **פרטי פרודקשן לא נוחתים על מחשב מקומי.** אף אחד לא מריץ מיגרציות מהלפטופ מול פרודקשן.

הרצה חוזרת אינה מסוכנת — הרשומה ב-`migrations.applied` גורמת לקובץ שכבר רץ להידלג.

---

## סדר ההקמה

**staging לפני production.** אותם צעדים בדיוק, בשתי סביבות נפרדות של Railway, כל אחת עם ה-Postgres ומשתני הסביבה שלה.

### 1. Postgres
הוסף את התוסף. הוא מייצר את משתני החיבור של הבעלים (`DATABASE_URL`, `PGHOST` וכו') **על שירות ה-Postgres**.

### 2. migrator
שירות מהריפו, Config path `ops/railway/migrator.json`, ומשתנה אחד:

```
MIGRATE_DATABASE_URL=${{Postgres.DATABASE_URL}}
```

דיפלוי. הוא מריץ את ארבע המיגרציות ויוצא. בלוג צריכות להופיע ארבע שורות `applying`.

בסוף השלב הזה קיימים `bot_user` ו-`admin_user` — **בלי סיסמה**, כלומר עדיין אי אפשר להתחבר איתם. זה מכוון: הסיסמאות אינן חלק מהמיגרציות ולא נכנסות לגיט.

### 3. סיסמאות התפקידים — צעד שאתה מבצע, לא הקוד

התחבר ל-Postgres של אותה סביבה (Railway → Postgres → Data / `railway connect`) והרץ:

```sql
ALTER ROLE bot_user   PASSWORD '<סיסמה שנוצרה במנהל הסיסמאות>';
ALTER ROLE admin_user PASSWORD '<סיסמה אחרת>';
```

שתי סיסמאות שונות, אחת לכל תפקיד, שנוצרות במנהל הסיסמאות ולא נכתבות בצ'אט, בקובץ או בקומיט. סיסמה שונה בין staging לפרודקשן.

### 4. bot

משתנים, כולם ברמת השירות:

```
DATABASE_URL=postgres://bot_user:<סיסמה>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}
TELEGRAM_BOT_TOKEN=<טוקן>
TELEGRAM_WEBHOOK_SECRET=<מחרוזת אקראית>
```

`PORT` מוזרק על ידי Railway. הרשת הפנימית (`RAILWAY_PRIVATE_DOMAIN`) ולא הדומיין הציבורי — ה-DB לא צריך להיות נגיש מהאינטרנט.

Generate Domain — זה השירות היחיד שנחשף בכוונה, בשביל ה-webhook.

### 5. admin

```
DATABASE_URL=postgres://admin_user:<סיסמה>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}
GOOGLE_CLIENT_ID=<...>
GOOGLE_CLIENT_SECRET=<...>
BETTER_AUTH_SECRET=<מחרוזת אקראית>
BETTER_AUTH_URL=https://<הדומיין של admin>
TELEGRAM_BOT_TOKEN=<אותו טוקן, מוגדר שוב כאן ולא כמשתנה משותף>
```

הרשימה המלאה של המשתנים לכל שירות נמצאת ב-`apps/bot/.env.example` וב-`apps/admin/.env.example`.

### 6. השורה הראשונה ב-allowlist

התחברות עם גוגל אינה הרשאה. עד שיש שורה בטבלה, אף אחד לא נכנס — כולל אתה:

```sql
INSERT INTO public.admin_allowlist (email, added_by) VALUES ('<המייל שלך>', 'bootstrap');
```

---

## דיפלוי שוטף

- **פריסה מגיט בלבד.** אין שינוי ידני בפרודקשן
- push לענף שמחובר לסביבה → Railway בונה את השירותים שה-`watchPatterns` שלהם נגעו
- **מיגרציה חדשה:** מריצים מחדש את `migrator` (Deploy) לפני שהקוד שתלוי בה עולה
- CI מריץ typecheck וטסטים על כל PR ([.github/workflows/ci.yml](.github/workflows/ci.yml)). זו האכיפה — לא ה-Skill

---

## מה עוד חייב להיסגר לפני פרודקשן

- **גיבויים אוטומטיים + שחזור שנבדק בפועל.** גיבוי שלא שוחזר אף פעם אינו גיבוי
- **Sentry וניטור uptime** בשני השירותים
- **סיבוב מפתחות:** כל מפתח שעבר בגיט או בצ'אט מוחלף מיד
