/**
 * Content for the public landing page (`/`).
 *
 * Kept separate from `translations.ts` because most of it is structured
 * (arrays of tiles, steps, stats) rather than the flat key → string map that
 * `t()` expects. Edit the copy here — the component renders whatever this file says.
 */

export type Lang = 'en' | 'ar';

/** Bento tile size. Spans must fill complete rows of a 4-column grid. */
type TileSize = 't-feature' | 't-tall' | 't-wide' | 't-sm';

export interface Category {
  img: string;
  cls: TileSize;
  en: string;
  ar: string;
}

/** Images live in `public/landing/`. Use at least 1200px on the long edge. */
export const CATEGORIES: Category[] = [
  { img: '/landing/grilled.jpg', cls: 't-feature', en: 'Charcoal Grills', ar: 'مشاوي على الفحم' },
  { img: '/landing/sandwiches.jpg', cls: 't-tall', en: 'Sandwiches', ar: 'سندويشات' },
  { img: '/landing/lahm-b-aajin.jpg', cls: 't-tall', en: "Lahm b'Aajin", ar: 'لحم بعجين' },
  { img: '/landing/chicken.jpg', cls: 't-wide', en: 'Chicken', ar: 'دجاج' },
  { img: '/landing/appetizers.jpg', cls: 't-sm', en: 'Mezze', ar: 'مقبلات' },
  { img: '/landing/plates.jpg', cls: 't-sm', en: 'Plates', ar: 'صحون' },
];

export interface Pair {
  en: [string, string];
  ar: [string, string];
}

export const STATS: Pair[] = [
  { en: ['1930', 'Established'], ar: ['١٩٣٠', 'سنة التأسيس'] },
  { en: ['Family-run', 'Since day one'], ar: ['عائلية', 'إدارة منذ البداية'] },
  { en: ['Ras Beirut', 'Sakyet Al Janzir'], ar: ['رأس بيروت', 'ساقية الجنزير'] },
];

export interface Value extends Pair {
  img: string;
}

export const VALUES: Value[] = [
  {
    img: '/landing/chicken.jpg',
    en: ['Cut In-House', 'The meat on your plate was cut at our own counter that morning. No middlemen, no mystery.'],
    ar: ['لحم من ملحمتنا', 'اللحم الذي تأكله قُطّع على طاولتنا في الصباح نفسه — بلا وسطاء ولا مفاجآت.'],
  },
  {
    img: '/landing/grilled.jpg',
    en: ['Fire & Charcoal', 'Grilled over real charcoal — the flavour nothing else gives you.'],
    ar: ['نار وفحم', 'المشاوي على الفحم فقط. الطعم الذي لا يمنحه أي شيء آخر.'],
  },
  {
    img: '/landing/appetizers.jpg',
    en: ['Family Recipes', 'Traditional Lebanese cooking with no shortcuts and no powdered mixes.'],
    ar: ['وصفات العائلة', 'وصفات لبنانية تقليدية، دون اختصارات ودون مساحيق جاهزة.'],
  },
  {
    img: '/landing/plates.jpg',
    en: ['Fast & Honest', "Clear prices, realistic timings, and an order that arrives exactly as you asked."],
    ar: ['سريع وصادق', 'أسعار واضحة، أوقات واقعية، وطلب يصل كما طلبته تماماً.'],
  },
];

export const STEPS: Pair[] = [
  {
    en: ['Pick your dishes', 'Browse the menu and customise each item the way you like it.'],
    ar: ['اختر أطباقك', 'تصفّح القائمة وخصّص كل صنف كما تحب.'],
  },
  {
    en: ['Send on WhatsApp', 'One tap sends it straight to us — no sign-up, no app to install.'],
    ar: ['أرسل عبر واتساب', 'بنقرة واحدة يصل الطلب إلينا — بدون تسجيل أو تطبيق.'],
  },
  {
    en: ['Delivery or pickup', 'We confirm, cook, and get it to your door — or have it waiting for you.'],
    ar: ['توصيل أو استلام', 'نؤكّد الطلب ونجهّزه للتوصيل أو للاستلام من المحل.'],
  },
];

/** Indexed by JS `Date.getDay()` — 0 is Sunday — to match `closed_days`. */
export const DAY_NAMES: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

/** Words in the scrolling gold ticker under the hero. */
export const TICKER: Record<Lang, string[]> = {
  en: ['Charcoal Grills', "Lahm b'Aajin", 'Tabbouleh', 'Fattoush', 'Shish Taouk', 'Kafta', 'Hummus', 'Sandwiches', 'Mezze', 'Butchers Since 1930'],
  ar: ['مشاوي على الفحم', 'لحم بعجين', 'تبولة', 'فتوش', 'شيش طاووق', 'كفتة', 'حمّص', 'سندويشات', 'مقبلات', 'ملحمة منذ ١٩٣٠'],
};

