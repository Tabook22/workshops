/**
 * Educational content and transparent, local heuristics.
 * Nothing here calls an AI service: every "coach" signal is a visible rule students can understand.
 */
import type {Idea} from './workshop';

export type Pair = readonly [en: string, ar: string];

/** Contribution types, colour-coded consistently across every screen so students learn the vocabulary. */
export const typeMeta: Record<string, {label: Pair; meaning: Pair; tone: string}> = {
  problem: {label: ['Problem', 'مشكلة'], meaning: ['A real need or difficulty — not a solution yet.', 'حاجة أو صعوبة حقيقية — وليست حلاً بعد.'], tone: 'problem'},
  idea: {label: ['Idea', 'فكرة'], meaning: ['A possible direction that could help.', 'اتجاه ممكن قد يساعد.'], tone: 'idea'},
  solution: {label: ['Solution', 'حل'], meaning: ['A concrete way to solve the selected problem.', 'طريقة ملموسة لحل المشكلة المختارة.'], tone: 'solution'},
  improvement: {label: ['Improvement', 'تحسين'], meaning: ['Builds on a teammate’s idea to make it stronger.', 'يطوّر فكرة زميل لجعلها أقوى.'], tone: 'improvement'},
  suggestion: {label: ['Feature', 'ميزة'], meaning: ['A specific capability for our product.', 'قدرة محددة لمنتجنا.'], tone: 'suggestion'},
  comment: {label: ['Comment', 'تعليق'], meaning: ['A question or reaction to an idea.', 'سؤال أو تفاعل مع فكرة.'], tone: 'comment'},
};

type Coach = {goal: Pair; starters: Pair[]; example: Pair; think: Pair};

