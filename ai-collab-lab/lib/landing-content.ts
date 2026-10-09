/**
 * Editable wording of the home (landing) page, in English and Arabic.
 * The layout and behaviour never change; only the text shown to visitors does.
 * Stored server-side (app_settings key "landing"); missing fields fall back to the defaults below.
 */
export type Bilingual = {en: string; ar: string};
export type LandingKey =
  | 'heroEyebrow' | 'heroTitle1' | 'heroTitle2' | 'heroAccent' | 'heroDescription' | 'joinButton' | 'presenterButton'
  | 'hubTitle' | 'hubText' | 'orb1' | 'orb2' | 'orb3' | 'orb4' | 'orb5' | 'orb6'
  | 'howEyebrow' | 'howTitle' | 'howText'
  | 'step1Title' | 'step1Text' | 'step2Title' | 'step2Text' | 'step3Title' | 'step3Text' | 'step4Title' | 'step4Text' | 'step5Title' | 'step5Text'
  | 'skillsEyebrow'
  | 'trust1Title' | 'trust1Text' | 'trust2Title' | 'trust2Text' | 'trust3Title' | 'trust3Text'
  | 'bottomText' | 'codePlaceholder'
  | 'guideEyebrow' | 'guideTitle' | 'guideText' | 'guideButton'
  | 'footerText';
export type LandingContent = Record<LandingKey, Bilingual>;

const b = (en: string, ar: string): Bilingual => ({en, ar});

export const defaultLanding: LandingContent = {
  heroEyebrow: b('THE NEXT IDEA STARTS WITH YOU', 'الفكرة القادمة تبدأ منك'),
  heroTitle1: b('Many minds.', 'عقولٌ كثيرة.'),
  heroTitle2: b('One', ''),
  heroAccent: b('better idea.', 'فكرةٌ أفضل.'),
  heroDescription: b('A live collaborative innovation experience where students think, share, improve, vote and build together with AI — and learn the workplace skills that make AI useful.', 'تجربة ابتكار تعاونية مباشرة يفكّر فيها الطلاب ويشاركون ويحسّنون ويصوّتون ويبنون معاً بالذكاء الاصطناعي — ويتعلمون مهارات العمل التي تجعل الذكاء الاصطناعي مفيداً.'),
  joinButton: b('Join workshop', 'انضم إلى الورشة'),
  presenterButton: b('Presenter login', 'دخول مقدم الورشة'),
  hubTitle: b('One product', 'منتج واحد'),
  hubText: b('built by the whole room', 'تبنيه القاعة كلها'),
  orb1: b('Reminders', 'تذكيرات'), orb2: b('Arabic voice', 'صوت عربي'), orb3: b('Clinic map', 'خريطة العيادة'),
  orb4: b('Privacy first', 'الخصوصية أولاً'), orb5: b('Study plan', 'خطة دراسية'), orb6: b('Peer support', 'دعم الزملاء'),
  howEyebrow: b('HOW A WORKSHOP FLOWS', 'كيف تسير الورشة'),
  howTitle: b('Five steps from a problem to a prototype', 'خمس خطوات من المشكلة إلى النموذج الأولي'),
  howText: b('The presenter guides the room; students follow automatically on their phones. No accounts, no installs.', 'يقود مقدم الورشة القاعة، ويتابع الطلاب تلقائياً على هواتفهم. بلا حسابات ولا تثبيت.'),
  step1Title: b('Think', 'فكّر'), step1Text: b('Name a real problem worth solving — before jumping to solutions.', 'حدّد مشكلة حقيقية تستحق الحل — قبل القفز إلى الحلول.'),
  step2Title: b('Share', 'شارك'), step2Text: b('Everyone contributes from their phone. Every voice is visible.', 'يشارك الجميع من هواتفهم. وكل صوت مسموع.'),
  step3Title: b('Improve', 'حسّن'), step3Text: b('Build on teammates’ ideas, find weaknesses, and make them stronger.', 'طوّر أفكار زملائك، واكتشف نقاط الضعف، واجعلها أقوى.'),
  step4Title: b('Vote', 'صوّت'), step4Text: b('Decide together using value, feasibility and responsibility.', 'قرّروا معاً وفق القيمة وقابلية التنفيذ والمسؤولية.'),
  step5Title: b('Build', 'ابنِ'), step5Text: b('Turn the winning ideas into a product brief and an AI build prompt.', 'حوّل الأفكار الفائزة إلى ملخص منتج وتعليمات بناء بالذكاء الاصطناعي.'),
  skillsEyebrow: b('WHAT STUDENTS PRACTISE', 'ما يمارسه الطلاب'),
  trust1Title: b('Arabic & English', 'العربية والإنجليزية'), trust1Text: b('with true right-to-left layout', 'مع تخطيط حقيقي من اليمين إلى اليسار'),
  trust2Title: b('Privacy by design', 'الخصوصية أولاً'), trust2Text: b('— nicknames only, no student accounts', '— أسماء مستعارة فقط، بلا حسابات للطلاب'),
  trust3Title: b('Resilient', 'موثوقية عالية'), trust3Text: b('— drafts and contributions survive reconnects', '— المسودات والمشاركات محفوظة رغم انقطاع الاتصال'),
  bottomText: b('Built for a room full of possibility.', 'صُمّمت لقاعة مليئة بالإمكانات.'),
  codePlaceholder: b('Have a workshop code?', 'لديك رمز ورشة؟'),
  guideEyebrow: b('FIRST TIME HERE?', 'أول مرة هنا؟'),
  guideTitle: b('Understand the app in one minute', 'افهم التطبيق في دقيقة'),
  guideText: b('What it is, why it matters, and how students and teachers use it — in simple words.', 'ما هو التطبيق، ولماذا هو مهم، وكيف يستخدمه الطلاب والمعلمون — بكلمات بسيطة.'),
  guideButton: b('Read the guide', 'اقرأ الدليل'),
  footerText: b('HUMAN CREATIVITY. COLLECTIVE INTELLIGENCE. AI POSSIBILITY.', 'إبداع الإنسان. ذكاء الجماعة. إمكانات الذكاء الاصطناعي.'),
};

