export type Locale = "he" | "en";

/* ────────────────────────────────────────────────────────────
   Static site facts
   ──────────────────────────────────────────────────────────── */
export const SITE = {
  lat: 14.6919,
  lng: -91.2717,
  timeZone: "America/Guatemala",
  whatsapp: "https://wa.me/50249727770",
  whatsappDisplay: "+502 4972 7770",
  /** Luxury Atitlán — tours, shuttles, laundry & apartments desk */
  luxuryWhatsapp: "https://wa.me/50254444418",
  luxuryWhatsappDisplay: "+502 5444 4418",
  instagram: "https://www.instagram.com/chabadpedro",
  facebook: "https://www.facebook.com/people/Chabad-Pedro/100001935416900",
  directions:
    "https://www.google.com/maps/dir/?api=1&destination=Chabad+Pedro+La+Laguna",
  /** External Shabbat & holiday registration form */
  registration: "https://app.flowiz.io/pdrr/f/",
  mapEmbed:
    "https://www.google.com/maps?q=San%20Pedro%20La%20Laguna%2C%20Solol%C3%A1%2C%20Guatemala&z=14&output=embed",
} as const;

/* Local imagery already downloaded to /public/img.
   More photography will be layered in later. */
export const IMG = {
  lake: "/img/3077262287.jpg",
  roshHashanah: "/img/1621138024.jpg",
  sukkot: "/img/3185078353.jpg",
  shabbatTable: "/img/4056272442.jpg",
  dough: "/img/1805472156.jpg",
  farbrengen: "/img/218850299.jpg",
  burgers: "/img/2883874980.jpg",
  falafel: "/img/3358755681.jpg",
  espresso: "/img/3871582043.jpg",
  suite5: "/img/1435585282.jpg",
  suite6: "/img/1795380640.jpg",
  suite7: "/img/2268044072.jpg",
  suite8: "/img/2715356649.jpg",
} as const;

export const ROUTES = {
  home: "/",
  chabadHouse: "/chabad-house",
  touristInfo: "/tourist-info",
  thingsToDo: "/things-to-do",
  food: "/food",
  hotels: "/hotels",
  judaism: "/judaism",
  shabbat: "/shabbat",
  prayers: "/judaism/prayers",
  synagogue: "/judaism/synagogue",
  mikvah: "/judaism/mikvah",
  zmanim: "/zmanim",
  events: "/events",
  faq: "/faq",
  donation: "/donation",
} as const;

/* ────────────────────────────────────────────────────────────
   Hebrew (source of truth for the shape)
   ──────────────────────────────────────────────────────────── */