/** Student scaffolding per workshop stage that accepts submissions. */
export const coach: Record<number, Coach> = {
  1: {
    goal: ['Describe who is struggling and why. Stay with the problem — solutions come later.', 'صف من يواجه صعوبة ولماذا. ركّز على المشكلة — الحلول تأتي لاحقاً.'],
    starters: [['Students struggle to … because …', 'يواجه الطلاب صعوبة في … لأن …'], ['It is hard to … when …', 'من الصعب … عندما …'], ['Many people forget to …', 'ينسى كثيرون أن …']],
    example: ['Students struggle to book clinic appointments because the phone line is busy during class breaks.', 'يواجه الطلاب صعوبة في حجز مواعيد العيادة لأن الخط مشغول خلال فترات الاستراحة.'],
    think: ['Who exactly? When does it happen? What does it cost them?', 'من بالتحديد؟ متى يحدث ذلك؟ وما أثره عليهم؟'],
  },
  2: {
    goal: ['Think freely. Quantity first — simple and unusual ideas are both welcome.', 'فكّر بحرية. الكمية أولاً — الأفكار البسيطة والغريبة مرحّب بها.'],
    starters: [['What if we …', 'ماذا لو …'], ['An app that helps students … by …', 'تطبيق يساعد الطلاب على … من خلال …'], ['We could use AI to …', 'يمكننا استخدام الذكاء الاصطناعي لـ …']],
    example: ['What if a chat assistant reminded students about appointments in Arabic and English, so they never miss one?', 'ماذا لو ذكّر مساعد محادثة الطلاب بمواعيدهم بالعربية والإنجليزية حتى لا يفوتهم أي موعد؟'],
    think: ['Combine two ideas. Flip the problem. Ask: what would make this 10× easier?', 'ادمج فكرتين. اقلب المشكلة. واسأل: ما الذي يجعل هذا أسهل بعشر مرات؟'],
  },
  3: {
    goal: ['Propose a concrete way to solve the selected idea. Say what it does and for whom.', 'اقترح طريقة ملموسة لتنفيذ الفكرة المختارة. وضّح ما تفعله ولمن.'],
    starters: [['The user opens … and then …', 'يفتح المستخدم … ثم …'], ['It works by …', 'تعمل من خلال …'], ['The first version only needs …', 'تحتاج النسخة الأولى فقط إلى …']],
    example: ['Students scan a QR code at the clinic, pick a time slot, and receive a reminder one hour before.', 'يمسح الطلاب رمز QR في العيادة ويختارون موعداً ويتلقون تذكيراً قبل ساعة.'],
    think: ['Is it realistic for a first prototype? What is the simplest version that works?', 'هل هي واقعية لنموذج أولي؟ ما أبسط نسخة تعمل؟'],
  },
  4: {
    goal: ['Don’t start over — build on the spotlighted idea. Constructive criticism is a skill.', 'لا تبدأ من جديد — طوّر الفكرة المعروضة. النقد البنّاء مهارة.'],
    starters: [['This would be even better if …', 'ستكون أفضل لو …'], ['One risk is … so we could …', 'أحد المخاطر هو … لذلك يمكننا …'], ['For students who …, add …', 'للطلاب الذين …، أضف …']],
    example: ['One risk is privacy, so reminders should never show the type of appointment on the lock screen.', 'أحد المخاطر هو الخصوصية، لذا يجب ألا تُظهر التذكيرات نوع الموعد على شاشة القفل.'],
    think: ['What could go wrong? Who might be left out? How could it be simpler?', 'ما الذي قد يسوء؟ من قد يُستبعد؟ كيف نجعلها أبسط؟'],
  },
  7: {
    goal: ['Suggest one final feature that makes the product genuinely more useful.', 'اقترح ميزة أخيرة تجعل المنتج أكثر فائدة فعلاً.'],
    starters: [['A feature that lets users …', 'ميزة تتيح للمستخدمين …'], ['To keep it safe, the app should …', 'لضمان الأمان، يجب أن …'], ['AI could help here by …', 'يمكن للذكاء الاصطناعي المساعدة هنا من خلال …']],
    example: ['To keep it safe, the assistant should always say “I am not a doctor” and link to the campus clinic.', 'لضمان الأمان، يجب أن يذكر المساعد دائماً «لست طبيباً» وأن يوجّه إلى عيادة الحرم.'],
    think: ['Is it needed by the users we described? Can a human check what AI does?', 'هل يحتاجها المستخدمون الذين وصفناهم؟ هل يستطيع الإنسان مراجعة ما يفعله الذكاء الاصطناعي؟'],
  },
};

export type Check = {key: string; label: Pair; ok: boolean};

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
const PEOPLE = /\b(students?|users?|people|staff|teachers?|patients?|everyone|visitors?|learners?|friends?|parents?|they)\b|طلاب|الطلاب|طالب|المستخدم|الناس|الموظف|المعلم|المرضى|الجميع|الزوار/i;
const REASON = /\b(because|so that|so they|in order to|which means|since|due to|to help|to make|to avoid|by|so)\b|لأن|لكي|حتى|بسبب|من أجل|مما|لتجنب|لمساعدة|من خلال/i;
const CONCRETE = /\b(when|every|daily|weekly|minutes?|hours?|app|reminder|map|chat|notification|feature|button|scan|book|track|show|send|record|alert|plan|\d+)\b|عندما|كل|يومي|أسبوع|دقيقة|ساعة|تطبيق|تذكير|خريطة|محادثة|إشعار|ميزة|زر|حجز|تتبع|يعرض|إرسال|خطة|[0-9٠-٩]/i;

/** Transparent writing-quality signals shown while a student types. */
export function assessContribution(text: string): Check[] {
  const count = words(text).length;
  return [
    {key: 'clear', label: ['Clear enough to understand (8+ words)', 'واضحة بما يكفي (8 كلمات أو أكثر)'], ok: count >= 8},
    {key: 'who', label: ['Names who it is for', 'تحدد لمن هي'], ok: PEOPLE.test(text)},
    {key: 'why', label: ['Explains why or how', 'تشرح السبب أو الطريقة'], ok: REASON.test(text)},
    {key: 'concrete', label: ['Includes a concrete detail', 'تتضمن تفصيلاً ملموساً'], ok: CONCRETE.test(text)},
  ];
}

