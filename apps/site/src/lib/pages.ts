import { IMG, type Locale } from "./content";

/* ────────────────────────────────────────────────────────────
   Extended page copy. Kept separate from content.ts so the
   navigation / home dictionary stays readable.
   ──────────────────────────────────────────────────────────── */

const he = {
  /* ── בית חב"ד ─────────────────────────────────────────── */
  chabadHouse: {
    quote: {
      text: "אין דבר כזה יהודי רחוק. יש רק יהודי שעדיין לא נכנס.",
      source: "על שולחן השבת בפדרו",
    },
    inside: {
      title: "מה יש בבית",
      lead: "שלוש קומות, חצר אחת, ומספיק כיסאות פלסטיק כדי להושיב חצי מהכפר.",
      items: [
        {
          title: "אולם התפילה",
          text: "בקומה השנייה. ספר תורה, ארון קודש מעץ, סידורים בעברית ובאנגלית, וטלית ותפילין לכל מי שרוצה להניח.",
        },
        {
          title: "המסעדה",
          text: "מטבח בשרי בהשגחה, שולחנות ארוכים, ותפריט שמשתנה לפי מה שהגיע מהשוק באותו בוקר.",
        },
        {
          title: "החצר",
          text: "מקום שבו נגמרות שיחות בשתיים בלילה. בסוכות היא הופכת לסוכה הגדולה בגואטמלה.",
        },
        {
          title: "הספרייה",
          text: "מדף תניא, גמרות, ספרי חסידות, וגם ערימת ספרים בעברית שמטיילים השאירו אחריהם. קחו, החזירו, או אל תחזירו.",
        },
        {
          title: "המקוואות",
          text: "מקווה גברים ומקווה נשים, נפרדים לחלוטין ובנויים לפי כל הדקדוקים. מקווה הנשים בתיאום מראש, עם חדר הכנה פרטי.",
        },
        {
          title: "פינת המידע",
          text: "מפות, המלצות, טלפונים של מדריכים אמינים, וכרטיס SIM אם שכחתם לקנות ברחוב.",
        },
      ],
    },
    weekly: {
      title: "השבוע בבית חב״ד",
      daily: {
        title: "סדר יומי · ראשון–חמישי",
        rows: [
          { t: "09:00", a: "שיעור חסידות" },
          { t: "10:00", a: "תפילת שחרית" },
          { t: "17:00", a: "שיעור תניא" },
          { t: "19:00", a: "שיעור פרשת השבוע" },
          { t: "21:00", a: "שיעור גמרא, ולאחריו תפילת ערבית" },
        ],
        note: "ביום רביעי מתקיים גם ״ערב החלטות טובות״.",
      },
      shabbatEve: {
        title: "ליל שבת",
        rows: [
          { t: "", a: "תפילת מנחה" },
          { t: "", a: "תפילת ערבית" },
          { t: "", a: "קידוש" },
          { t: "", a: "סעודת ליל שבת" },
          { t: "", a: "התוועדות חסידית ועונג שבת" },
        ],
      },
      shabbatDay: {
        title: "יום שבת קודש",
        rows: [
          { t: "10:00", a: "ג׳חנון" },
          { t: "", a: "תפילת שחרית" },
          { t: "13:00", a: "התוועדות בבית הכנסת" },
          { t: "14:00", a: "קידוש, סלטים חמים וקינוחים — סעודת שבת צהריים" },
          { t: "", a: "תפילת מנחה" },
          {
            t: "",
            a: "כחצי שעה לפני צאת השבת: סדר ניגונים, מאמר חסידות ותפילת ערבית",
          },
          { t: "", a: "הבדלה בצאת השבת" },
        ],
      },
    },
    team: {
      title: "מי מחזיק את המקום",
      text: "הרב והרבנית, שלוחי הרבי לגואטמלה, מנהלים את הבית יחד עם צוות בחורים שמגיע לעונות העמוסות. הם מבשלים, מארחים, מסדרים כרטיסי טיסה בחירום, מלווים לבית חולים, ולפעמים פשוט יושבים לשמוע. אין להם שעות קבלה.",
    },
  },

  /* ── מידע למטייל ───────────────────────────────────────── */
  touristInfo: {
    health: {
      title: "בריאות ורפואה",
      items: [
        "מרפאה מקומית פועלת בכפר, וזמינה בשעות היום.",
        "מומלץ להביא ביטוח נסיעות שמכסה טיפוס הרים וספורט מים.",
        "יש שירותי רופאים דוברי אנגלית באזור.",
        "למקרי חירום יש בית חולים.",
        "מענה בוואטסאפ מבית חב״ד בכל שעה.",
      ],
    },
    money: {
      title: "לוגיסטיקה יומיומית",
      items: [
        "כביסה: אפשר לעשות כביסה ב-Luxury Atitlán, אחרי ה-Casa Blanca.",
        "תחבורה בכפר: טוק־טוק בכל מקום, ונסיעה בתוך סן פדרו זולה.",
        "אינטרנט: אלחוטי חופשי בבית חב״ד, וקליטה סלולרית טובה סביב האגם.",
        "כרטיס SIM מקומי (Tigo / Claro) נמכר ברחוב.",
        "רוב המקומות כבר מקבלים אשראי, אבל תמיד עדיף להביא מזומן.",
      ],
    },
    phrases: {
      title: "ספרדית להישרדות",
      lead: "חמש מילים שיפתחו לכם דלתות בכפר.",
      items: [
        { es: "Buenos días", he: "בוקר טוב" },
        { es: "¿Cuánto cuesta?", he: "כמה זה עולה?" },
        { es: "Sin carne, por favor", he: "בלי בשר, בבקשה" },
        { es: "¿Dónde está el muelle?", he: "איפה המזח?" },
        { es: "Gracias, muy amable", he: "תודה, אדיב מאוד" },
      ],
    },
  },

  /* ── מה לעשות ──────────────────────────────────────────── */
  thingsToDo: {
    intro:
      "אגם אטיטלן הוא אחד המקומות היפים בעולם, ובסן פדרו יש מה לעשות בכל יום מחדש — זריחות, כפרים, שווקים, מים חמים וסדנאות. ריכזנו כאן את הכל בשלוש שכבות: מה שיוצא מבית חב״ד, מה שאפשר להזמין דרך לוקשרי אטיטלן, ומה שפשוט יוצאים לעשות לבד.",
    note:
      "כל הפעילויות הללו יוצאות מאזור האגם. יש לתכנן את החזרה לפני השקיעה בערב שבת.",

    chabad: {
      title: "מה שבית חב״ד מציע",
      lead: "פעילויות שיוצאות מהבית עצמו, בלי לחפש רחוק.",
      items: [
        {
          title: "תצפית האף האינדיאני",
          time: "שני ושישי · 03:30",
          text: "טיול זריחה שיוצא מבית חב״ד: נסיעה של חצי שעה, טיפוס קצר, ולמעלה — ארוחת בוקר ישראלית, תה ועוגות, הנחת תפילין ונוף שלא נשכח. חוזרים בסביבות 08:30.",
        },
        {
          title: "שיעורים יומיים",
          time: "ראשון–חמישי",
          text: "שיעור חסידות ב-09:00, תניא ב-17:00, פרשת השבוע ב-19:00 ושיעור גמרא ב-21:00 ואחריו ערבית. ביום רביעי גם ערב החלטות טובות.",
        },
        {
          title: "קבלת שבת וסעודת ליל שבת",
          time: "ערב שבת",
          text: "מנחה וערבית, קידוש וסעודה מושקעת, ואחריה התוועדות חסידית ועונג שבת. בהרשמה ותשלום מראש.",
        },
        {
          title: "שבת קודש",
          time: "שבת",
          text: "ג׳חנון ב-10:00, שחרית, התוועדות ב-13:00, וקידוש עם סלטים חמים וקינוחים ב-14:00.",
        },
        {
          title: "מוצאי שבת",
          time: "מוצ״ש",
          text: "ערב שייקים וגיטרות בבית חב״ד — הדרך הכי טובה לסגור שבת ולפתוח שבוע.",
        },
        {
          title: "מרכז מידע ותיאומים",
          time: "כל השבוע",
          text: "מפות, המלצות, טלפונים של מדריכים אמינים, וכל שאלה — בוואטסאפ, בכל שעה.",
        },
      ],
    },

    luxury: {
      title: "דרך לוקשרי אטיטלן",
      lead: "כמעט כל טיול, סדנה או הסעה בכפר אפשר לסגור בהודעת וואטסאפ אחת לצוות של לוקשרי אטיטלן.",
      cta: "לתיאום בוואטסאפ",
      items: [
        {
          name: "האף האינדיאני · Nariz del Indio",
          time: "יציאה 03:30 · חזרה 08:30",
          level: "זריחה",
          text: "נסיעה של חצי שעה, טיפוס קצר, והנוף המפורסם של האגם עם שלושת הרי הגעש בזריחה.",
        },
        {
          name: "הר הגעש סן פדרו",
          time: "כ-4 שעות",
          level: "מאתגר",
          text: "טיפוס של 800 מטר עד לגובה 2,995 מטר. יוצאים בזריחה, וחובה מדריך מקומי. ההר אינו פעיל.",
        },
        {
          name: "אומגות בשמורת אטיטלן",
          time: "1.5–2 שעות",
          level: "אקסטרים",
          text: "מסלול רגיל של 8 כבלים, או המסלול האתגרי והמומלץ — 7 כבלים ארוכים מעל מפלים ויערות. יציאות ב-09:00, 11:00, 13:00 ו-15:00.",
        },
        {
          name: "פנחצ׳ל ושמורת הטבע",
          time: "יום · סירה 25 דקות",
          level: "קל",
          text: "העיירה המתוירת של האגם ושוק עבודות היד הענק שלה, ולידה שמורת טבע עם גשרים תלויים, תצפיות, חוף פרטי, חוות פרפרים וקופים.",
        },
        {
          name: "מצנח רחיפה מעל האגם",
          time: "כ-25 דקות מעוף",
          level: "אקסטרים",
          text: "טיסה עם אלופי עולם בתחום, ממריאים מעל הלגונה ורואים את האגם כולו מלמעלה.",
        },
        {
          name: "רכיבה על סוסים",
          time: "כשעתיים",
          level: "קל",
          text: "מתחילים ברחובות הכפר ומסיימים בדהרה אל נקודת תצפית. אפשר להאריך את המסלול עד חוף פינקה.",
        },
        {
          name: "סיור קפה · לס קריסטלינס",
          time: "כ-3 שעות",
          level: "קל",
          text: "כל הדרך של הקפה הגואטמלי — מהקטיף, דרך הייבוש והקלייה, ועד טעימות בסוף.",
        },
        {
          name: "שוק צ׳יצ׳יקסטננגו",
          time: "ראשון וחמישי · יום שלם",
          level: "קל",
          text: "השוק הגדול וההומה בגואטמלה. שאטל יוצא מסן פדרו ומשאיר כחמש שעות לשוטט.",
        },
        {
          name: "סנטיאגו אטיטלן",
          time: "סירה · חצי יום",
          level: "קל",
          text: "הריכוז הגדול של ילידי המאיה באגם, עבודות אומנות ייחודיות ושוק שוקק בשישי וראשון.",
        },
        {
          name: "ספורט ימי",
          time: "לפי בחירה",
          level: "קל",
          text: "סאפ, אופנועי ים, בננה וסקי מים — הכל על מי האגם.",
        },
        {
          name: "שאטלים והסעות",
          time: "לפי יעד",
          level: "לוגיסטיקה",
          text: "שאטלים ליעדים ברחבי גואטמלה, הסעות פרטיות והזמנת כרטיסים.",
        },
        {
          name: "כביסה",
          time: "יום עבודה",
          level: "שירות",
          text: "כביסה ב-Luxury Atitlán, אחרי ה-Casa Blanca.",
        },
      ],
    },

    solo: {
      title: "מה שיוצאים לעשות לבד",
      lead: "בלי הזמנה, בלי מדריך — פשוט קמים והולכים.",
      items: [
        {
          name: "קיאקים על האגם",
          time: "שעה–שעתיים",
          level: "קל",
          text: "השכרה 40 מטר שמאלה מבית חב״ד. אפשר לחצות את הלגונה לחופים ממול. עדיף בבוקר, לפני שהרוח מתעוררת.",
        },
        {
          name: "סן חואן לה לגונה",
          time: "20 דקות ברגל",
          level: "קל",
          text: "הכפר השכן: תצפית מטורפת, סדנת דבורים נטולות עוקץ, וסדנת צביעת בדים בצבעי צמחים.",
        },
        {
          name: "שוק סן פדרו",
          time: "בוקר",
          level: "קל",
          text: "שוק יומי במעלה הכפר. בראשון בבוקר הוא מתרחב לרחובות נוספים והופך צבעוני במיוחד.",
        },
        {
          name: "אופניים",
          time: "שעה עד 4 שעות",
          level: "קל–בינוני",
          text: "השכרה בכפר, לסיבוב רגוע ברחובות או למסלול רכיבה לאורך האגם עד סן מרקוס.",
        },
        {
          name: "בריכות סולאריות ומים חמים",
          time: "ערב או יום",
          level: "רגיעה",
          text: "הבריכות הסולאריות פועלות בלילה ועד 08:30, וכוללות ג׳קוזי ובריכה קרה. מתחם לוס טרמאלס פתוח כל היום באוויר הפתוח, וגם סאונה יבשה.",
        },
        {
          name: "סן מרקוס",
          time: "סירה 15 דקות",
          level: "קל",
          text: "כפר באווירה רוחנית: שיעורי יוגה והרפיה מול הנוף במרכז אמריטה. יש שם גם מקפצה של 17 מטר לאגם — מרשימה, אבל מסוכנת, ועדיף לוותר על הקפיצה.",
        },
      ],
    },

    beaches: {
      title: "חופי רחצה",
      lead: "אפשר לשחות באגם בזהירות. המים נקיים ברובם, אך אין לשתות מהם.",
      items: [
        {
          name: "חוף הסלעים",
          meta: "5 דקות הליכה",
          text: "ימינה מבית חב״ד. החוף הכי פופולרי בכפר — חובה לשמור על הניקיון.",
        },
        {
          name: "החוף שמשמאל לבית חב״ד",
          meta: "דקות ספורות",
          text: "מעבר למלון לונה אזול. חוף נוח לשהייה ארוכה.",
        },
        {
          name: "חוף פינקה · Finca",
          meta: "טוקטוק + 15 דקות",
          text: "חול שחור-אפור, מבודד ומרגיע. מגיעים בטוקטוק ואז הליכה דרך נקודת תצפית.",
        },
        {
          name: "לאס קריסטלינס",
          meta: "טוקטוק או קיאק",
          text: "מול סן פדרו. אפשר להגיע בטוקטוק או לחתור לשם בקיאק.",
        },
      ],
    },

    villages: {
      title: "כפרים סביב האגם",
      lead: "כל אחד מהם עולם בפני עצמו, וכולם במרחק סירה קצרה.",
      items: [
        {
          name: "פנחצ׳ל",
          meta: "סירה 25 דקות",
          text: "העיירה הגדולה והמתוירת של האגם: מסעדות, שוק עבודות יד ענק, והרבה כספומטים.",
        },
        {
          name: "שמורת טבע אטיטלן",
          meta: "צמוד לפנחצ׳ל",
          text: "שבילי הליכה, גשרים תלויים, תצפיות, חוף פרטי, חוות פרפרים וקופים ואומגות. טיפ: קנו בננות בשוק — תוכלו להאכיל את פרפרי הענק מהיד.",
        },
        {
          name: "סן חואן",
          meta: "20 דקות ברגל",
          text: "תצפית מטורפת, סדנת דבורים נטולות עוקץ, וסדנת צביעת בדים מהצומח.",
        },
        {
          name: "סן מרקוס",
          meta: "סירה 15 דקות",
          text: "אווירה רוחנית ושקטה, יוגה והרפיה מול הנוף, ומקפצה גבוהה אל האגם.",
        },
        {
          name: "סנטיאגו אטיטלן",
          meta: "סירה 25 דקות",
          text: "הריכוז הגדול של ילידי המאיה, עבודות אומנות ושוק שוקק בשישי וראשון.",
        },
        {
          name: "חייבליטו",
          meta: "סירה",
          text: "כפר קטן עם בר-מסעדה על המים (Club Ven Aca), בריכה מרעננת ומפל במעלה הכפר.",
        },
        {
          name: "צונונה",
          meta: "סירה",
          text: "נחל מדהים בכניסה, וסיורי חקלאות אורגנית (Atitlan Organics) שיוצאים בימי שישי.",
        },
        {
          name: "צ׳יצ׳יקסטננגו",
          meta: "שאטל · ראשון וחמישי",
          text: "השוק ההומה והגדול בגואטמלה, כשעתיים וחצי נסיעה מהאגם.",
        },
      ],
    },

    hikes: {
      title: "מסלולי הליכה",
      lead: "שני מסלולים שאפשר לעשות בלי מדריך, על שפת האגם ומעליה.",
      items: [
        {
          name: "מצונונה לחייבליטו",
          time: "כשעתיים",
          level: "קל",
          text: "הליכה על שפת האגם, עם סיום בבריכה של חייבליטו.",
        },
        {
          name: "מסלול סן מרקוס",
          time: "כ-4 שעות",
          level: "קל–בינוני",
          text: "טיפוס מתון על צלע ההר, עם תצפיות פנורמיות עוצרות נשימה.",
        },
      ],
    },

    workshops: {
      title: "סדנאות, קניות ושירותים",
      lead: "כל אלה בתוך הכפר, במרחק הליכה קצר מבית חב״ד.",
      items: [
        {
          title: "קורס ציור בסגנון המאיה",
          text: "סדנה של כשלוש שעות עם האמן ניקולס, בלי צורך בניסיון קודם. הקאנבס נשאר אצלכם. הגלריה ימינה מבית חב״ד.",
        },
        {
          title: "סדנת צורפות",
          text: "יוצרים תכשיט ייחודי מאפס. אפשר לשבת שם עד שלוש שעות בכיף.",
        },
        {
          title: "סדנת חרוזים",
          text: "חוויה ידידותית ומומלצת, ליד הוטל מריה אלנה.",
        },
        {
          title: "אריגה על חפצים · טוני",
          text: "עבודת אריגה שלא נפרמת על מצתים, עטים וצמידים, עם אפשרות לטקסט אישי.",
        },
        {
          title: "תכשיטי מריה אורו",
          text: "חנות זהב, כסף וגולדפילד עם יחס חם והנחות לישראלים. למעלה בכפר.",
        },
        {
          title: "מתפרת רוסריו",
          text: "תיקון בגדים ותיקים, עיצוב דאפו אישי, וקורסים לשזירת צמידים וצמות.",
        },
        {
          title: "מסאז׳ · תמי",
          text: "מטפלת הוליסטית ישראלית מקצועית מאחורי הבודהה בר: שוודי, רקמות עמוק ואבנים חמות.",
        },
        {
          title: "קוסמטיקה · ברנדה",
          text: "משמאל לבית חב״ד — לק ג׳ל, פדיקור, שעווה ותספורות.",
        },
        {
          title: "לימוד ספרדית",
          text: "שיעורים פרטיים אחד-על-אחד עם מורים מקומיים, או מסלול מלא בבית הספר Orbita.",
        },
      ],
    },

    week: {
      title: "הצעה לסדר ימים",
      lead: "לו״ז שבועי מומלץ, אם יש לכם שבוע שלם באגם.",
      days: [
        {
          day: "ראשון",
          text: "בבוקר השוק המקומי בסן פדרו. אחר כך מעבר לסן מרקוס — שמורה וקפיצה לאגם. אפשר להמשיך לחייבליטו.",
        },
        {
          day: "שני",
          text: "לפנות בוקר טיול זריחה לאף האינדיאני. אחרי התרעננות — פנחצ׳ל: שוק, קופים, פרפרים ואומגות. אפשר לשלב מצנח רחיפה.",
        },
        {
          day: "שלישי",
          text: "רכיבה על סוסים עם סיור קפה או חוף פינקה, או שייט קיאקים באגם. לחובבים — קורס ציור.",
        },
        {
          day: "רביעי",
          text: "למטיבי לכת: מסלול הליכה או טיול אופניים. לחלופין — סדנת צורפות, אריגה או שיעור ספרדית. בערב שיעור בבית חב״ד.",
        },
        {
          day: "חמישי",
          text: "בבוקר יציאה לשוק צ׳יצ׳יקסטננגו, או יום פינוק בבריכות החמות ומסאז׳.",
        },
        {
          day: "שישי",
          text: "03:30 יציאה לאף האינדיאני, חזרה ב-09:00 ומנוחה לקראת שבת. בערב קבלת שבת וסעודת ליל שבת בבית חב״ד.",
        },
        {
          day: "שבת קודש",
          text: "10:00 ג׳חנון ופינוקים, סיבוב בכפר, ובצהריים סעודה עם חמין. במוצאי שבת — ערב שייקים וגיטרות.",
        },
      ],
    },
  },

  /* ── אוכל כשר ──────────────────────────────────────────── */
  food: {
    intro:
      "כל מה שמופיע כאן נמצא תחת השגחת בית חב״ד המקומי. אין הכשר חיצוני בגואטמלה — הבשר מיובא ונשחט בפיקוח, והירקות עוברים בדיקה במטבח שלנו.",
    venues: [
      {
        name: 'מסעדת בית חב"ד',
        kind: "מסעדה · בשרי",
        img: IMG.burgers,
        active: true,
        hours: "ראשון–חמישי 12:00–21:00 · שישי עד שעתיים לפני השקיעה",
        text: "המטבח המרכזי. המבורגר על הפלטה, שניצל, מרק עוף, צלחות ישראליות ותפריט צהריים משתנה. בעונה יש גם ארוחת בוקר.",
        highlights: ["המבורגר וצ׳יפס", "מרק עוף עם קניידלך", "שווארמה בשישי"],
      },
      {
        name: "אספרסו בר",
        kind: "בית קפה · חלבי",
        img: IMG.espresso,
        active: true,
        hours: "ראשון–חמישי 08:00–17:00",
        text: "קפה גואטמלי מקומי, קלייה טרייה. סנדוויצ׳ים, טוסטים, מאפים וגלידה. הכי שקט בשעות הבוקר.",
        highlights: ["אספרסו מפולי אטיטלן", "טוסט גבינות", "לימונדה נענע"],
      },
      {
        name: "הפלאפל",
        kind: "מסעדה · בשרי ופרווה",
        img: IMG.falafel,
        active: false,
        hours: "סגור לעונה",
        text: "דוכן הפלאפל בסמטה הראשית, מוסד בפני עצמו אצל מטיילים. נסגר לעונה — עדכונים בוואטסאפ.",
        highlights: ["מנת פלאפל", "סביח", "צ׳יפס בפיתה"],
      },
    ],
    kashrut: {
      title: "על הכשרות",
      items: [
        "הבשר מיובא קפוא בהשגחה, ומגיע חתום. אין רכישת בשר מקומי.",
        "ירקות עלים נבדקים במטבח לפי נהלי בדיקת תולעים.",
        "יין ומיץ ענבים — רק מבושל ובהשגחה.",
        "המסעדה סגורה בשבת ובחג. סעודות מוגשות בבית חב״ד בלבד.",
        "אם אתם צריכים אוכל לדרך — אפשר להזמין חבילות מראש, יום קודם.",
      ],
    },
    tips: {
      title: "טיפים",
      items: [
        "בעונת החגים המסעדה מתמלאת. שווה להגיע מוקדם או להזמין מקום.",
        "יש אפשרות לצמחוני ולטבעוני בכל תפריט — בקשו במטבח.",
        "אלרגיות: תגידו מראש, המטבח קטן ואפשר להתאים.",
      ],
    },
  },

  /* ── לינה ──────────────────────────────────────────────── */
  hotels: {
    intro:
      "כל יחידות האירוח מנוהלות על ידי לוקשרי אטיטלן, במרחק הליכה קצר מבית חב״ד — חשוב במיוחד בשבת, כשלא נוסעים. הסוויטות יושבות במעלה הגבעה, כחמישים מטר מהמים; הדירות ממש על שפת האגם.",
    tips: {
      title: "לפני שמזמינים",
      items: [
        "סגרו את התשלום והמפתח לפני כניסת השבת — אין קבלה פעילה בשבת.",
        "בקשו חדר לא פונה לרחוב הראשי אם אתם ישנים קל; המוזיקה בכפר נמשכת.",
        "בעונת הגשמים (מאי–אוקטובר) בדקו שיש מייבש או מקום לתלות כביסה.",
        "ההזמנה מתבצעת ישירות מול לוקשרי אטיטלן, ב-Airbnb או בוואטסאפ. לשאלות על יחידה מסוימת — כתבו להם.",
      ],
    },
  },

  /* ── שבת ───────────────────────────────────────────────── */
  shabbat: {
    intro:
      "שבת בפדרו היא הדבר שהכי הרבה אנשים זוכרים מהטיול. מאות מטיילים, שולחנות עד סוף החצר, וניגון שממשיך הרבה אחרי שהאוכל נגמר.",
    steps: {
      title: "איך נרשמים",
      items: [
        {
          n: "01",
          title: "ממלאים טופס",
          text: "טופס קצר: שם, מספר סועדים, ולאיזו סעודה — ליל שבת, שבת בצהריים, או שתיהן.",
        },
        {
          n: "02",
          title: "משלימים תשלום",
          text: "התשלום מתבצע באותו טופס. הוא מכסה חלק מעלות האוכל וההכנות, ומאפשר לנו לדעת לכמה לבשל.",
        },
        {
          n: "03",
          title: "מגיעים",
          text: "נחזור אליכם בוואטסאפ עם השעה המדויקת — היא משתנה כל שבוע לפי השקיעה. בואו קצת קודם, כדי להספיק להתפלל.",
        },
      ],
      note: "ההרשמה והתשלום נסגרים ביום חמישי ב־20:00 שעון מקומי. אחרי זה כבר קשה לנו להוסיף מנות — אז עדיף להקדים.",
    },
    bring: {
      title: "מה כדאי להביא",
      items: [
        "שכבה חמה — בערב יורדת טמפרטורה ליד המים.",
        "פנס קטן, הרחובות בכפר חשוכים אחרי הסעודה.",
        "את ההרשמה והתשלום השלימו מראש — בשבת עצמה לא מטפלים בכסף.",
        "ניגון אחד שאתם אוהבים. באמת.",
      ],
    },
    holidays: {
      title: "חגים",
      text: "בראש השנה, סוכות, פסח ושבועות התוכנית מתרחבת: תפילות מלאות, סעודות חג, תקיעת שופר, סוכה גדולה בחצר, וסדר פסח לכמה מאות איש. ההרשמה לחגים נפתחת כחודש מראש ומתמלאת מהר.",
    },
  },

  /* ── בית הכנסת ─────────────────────────────────────────── */
  synagogue: {
    body: [
      "בית הכנסת נמצא בקומה השנייה של בית חב״ד. הוא לא גדול ולא מפואר — כמה שורות ספסלים, ארון קודש מעץ, ובימה פשוטה במרכז.",
      "יש בו ספר תורה כשר, סידורי תהילת ה׳ בעברית ובאנגלית, חומשים, וארון עם טליתות ותפילין למי שהגיע בלי. בשבתות העמוסות של העונה הקהל גולש אל החצר, ומי שמאחר מוצא את עצמו מתפלל מתחת לכוכבים.",
      "זהו בית כנסת פעיל: תפילות ושיעורים לאורך כל היום, כל השנה. בעונה השקטה זה לפעמים דורש קצת מאמץ — אם אתם בכפר ואתם העשירי, אתם באמת העשירי.",
    ],
    features: [
      { k: "ספר תורה", v: "כשר, נבדק" },
      { k: "סידורים", v: "עברית · אנגלית · תעתיק" },
      { k: "טלית ותפילין", v: "זמינים במקום" },
      { k: "עזרת נשים", v: "מחיצה קבועה" },
      { k: "מיקום", v: "קומה שנייה" },
      { k: "מיזוג", v: "כן, ועובד" },
    ],
  },

  /* ── מקווה ─────────────────────────────────────────────── */
  mikvah: {
    body: [
      "בבית חב״ד פדרו שני מקוואות נפרדים: מקווה גברים ומקווה נשים. שניהם נבנו לפי כל הדקדוקים ההלכתיים, ושניהם מטופחים, נקיים ופרטיים לחלוטין.",
      "השימוש בתיאום מראש בלבד — כדי לוודא שהמקום פנוי, מחומם ומוכן, ושהבלנית תהיה שם.",
    ],
    steps: [
      {
        n: "01",
        title: "יצירת קשר",
        text: "הודעת וואטסאפ לרבנית, עדיף יומיים מראש. אפשר גם באנגלית.",
      },
      {
        n: "02",
        title: "תיאום שעה",
        text: "נקבע שעה אחרי צאת הכוכבים. בשבת וחג — בתיאום מיוחד.",
      },
      {
        n: "03",
        title: "הגעה",
        text: "חדר הכנה פרטי עם כל מה שצריך. הבלנית מלווה במידת הצורך.",
      },
    ],
    privacy:
      "כל פנייה נשמרת בדיסקרטיות מוחלטת. אין רישום, אין שמות, ואין מי שיודע חוץ מהרבנית.",
  },

  /* ── אירועים ───────────────────────────────────────────── */
  events: {
    intro:
      "מעבר לשבתות ולחגים, יש בבית חב״ד קצב שבועי קבוע של שיעורים ותפילות. לסעודות ולאירועים שדורשים מאיתנו התארגנות מראש — שבתות, חגים וערבי חג — נדרשת הרשמה ותשלום דרך הטופס המקוון.",
    weekly: {
      title: "קבוע בשבוע",
      items: [
        {
          day: "א׳–ה׳",
          title: "שיעור חסידות",
          time: "09:00",
          text: "פותחים את היום בלימוד חסידות. לאט, בלי ידע מוקדם, עם קפה.",
        },
        {
          day: "א׳–ה׳",
          title: "תפילת שחרית",
          time: "10:00",
          text: "טלית ותפילין במקום לכל מי שרוצה להניח.",
        },
        {
          day: "א׳–ה׳",
          title: "שיעור תניא",
          time: "17:00",
          text: "פרק ליום, בעברית פשוטה. אפשר להצטרף באמצע.",
        },
        {
          day: "א׳–ה׳",
          title: "שיעור פרשת השבוע",
          time: "19:00",
          text: "חצי שעה על הפרשה. מתאים גם למי שלא פתח חומש מאז בית הספר.",
        },
        {
          day: "א׳–ה׳",
          title: "שיעור גמרא · ואחריו ערבית",
          time: "21:00",
          text: "לומדים דף, ומתפללים ערבית בסיום השיעור.",
        },
        {
          day: "רביעי",
          title: "ערב החלטות טובות",
          time: "בערב",
          text: "ערב מיוחד אחת לשבוע — קבלת החלטה טובה אחת, יחד.",
        },
        {
          day: "ליל שבת",
          title: "התוועדות חסידית ועונג שבת",
          time: "אחרי הסעודה",
          text: "ניגונים, לחיים וסיפורים. נגמר מתי שנגמר.",
        },
        {
          day: "שבת",
          title: "התוועדות בבית הכנסת",
          time: "13:00",
          text: "אחרי התפילה, לפני הקידוש. פחות מילים, יותר שירה.",
        },
      ],
    },
    note: "בעונה השקטה חלק מהשיעורים משתנים או מתאחדים. שווה לוודא בוואטסאפ.",
  },

  /* ── תרומה ─────────────────────────────────────────────── */
  donation: {
    body: [
      "דמי ההרשמה לסעודות שבת, לחגים ולאירועים מכסים חלק קטן מן העלות האמיתית. כל השאר — מיטה בחירום, ליווי לבית חולים, ארוחה חמה למי שנגמר לו הכסף בדרך — עובד רק בגלל שאנשים שכבר היו כאן, או שמעו על המקום, בוחרים לתת.",
      "כל תרומה הולכת ישירות לפעילות: אוכל, גז, חשמל, ספרים, ציוד למקווה, וכרטיסי אוטובוס למי שנתקע. אין כאן משרד, אין שכר, ואין תקורה.",
    ],
    ways: {
      title: "דרכים נוספות לעזור",
      items: [
        {
          title: "להביא ציוד",
          text: "ספרי קודש בעברית, טליתות, ספרים לספרייה — כל דבר שאפשר לסחוב במזוודה.",
        },
        {
          title: "לבשל ולסדר",
          text: "בעונת החגים תמיד חסרות ידיים. יום עבודה במטבח שווה הרבה.",
        },
        {
          title: "לספר לאחרים",
          text: "רוב האנשים מגיעים לכאן כי מישהו אמר להם. תגידו.",
        },
        {
          title: "לחזור",
          text: "הכי טוב שיש. הדלת נשארת פתוחה.",
        },
      ],
    },
  },

  /* ── שאלות נוספות ──────────────────────────────────────── */
  faqExtra: [
    {
      q: "אפשר להגיע עם ילדים?",
      a: "בהחלט. יש מקום לרוץ בחצר, והשולחן רועש ממילא. בעונה יש לפעמים פעילות לילדים בשבת אחר הצהריים.",
    },
    {
      q: "יש איפה להתפלל בשבת אם לא נרשמתי לסעודה?",
      a: "כן. התפילות והשיעורים פתוחים תמיד ואינם דורשים הרשמה — ההרשמה והתשלום נוגעים לסעודות ולאירועים בלבד.",
    },
    {
      q: "אפשר לשלוח חבילה או דואר לבית חב״ד?",
      a: "עדיף לא. הדואר לגואטמלה איטי ולא אמין. אם אתם צריכים משהו דחוף — דברו איתנו קודם.",
    },
    {
      q: "אני מגיע בערב ראש השנה בלי הרשמה. יש סיכוי?",
      a: "תמיד יש סיכוי, אבל בחגים המקום מתמלא לגמרי. תשלחו הודעה כמה שיותר מוקדם, גם אם זה יומיים לפני.",
    },
  ],
};