const he = {
  brand: {
    name: 'בית חב"ד פדרו',
    sub: "אגם אטיטלן · גואטמלה",
    monogram: "חב״ד",
  },

  nav: [
    { label: 'בית חב"ד', href: ROUTES.chabadHouse },
    { label: "מידע למטייל", href: ROUTES.touristInfo },
    { label: "מה לעשות", href: ROUTES.thingsToDo },
    { label: "אוכל כשר", href: ROUTES.food },
    { label: "לינה", href: ROUTES.hotels },
    {
      label: "יהדות",
      href: ROUTES.judaism,
      children: [
        { label: "שבת וחג", href: ROUTES.shabbat },
        { label: "הרשמה ותשלום לשבת וחג", href: SITE.registration },
        { label: "תפילות", href: ROUTES.prayers },
        { label: "בית הכנסת", href: ROUTES.synagogue },
        { label: "מקוואות", href: ROUTES.mikvah },
        { label: "זמני היום", href: ROUTES.zmanim },
      ],
    },
    { label: "שאלות נפוצות", href: ROUTES.faq },
  ],

  ui: {
    donate: "תרומה",
    shabbatCta: "שבת וחג",
    menu: "תפריט",
    close: "סגירה",
    details: "פרטים",
    register: "הרשמה",
    registerPay: "הרשמה ותשלום",
    registerShort: "להרשמה",
    registerNote:
      "ההרשמה והתשלום לסעודות שבת, לחגים ולאירועים מתבצעים מראש בטופס אחד.",
    navigate: "ניווט",
    readMore: "קריאה נוספת",
    viewAll: "לכל הפריטים",
    backHome: "חזרה לעמוד הבית",
    language: "English",
    langShort: "EN",
    scroll: "גלול",
    askQuestion: "יש לי שאלה",
    talkToUs: "דברו איתנו בוואטסאפ",
    active: "פעיל",
    inactive: "אינו פעיל כרגע",
    walk: "דקות הליכה מבית חב״ד",
    localTime: "שעון מקומי בפדרו",
  },

  hero: {
    kicker: "סן פדרו לה לגונה · אגם אטיטלן",
    titleLines: ["הבית היהודי", "על שפת האגם"],
    lead: 'בין שלושה הרי געש ומים בצבע אבן חן, יש דלת שתמיד פתוחה. אוכל כשר, בית כנסת פעיל, סעודות שבת וחג, וכתובת אחת לכל מה שתצטרכו בדרך.',
    primary: { label: "מידע למטייל", href: ROUTES.touristInfo },
    secondary: { label: "שבת וחג בפדרו", href: ROUTES.shabbat },
    slides: [
      { src: IMG.lake, caption: "אגם אטיטלן, מבט מן הרכס הצפוני" },
      { src: IMG.shabbatTable, caption: "שולחן שבת בבית חב״ד" },
      { src: IMG.espresso, caption: "בית הקפה הכשר בלב הכפר" },
    ],
    statusLabel: "הדלקת נרות הקרובה",
    statusEndsLabel: "צאת השבת",
  },

  ribbon: [
    "כשרות למהדרין",
    "בית כנסת פעיל",
    "סעודות שבת",
    "מקוואות",
    "ספרייה תורנית",
    "הרשמה מראש",
    "לכל יהודי",
  ],

  quick: {
    kicker: "מדריך מהיר",
    title: "כל מה שצריך לטיול כשר בפדרו",
    travelTitle: "למטיילים באגם אטיטלן",
    travelLead: "מה לעשות, איפה לישון ואיך מגיעים — קישורים ישירים למידע החשוב.",
    items: [
      {
        n: "01",
        title: "מידע למטייל",
        text: "הגעה, כסף, בריאות ובטיחות — כל מה שכדאי לדעת לפני שיורדים מהשאטל.",
        href: ROUTES.touristInfo,
      },
      {
        n: "02",
        title: "מה לעשות",
        text: "טיולים באגם, זריחות, כפרים ושווקים — דרכנו, דרך לוקשרי, או לבד.",
        href: ROUTES.thingsToDo,
      },
      {
        n: "03",
        title: "שבת וחג",
        text: "סעודות, זמנים, והרשמה ותשלום מראש בטופס אחד קצר.",
        href: ROUTES.shabbat,
      },
      {
        n: "04",
        title: "אוכל כשר",
        text: "מסעדה בשרית, בית קפה חלבי ופלאפל — הכל תחת השגחה.",
        href: ROUTES.food,
      },
      {
        n: "05",
        title: "לינה",
        text: "דירות ואכסניות מומלצות, במרחק דקות ספורות מבית חב״ד.",
        href: ROUTES.hotels,
      },
      {
        n: "06",
        title: 'בית חב"ד',
        text: "מי אנחנו, מה יש כאן, וסדר היום והשבת אצלנו.",
        href: ROUTES.chabadHouse,
      },
    ],
  },

  provides: {
    kicker: "מה יש כאן",
    title: 'בית חב"ד פדרו מעמיד לרשותכם',
    items: [
      {
        title: "מרכז מידע למטייל",
        text: "אנשים שמכירים כל שביל באגם, ועונים גם בשתיים בלילה.",
        href: ROUTES.touristInfo,
        img: IMG.lake,
        status: "active",
      },
      {
        title: "סעודות שבת וחג",
        text: "שולחן ארוך, אוכל ביתי, שירים — ומקום פנוי תמיד בשבילכם.",
        href: ROUTES.shabbat,
        img: IMG.shabbatTable,
        status: "active",
      },
      {
        title: "בית כנסת פעיל",
        text: "תפילות ושיעורים לאורך כל היום, עם טלית ותפילין במקום למי שצריך.",
        href: ROUTES.prayers,
        img: IMG.farbrengen,
        status: "active",
      },
      {
        title: "מסעדה כשרה",
        text: "בשרי חם, ארוחות עסקיות והמבורגר שזכה לשם באגם.",
        href: ROUTES.food,
        img: IMG.burgers,
        status: "active",
      },
      {
        title: "המקוואות",
        text: "מקווה גברים ומקווה נשים, נפרדים ומטופחים. הנשים בתיאום מראש.",
        href: ROUTES.mikvah,
        img: IMG.espresso,
        status: "active",
      },
      {
        title: "התוועדויות חסידיות",
        text: "לילות של ניגון, לחיים ומילה טובה — בעיקר בערבי שבת.",
        href: ROUTES.events,
        img: IMG.dough,
        status: "active",
      },
    ],
  },

  about: {
    kicker: "הסיפור",
    title: 'כל מה שרציתם לדעת על בית חב"ד פדרו',
    text: 'שליחות שהתחילה בכמה מזרנים ובקומקום, והפכה לכתובת של אלפי מטיילים בשנה על שפת אגם אטיטלן.',
    cta: { label: 'על בית חב"ד', href: ROUTES.chabadHouse },
  },

  events: {
    kicker: "יומן",
    title: 'אירועים בבית חב"ד',
    viewAll: 'לכל האירועים בבית חב"ד',
    items: [
      {
        tag: "שיעור",
        title: "שיעור תניא",
        date: "ראשון — חמישי",
        time: "17:00",
        img: IMG.dough,
        href: ROUTES.events,
      },
      {
        tag: "ערב מיוחד",
        title: "ערב החלטות טובות",
        date: "כל יום רביעי",
        time: "בערב",
        img: IMG.farbrengen,
        href: ROUTES.events,
      },
      {
        tag: "התוועדות",
        title: "התוועדות שבת קודש",
        date: "שבת, בבית הכנסת",
        time: "13:00",
        img: IMG.farbrengen,
        href: ROUTES.events,
      },
    ],
  },

  shabbatBand: {
    kicker: "כל שבוע מחדש",
    title: "סעודות שבת וחג",
    text: "שולחן ארוך, מרק חם אחרי יום של הליכה, וניגון שנשמע עד האגם. הסעודות דורשות מאיתנו הכנה מראש — לכן ההרשמה והתשלום מתבצעים מראש בטופס אחד, ונסגרים ביום חמישי בערב.",
    cta: { label: "מידע והרשמה", href: ROUTES.shabbat },
  },

  food: {
    kicker: "טעם",
    title: "אוכל כשר בפדרו",
    viewAll: "לכל האוכל הכשר בפדרו",
    items: [
      {
        title: 'מסעדת בית חב"ד',
        tags: ["מסעדה", "בשרי"],
        address: "Chabad Pedro La Laguna, San Pedro La Laguna",
        img: IMG.burgers,
        active: true,
        href: ROUTES.food,
      },
      {
        title: "הפלאפל",
        tags: ["מסעדה", "בשרי", "פרווה"],
        address: "Calle Principal, San Pedro La Laguna",
        img: IMG.falafel,
        active: false,
        href: ROUTES.food,
      },
      {
        title: "אספרסו בר",
        tags: ["בית קפה", "חלבי"],
        address: "Chabad Pedro La Laguna, San Pedro La Laguna",
        img: IMG.espresso,
        active: true,
        href: ROUTES.food,
      },
    ],
  },

  stay: {
    kicker: "לינה",
    title: "לישון על שפת האגם",
    sub: "שני מתחמים במרחק הליכה קצר מבית חב״ד — סוויטות במעלה הגבעה, ודירות ממש מול המים.",
    viewAll: "לכל אפשרויות הלינה",
  },

  zmanim: {
    kicker: "לוח",
    title: "זמני היום בהלכה",
    subtitle: "מחושב לפי מיקומה של סן פדרו לה לגונה",
    note: "הזמנים מחושבים אוטומטית בדפדפן שלכם, לפי קווי האורך והרוחב של סן פדרו ולפי שעון גואטמלה (UTC-6). למעשה הלכה — יש לוודא מול הרב.",
    cta: { label: "לוח זמנים מלא", href: ROUTES.zmanim },
    labels: {
      alot: "עלות השחר",
      misheyakir: "טלית ותפילין",
      sunrise: "הנץ החמה",
      shmaMGA: 'סוף זמן ק"ש (מג"א)',
      shmaGRA: 'סוף זמן ק"ש (גר"א)',
      tfila: "סוף זמן תפילה",
      chatzot: "חצות היום",
      minchaGedola: "מנחה גדולה",
      plag: "פלג המנחה",
      sunset: "שקיעה",
      tzeit: "צאת הכוכבים",
      chatzotNight: "חצות הלילה",
    },
  },

  holidays: {
    kicker: "בקרוב",
    title: "חוגגים יחד",
    items: [
      {
        title: 'ראש השנה תשפ"ז',
        year: "2026",
        text: 'חוגגים יחד עם בית חב"ד פדרו',
        img: IMG.roshHashanah,
        href: ROUTES.shabbat,
      },
      {
        title: 'סוכות תשפ"ז',
        year: "2026",
        text: 'חוגגים יחד עם בית חב"ד פדרו',
        img: IMG.sukkot,
        href: ROUTES.shabbat,
      },
    ],
  },

  findUs: {
    kicker: "מפה",
    title: "כאן תמצאו אותנו",
    name: 'בית חב"ד פדרו גואטמלה',
    address: "Chabad Pedro La Laguna, San Pedro La Laguna, Sololá, Guatemala",
    hint: "שלוש דקות הליכה מהמזח הראשי, בסמטה שמאחורי הכיכר.",
  },

  donate: {
    kicker: "שותפות",
    title: "כל ארוחה כאן ממומנת על ידי מישהו",
    text: "דמי ההרשמה לשבתות ולאירועים מכסים חלק קטן מן העלות. כל השאר — האוכל, הגז, הספרים והעזרה למי שנתקע — מגיע מאנשים שבחרו לתת.",
    cta: { label: "לתרומה מאובטחת", href: ROUTES.donation },
  },

  footer: {
    tagline: "דלת פתוחה על שפת אגם אטיטלן",
    columns: [
      {
        title: "המקום",
        links: [
          { label: 'בית חב"ד', href: ROUTES.chabadHouse },
          { label: "מידע למטייל", href: ROUTES.touristInfo },
          { label: "מה לעשות", href: ROUTES.thingsToDo },
          { label: "אוכל כשר", href: ROUTES.food },
          { label: "לינה", href: ROUTES.hotels },
        ],
      },
      {
        title: "יהדות",
        links: [
          { label: "שבת וחג", href: ROUTES.shabbat },
          { label: "תפילות", href: ROUTES.prayers },
          { label: "בית הכנסת", href: ROUTES.synagogue },
          { label: "מקווה", href: ROUTES.mikvah },
          { label: "זמני היום", href: ROUTES.zmanim },
        ],
      },
      {
        title: "עוד",
        links: [
          { label: "הרשמה ותשלום לשבת וחג", href: SITE.registration },
          { label: "אירועים", href: ROUTES.events },
          { label: "שאלות נפוצות", href: ROUTES.faq },
          { label: "תרומה", href: ROUTES.donation },
        ],
      },
    ],
    rights: 'בית חב"ד פדרו גואטמלה · כל הזכויות שמורות',
    privacy: "מדיניות פרטיות",
    cookies: "שימוש בעוגיות",
  },

  /* ── Subpages ───────────────────────────────────────────── */
  pages: {
    chabadHouse: {
      eyebrow: "הבית",
      title: 'בית חב"ד פדרו',
      lead: 'מקום אחד בגואטמלה שבו אף אחד לא שואל אתכם מאיפה אתם ולמה באתם. פשוט נכנסים.',
      img: IMG.lake,
      body: [
        "סן פדרו לה לגונה יושבת על שפתו הדרומית של אגם אטיטלן, מתחת להר הגעש שנושא את אותו שם. בעשור האחרון הפכה העיירה לתחנה קבועה כמעט של כל מטייל ישראלי בדרום אמריקה — ובלב שלה, בסמטה צדדית קטנה, יש בית חב״ד.",
        "בית חב״ד פדרו פועל כל השנה: בית כנסת פעיל, מסעדה כשרה, מקוואות, ספרייה, וסעודות שבת שמושיבות סביב שולחן אחד מאות מטיילים. בחגים המספרים גדלים — ראש השנה, סוכות ופסח כאן הם אירועים של ממש.",
        "הדלת פתוחה לכל אחד: דתי, חילוני, ישראלי, אמריקאי, לבד או בקבוצה. לסעודות שבת, לחגים ולאירועים שדורשים מאיתנו התארגנות מראש נדרשת הרשמה ותשלום דרך הטופס המקוון — כך אנחנו יודעים לכמה לבשל, ומצליחים לארח מאות אנשים בכל שבוע.",
      ],
      facts: [
        { k: "נוסד", v: "2011" },
        { k: "מטיילים בשנה", v: "אלפי אורחים מכל העולם" },
        { k: "שולחן שבת", v: "עד 300 סועדים בערב שבת" },
        { k: "בית הכנסת", v: "בית כנסת פעיל" },
        { k: "מקוואות", v: "מקווה גברים ומקווה נשים" },
        { k: "שפות", v: "עברית · אנגלית · ספרדית" },
      ],
    },

    touristInfo: {
      eyebrow: "בשטח",
      title: "מידע למטייל",
      lead: "מה שכדאי לדעת לפני שיורדים מהשאטל — הגעה, כסף, בריאות ובטיחות.",
      img: IMG.lake,
      sections: [
        {
          title: "איך מגיעים",
          items: [
            "מגואטמלה סיטי או מאנטיגואה יש שאטל ישיר לסן פדרו — לא לפנחצ׳ל.",
            "השאטל מוריד את הנוסעים ממש ליד בית חב״ד.",
            "הנסיעה אורכת בסביבות ארבע שעות.",
            "תכננו להגיע ביום שישי, הרבה לפני כניסת השבת.",
          ],
        },
        {
          title: "כסף ואשראי",
          items: [
            "המטבע הוא קצאל גואטמלי (GTQ).",
            "יש כספומטים בצומת.",
            "רוב המקומות כבר מקבלים אשראי, אבל תמיד עדיף להביא מזומן.",
            "כרטיס SIM מקומי (Tigo / Claro) נמכר ברחוב ועולה מעט. הכיסוי סביב האגם טוב.",
            "בבית חב״ד יש אינטרנט אלחוטי חופשי לכל אורח.",
          ],
        },
        {
          title: "בטיחות",
          items: [
            "סן פדרו היא מקום בטוח, רגוע ובסדר גמור.",
            "האווירה בכפר נינוחה, והמקומיים מסבירי פנים.",
            "שמרו על הדרכון בכספת — צילום בטלפון מספיק לרוב.",
            "בכל שאלה או בעיה אנחנו זמינים בוואטסאפ, בכל שעה.",
          ],
        },
        {
          title: "מים ושחייה",
          items: [
            "המים באגם נקיים ברובם, אך אין לשתות מהם. מים מינרליים זמינים בכל חנות.",
            "אפשר לשחות באגם בזהירות.",
            "עדיף לא לקפוץ מהמקפצה בסן מרקוס — היא מסוכנת.",
          ],
        },
      ],
    },

    food: {
      eyebrow: "כשרות",
      title: "אוכל כשר בפדרו",
      lead: "הכל תחת השגחת בית חב״ד המקומי. בשרי, חלבי ופרווה — במרחק הליכה.",
      img: IMG.burgers,
      note: "שעות הפעילות משתנות לפי העונה. מומלץ לוודא בוואטסאפ לפני שמגיעים.",
    },

    hotels: {
      eyebrow: "לינה",
      title: "מקומות לישון",
      lead: "סוויטות ודירות על שפת האגם, במרחק הליכה קצר מבית חב״ד.",
      img: IMG.suite7,
      note: "בשבת אין קבלה או תשלום. סדרו הכל ביום חמישי או שישי בבוקר.",
    },

    shabbat: {
      eyebrow: "שבת",
      title: "שבת וחג בפדרו",
      lead: "הרשמה ותשלום לסעודות, סדר התפילות, וכל מה שצריך לדעת לפני כניסת השבת.",
      img: IMG.shabbatTable,
      scheduleNight: [
        { k: "תפילת מנחה", v: "לפני השקיעה" },
        { k: "תפילת ערבית", v: "מיד לאחר מכן" },
        { k: "קידוש", v: "בסיום התפילה" },
        { k: "סעודת ליל שבת", v: "לאחר הקידוש" },
        { k: "התוועדות חסידית ועונג שבת", v: "לאחר הסעודה" },
      ],
      scheduleDay: [
        { k: "ג׳חנון", v: "10:00" },
        { k: "תפילת שחרית", v: "לאחר הג׳חנון" },
        { k: "התוועדות בבית הכנסת", v: "13:00" },
        { k: "קידוש, סלטים חמים וקינוחים", v: "14:00" },
        { k: "תפילת מנחה", v: "לאחר הסעודה" },
        { k: "סדר ניגונים ומאמר חסידות", v: "כחצי שעה לפני צאת השבת" },
        { k: "תפילת ערבית והבדלה", v: "בצאת השבת" },
      ],
      note: "ההרשמה והתשלום לסעודות נסגרים ביום חמישי בשעה 20:00 שעון מקומי.",
    },

    judaism: {
      eyebrow: "יהדות",
      title: "יהדות בפדרו",
      lead: "תפילות, בית כנסת, מקוואות וזמני היום — כל השירותים במקום אחד.",
      img: IMG.farbrengen,
    },

    prayers: {
      eyebrow: "סדר יומי",
      title: "תפילות ושיעורים",
      lead: "בית כנסת פעיל: תפילות ושיעורים לאורך כל היום, כל ימות השנה.",
      img: IMG.farbrengen,
      schedule: [
        { k: "שיעור חסידות", v: "09:00" },
        { k: "תפילת שחרית", v: "10:00" },
        { k: "שיעור תניא", v: "17:00" },
        { k: "שיעור פרשת השבוע", v: "19:00" },
        { k: "שיעור גמרא", v: "21:00" },
        { k: "תפילת ערבית", v: "בסיום שיעור הגמרא" },
      ],
      note: "הסדר הזה נוהג בימים ראשון עד חמישי. ביום רביעי מתקיים גם ערב החלטות טובות. טלית ותפילין זמינים במקום.",
    },

    synagogue: {
      eyebrow: "מקום",
      title: "בית הכנסת",
      lead: "אולם התפילה שבקומה השנייה — ספר תורה, ספרייה, ומזגן שעובד.",
      img: IMG.espresso,
    },

    mikvah: {
      eyebrow: "טהרה",
      title: "המקוואות",
      lead: "בבית חב״ד שני מקוואות נפרדים: מקווה גברים ומקווה נשים.",
      img: IMG.lake,
      note: "מקווה הנשים בתיאום מראש — הודעת וואטסאפ לרבנית, עד יומיים מראש. מקווה הגברים פתוח לפי שעות בית הכנסת.",
    },

    thingsToDo: {
      eyebrow: "האגם",
      title: "מה לעשות",
      lead: "מה שבית חב״ד מציע, מה שאפשר לסדר דרך לוקשרי אטיטלן, ומה שיוצאים לעשות לבד.",
      img: IMG.lake,
      note: "כל הפעילויות הללו יוצאות מאזור האגם. יש לתכנן את החזרה לפני השקיעה בערב שבת.",
    },


    zmanim: {
      eyebrow: "לוח",
      title: "זמני היום בהלכה",
      lead: "מחושב בזמן אמת עבור סן פדרו לה לגונה, אגם אטיטלן.",
      img: IMG.lake,
    },

    events: {
      eyebrow: "יומן",
      title: "אירועים",
      lead: "שיעורים יומיים, התוועדויות, ערב החלטות טובות וערבי חג.",
      img: IMG.farbrengen,
    },

    faq: {
      eyebrow: "שאלות",
      title: "שאלות נפוצות",
      lead: "התשובות לדברים שנשאלים אותנו כמעט כל יום.",
      img: IMG.espresso,
      items: [
        {
          q: "צריך להירשם מראש לסעודת שבת?",
          a: "כן. לסעודות שבת, לחגים ולאירועים שדורשים מאיתנו הכנה מראש יש להירשם ולשלם דרך הטופס המקוון. זה לוקח דקה, וההרשמה נסגרת ביום חמישי ב-20:00 שעון מקומי.",
        },
        {
          q: "כמה זה עולה?",
          a: "לסעודות שבת, לחגים ולאירועים יש דמי הרשמה שמשולמים מראש בטופס, והם מכסים חלק מעלות האוכל וההכנות. התפילות, השיעורים והמידע פתוחים לכל אחד.",
        },
        {
          q: "אני לא דתי. זה בסדר?",
          a: "לגמרי. רוב האורחים כאן אינם דתיים. אין דרישות, אין הרצאות ואין הפתעות — רק אוכל טוב ואנשים טובים.",
        },
        {
          q: "אפשר להשאיר תיקים או ציוד?",
          a: "אפשר להשאיר תיק לכמה שעות בזמן טיול, בתיאום מראש. אחסון ארוך יותר תלוי במקום הפנוי.",
        },
        {
          q: "יש מקום לישון בבית חב״ד?",
          a: "אין לינה בבית חב״ד עצמו, אך בעמוד הלינה יש דירות ואכסניות מומלצות במרחק דקה או שתיים.",
        },
        {
          q: "מה עושים אם יש חירום רפואי?",
          a: "צרו קשר מיד בוואטסאפ, בכל שעה. יש בכפר מרפאה מקומית, יש רופאים דוברי אנגלית, ולמקרי חירום יש בית חולים.",
        },
        {
          q: "בית הכנסת פעיל בימי חול?",
          a: "כן, כל השנה. שיעור חסידות ב-09:00, שחרית ב-10:00, שיעור תניא ב-17:00, שיעור פרשה ב-19:00, ושיעור גמרא ב-21:00 ואחריו ערבית.",
        },
      ],
    },

    donation: {
      eyebrow: "שותפות",
      title: "תרומה",
      lead: "כל שקל כאן הופך לצלחת חמה, לנר שבת, או לכרטיס אוטובוס למישהו שנתקע.",
      img: IMG.shabbatTable,
      tiers: [
        { amount: "36", label: "ארוחה חמה אחת" },
        { amount: "180", label: "סעודת שבת לחמישה" },
        { amount: "540", label: "שבת שלמה למניין" },
        { amount: "1800", label: "שותפות חג" },
      ],
      note: "התרומה מתבצעת בעמוד מאובטח חיצוני של בית חב״ד.",
    },
  },
};