/** Ready-made wording for different audiences. Only audience-specific lines change; everything else keeps the defaults. */
export const landingPresets: Record<'students' | 'employees' | 'public', {label: Bilingual; hint: Bilingual; content: Partial<LandingContent>}> = {
  students: {label: b('Students', 'الطلاب'), hint: b('Universities, schools and training courses.', 'الجامعات والمدارس والدورات التدريبية.'), content: {}},
  employees: {
    label: b('Employees', 'الموظفون'), hint: b('Teams, departments and corporate workshops.', 'الفرق والأقسام وورش عمل المؤسسات.'),
    content: {
      heroEyebrow: b('THE NEXT IMPROVEMENT STARTS WITH YOUR TEAM', 'التحسين القادم يبدأ من فريقك'),
      heroDescription: b('A live innovation session where colleagues think, share, improve, vote and build together with AI — turning everyday work challenges into practical solutions.', 'جلسة ابتكار مباشرة يفكّر فيها الزملاء ويشاركون ويحسّنون ويصوّتون ويبنون معاً بالذكاء الاصطناعي — لتحويل تحديات العمل اليومية إلى حلول عملية.'),
      presenterButton: b('Facilitator login', 'دخول الميسّر'),
      hubText: b('built by the whole team', 'يبنيه الفريق كله'),
      orb1: b('Faster approvals', 'موافقات أسرع'), orb3: b('Shared dashboard', 'لوحة مشتركة'), orb5: b('Onboarding plan', 'خطة تهيئة'), orb6: b('Team support', 'دعم الفريق'),
      howEyebrow: b('HOW A SESSION FLOWS', 'كيف تسير الجلسة'),
      howTitle: b('Five steps from a work challenge to a solution', 'خمس خطوات من تحدٍّ في العمل إلى حل'),
      howText: b('The facilitator guides the room; participants follow automatically on their phones. No accounts, no installs.', 'يقود الميسّر القاعة، ويتابع المشاركون تلقائياً على هواتفهم. بلا حسابات ولا تثبيت.'),
      step1Text: b('Name a real problem in your work that is worth solving.', 'حدّد مشكلة حقيقية في عملك تستحق الحل.'),
      step3Text: b('Build on colleagues’ ideas, find risks, and make them stronger.', 'طوّر أفكار زملائك، واكتشف المخاطر، واجعلها أقوى.'),
      step4Text: b('Decide together using value, cost, feasibility and responsibility.', 'قرّروا معاً وفق القيمة والتكلفة وقابلية التنفيذ والمسؤولية.'),
      step5Text: b('Turn the best ideas into a clear project brief and an AI build prompt.', 'حوّل أفضل الأفكار إلى ملخص مشروع واضح وتعليمات بناء بالذكاء الاصطناعي.'),
      skillsEyebrow: b('WHAT TEAMS PRACTISE', 'ما يمارسه الفريق'),
      trust2Text: b('— nicknames only, no staff accounts', '— أسماء مستعارة فقط، بلا حسابات للموظفين'),
      bottomText: b('Built for teams that want to improve how they work.', 'صُمّمت للفرق التي تريد تحسين طريقة عملها.'),
      guideText: b('What it is, why it matters, and how participants and facilitators use it — in simple words.', 'ما هو التطبيق، ولماذا هو مهم، وكيف يستخدمه المشاركون والميسّرون — بكلمات بسيطة.'),
      footerText: b('HUMAN EXPERIENCE. TEAM INTELLIGENCE. AI POSSIBILITY.', 'خبرة الإنسان. ذكاء الفريق. إمكانات الذكاء الاصطناعي.'),
    },
  },
  public: {
    label: b('General public', 'عامة الناس'), hint: b('Community events, exhibitions and open sessions.', 'الفعاليات المجتمعية والمعارض والجلسات المفتوحة.'),
    content: {
      heroEyebrow: b('GOOD IDEAS COME FROM EVERYONE', 'الأفكار الجيدة تأتي من الجميع'),
      heroDescription: b('A live, friendly workshop where people think, share, improve, vote and build together with AI — no experience needed.', 'ورشة مباشرة وودّية يفكّر فيها الناس ويشاركون ويحسّنون ويصوّتون ويبنون معاً بالذكاء الاصطناعي — دون الحاجة إلى خبرة سابقة.'),
      presenterButton: b('Host login', 'دخول المنظّم'),
      hubText: b('built by everyone here', 'يبنيه كل الحاضرين'),
      orb1: b('Safer streets', 'شوارع أكثر أماناً'), orb3: b('Community map', 'خريطة الحي'), orb5: b('Local services', 'خدمات محلية'), orb6: b('Neighbour support', 'دعم الجيران'),
      howEyebrow: b('HOW IT WORKS', 'كيف يعمل'),
      howTitle: b('Five easy steps from a problem to an idea you can build', 'خمس خطوات سهلة من مشكلة إلى فكرة قابلة للبناء'),
      howText: b('The host guides the room; everyone follows on their phone. No accounts, no downloads.', 'يقود المنظّم القاعة، ويتابع الجميع على هواتفهم. بلا حسابات ولا تنزيل.'),
      step1Text: b('Talk about a real problem in daily life that is worth solving.', 'تحدّث عن مشكلة حقيقية في الحياة اليومية تستحق الحل.'),
      step3Text: b('Build on other people’s ideas and make them better.', 'طوّر أفكار الآخرين واجعلها أفضل.'),
      skillsEyebrow: b('WHAT PARTICIPANTS PRACTISE', 'ما يمارسه المشاركون'),
      trust2Text: b('— nicknames only, no sign-up', '— أسماء مستعارة فقط، بلا تسجيل'),
      bottomText: b('Built for curious minds of every age.', 'صُمّمت للعقول الفضولية من كل الأعمار.'),
      guideText: b('What it is, why it matters, and how to take part — in simple words.', 'ما هو التطبيق، ولماذا هو مهم، وكيف تشارك — بكلمات بسيطة.'),
      footerText: b('EVERYDAY CREATIVITY. COLLECTIVE INTELLIGENCE. AI POSSIBILITY.', 'إبداع يومي. ذكاء جماعي. إمكانات الذكاء الاصطناعي.'),
    },
  },
};