/** Presenter facilitation notes for each of the five guided steps. */
export const facilitation: {goal: Pair; ask: Pair; time: Pair; tip: Pair; skills: number[]}[] = [
  {goal: ['Students separate a problem from a solution and describe a real need.', 'يميّز الطلاب بين المشكلة والحل ويصفون حاجة حقيقية.'], ask: ['“Think of the last time this was difficult for you. What happened?”', '«تذكّر آخر مرة كان فيها هذا صعباً عليك. ماذا حدث؟»'], time: ['5–7 min', '5–7 دقائق'], tip: ['If students jump to apps, ask: “What problem does that app solve?”', 'إذا قفز الطلاب إلى التطبيقات، اسأل: «ما المشكلة التي يحلها هذا التطبيق؟»'], skills: [0, 4]},
  {goal: ['Generate many options before judging any of them.', 'توليد خيارات كثيرة قبل الحكم على أي منها.'], ask: ['“What would you build if it could not fail?”', '«ماذا ستبني لو كان النجاح مضموناً؟»'], time: ['6–8 min', '6–8 دقائق'], tip: ['Read two ideas aloud and ask the room to combine them into a third.', 'اقرأ فكرتين بصوت عالٍ واطلب من القاعة دمجهما في فكرة ثالثة.'], skills: [1, 2]},
  {goal: ['Practise constructive critique: improve an idea rather than replace it.', 'ممارسة النقد البنّاء: تحسين الفكرة بدلاً من استبدالها.'], ask: ['“What is one risk — and how would you reduce it?”', '«ما أحد المخاطر — وكيف تقلله؟»'], time: ['8–10 min', '8–10 دقائق'], tip: ['Spotlight one idea at a time. Celebrate improvements that mention risks or inclusion.', 'اعرض فكرة واحدة في كل مرة. احتفِ بالتحسينات التي تذكر المخاطر أو الشمول.'], skills: [2, 3, 4]},
  {goal: ['Make a decision with criteria: value, feasibility and responsibility.', 'اتخاذ قرار وفق معايير: القيمة وقابلية التنفيذ والمسؤولية.'], ask: ['“If we could only build three features, which three — and why?”', '«لو استطعنا بناء ثلاث ميزات فقط، فأيها — ولماذا؟»'], time: ['8–10 min', '8–10 دقائق'], tip: ['Show the brief and ask students to spot one thing AI should not decide alone.', 'اعرض الملخص واطلب من الطلاب تحديد أمر لا ينبغي للذكاء الاصطناعي أن يقرره وحده.'], skills: [5, 7]},
  {goal: ['See AI as a collaborator: humans set direction, AI drafts, humans verify.', 'رؤية الذكاء الاصطناعي كشريك: الإنسان يحدد الاتجاه، والذكاء الاصطناعي يصيغ، والإنسان يتحقق.'], ask: ['“Does the prototype solve our original problem? What would you test first?”', '«هل يحل النموذج مشكلتنا الأصلية؟ ما أول شيء ستختبره؟»'], time: ['10–20 min', '10–20 دقيقة'], tip: ['Point at one AI output and ask: “How do we know this is correct?”', 'أشر إلى أحد مخرجات الذكاء الاصطناعي واسأل: «كيف نعرف أن هذا صحيح؟»'], skills: [6, 7]},
];