/* ────────────────────────────────────────────────────────────
   English
   ──────────────────────────────────────────────────────────── */
const en: typeof he = {
  brand: {
    name: "Chabad of Pedro",
    sub: "Lake Atitlán · Guatemala",
    monogram: "CP",
  },

  nav: [
    { label: "Chabad House", href: ROUTES.chabadHouse },
    { label: "Visitor Info", href: ROUTES.touristInfo },
    { label: "Things to do", href: ROUTES.thingsToDo },
    { label: "Kosher Food", href: ROUTES.food },
    { label: "Stay", href: ROUTES.hotels },
    {
      label: "Judaism",
      href: ROUTES.judaism,
      children: [
        { label: "Shabbat & Holidays", href: ROUTES.shabbat },
        { label: "Shabbat & holiday registration", href: SITE.registration },
        { label: "Prayers", href: ROUTES.prayers },
        { label: "Synagogue", href: ROUTES.synagogue },
        { label: "Mikvah", href: ROUTES.mikvah },
        { label: "Halachic Times", href: ROUTES.zmanim },
      ],
    },
    { label: "FAQ", href: ROUTES.faq },
  ],

  ui: {
    donate: "Donate",
    shabbatCta: "Shabbat & Holiday",
    menu: "Menu",
    close: "Close",
    details: "Details",
    register: "Register",
    registerPay: "Register & Pay",
    registerShort: "Register",
    registerNote:
      "Shabbat meal registration, holiday registration, and event registration are all done through one online form.",
    navigate: "Navigate",
    readMore: "Read more",
    viewAll: "View all",
    backHome: "Back to home",
    language: "עברית",
    langShort: "HE",
    scroll: "Scroll",
    askQuestion: "I have a question",
    talkToUs: "Message us on WhatsApp",
    active: "Active",
    inactive: "Currently inactive",
    walk: "min walk from Chabad House",
    localTime: "Local time in Pedro",
  },

  hero: {
    kicker: "San Pedro La Laguna · Lake Atitlán",
    titleLines: ["A Jewish home", "on the lake shore"],
    lead: "Between three volcanoes and water the colour of jade, there is a door that never closes. Kosher food, an active synagogue, Shabbat meals — and one address for everything else.",
    primary: { label: "Visitor Info", href: ROUTES.touristInfo },
    secondary: { label: "Shabbat in Pedro", href: ROUTES.shabbat },
    slides: [
      { src: IMG.lake, caption: "Lake Atitlán from the northern ridge" },
      { src: IMG.shabbatTable, caption: "The Shabbat table at Chabad" },
      { src: IMG.espresso, caption: "The kosher café in the village centre" },
    ],
    statusLabel: "Next candle lighting",
    statusEndsLabel: "Shabbat ends",
  },

  ribbon: [
    "Glatt kosher",
    "Active synagogue",
    "Shabbat meals",
    "Mikvaot",
    "Torah library",
    "Book ahead",
    "Everyone welcome",
  ],

  quick: {
    kicker: "Quick guide",
    title: "Everything you need for a kosher trip to Pedro",
    travelTitle: "Travelling around Lake Atitlán",
    travelLead: "Things to do, places to stay and how to get here — direct links to the useful information.",
    items: [
      {
        n: "01",
        title: "Visitor Info",
        text: "Getting here, money, health and safety — before you step off the shuttle.",
        href: ROUTES.touristInfo,
      },
      {
        n: "02",
        title: "Things to do",
        text: "Sunrises, villages, markets and the lake — with us, with Luxury, or alone.",
        href: ROUTES.thingsToDo,
      },
      {
        n: "03",
        title: "Shabbat & Holidays",
        text: "Meals, times, and registration with payment through one short form.",
        href: ROUTES.shabbat,
      },
      {
        n: "04",
        title: "Kosher Food",
        text: "A meat restaurant, a dairy café and falafel — all supervised.",
        href: ROUTES.food,
      },
      {
        n: "05",
        title: "Stay",
        text: "Vetted apartments and hostels, minutes from the Chabad House.",
        href: ROUTES.hotels,
      },
      {
        n: "06",
        title: "Chabad House",
        text: "Who we are, what is here, and how the day and the Shabbat run.",
        href: ROUTES.chabadHouse,
      },
    ],
  },

  provides: {
    kicker: "What's here",
    title: "Chabad of Pedro provides",
    items: [
      {
        title: "Visitor Centre",
        text: "People who know every trail on the lake — and answer at 2am too.",
        href: ROUTES.touristInfo,
        img: IMG.lake,
        status: "active",
      },
      {
        title: "Shabbat & Holiday Meals",
        text: "One long table, home cooking, singing — and always a free seat.",
        href: ROUTES.shabbat,
        img: IMG.shabbatTable,
        status: "active",
      },
      {
        title: "Active synagogue",
        text: "Prayers and classes throughout the day, with tallit and tefillin on hand.",
        href: ROUTES.prayers,
        img: IMG.farbrengen,
        status: "active",
      },
      {
        title: "Kosher Restaurant",
        text: "Hot meat meals, lunch specials, and the burger that made a name here.",
        href: ROUTES.food,
        img: IMG.burgers,
        status: "active",
      },
      {
        title: "The mikvaot",
        text: "A men's mikvah and a women's mikvah, separate and well kept. Women's by appointment.",
        href: ROUTES.mikvah,
        img: IMG.espresso,
        status: "active",
      },
      {
        title: "Farbrengens",
        text: "Nights of niggun, l'chaim and a good word — mostly on Friday nights.",
        href: ROUTES.events,
        img: IMG.dough,
        status: "active",
      },
    ],
  },

  about: {
    kicker: "The story",
    title: "Everything you wanted to know about Chabad of Pedro",
    text: "Rabbi Abrami Meiri and Rebbetzin Sarah Meiri founded the Chabad House in 2011 and have supported Jewish travellers in San Pedro La Laguna ever since.",
    cta: { label: "About the Chabad House", href: ROUTES.chabadHouse },
  },

  events: {
    kicker: "Calendar",
    title: "Events at Chabad of Pedro",
    viewAll: "All events at Chabad Pedro",
    items: [
      {
        tag: "Class",
        title: "Tanya class",
        date: "Sunday — Thursday",
        time: "17:00",
        img: IMG.dough,
        href: ROUTES.events,
      },
      {
        tag: "Special evening",
        title: "Evening of good resolutions",
        date: "Every Wednesday",
        time: "Evening",
        img: IMG.farbrengen,
        href: ROUTES.events,
      },
      {
        tag: "Farbrengen",
        title: "Shabbat farbrengen",
        date: "Shabbat, in the synagogue",
        time: "13:00",
        img: IMG.farbrengen,
        href: ROUTES.events,
      },
    ],
  },

  shabbatBand: {
    kicker: "Every single week",
    title: "Shabbat & Holiday meals",
    text: "One long table, hot soup after a day of hiking, and singing you can hear down at the water. These meals take real preparation — so registration and payment are done in advance through one form, and close on Thursday evening.",
    cta: { label: "Information & Registration", href: ROUTES.shabbat },
  },

  food: {
    kicker: "Taste",
    title: "Kosher food in Pedro",
    viewAll: "All kosher food in Pedro",
    items: [
      {
        title: "Chabad House Restaurant",
        tags: ["Restaurant", "Meat"],
        address: "Chabad Pedro La Laguna, San Pedro La Laguna",
        img: IMG.burgers,
        active: true,
        href: ROUTES.food,
      },
      {
        title: "Hafalafel",
        tags: ["Restaurant", "Meat", "Parve"],
        address: "Calle Principal, San Pedro La Laguna",
        img: IMG.falafel,
        active: false,
        href: ROUTES.food,
      },
      {
        title: "Espresso Bar",
        tags: ["Café", "Dairy"],
        address: "Chabad Pedro La Laguna, San Pedro La Laguna",
        img: IMG.espresso,
        active: true,
        href: ROUTES.food,
      },
    ],
  },

  stay: {
    kicker: "Stay",
    title: "Sleeping on the lake shore",
    sub: "Two complexes a short walk from the Chabad House — suites up the hillside, apartments right on the water.",
    viewAll: "All accommodation options",
  },

  zmanim: {
    kicker: "Times",
    title: "Halachic times of the day",
    subtitle: "Calculated for the coordinates of San Pedro La Laguna",
    note: "Times are calculated in your browser from the latitude and longitude of San Pedro, on Guatemala time (UTC-6). For anything halachically binding, confirm with the Rabbi.",
    cta: { label: "Full timetable", href: ROUTES.zmanim },
    labels: {
      alot: "Dawn (Alot)",
      misheyakir: "Tallit & Tefillin",
      sunrise: "Sunrise",
      shmaMGA: "Latest Shma (M.A.)",
      shmaGRA: "Latest Shma (GRA)",
      tfila: "Latest Shacharit",
      chatzot: "Midday",
      minchaGedola: "Mincha Gedola",
      plag: "Plag HaMincha",
      sunset: "Sunset",
      tzeit: "Nightfall",
      chatzotNight: "Midnight",
    },
  },

  holidays: {
    kicker: "Coming up",
    title: "Celebrating together",
    items: [
      {
        title: "Rosh HaShanah 5787",
        year: "2026",
        text: "Celebrating together with Chabad of Pedro",
        img: IMG.roshHashanah,
        href: ROUTES.shabbat,
      },
      {
        title: "Sukkot 5787",
        year: "2026",
        text: "Celebrating together with Chabad of Pedro",
        img: IMG.sukkot,
        href: ROUTES.shabbat,
      },
    ],
  },

  findUs: {
    kicker: "Map",
    title: "You will find us here",
    name: "Chabad of Pedro Guatemala",
    address: "Chabad Pedro La Laguna, San Pedro La Laguna, Sololá, Guatemala",
    hint: "Three minutes on foot from the main dock, in the lane behind the square.",
  },

  donate: {
    kicker: "Partnership",
    title: "Every meal here is paid for by somebody",
    text: "Registration and payment for Shabbat and festival meals are what let us seat hundreds of people around one table. Anything beyond that goes straight into the work.",
    cta: { label: "Give securely", href: ROUTES.donation },
  },

  footer: {
    tagline: "An open door on the shore of Lake Atitlán",
    columns: [
      {
        title: "The place",
        links: [
          { label: "Chabad House", href: ROUTES.chabadHouse },
          { label: "Visitor Info", href: ROUTES.touristInfo },
          { label: "Things to do", href: ROUTES.thingsToDo },
          { label: "Kosher Food", href: ROUTES.food },
          { label: "Stay", href: ROUTES.hotels },
        ],
      },
      {
        title: "Judaism",
        links: [
          { label: "Shabbat & Holidays", href: ROUTES.shabbat },
          { label: "Prayers", href: ROUTES.prayers },
          { label: "Synagogue", href: ROUTES.synagogue },
          { label: "Mikvaot", href: ROUTES.mikvah },
          { label: "Halachic Times", href: ROUTES.zmanim },
        ],
      },
      {
        title: "More",
        links: [
          { label: "Shabbat & holiday registration", href: SITE.registration },
          { label: "Events", href: ROUTES.events },
          { label: "FAQ", href: ROUTES.faq },
          { label: "Donate", href: ROUTES.donation },
        ],
      },
    ],
    rights: "Chabad of Pedro Guatemala · All rights reserved",
    privacy: "Privacy Policy",
    cookies: "Use of Cookies",
  },

  pages: {
    chabadHouse: {
      eyebrow: "The house",
      title: "Chabad of Pedro",
      lead: "One place in Guatemala where nobody asks where you're from or why you came. You just walk in.",
      img: IMG.lake,
      body: [
        "San Pedro La Laguna sits on the southern shore of Lake Atitlán, beneath the volcano that shares its name. Over the last decade the town has become an almost obligatory stop for travellers crossing Central America — and at its heart, down a small side lane, there is a Chabad House.",
        "Chabad of Pedro runs all year: an active synagogue, a kosher restaurant, mikvaot, a library, and Shabbat meals that seat hundreds of travellers around one table. On the festivals the numbers grow — Rosh HaShanah, Sukkot and Pesach here are events in their own right.",
        "The door is open to everyone: religious, secular, Israeli, American, alone or in a group. Shabbat meals, festivals and any event we prepare for in advance require registration and payment through the online form — that is how we know how much to cook, and how we manage to host hundreds of people every week.",
      ],
      facts: [
        { k: "Established", v: "Running continuously for two decades" },
        { k: "Travellers a year", v: "Thousands of guests from everywhere" },
        { k: "Shabbat table", v: "Up to 300 diners on Friday night" },
        { k: "Synagogue", v: "Active synagogue" },
        { k: "Mikvaot", v: "Men's and women's mikvah" },
        { k: "Languages", v: "Hebrew · English · Spanish" },
      ],
    },

    touristInfo: {
      eyebrow: "On the ground",
      title: "Visitor information",
      lead: "What to know before you step off the shuttle — getting here, money, health and safety.",
      img: IMG.lake,
      sections: [
        {
          title: "Getting here",
          items: [
            "From Guatemala City or Antigua — a direct shuttle to San Pedro, not Panajachel.",
            "The shuttle drops passengers right by the Chabad House.",
            "The ride takes about four hours.",
            "Plan to arrive on Friday, well before Shabbat begins.",
          ],
        },
        {
          title: "Money & credit",
          items: [
            "The currency is the Guatemalan quetzal (GTQ).",
            "There are ATMs at the junction.",
            "Most places now accept credit cards, but cash is always better to have with you.",
            "A local SIM (Tigo / Claro) is sold in the street and costs very little. Coverage around the lake is good.",
            "Free wifi for every guest at the Chabad House.",
          ],
        },
        {
          title: "Safety",
          items: [
            "San Pedro is safe, calm, and perfectly fine.",
            "The atmosphere in the village is relaxed, and locals are friendly.",
            "Keep your passport in a safe — a photo on your phone is enough for most situations.",
            "If you have any question or issue, we are available on WhatsApp at any time.",
          ],
        },
        {
          title: "Water & swimming",
          items: [
            "The lake water is mostly clean, but should not be drunk. Bottled water is available in every shop.",
            "You can swim in the lake carefully.",
            "It is better not to jump from the diving platform in San Marcos — it is dangerous.",
          ],
        },
      ],
    },

    food: {
      eyebrow: "Kashrut",
      title: "Kosher food in Pedro",
      lead: "All under local Chabad supervision. Meat, dairy and parve — all within walking distance.",
      img: IMG.burgers,
      note: "Opening hours change with the season. Best to confirm on WhatsApp before you head over.",
    },

    hotels: {
      eyebrow: "Stay",
      title: "Places to sleep",
      lead: "Suites and apartments on the lake shore, a short walk from the Chabad House.",
      img: IMG.suite7,
      note: "There is no reception or payment on Shabbat. Arrange everything Thursday or Friday morning.",
    },

    shabbat: {
      eyebrow: "Shabbat",
      title: "Shabbat & Holidays in Pedro",
      lead: "Meal registration and payment, the order of prayers, and everything to know before Shabbat comes in.",
      img: IMG.shabbatTable,
      scheduleNight: [
        { k: "Mincha", v: "Before sunset" },
        { k: "Maariv", v: "Straight afterwards" },
        { k: "Kiddush", v: "At the end of prayers" },
        { k: "Friday night meal", v: "After kiddush" },
        { k: "Farbrengen & Oneg Shabbat", v: "After the meal" },
      ],
      scheduleDay: [
        { k: "Jachnun", v: "10:00" },
        { k: "Shacharit", v: "After the jachnun" },
        { k: "Farbrengen in the synagogue", v: "13:00" },
        { k: "Kiddush, hot salads & desserts", v: "14:00" },
        { k: "Mincha", v: "After the meal" },
        { k: "Niggunim & a chassidic ma'amar", v: "Half an hour before Shabbat ends" },
        { k: "Maariv & Havdalah", v: "As Shabbat goes out" },
      ],
      note: "Registration and payment for the meals close on Thursday at 20:00 local time.",
    },

    judaism: {
      eyebrow: "Judaism",
      title: "Judaism in Pedro",
      lead: "Prayers, synagogue, mikvaot and halachic times — all in one place.",
      img: IMG.farbrengen,
    },

    prayers: {
      eyebrow: "Daily order",
      title: "Prayers & classes",
      lead: "An active synagogue: prayers and classes right through the day, all year round.",
      img: IMG.farbrengen,
      schedule: [
        { k: "Shacharit — weekdays", v: "07:30" },
        { k: "Shacharit — Rosh Chodesh, Mon & Thu", v: "07:15" },
        { k: "Mincha", v: "Twenty minutes before sunset" },
        { k: "Maariv", v: "Straight after nightfall" },
        { k: "Shacharit — Shabbat", v: "09:30" },
      ],
      note: "Tallit and tefillin are available on site.",
    },

    synagogue: {
      eyebrow: "Place",
      title: "The synagogue",
      lead: "The prayer hall on the second floor — a Torah scroll, a library, and air conditioning that works.",
      img: IMG.espresso,
    },

    mikvah: {
      eyebrow: "Taharah",
      title: "The mikvaot",
      lead: "The Chabad House has two separate mikvaot: one for men and one for women.",
      img: IMG.lake,
      note: "The women's mikvah is by appointment — a WhatsApp message to the Rebbetzin, up to two days ahead. The men's mikvah is open during synagogue hours.",
    },

    thingsToDo: {
      eyebrow: "The lake",
      title: "Things to do",
      lead: "What the Chabad House offers, what Luxury Atitlán can arrange, and what you simply go and do yourself.",
      img: IMG.lake,
      note: "All of these trips leave from the lake. Plan your return before sunset on Friday.",
    },

    zmanim: {
      eyebrow: "Times",
      title: "Halachic times of the day",
      lead: "Calculated live for San Pedro La Laguna, Lake Atitlán.",
      img: IMG.lake,
    },

    events: {
      eyebrow: "Calendar",
      title: "Events",
      lead: "Daily classes, farbrengens, the evening of good resolutions and festival nights.",
      img: IMG.farbrengen,
    },

    faq: {
      eyebrow: "Questions",
      title: "Frequently asked",
      lead: "Answers to the things we get asked almost every day.",
      img: IMG.espresso,
      items: [
        {
          q: "Do I need to register for the Shabbat meal?",
          a: "Yes. Shabbat meals, festivals and any event we prepare for in advance are registered and paid for through the online form. It takes a minute, and registration closes on Thursday at 20:00 local time.",
        },
        {
          q: "How much does it cost?",
          a: "Shabbat meals, festivals and events carry a registration fee, paid in advance through the form, which covers part of the cost of the food and the preparation. Prayers, classes and information are open to everyone.",
        },
        {
          q: "I'm not religious. Is that okay?",
          a: "Completely. Most guests here are not religious. No requirements, no lectures, no surprises — just good food and good people.",
        },
        {
          q: "Can I leave bags or gear?",
          a: "You can leave a bag for a few hours while hiking, arranged in advance. Longer storage depends on available space.",
        },
        {
          q: "Is there somewhere to sleep at the Chabad House?",
          a: "There is no accommodation at the Chabad House itself, but the Stay page lists apartments and hostels a minute or two away.",
        },
        {
          q: "What if there is a medical emergency?",
          a: "Message us on WhatsApp immediately, at any hour. There is a local clinic in the village, English-speaking doctors, and a hospital for emergencies.",
        },
        {
          q: "Is the synagogue active on weekdays?",
          a: "Yes, all year. Chassidut class at 09:00, Shacharit at 10:00, Tanya at 17:00, the parsha class at 19:00, and Gemara at 21:00 followed by Maariv.",
        },
      ],
    },

    donation: {
      eyebrow: "Partnership",
      title: "Donate",
      lead: "Every dollar here turns into a hot plate, a Shabbat candle, or a bus ticket for somebody stranded.",
      img: IMG.shabbatTable,
      tiers: [
        { amount: "36", label: "One hot meal" },
        { amount: "180", label: "Shabbat dinner for five" },
        { amount: "540", label: "A full Shabbat for a minyan" },
        { amount: "1800", label: "Festival partnership" },
      ],
      note: "Donations are processed on a secure external Chabad page.",
    },
  },
};

export type SiteContent = typeof he;

export const content: Record<Locale, SiteContent> = { he, en };
