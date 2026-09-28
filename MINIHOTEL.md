# MINIHOTEL.md — סיכום התיעוד של MiniHotel

מה שחשוב לנו מתוך [minihotel.readme.io](https://minihotel.readme.io/reference/overview).
נכון ל-1 בספטמבר 2026. **לאמת מול התיעוד לפני מימוש** — זה סיכום, לא מקור אמת.

---

## שתי משפחות API

| משפחה | לְמה | רלוונטי לנו |
|---|---|---|
| **ARI API** | Availability, Rates, Inventory + יצירת הזמנות | ✅ מרכזי |
| **SCI API** (XML/JSON) | ניהול מלא: חדרים, תשלומים, מסמכים, אשראי, SMS/מייל | ⚠️ ברובו לא בשימוש |
| **Webhooks** | הזמנות + סטטוס חדרים בזמן אמת | ✅ מרכזי |
| **Booking Engine** | מנוע הזמנות משובץ | לא בשימוש כרגע |

---

## אימות — הממצא הכי חשוב

שלושה שדות: `username`, `password`, `hotelID`.

⚠️ **האימות מונוליטי. אין סקופים.**
אותו credential עושה גם קריאת זמינות, גם יצירת הזמנות, וגם `processCreditCard()` ו-`sendPayment()`. התיעוד לא מתאר שום מנגנון להגבלת משתמש לפעולות מסוימות או לקריאה בלבד.

**המשמעות:** כל תהליך שמחזיק את המפתח הזה מחזיק מפתח שיודע לחייב כרטיסי אשראי. זה לא סיכון שקשור למודל — המודל לעולם לא רואה credentials. זה נוגע לתרחיש של קומפרומיז של התהליך עצמו.

✅ **מיטיגציה שקיימת אצלהם:** קוד השגיאה `A01` הוא *IP address is not authorized*, כלומר יש להם אכיפת IP allowlist בצד שלהם. זה מקטין משמעותית את הערך של מפתח שדלף.

---

## זמינות — `Immediate ARI`

ה-endpoint המרכזי עבור `check_availability`.

### פרמטרים בבקשה

| פרמטר | מקור |
|---|---|
| `username`, `password` | env, בצד השרת |
| `Hotel` / `Area` | קונפיגורציה |
| `DateRange` (from, to) | **מהמודל** — דורש ולידציה וחסם טווח |
| `Guests` (adults, child, babies) | **מהמודל** — דורש ולידציה וחסמים |
| `RoomTypes` (ALL / MIN / קוד) | קוד |
| `Prices` → `rateCode` | **קוד בלבד.** חובה, אחד לבקשה |
| `Agent id` | **קוד בלבד.** פילטר תעריפי סוכן |
| `MinimumNights` | קוד |

❌ `rateCode` ו-`Agent id` לא מגיעים מהמודל בשום מצב — אחרת אפשר לבקש תעריפי סוכן.

### שדות בתשובה

```
Hotel:     id, Name_h, Name_e, Currency
           DateRange (from, to)
           Guests (adults, child, babies)
           CancellPol (Full | OneNight)
RoomType:  id, Name_h, Name_e
           Inventory: Allocation, maxavail
Price:     board, boardDesc, value, value_nrf
```

**המחירים הם מחירי מכירה**, לא עלות. `value` = מחיר לכל השהות (לא ללילה), `value_nrf` = מחיר ללא ביטול.

### ה-whitelist — מה עובר למודל

| שדה | עובר? | למה |
|---|---|---|
| `RoomType.Name` (לפי שפה) | ✅ | |
| `boardDesc` | ✅ | |
| `value`, `value_nrf` | ✅ | מחיר מכירה, האורח אמור לראות |
| `Currency` | ✅ | |
| `CancellPol` | ✅ | |
| `RoomType.id` | ✅ | מזהה פנימי, לא רגיש |
| **`Allocation`** | ❌ | |
| **`maxavail`** | ❌ | |

⚠️ **`Allocation` + `maxavail` = שיעור התפוסה המדויק.** הצמד הזה חושף כמה חדרים יש לך וכמה תפוסים — מודיעין עסקי למתחרה, ומיפוי מלא של לוח התפוסה דרך קריאות חוזרות.
האורח מקבל "פנוי / לא פנוי", ולכל היותר דחיפה מסוג "נשארו 2" — **בלי המכנה**.

---

## ARI Push — דחיפה יזומה אלינו

MiniHotel דוחפת עדכונים ל-endpoint שאנחנו מארחים:

- **זמינות:** עדכונים מצטברים כל 2–10 דקות + סנכרון מלא כל חצות
- **תעריפים:** סנכרון מלא כל ~שעתיים, או לפי דרישה
- פורמט XML ב-POST. הנתונים: room id, תאריך, allocation, max available, rate code, price
- URL אחד בכל רגע נתון; יש אפשרות ל-URL בדיקה לפני מעבר לפרודקשן
- מיפוי חדרים וקודי תעריף מתואם מולם מראש

⚠️ **התיעוד לא מתאר שום אימות על ה-push.** endpoint פומבי שכותב לנו נתוני זמינות בלי חתימה.

**סטטוס אצלנו:** לא בשימוש בשלב ראשון. רלוונטי בהמשך כשכבת cache אם latency או מכסות יתחילו להפריע.

---

## Webhooks של הזמנות

**אירועים:** `reservation.created`, `reservation.updated`, `reservation.cancelled`.
חלים על הזמנות מכל מקור — ידני, מנוע הזמנות, OTA, שותפים מחוברים.

### מבנה ה-payload

```
reservationNumber, source, status, timestamp (UTC)
total:    amount, currency
header:   שם אורח, פרטי קשר, קוד מדינה, עיר,
          תאריכי כניסה/יציאה, מערך חדרים (מספר + סוג)
members:  מערך אורחים — פרטים, חדר משויך, שעות, פילוח
          (adults, children, babies, youth), lockKeys
otaInfo:  פרטי הפורטל
```

### 🚨 `lockKeys` — הפריט הרגיש ביותר בכל האינטגרציה

עבור אינטגרציות TTLock, ה-payload מכיל **קוד PIN של המנעול החכם**, מזהה המנעול ושמו.

זה לא מידע עסקי — זו **גישה פיזית לדירה**.

❌ `lockKeys` לא נכנס לשום מקום שהמודל יכול להגיע אליו
❌ `lockKeys` לא נכנס ללוגים
❌ אם הוא נשמר — לא ב-`public` בהישג ידו של `bot_user`

זה גם מחזק כלל שכבר קיים: הבוט לא צריך גישה לטבלת ההזמנות המלאה, אלא לשדות ספציפיים בלבד.

### אמינות המסירה

- על ה-endpoint להחזיר **2xx** תוך **15 שניות**
- כישלון = תשובה שאינה 2xx, timeout, או שגיאת חיבור/DNS/TLS
- **6 ניסיונות חוזרים:** 10 שניות → דקה → 5 דקות → 10 דקות → שעה → 6 שעות
- אחרי הניסיון השישי — מסומן ככישלון סופי

**נגזרות למימוש:** ה-endpoint חייב להיות מהיר — לקבל, לאמת, לכתוב לתור, ולהחזיר 200. בלי עיבוד סינכרוני. וצריך לטפל בכפילויות, כי retry אחרי timeout מייצר מסירה כפולה של אותו אירוע.

⚠️ גם כאן — **אין אימות מתועד**.

---

## קודי שגיאה

הרשימה המלאה: [error-codes](https://minihotel.readme.io/reference/error-codes). אלה שכבר פגשנו או שהקוד מסווג:

| קוד | משמעות | אצלנו |
|---|---|---|
| `210` | Incorrect username | `auth_failed` |
| `211` | Incorrect hotel ID | `auth_failed` |
| `863` | Incorrect user code | `auth_failed` (בעבר נרשם כאן בטעות כשגיאת IP) |
| `A01` | IP address is not authorized | `ip_not_authorized` |
| `202` | Hotel GDS Code does not exist | `vendor_error` |
| `303` | Incorrect room linkage setup | `vendor_error` |
| `308` / `803` | Incorrect rate code | `vendor_error` |
| `309` | Price list is not defined in Minihotel | `vendor_error` |


כ-40 קודים. הקבוצות הרלוונטיות:

| טווח | נושא |
|---|---|
| 001–108 | ולידציה: XML לא תקין, קודי משתמש/מלון, בעיות תאריכים וטווחים |
| 202–206 | מלון/אזור לא קיים, אין תוצאות |
| 210–211, 863 | אימות: שם משתמש (210), קוד מלון (211), קוד משתמש (863) |
| A01 | **IP לא מורשה** |
| 301–310, 803 | תמחור והגדרות: קישור חדרים, קודי תעריף, מחירונים חסרים |
| 516–517 | הזמנות: כישלון, מזהה כפול |
| 599 | שגיאת מערכת — דורש פנייה לתמיכה |

**אין קודי rate limit או מכסות.** לא מתועדת שום הגבלת קצב — מה שלא אומר שאין. החסם שלנו על קצב הקריאות הוא באחריותנו, לא שלהם.

---

## מה נבדק בפועל (28 בספטמבר 2026)

נבדק מול ה-sandbox ומול production. דוגמאות התשובות האמיתיות נשמרו ב-[tests/minihotel/fixtures](tests/minihotel/fixtures/README.md).

- **ל-sandbox יש משתמש בדיקה ציבורי** (מופיע בתיעוד): `Test` / `3657488`, מלון `sandbox`. הוא לא סוד
- **ה-sandbox לא בודק את הסיסמה.** סיסמה שגויה מחזירה נתונים רגילים. לכן הצלחה ב-sandbox לא מוכיחה שהסיסמה נכונה
- **שגיאות מגיעות כ-HTTP 200 עם טקסט פשוט**, לא XML ולא סטטוס שגיאה. למשל: `ERR 202: Hotel GDS Code does not exist: …`. צריך לבדוק את גוף התשובה, לא את הסטטוס
- **שם משתמש שגוי מקבל `ERR 210` עוד לפני בדיקת ה-IP.** מכתובת שלא ברשימה, עם משתמש מזויף, production ענה `210` ולא `A01`. לכן את שגיאת ה-IP אפשר לראות רק עם credentials אמיתיים
- **ב-XML יש רווחים לפני `=` בחלק מהתכונות** (`ExtraAdultFee ="150.00"`) ורווח לפני השורה הראשונה. parser רגיל מסתדר עם זה; ביטוי רגולרי כנראה לא
- **28 בספטמבר, מ-staging עם המשתמש `atitlan`: `A01`.** הכתובות של Railway עוד לא ב-whitelist. מכיוון שמשתמש מזויף מקבל `210` לפני בדיקת ה-IP, `A01` מראה ש**שם המשתמש קיים**. את הסיסמה נדע רק אחרי שה-whitelist ייפתח
- **אחרי שהכתובות נוספו (28 בספטמבר, ערב): המשתמש הנכון הוא `luxuryat`,** זה ש-LATAM שלחו. `atitlan` המשיך לקבל `A01` גם אחרי ש-MiniHotel אישרו את ה-whitelist, כלומר **ה-whitelist אצלם משויך למשתמש**. עם `luxuryat` עברנו את בדיקת המשתמש ואת בדיקת ה-IP. כנראה גם MiniHotel ראו בניסיונות של `atitlan` "משתמש שגוי"
- **הבעיה הבאה: `ERR 303: Incorrect room linkage setup`** ב-Bulk ARI עם `luxuryat`. זו הגדרה בצד של MiniHotel (קישור סוגי החדרים למשתמש/לערוץ), לא בעיה בקוד
- **Bulk ARI** (`ResponseType="05"`) מחזיר בבקשה אחת זמינות, מחיר ללילה, מינימום לילות וסגירות, לכל יום ולכל סוג חדר. מסך הזמינות באדמין משתמש בו. `Mavailability` הוא מספר היחידות הפנויות. ⚠️ לאורח זה לא עובר כמו שהוא (ראו "ה-whitelist")

### איפה הקוד

`packages/minihotel` — ה-client היחיד: בונה XML, מפרסר, ממפה שגיאות. מקבל credentials כפרמטר ולא קורא env. כרגע רק `apps/admin` משתמש בו (מסך "זמינות"). הקוד שמכניס סיסמה ל-XML מבצע escape, כי בסיסמאות שקיבלנו יש תווים כמו `'` ו-`|`.

---

## מה אנחנו משתמשים בו ומה לא

| ✅ בשימוש | ⛔ לא נוגעים |
|---|---|
| `Immediate ARI` — זמינות (הבוט, משימה 0003) | `processCreditCard()` |
| Bulk ARI — מסך הזמינות באדמין | |
| Webhooks של הזמנות | `sendPayment()` |
| | `GetReservationBalance()` |
| | `sendEmail()`, `sendSMS()` |

⚠️ **`sendEmail()` ו-`sendSMS()` הם נתיב שליחה שני**, שעוקף לגמרי את שכבת השליחה שלנו — בלי תבנית, בלי טריגר אנושי, בלי הלוג שלנו. אנחנו לא קוראים להם.

יצירת הזמנות (`create-modify-reservations`) אינה בשלב הראשון — הסוכן אוסף פרטים ואדם סוגר.

---

## החשבון שלנו — מה עלה מההתכתבות עם התמיכה

מקור: התכתבות במייל של בעל המלון עם MiniHotel ב-17–18 באוגוסט 2026 (כרטיס תמיכה `197345`), כשהקים אינטגרציה ב-Base44. נכתב ב-18 בספטמבר 2026.
**אין כאן סיסמאות.** הן נמצאות בתיבת המייל של המלון, ולא נכנסות לריפו.

### תנאי הגישה ל-production

- **Professional plan בלבד.** API זמין רק בתוכנית הזו; משנים תוכנית דרך איש המכירות
- **כתב ויתור (disclaimer).** המלון **וגם חברת הפיתוח** מאשרים במייל שכל תקלה באינטגרציה באחריותם בלבד. זה תנאי לקבלת credentials של production
- **IP קבוע בלבד.** לא טווחים, לא IP דינמי. מותר לשלוח כתובת אחת או כמה כתובות בודדות
- פיתוח ובדיקות קודם כול ב-sandbox; ה-whitelist מתבקש רק אחרי שהפיתוח עובד שם
- מה שלא מופיע ב[תיעוד](https://minihotel.readme.io/reference/overview) לא אפשרי דרך API
- במיילים של התמיכה (LATAM) כתוב שאם לא עונים, זה נחשב כאישור שהפרטים נכונים. לכן חשוב לענות כשמשהו שגוי

### מה קיים היום

| פריט | ערך |
|---|---|
| Hotel code | `luxury50` |
| Rate codes | `*ALL`, `USD` |
| IP ב-whitelist | `137.184.104.26` — שרת proxy של האינטגרציה ב-Base44. **Base44 יוצאת משימוש; לבקש להסיר** |
| Webhooks | מופעלים. נשלחים ל-endpoint של Base44 עם Basic Auth. נרשמו ארבעה אירועים: שלושת אירועי ההזמנה ו-`room.occupancy.updated` (לא מופיע בסעיף ה-Webhooks למטה, לאמת בתיעוד). ⚠️ ה-URL נשלח אליהם פעם אחת עם `%0A` (שורה חדשה) בסופו; לא ידוע איזו גרסה נרשמה |
| Booking Engine | יש Hotel ID ו-Instance ID (במייל). לא בשימוש אצלנו |

⚠️ **הונפקו שני זוגות credentials שונים ל-production:** שם משתמש אחד מהתמיכה באנגלית (Arkady), ושם משתמש אחר מהתמיכה ב-LATAM (Yasmany), שנשלח יחד עם ה-IP. לא ברור איזה זוג שייך לאיזה API, והאם ה-whitelist קשור למשתמש. צריך לברר לפני שמחברים.

⚠️ **ה-whitelist לא אחיד בין ה-endpoints.** מאותו IP, ARI (`/gds`) ו-Content (`/content/agents/ws/...`) עבדו, אבל `GetReservationKey` (`/api/Agents/Sci/Reservation/GetReservationKey`, SCI) החזיר `401 Your IP Address is not authorized`. לא ידוע אם זה תוקן.

ℹ️ **ל-Base44 יש אינטגרציה שעבדה ב-sandbox:** זמינות ומחירים (Immediate ARI), `getRoomTypes`, `getRooms`, `GetReservationKey`, מקבל webhooks ו-iframe של Booking Engine. הבקשות והתשובות שהיא שלחה וקיבלה הן הדוגמה הקרובה ביותר לפורמט האמיתי שיש לנו.

ℹ️ **מה הוצהר מולם:** שימוש לקריאה בלבד — "we will not create, modify, or cancel reservations through the API". פעולת כתיבה מ-`apps/admin` בעתיד תהיה חריגה ממה שהוצהר, וכדאי לעדכן אותם לפני כן.

ℹ️ פרטי הכניסה לממשק (GUI) של MiniHotel לא עובדים מול ה-API (`ERR 210: Wrong User Name`). ה-credentials של ה-API נפרדים.

### החלטות (18 בספטמבר 2026)

- **Base44 יוצאת משימוש.** המערכת הזו מחליפה אותה
- **גם `apps/bot` וגם `apps/admin` ניגשים ל-MiniHotel.** לכן לשניהם static egress IPs ב-production, ושניהם ב-whitelist. המשמעות: שני השירותים מחזיקים credential שיודע גם לחייב כרטיסי אשראי (ראו "אימות"). כל שירות מקבל אותו כמשתנה סביבה משלו, ברמת השירות
- **משתמשים בחשבון ה-API הקיים.** לא מבקשים משתמש נוסף, כדי לא לעכב את התהליך. איזה משני שמות המשתמש עובד בודקים בעצמנו אחרי שה-whitelist נפתח
- **staging עובד מול ה-sandbox,** עם credentials של sandbox. זה מה שמפריד בין הסביבות — לא הכתובות. ב-Railway בריכת הכתובות משותפת, ו-staging יוצא מאותן כתובות כמו production (DEPLOY.md)
  - ⚠️ **זמנית (28 בספטמבר 2026): staging עובד מול החשבון האמיתי,** לפי החלטת הבעלים, כדי לבדוק את מסך הזמינות לפני production. ההפרדה פתוחה כמשימה: [work/0013](work/0013-staging-minihotel-separation.md)

### הכתובות שנשלחו ל-whitelist

חמש כתובות, מתוך [DEPLOY.md](DEPLOY.md#static-egress-addresses):

`208.77.244.240`, `208.77.244.242`, `152.55.184.241`, `152.55.185.189`, `152.55.185.190`

### כתובות

| API | Base URL |
|---|---|
| ARI | `https://api.minihotel.cloud/gds` |
| Content & Data | `https://api2.minihotel.cloud` |

### קודי סוגי חדרים

`BALI`, `DUBAI`, `KOSMIO`, `Lavilla` (LA VILLA), `MIAMI`, `NEWYORK`, `SPEDRO` (S.PEDRO), `TEL-AVID`, `TIBERIAS`, `TOKIO`, `VENICE`, ו-`SUITE1`–`SUITE10`.
**המלון לא משתמש ב-`SUITE1`–`SUITE10`.** הם לא צריכים להגיע לאורח.

### אנשי קשר

| מי | תפקיד | ערוץ |
|---|---|---|
| Arkady Katz | VP Product | support@minihotel.io (Freshdesk; לענות בשרשור של כרטיס `197345`) |
| Yasmany Maestres | Technical Support Manager, LATAM (ספרדית) | soporte@minihotel.io |
| Viridiana Sánchez | Onboarding (ספרדית) | viri@minihotel.io |

---

## לשאול את MiniHotel

1. **האם אפשר להנפיק משתמש שני מוגבל לקריאת ARI בלבד?** אם כן — כל הדיון על היכן מחזיקים את המפתח מתייתר
2. **האם יש אימות על ה-webhooks ועל ה-ARI Push** — secret, חתימה, או IP מוצא קבוע שאפשר לסנן לפיו?
3. ~~איך מגדירים את ה-IP allowlist~~ — נענה: שולחים במייל כתובות IP קבועות בודדות, לא טווחים (ראו "החשבון שלנו")
6. ~~איזה משני זוגות ה-credentials שייך לאיזה API~~ — לא שואלים; בודקים בעצמנו אחרי שה-whitelist נפתח
4. האם יש הגבלת קצב בפועל, גם אם לא מתועדת
5. האם `lockKeys` ניתן לכיבוי ב-payload אם איננו משתמשים ב-TTLock