export type Role = 'human' | 'ai' | 'both';
/** A short sorting activity that builds AI literacy: who should own each task? */
export const roleQuiz: {task: Pair; answer: Role; why: Pair}[] = [
  {task: ['Decide which problem matters most to our students', 'تحديد المشكلة الأهم لطلابنا'], answer: 'human', why: ['Values and priorities come from people who live the problem.', 'القيم والأولويات تأتي من الأشخاص الذين يعيشون المشكلة.']},
  {task: ['Group 60 ideas into themes', 'تجميع 60 فكرة في محاور'], answer: 'ai', why: ['Sorting large amounts of text quickly is a strength of AI — a person should still review the groups.', 'فرز كميات كبيرة من النصوص بسرعة من نقاط قوة الذكاء الاصطناعي — مع مراجعة بشرية للمجموعات.']},
  {task: ['Write a first draft of the app’s welcome screen', 'كتابة مسودة أولى لشاشة الترحيب في التطبيق'], answer: 'both', why: ['AI can draft fast; humans edit for tone, accuracy and culture.', 'يصيغ الذكاء الاصطناعي بسرعة، ويحرر الإنسان النبرة والدقة والملاءمة الثقافية.']},
  {task: ['Tell a student whether their symptoms are serious', 'إخبار طالب ما إذا كانت أعراضه خطيرة'], answer: 'human', why: ['Health decisions need qualified professionals. AI must not diagnose.', 'القرارات الصحية تحتاج إلى مختصين مؤهلين. لا يجوز للذكاء الاصطناعي التشخيص.']},
  {task: ['Translate a reminder into Arabic and English', 'ترجمة تذكير إلى العربية والإنجليزية'], answer: 'both', why: ['AI translates well, but a fluent speaker should check meaning and tone.', 'يترجم الذكاء الاصطناعي جيداً، لكن يجب أن يراجع متحدث متمكن المعنى والنبرة.']},
  {task: ['Generate starter code for a prototype', 'توليد شيفرة أولية لنموذج تجريبي'], answer: 'ai', why: ['AI coding tools speed up building — people still test it and own the result.', 'تسرّع أدوات البرمجة بالذكاء الاصطناعي البناء — ويبقى الإنسان مسؤولاً عن الاختبار والنتيجة.']},
  {task: ['Choose what personal data the app is allowed to collect', 'اختيار البيانات الشخصية التي يُسمح للتطبيق بجمعها'], answer: 'human', why: ['Privacy and consent are ethical decisions, owned by people.', 'الخصوصية والموافقة قرارات أخلاقية يملكها الإنسان.']},
  {task: ['Summarise feedback from 100 users', 'تلخيص ملاحظات 100 مستخدم'], answer: 'both', why: ['AI summarises at scale; humans check for missing or unfair conclusions.', 'يلخص الذكاء الاصطناعي على نطاق واسع، ويتحقق الإنسان من الاستنتاجات الناقصة أو غير العادلة.']},
];

/** How each workplace skill was practised today — shown after a student reflects. */
export const skillPractice: Record<string, Pair> = {
  'Problem Solving': ['You turned a vague challenge into a clear problem worth solving.', 'حوّلت تحدياً غامضاً إلى مشكلة واضحة تستحق الحل.'],
  'Creativity': ['You generated options before judging them, and combined ideas into new ones.', 'ولّدت خيارات قبل الحكم عليها، ودمجت الأفكار لتكوين أفكار جديدة.'],
  'Collaboration': ['You built on teammates’ ideas instead of starting over.', 'طوّرت أفكار زملائك بدلاً من البدء من جديد.'],
  'Communication': ['You explained an idea clearly enough for others to improve it.', 'شرحت فكرة بوضوح يكفي ليطوّرها الآخرون.'],
  'Critical Thinking': ['You looked for risks and weaknesses — and suggested fixes.', 'بحثت عن المخاطر ونقاط الضعف — واقترحت حلولاً.'],
  'Decision Making': ['You chose between good options using value and feasibility.', 'اخترت بين خيارات جيدة بناءً على القيمة وقابلية التنفيذ.'],
  'AI Literacy': ['You decided what AI should do, and what people must check.', 'حددت ما ينبغي للذكاء الاصطناعي فعله، وما يجب أن يراجعه الإنسان.'],
  'Product Development': ['You moved from problem to features to a buildable brief.', 'انتقلت من المشكلة إلى الميزات إلى ملخص قابل للبناء.'],
};