export const COPY: Record<Lang, Record<string, string>> = {
  en: {
    brand: 'Parisienne',
    navMenu: 'Menu',
    navStory: 'Story',
    navVisit: 'Visit',
    navOrder: 'Order Now',
    swap: 'عربي',

    eyebrow: 'Boucherie & Grill · Ras Beirut · Est. 1930',
    heroTitle: 'From our block,<br>straight to the <em>charcoal</em>',
    heroSub:
      "A butchery first, a grill second. We cut the meat ourselves and fire it over charcoal — sandwiches, lahm b'aajin and mezze alongside. Delivery, pickup, or eat in.",
    ctaOrder: 'Order Now',
    ctaMenu: 'Browse the Menu',
    scroll: 'Scroll',

    yearLabel: 'Established',
    storyEyebrow: 'Our Story',
    storyTitle: 'Behind the same counter since 1930',
    storyP1:
      'Parisienne opened as a <strong>boucherie in Ras Beirut in 1930</strong>. The city around it has changed almost beyond recognition. The counter has not.',
    storyP2:
      "It is still run by the same family, and still works the way a butcher's shop is meant to: whole cuts broken down in-house, trimmed to order, and grilled over charcoal a few steps from where they were cut.",

    menuEyebrow: 'The Menu',
    menuTitle: 'What we bring to the table',
    menuSub: 'Everything off the charcoal, plus sandwiches, mezze and cold plates. Full range and prices live in the ordering app.',
    ctaFullMenu: 'See the Full Menu',

    whyEyebrow: 'About Us',
    whyTitle: 'Butchers first, cooks second',

    howEyebrow: 'Ordering',
    howTitle: "Three steps and it's on its way",
    howSub: 'No apps, no accounts. Choose, send, enjoy.',
    ctaStart: 'Start Your Order',

    visitEyebrow: 'Visit',
    visitTitle: 'Come in, or send it over',
    visitSub: 'The table is ready — and WhatsApp is always open.',
    infoAddrT: 'Address',
    infoAddr: 'Georges Zouein Street, Sakyet Al Janzir<br>Ras Beirut, Lebanon',
    infoHoursT: 'Opening Hours',
    infoHours: 'Open daily<br><span class="lp-dim">Message us on WhatsApp to check</span>',
    infoPhoneT: 'WhatsApp',

    closerTitle: "Hungry? We're one tap away",
    closerSub: 'Order online and get instant confirmation on WhatsApp.',
    ctaOrder2: 'Order Now',

    footL: '© {year} Boucherie & Grill Parisienne · Est. 1930',
  },
  ar: {
    brand: 'الباريسية',
    navMenu: 'القائمة',
    navStory: 'حكايتنا',
    navVisit: 'زورونا',
    navOrder: 'اطلب الآن',
    swap: 'English',

    eyebrow: 'ملحمة ومشاوي الباريسية · رأس بيروت · منذ ١٩٣٠',
    heroTitle: 'من ملحمتنا<br>إلى <em>الفحم</em> مباشرة',
    heroSub:
      'ملحمة قبل أن نكون مشاوي. نقطّع اللحم بأيدينا ونشويه على الفحم — إلى جانب السندويشات ولحم بعجين والمقبلات. توصيل، استلام، أو تناول في المحل.',
    ctaOrder: 'اطلب الآن',
    ctaMenu: 'تصفّح القائمة',
    scroll: 'مرّر',

    yearLabel: 'سنة التأسيس',
    storyEyebrow: 'حكايتنا',
    storyTitle: 'خلف الطاولة نفسها منذ ١٩٣٠',
    storyP1:
      'فتحت الباريسية أبوابها <strong>كملحمة في رأس بيروت عام ١٩٣٠</strong>. تغيّرت المدينة من حولها حتى كادت لا تُعرف. أما الطاولة فبقيت كما هي.',
    storyP2:
      'لا تزال العائلة نفسها تديرها، ولا يزال العمل يجري كما ينبغي في أي ملحمة: لحم يُقطَّع في المحل، ويُنظَّف حسب الطلب، ويُشوى على الفحم على بُعد خطوات من حيث قُطِّع.',

    menuEyebrow: 'القائمة',
    menuTitle: 'ما نقدّمه على الطاولة',
    menuSub: 'كل ما يخرج من على الفحم، إضافة إلى السندويشات والمقبلات والصحون الباردة. القائمة الكاملة والأسعار في تطبيق الطلب.',
    ctaFullMenu: 'شاهد القائمة الكاملة',

    whyEyebrow: 'عن المحل',
    whyTitle: 'لحّامون أولاً، طبّاخون ثانياً',

    howEyebrow: 'الطلب',
    howTitle: 'ثلاث خطوات وطلبك في الطريق',
    howSub: 'لا تطبيقات، لا حسابات. اختر، أرسل، استلم.',
    ctaStart: 'ابدأ طلبك',

    visitEyebrow: 'زورونا',
    visitTitle: 'تعال، أو أرسل طلبك',
    visitSub: 'الطاولة جاهزة — وواتساب مفتوح دائماً.',
    infoAddrT: 'العنوان',
    infoAddr: 'شارع جورج زوين، ساقية الجنزير<br>رأس بيروت، لبنان',
    infoHoursT: 'أوقات الدوام',
    infoHours: 'مفتوح يومياً<br><span class="lp-dim">راسلنا على واتساب للتأكد</span>',
    infoPhoneT: 'واتساب',

    closerTitle: 'جائع؟ نحن على بعد نقرة',
    closerSub: 'اطلب أونلاين واحصل على تأكيد فوري عبر واتساب.',
    ctaOrder2: 'اطلب الآن',

    footL: '© {year} ملحمة ومشاوي الباريسية · منذ ١٩٣٠',
  },
};

/** Shown in the Visit section, the footer, and the floating button. */
export const WHATSAPP_NUMBER = '96171129798';
export const WHATSAPP_DISPLAY = '+961 71 129 798';