/** Admin form layout: sections, field labels and whether a field is a long text. */
export const landingSections: {title: Bilingual; fields: [LandingKey, Bilingual, boolean?][]}[] = [
  {title: b('Top of the page', 'أعلى الصفحة'), fields: [['heroEyebrow', b('Small heading', 'العنوان الصغير')], ['heroTitle1', b('Headline — line 1', 'العنوان الرئيسي — السطر 1')], ['heroTitle2', b('Headline — line 2 (plain part)', 'العنوان الرئيسي — السطر 2 (الجزء العادي)')], ['heroAccent', b('Headline — line 2 (coloured part)', 'العنوان الرئيسي — السطر 2 (الجزء الملوّن)')], ['heroDescription', b('Description', 'الوصف'), true], ['joinButton', b('Join button', 'زر الانضمام')], ['presenterButton', b('Presenter button', 'زر مقدم الورشة')]]},
  {title: b('Illustration', 'الرسم التوضيحي'), fields: [['hubTitle', b('Centre title', 'عنوان المركز')], ['hubText', b('Centre text', 'نص المركز')], ['orb1', b('Bubble 1', 'الفقاعة 1')], ['orb2', b('Bubble 2', 'الفقاعة 2')], ['orb3', b('Bubble 3', 'الفقاعة 3')], ['orb4', b('Bubble 4', 'الفقاعة 4')], ['orb5', b('Bubble 5', 'الفقاعة 5')], ['orb6', b('Bubble 6', 'الفقاعة 6')]]},
  {title: b('How it works', 'كيف يعمل'), fields: [['howEyebrow', b('Small heading', 'العنوان الصغير')], ['howTitle', b('Title', 'العنوان')], ['howText', b('Text', 'النص'), true], ['step1Title', b('Step 1 — name', 'الخطوة 1 — الاسم')], ['step1Text', b('Step 1 — text', 'الخطوة 1 — النص'), true], ['step2Title', b('Step 2 — name', 'الخطوة 2 — الاسم')], ['step2Text', b('Step 2 — text', 'الخطوة 2 — النص'), true], ['step3Title', b('Step 3 — name', 'الخطوة 3 — الاسم')], ['step3Text', b('Step 3 — text', 'الخطوة 3 — النص'), true], ['step4Title', b('Step 4 — name', 'الخطوة 4 — الاسم')], ['step4Text', b('Step 4 — text', 'الخطوة 4 — النص'), true], ['step5Title', b('Step 5 — name', 'الخطوة 5 — الاسم')], ['step5Text', b('Step 5 — text', 'الخطوة 5 — النص'), true]]},
  {title: b('Skills and highlights', 'المهارات والمزايا'), fields: [['skillsEyebrow', b('Skills heading', 'عنوان المهارات')], ['trust1Title', b('Highlight 1 — title', 'الميزة 1 — العنوان')], ['trust1Text', b('Highlight 1 — text', 'الميزة 1 — النص')], ['trust2Title', b('Highlight 2 — title', 'الميزة 2 — العنوان')], ['trust2Text', b('Highlight 2 — text', 'الميزة 2 — النص')], ['trust3Title', b('Highlight 3 — title', 'الميزة 3 — العنوان')], ['trust3Text', b('Highlight 3 — text', 'الميزة 3 — النص')]]},
  {title: b('Bottom of the page', 'أسفل الصفحة'), fields: [['bottomText', b('Bottom line', 'السطر الأخير')], ['codePlaceholder', b('Code box hint', 'تلميح مربع الرمز')], ['guideEyebrow', b('Guide box — small heading', 'مربع الدليل — العنوان الصغير')], ['guideTitle', b('Guide box — title', 'مربع الدليل — العنوان')], ['guideText', b('Guide box — text', 'مربع الدليل — النص'), true], ['guideButton', b('Guide box — button', 'مربع الدليل — الزر')], ['footerText', b('Footer slogan', 'شعار التذييل')]]},
];

const LIMIT = 400;
/** Keeps known fields only, trims and limits length; anything missing comes from the defaults. */
export function sanitizeLanding(input: unknown): LandingContent {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const out = {} as LandingContent;
  for (const key of Object.keys(defaultLanding) as LandingKey[]) {
    const v = source[key] as Partial<Bilingual> | undefined;
    const clean = (s: unknown, fallback: string) => typeof s === 'string' ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, LIMIT) : fallback;
    out[key] = {en: clean(v?.en, defaultLanding[key].en), ar: clean(v?.ar, defaultLanding[key].ar)};
  }
  return out;
}
export const presetContent = (preset: keyof typeof landingPresets): LandingContent => ({...defaultLanding, ...landingPresets[preset].content});