const STOP = new Set(('a an the and or but if then so to of in on at for with by from into about as is are was were be been being it its this that these those there their they them we our us you your i my me he she his her can could would should will just also more most very really much many some any all not no yes do does did have has had make makes made help helps using use get gets need needs want like than when where what which who how why one two app apps idea ideas student students university ai before after each other through every same only even still such own way well while over into onto across without within lets let able something things thing want wants collects collect completed changes change shows show gives give takes take put puts '
  + 'في من على إلى عن مع هذا هذه ذلك التي الذي الذين هو هي هم نحن أن إن كان كانت يكون لا ما لم لن قد كل أو ثم بعض أي عند حتى لكي لأن مثل يمكن يجب فكرة الطلاب طالب الطالب تطبيق').split(' '));

/** Most frequent meaningful words across contributions — a transparent "what the room is saying". */
export function themes(ideas: Idea[], limit = 18): {word: string; count: number}[] {
  const counts = new Map<string, {word: string; count: number}>();
  for (const idea of ideas) {
    const seen = new Set<string>();
    for (const raw of (idea.title + ' ' + idea.text).toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      // Treat Arabic "ال" + word and the bare word as one theme; count each word once per idea.
      const key = raw.replace(/^ال(?=\p{L}{3,})/u, '');
      if (raw.length < 3 || STOP.has(raw) || STOP.has(key) || /^\p{N}+$/u.test(key) || seen.has(key)) continue;
      seen.add(key);
      const entry = counts.get(key) || {word: raw, count: 0};
      entry.count++;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].filter(t => t.count > 1 || ideas.length < 6).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).slice(0, limit);
}

/** Good prompts share recognisable ingredients. Teaching them is part of AI literacy. */
export function promptChecks(prompt: string): Check[] {
  const has = (re: RegExp) => re.test(prompt);
  return [
    {key: 'goal', label: ['States the goal', 'يحدد الهدف'], ok: has(/#\s*PROJECT|build\s/i)},
    {key: 'users', label: ['Describes the users', 'يصف المستخدمين'], ok: has(/#\s*TARGET USERS\s*\n\s*\S/i)},
    {key: 'features', label: ['Lists core features', 'يسرد الميزات الأساسية'], ok: has(/#\s*CORE FEATURES\s*\n\s*\S/i)},
    {key: 'context', label: ['Gives real context (student ideas)', 'يقدم سياقاً حقيقياً (أفكار الطلاب)'], ok: has(/#\s*STUDENT CONTRIBUTIONS\s*\n\s*\[/i)},
    {key: 'constraints', label: ['Sets technical constraints', 'يضع قيوداً تقنية'], ok: has(/#\s*TECHNICAL REQUIREMENTS/i)},
    {key: 'safety', label: ['Includes safety & privacy', 'يتضمن السلامة والخصوصية'], ok: has(/#\s*SAFETY\s*\n\s*\S/i)},
    {key: 'human', label: ['Keeps a human in the loop', 'يُبقي الإنسان في الحلقة'], ok: has(/#\s*HUMAN OVERSIGHT\s*\n\s*\S/i)},
    {key: 'result', label: ['Defines what “done” means', 'يحدد معنى «الإنجاز»'], ok: has(/#\s*EXPECTED RESULT/i)},
  ];
}

/** "AI Study Assistant" → "AI study assistant": lowercase words but keep acronyms like AI and IT. */
export function challengeQuestion(challenge: string): string {
  const phrase = challenge.split(/\s+/).map(w => /^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase()).join(' ');
  return `How can we use technology and AI to create a useful ${phrase} for university students?`;
}