/* ────────────────────────────────────────────────────────────
   English
   ──────────────────────────────────────────────────────────── */
const en: typeof he = {
  chabadHouse: {
    quote: {
      text: "There is no such thing as a distant Jew. Only one who hasn't walked in yet.",
      source: "Overheard at the Shabbat table in Pedro",
    },
    inside: {
      title: "What's in the house",
      lead: "Three floors, one courtyard, and enough plastic chairs to seat half the town.",
      items: [
        {
          title: "The prayer hall",
          text: "On the second floor. A Torah scroll, an ark built from wood, siddurim in Hebrew and English, and tallit and tefillin for anyone who wants to put them on.",
        },
        {
          title: "The restaurant",
          text: "A supervised meat kitchen, long tables, and a menu that changes with whatever arrived from the market that morning.",
        },
        {
          title: "The courtyard",
          text: "Where conversations end at two in the morning. On Sukkot it becomes the largest sukkah in Guatemala.",
        },
        {
          title: "The library",
          text: "A shelf of Tanya, Gemaras, chassidut, and a pile of paperbacks travellers left behind. Take one, return it, or don't.",
        },
        {
          title: "The mikvaot",
          text: "Men's and women's mikvahs, completely separate and built to every specification. The women's mikvah is by appointment, with a private preparation room.",
        },
        {
          title: "The information desk",
          text: "Maps, recommendations, numbers of guides we actually trust, and a SIM card if you forgot to buy one in the street.",
        },
      ],
    },
    weekly: {
      title: "The week at Chabad",
      daily: {
        title: "Daily schedule · Sunday–Thursday",
        rows: [
          { t: "09:00", a: "Chassidut class" },
          { t: "10:00", a: "Shacharit" },
          { t: "17:00", a: "Tanya class" },
          { t: "19:00", a: "Weekly parsha class" },
          { t: "21:00", a: "Gemara class, followed by Maariv" },
        ],
        note: "On Wednesday there's also a 'good resolutions' evening.",
      },
      shabbatEve: {
        title: "Friday night",
        rows: [
          { t: "", a: "Mincha" },
          { t: "", a: "Maariv" },
          { t: "", a: "Kiddush" },
          { t: "", a: "Friday night meal" },
          { t: "", a: "Chassidic farbrengen and oneg Shabbat" },
        ],
      },
      shabbatDay: {
        title: "Shabbat day",
        rows: [
          { t: "10:00", a: "Jachnun" },
          { t: "", a: "Shacharit" },
          { t: "13:00", a: "Farbrengen in the synagogue" },
          { t: "14:00", a: "Kiddush, hot salads and desserts — Shabbat lunch" },
          { t: "", a: "Mincha" },
          {
            t: "",
            a: "About half an hour before Shabbat ends: niggunim, a chassidic teaching and Maariv",
          },
          { t: "", a: "Havdalah at nightfall" },
        ],
      },
    },
    team: {
      title: "Who holds the place together",
      text: "The Rabbi and Rebbetzin, the Rebbe's emissaries to Guatemala, run the house together with a team of young men who come for the busy seasons. They cook, they host, they rebook emergency flights, they sit in hospital waiting rooms, and sometimes they just listen. There are no office hours.",
    },
  },

  touristInfo: {
    health: {
      title: "Health & medicine",
      items: [
        "A local clinic operates in the village and is available during the day.",
        "Bring travel insurance that covers hiking and water sports.",
        "There are English-speaking doctors in the area.",
        "For emergencies there is a hospital.",
        "WhatsApp support from Chabad House at any hour.",
      ],
    },
    money: {
      title: "Everyday logistics",
      items: [
        "Laundry: you can do laundry at Luxury Atitlán, after Casa Blanca.",
        "Getting around the village: tuk-tuks are everywhere, and rides within San Pedro are cheap.",
        "Internet: free Wi‑Fi at Chabad House, and good cell coverage around the lake.",
        "Local SIM cards (Tigo / Claro) are sold in the street.",
        "Most places now accept cards, but it's still better to bring cash.",
      ],
    },
    phrases: {
      title: "Survival Spanish",
      lead: "Five phrases that will open doors in the village.",
      items: [
        { es: "Buenos días", he: "Good morning" },
        { es: "¿Cuánto cuesta?", he: "How much is it?" },
        { es: "Sin carne, por favor", he: "No meat, please" },
        { es: "¿Dónde está el muelle?", he: "Where is the dock?" },
        { es: "Gracias, muy amable", he: "Thank you, very kind" },
      ],
    },
  },

  thingsToDo: {
    intro:
      "Lake Atitlán is one of the most beautiful places on earth, and San Pedro gives you something to do every single day — sunrises, villages, markets, hot pools and workshops. We have gathered it all in three layers: what leaves from the Chabad House, what Luxury Atitlán can arrange, and what you simply go and do yourself.",
    note:
      "All of these activities start from the lake area. Plan your return before sunset on Friday.",

    chabad: {
      title: "What the Chabad House offers",
      lead: "Everything here leaves from the house itself.",
      items: [
        {
          title: "Indian Nose viewpoint",
          time: "Monday & Friday · 03:30",
          text: "A sunrise trip leaving from the Chabad House: half an hour by road, a short climb, and at the top an Israeli breakfast, tea and cake, tefillin, and a view you won't forget. Back around 08:30.",
        },
        {
          title: "Daily classes",
          time: "Sunday — Thursday",
          text: "Chassidut at 09:00, Tanya at 17:00, the weekly parsha at 19:00, and Gemara at 21:00 followed by Maariv. Wednesday also holds an evening of good resolutions.",
        },
        {
          title: "Kabbalat Shabbat & Friday night meal",
          time: "Friday",
          text: "Mincha and Maariv, kiddush and a proper meal, followed by a chassidic farbrengen and Oneg Shabbat. Registration and payment in advance.",
        },
        {
          title: "Shabbat",
          time: "Saturday",
          text: "Jachnun at 10:00, Shacharit, a farbrengen at 13:00, and kiddush with hot salads and desserts at 14:00.",
        },
        {
          title: "Motzaei Shabbat",
          time: "Saturday night",
          text: "Shakes and guitars at the Chabad House — the best way to close Shabbat and open the week.",
        },
        {
          title: "Information desk",
          time: "All week",
          text: "Maps, recommendations, numbers of guides we trust, and any question at all — on WhatsApp, any hour.",
        },
      ],
    },

    luxury: {
      title: "Through Luxury Atitlán",
      lead: "Almost every trip, workshop or transfer in the village can be booked with one WhatsApp message to the Luxury Atitlán desk.",
      cta: "Book on WhatsApp",
      items: [
        {
          name: "Indian Nose · Nariz del Indio",
          time: "Leave 03:30 · back 08:30",
          level: "Sunrise",
          text: "Half an hour by road, a short climb, and the famous view of the lake with its three volcanoes at sunrise.",
        },
        {
          name: "San Pedro volcano",
          time: "About 4 hours",
          level: "Hard",
          text: "An 800-metre climb up to 2,995m. You leave at sunrise, and a local guide is mandatory. The volcano is not active.",
        },
        {
          name: "Ziplines at the Atitlán reserve",
          time: "1.5–2 hours",
          level: "Adrenaline",
          text: "The standard route runs 8 cables; the harder, better route runs 7 long cables over waterfalls and forest. Departures at 09:00, 11:00, 13:00 and 15:00.",
        },
        {
          name: "Panajachel & the nature reserve",
          time: "Full day · 25 min by boat",
          level: "Easy",
          text: "The lake's busiest town with its huge handicraft market, and next to it a reserve with hanging bridges, viewpoints, a private beach, and butterfly and monkey farms.",
        },
        {
          name: "Paragliding over the lake",
          time: "About 25 minutes airborne",
          level: "Adrenaline",
          text: "Flying with world champions, launching above the lagoon and seeing the whole lake from the air.",
        },
        {
          name: "Horse riding",
          time: "About two hours",
          level: "Easy",
          text: "You start in the village streets and finish at a gallop towards a viewpoint. The route can be extended to Finca beach.",
        },
        {
          name: "Coffee tour · Las Cristalinas",
          time: "About 3 hours",
          level: "Easy",
          text: "The whole journey of Guatemalan coffee — picking, drying, roasting, and tasting at the end.",
        },
        {
          name: "Chichicastenango market",
          time: "Sunday & Thursday · full day",
          level: "Easy",
          text: "The largest market in Guatemala. A shuttle leaves San Pedro and gives you around five hours to wander.",
        },
        {
          name: "Santiago Atitlán",
          time: "Boat · half a day",
          level: "Easy",
          text: "The largest Maya community on the lake, distinctive craftwork, and a busy market on Friday and Sunday.",
        },
        {
          name: "Water sports",
          time: "Your choice",
          level: "Easy",
          text: "SUP, jet skis, banana rides and water skiing — all on the lake.",
        },
        {
          name: "Shuttles & transfers",
          time: "By destination",
          level: "Logistics",
          text: "Shuttles across Guatemala, private transfers and ticket booking.",
        },
        {
          name: "Laundry",
          time: "One working day",
          level: "Service",
          text: "Laundry at Luxury Atitlán, just after Casa Blanca.",
        },
      ],
    },

    solo: {
      title: "What you can do on your own",
      lead: "No booking, no guide — just get up and go.",
      items: [
        {
          name: "Kayaking on the lake",
          time: "One to two hours",
          level: "Easy",
          text: "Rental 40 metres to the left of the Chabad House. You can paddle across the lagoon to the beaches opposite. Best in the morning, before the wind picks up.",
        },
        {
          name: "San Juan La Laguna",
          time: "20 minutes on foot",
          level: "Easy",
          text: "The neighbouring village: a spectacular viewpoint, a stingless-bee workshop, and natural plant-dye textile workshops.",
        },
        {
          name: "San Pedro market",
          time: "Morning",
          level: "Easy",
          text: "A daily market up in the village. On Sunday morning it spills into the surrounding streets and turns especially colourful.",
        },
        {
          name: "Bicycles",
          time: "One to four hours",
          level: "Easy–moderate",
          text: "Rent in the village for a gentle ride through the streets, or a longer route along the lake to San Marcos.",
        },
        {
          name: "Solar pools & hot springs",
          time: "Evening or day",
          level: "Relaxing",
          text: "The solar pools run at night and until 08:30, with a jacuzzi and a cold pool. Los Termales is open all day in the open air, and has a dry sauna too.",
        },
        {
          name: "San Marcos",
          time: "15 minutes by boat",
          level: "Easy",
          text: "A village with a spiritual atmosphere: yoga and relaxation classes facing the view. There is also a 17-metre diving platform into the lake — impressive, but dangerous, and better skipped.",
        },
      ],
    },

    beaches: {
      title: "Swimming spots",
      lead: "You can swim in the lake carefully. The water is mostly clean, but should not be drunk.",
      items: [
        {
          name: "The rock beach",
          meta: "5 minutes on foot",
          text: "To the right of the Chabad House. The most popular spot in the village — please keep it clean.",
        },
        {
          name: "The beach to the left",
          meta: "A few minutes",
          text: "Past Hotel Luna Azul. A comfortable beach for a long afternoon.",
        },
        {
          name: "Finca beach",
          meta: "Tuk-tuk + 15 minutes",
          text: "Black-grey sand, isolated and calm. Tuk-tuk, then a walk through a viewpoint.",
        },
        {
          name: "Las Cristalinas",
          meta: "Tuk-tuk or kayak",
          text: "Opposite San Pedro. Reachable by tuk-tuk, or paddle there by kayak.",
        },
      ],
    },

    villages: {
      title: "Villages around the lake",
      lead: "Each one is a world of its own, and all are a short boat ride away.",
      items: [
        {
          name: "Panajachel",
          meta: "25 minutes by boat",
          text: "The lake's largest and most touristic town: restaurants, an enormous handicraft market, and plenty of ATMs.",
        },
        {
          name: "Atitlán nature reserve",
          meta: "Next to Panajachel",
          text: "Walking trails, hanging bridges, viewpoints, a private beach, butterfly and monkey farms, and ziplines. Tip: buy bananas at the market — you can feed the giant butterflies from your hand.",
        },
        {
          name: "San Juan",
          meta: "20 minutes on foot",
          text: "A spectacular viewpoint, a stingless-bee workshop, and plant-dye textile workshops.",
        },
        {
          name: "San Marcos",
          meta: "15 minutes by boat",
          text: "A quiet, spiritual atmosphere, yoga facing the view, and a high diving platform into the lake.",
        },
        {
          name: "Santiago Atitlán",
          meta: "25 minutes by boat",
          text: "The largest Maya community, distinctive craftwork, and a bustling market on Friday and Sunday.",
        },
        {
          name: "Jaibalito",
          meta: "By boat",
          text: "A tiny village with a bar-restaurant on the water (Club Ven Aca), a refreshing pool, and a waterfall up the hill.",
        },
        {
          name: "Tzununa",
          meta: "By boat",
          text: "A beautiful stream at the entrance, and organic farming tours (Atitlan Organics) that run on Fridays.",
        },
        {
          name: "Chichicastenango",
          meta: "Shuttle · Sun & Thu",
          text: "The biggest and busiest market in Guatemala, about two and a half hours from the lake.",
        },
      ],
    },

    hikes: {
      title: "Walking routes",
      lead: "Two routes you can do without a guide, along the lake and above it.",
      items: [
        {
          name: "Tzununa to Jaibalito",
          time: "About two hours",
          level: "Easy",
          text: "A walk along the lake shore, finishing at the pool in Jaibalito.",
        },
        {
          name: "The San Marcos route",
          time: "About 4 hours",
          level: "Easy–moderate",
          text: "A gentle climb along the mountainside, with panoramic views the whole way.",
        },
      ],
    },

    workshops: {
      title: "Workshops, shopping & services",
      lead: "All of these are inside the village, a short walk from the Chabad House.",
      items: [
        {
          title: "Maya-style painting course",
          text: "A three-hour workshop with the artist Nicolas, no experience needed. The canvas is yours to keep. The gallery is to the right of the Chabad House.",
        },
        {
          title: "Silversmithing workshop",
          text: "Make a piece of jewellery from scratch. You can happily spend three hours there.",
        },
        {
          title: "Beading workshop",
          text: "A friendly, highly recommended session next to Hotel Maria Elena.",
        },
        {
          title: "Woven objects · Tony",
          text: "Weaving that never unravels, on lighters, pens and bracelets, with the option of personal text.",
        },
        {
          title: "Maria Oro jewellery",
          text: "Gold, silver and gold-filled, with a warm welcome and discounts for Israelis. Up in the village.",
        },
        {
          title: "Rosario's tailoring",
          text: "Clothing and bag repairs, custom designs, and courses in braiding bracelets.",
        },
        {
          title: "Massage · Tami",
          text: "A professional Israeli holistic therapist behind the Buddha Bar: Swedish, deep tissue and hot stones.",
        },
        {
          title: "Beauty · Brenda",
          text: "To the left of the Chabad House — gel nails, pedicure, waxing and haircuts.",
        },
        {
          title: "Spanish lessons",
          text: "One-to-one private lessons with local teachers, or a full course at the Orbita school.",
        },
      ],
    },

    week: {
      title: "A suggested week",
      lead: "If you have a full week on the lake, this is how we would spend it.",
      days: [
        {
          day: "Sunday",
          text: "The local market in San Pedro in the morning, then over to San Marcos for the reserve and a swim. You can carry on to Jaibalito.",
        },
        {
          day: "Monday",
          text: "Sunrise trip to Indian Nose before dawn. After freshening up — Panajachel: market, monkeys, butterflies and ziplines. Paragliding fits in here too.",
        },
        {
          day: "Tuesday",
          text: "Horse riding with a coffee tour or Finca beach, or kayaking on the lake. If you'd rather sit still — the painting course.",
        },
        {
          day: "Wednesday",
          text: "For the energetic: a walking route or a bike ride. Otherwise silversmithing, weaving or a Spanish lesson. In the evening, a class at the Chabad House.",
        },
        {
          day: "Thursday",
          text: "The Chichicastenango market in the morning, or a slow day at the hot pools with a massage.",
        },
        {
          day: "Friday",
          text: "03:30 out to Indian Nose, back by 09:00 and rest before Shabbat. In the evening, Kabbalat Shabbat and the Friday night meal at the Chabad House.",
        },
        {
          day: "Shabbat",
          text: "10:00 jachnun and treats, a walk around the village, and lunch with cholent. On Saturday night — shakes and guitars.",
        },
      ],
    },
  },

  food: {
    intro:
      "Everything listed here is under local Chabad supervision. There is no external kashrut authority in Guatemala — meat is imported and sealed under supervision, and vegetables are checked in our own kitchen.",
    venues: [
      {
        name: "Chabad House Restaurant",
        kind: "Restaurant · Meat",
        img: IMG.burgers,
        active: true,
        hours: "Sun–Thu 12:00–21:00 · Friday until two hours before sunset",
        text: "The main kitchen. Burgers off the plancha, schnitzel, chicken soup, Israeli plates and a rotating lunch menu. In season there's breakfast too.",
        highlights: ["Burger and chips", "Chicken soup with kneidlach", "Friday shawarma"],
      },
      {
        name: "Espresso Bar",
        kind: "Café · Dairy",
        img: IMG.espresso,
        active: true,
        hours: "Sun–Thu 08:00–17:00",
        text: "Local Guatemalan coffee, freshly roasted. Sandwiches, toasties, pastries and ice cream. Quietest in the morning.",
        highlights: ["Espresso from Atitlán beans", "Cheese toastie", "Mint lemonade"],
      },
      {
        name: "Hafalafel",
        kind: "Restaurant · Meat & Parve",
        img: IMG.falafel,
        active: false,
        hours: "Closed for the season",
        text: "The falafel stand on the main lane, an institution among travellers. Closed for the season — updates on WhatsApp.",
        highlights: ["Falafel plate", "Sabich", "Chips in pita"],
      },
    ],
    kashrut: {
      title: "About the kashrut",
      items: [
        "Meat is imported frozen under supervision and arrives sealed. No local meat is purchased.",
        "Leafy vegetables are checked in the kitchen following standard insect-checking procedure.",
        "Wine and grape juice — mevushal and supervised only.",
        "The restaurant is closed on Shabbat and festivals. Meals are served at the Chabad House only.",
        "Need food for the road? Packed meals can be ordered a day ahead.",
      ],
    },
    tips: {
      title: "Tips",
      items: [
        "In festival season the restaurant fills up. Come early or reserve a table.",
        "Vegetarian and vegan options exist on every menu — just ask the kitchen.",
        "Allergies: tell us in advance. The kitchen is small and can adapt.",
      ],
    },
  },

  hotels: {
    intro:
      "Every unit is run by Luxury Atitlán and sits a short walk from the Chabad House — which matters most on Shabbat, when nobody drives. The suites are up the hillside, some fifty metres from the water; the apartments are right on the shore.",
    tips: {
      title: "Before you book",
      items: [
        "Settle payment and collect your key before Shabbat comes in — no reception operates on Shabbat.",
        "Ask for a room away from the main street if you're a light sleeper; the village music runs late.",
        "In the rainy season (May–October) check there's a dryer or somewhere to hang laundry.",
        "Booking is direct with Luxury Atitlán, on Airbnb or over WhatsApp. For a question about a specific unit, message them.",
      ],
    },
  },

  shabbat: {
    intro:
      "Shabbat in Pedro is the thing most people remember from the whole trip. Hundreds of travellers, tables reaching the end of the courtyard, and singing that carries on long after the food is gone.",
    steps: {
      title: "How to register",
      items: [
        {
          n: "01",
          title: "Fill in the form",
          text: "A short registration form: your name, how many people, and which meal — Friday night, Shabbat lunch, or both.",
        },
        {
          n: "02",
          title: "Get confirmed",
          text: "We'll come back on WhatsApp with an exact time. It shifts every week with the sunset.",
        },
        {
          n: "03",
          title: "Show up",
          text: "Twenty minutes early if you want to pray first. Coming just for the meal is fine too.",
        },
      ],
      note: "Registration closes Thursday at 20:00 local time. After that — still come, we just can't promise you a seat.",
    },
    bring: {
      title: "What to bring",
      items: [
        "A warm layer — the temperature drops by the water in the evening.",
        "A small torch; the village streets are dark after the meal.",
        "If you want to give, bring cash — but only before or after Shabbat.",
        "One niggun you love. Seriously.",
      ],
    },
    holidays: {
      title: "Festivals",
      text: "On Rosh HaShanah, Sukkot, Pesach and Shavuot the programme expands: full services, festival meals, shofar blowing, a large sukkah in the courtyard, and a Seder for several hundred people. Festival registration opens about a month ahead and fills fast.",
    },
  },

  synagogue: {
    body: [
      "The synagogue is on the second floor of the Chabad House. It is neither large nor grand — a few rows of benches, a wooden ark, and a simple bimah in the middle.",
      "Inside there is a kosher Torah scroll, Tehillat Hashem siddurim in Hebrew and English, chumashim, and a cupboard of tallitot and tefillin for anyone who arrived without. On busy Shabbatot in season the crowd spills into the courtyard, and whoever comes late ends up praying under the stars.",
      "This is an active synagogue: prayers and classes throughout the day, all year. In the quiet season that sometimes takes effort — if you're in the village and you're the tenth man, you really are the tenth man.",
    ],
    features: [
      { k: "Torah scroll", v: "Kosher, checked" },
      { k: "Siddurim", v: "Hebrew · English · transliteration" },
      { k: "Tallit & tefillin", v: "Available on site" },
      { k: "Women's section", v: "Permanent mechitza" },
      { k: "Location", v: "Second floor" },
      { k: "Air conditioning", v: "Yes, and it works" },
    ],
  },

  mikvah: {
    body: [
      "The mikvah was built at the Chabad House to every halachic specification, and serves women from the community as well as travellers passing through. It is well kept, clean, and completely private.",
      "Use is by appointment only — so that the space is available, heated and prepared, and so the attendant is there.",
    ],
    steps: [
      {
        n: "01",
        title: "Get in touch",
        text: "A WhatsApp message to the Rebbetzin, ideally two days ahead. English is fine.",
      },
      {
        n: "02",
        title: "Agree a time",
        text: "We'll set a time after nightfall. Shabbat and festivals by special arrangement.",
      },
      {
        n: "03",
        title: "Arrive",
        text: "A private preparation room with everything you need. An attendant assists if wanted.",
      },
    ],
    privacy:
      "Every enquiry is kept in complete discretion. No register, no names, and nobody knows but the Rebbetzin.",
  },

  events: {
    intro:
      "Beyond Shabbat and the festivals, the Chabad House keeps a weekly rhythm of classes and prayers. Anything we prepare in advance — Shabbat, festivals and festival evenings — requires registration and payment through the online form.",
    weekly: {
      title: "Every week",
      items: [
        {
          day: "Monday",
          title: "Parsha class",
          time: "20:30",
          text: "Half an hour on the weekly portion, in plain language, with coffee. Suitable for anyone who hasn't opened a chumash since school.",
        },
        {
          day: "Tuesday",
          title: "Chassidut class",
          time: "20:30",
          text: "Learning Tanya and chassidic discourses. Slowly, no prior knowledge needed.",
        },
        {
          day: "Wednesday",
          title: "Women's class",
          time: "18:00",
          text: "Learning and conversation with the Rebbetzin. At home, around a table.",
        },
        {
          day: "Thursday",
          title: "Challah separation",
          time: "19:00",
          text: "Knead the dough, separate challah, light a candle. One of the most loved evenings of the week.",
        },
        {
          day: "Friday",
          title: "Friday night farbrengen",
          time: "After the meal",
          text: "Niggunim, l'chaim, stories. It ends when it ends.",
        },
        {
          day: "Shabbat",
          title: "Shabbat farbrengen",
          time: "12:45",
          text: "After prayers, around the kiddush. Fewer words, more singing.",
        },
      ],
    },
    note: "In the quiet season some classes shift or merge. Worth confirming on WhatsApp.",
  },

  donation: {
    body: [
      "Chabad of Pedro does not charge. Not for a Shabbat meal, not for an emergency bed, not for a hospital escort, and not for a hot meal for someone who ran out of money on the road. It only works because people who have been here — or heard about the place — choose to give.",
      "Every donation goes straight into the work: food, gas, electricity, books, mikvah equipment, and bus tickets for whoever is stranded. There is no office, no salary, and no overhead.",
    ],
    ways: {
      title: "Other ways to help",
      items: [
        {
          title: "Bring supplies",
          text: "Hebrew seforim, tallitot, books for the library — anything that fits in a suitcase.",
        },
        {
          title: "Cook and set up",
          text: "In festival season there are never enough hands. A day in the kitchen is worth a lot.",
        },
        {
          title: "Tell people",
          text: "Most people arrive because somebody told them. Tell them.",
        },
        {
          title: "Come back",
          text: "The best one. The door stays open.",
        },
      ],
    },
  },

  faqExtra: [
    {
      q: "Can I come with children?",
      a: "Absolutely. There's room to run in the courtyard, and the table is loud anyway. In season there's sometimes a children's programme on Shabbat afternoon.",
    },
    {
      q: "Can I pray on Shabbat without registering for a meal?",
      a: "Yes. Services are always open and never require registration — even if you're eating somewhere else.",
    },
    {
      q: "Can I post a package to the Chabad House?",
      a: "Better not. Post to Guatemala is slow and unreliable. If you need something urgently, speak to us first.",
    },
    {
      q: "I'm arriving on Rosh HaShanah eve without registering. Any chance?",
      a: "There's always a chance, but the festivals fill completely. Send a message as early as you can, even if that's two days before.",
    },
  ],
};

export type PageExtras = typeof he;

export const extra: Record<Locale, PageExtras> = { he, en };
