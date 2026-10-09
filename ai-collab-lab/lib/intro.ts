/**
 * Plain-language introduction to the app (English / Arabic), shown on the About page and to first-time visitors.
 * Edit the wording here; every screen that shows the introduction reads from this file.
 */
type Pair = [en: string, ar: string];

export const intro = {
  title: ['What is it?', 'ما هو التطبيق؟'] as Pair,
  what: [
    ['AI Collab Lab is a website where a whole class works together to turn a real problem into an idea for a new product, with the help of AI.', 'مختبر التعاون بالذكاء الاصطناعي موقع إلكتروني يعمل فيه الصف كله معاً لتحويل مشكلة حقيقية إلى فكرة لمنتج جديد، بمساعدة الذكاء الاصطناعي.'],
    ['The teacher (the “presenter”) leads the session on a big screen. Students take part from their own phones. No one needs to download anything or create an account, and it works in both English and Arabic.', 'يقود المعلم («مقدم الورشة») الجلسة على شاشة كبيرة، ويشارك الطلاب من هواتفهم. لا يحتاج أحد إلى تنزيل أي شيء أو إنشاء حساب، ويعمل الموقع بالعربية والإنجليزية.'],
  ] as Pair[],
  whyTitle: ['Why is it important?', 'لماذا هو مهم؟'] as Pair,
  why: [
    [['Everyone gets a voice', 'لكل شخص صوت'], ['In a normal class, a few students do most of the talking. Here, every student can share their ideas from their phone — even shy ones, and even without giving their name.', 'في الصف المعتاد يتحدث عدد قليل من الطلاب أغلب الوقت. هنا يستطيع كل طالب مشاركة أفكاره من هاتفه — حتى الخجولون، وحتى دون ذكر أسمائهم.']],
    [['Students learn real job skills', 'يتعلم الطلاب مهارات العمل الحقيقية'], ['Employers look for people who can solve problems, work in a team, explain ideas, think critically and make good decisions. Students practise all of these in one session.', 'يبحث أصحاب العمل عمّن يستطيع حل المشكلات والعمل ضمن فريق وشرح الأفكار والتفكير النقدي واتخاذ قرارات جيدة. ويمارس الطلاب كل ذلك في جلسة واحدة.']],
    [['Students learn to use AI the right way', 'يتعلم الطلاب استخدام الذكاء الاصطناعي بالطريقة الصحيحة'], ['AI is a powerful helper, but it does not replace human thinking. People choose the problem, AI helps organize and build, and people check that the result is correct and safe.', 'الذكاء الاصطناعي مساعد قوي، لكنه لا يحل محل تفكير الإنسان. الإنسان يختار المشكلة، والذكاء الاصطناعي يساعد في التنظيم والبناء، ثم يتحقق الإنسان من أن النتيجة صحيحة وآمنة.']],
    [['Arabic and English speakers take part equally', 'يشارك متحدثو العربية والإنجليزية بالتساوي'], ['Each person picks their language. With translation turned on, ideas written in one language appear in the other, so no one is left out.', 'يختار كل شخص لغته. وعند تفعيل الترجمة تظهر الأفكار المكتوبة بلغة باللغة الأخرى، فلا يُستبعد أحد.']],
    [['It ends with something real', 'وينتهي بشيء حقيقي'], ['By the end, the class has a clear product plan and ready-made instructions that an AI tool can use to start building it.', 'في النهاية يكون لدى الصف خطة منتج واضحة وتعليمات جاهزة يمكن لأداة ذكاء اصطناعي استخدامها لبدء بنائه.']],
  ] as [Pair, Pair][],
  stepsTitle: ['How does it work? Five simple steps', 'كيف يعمل؟ خمس خطوات بسيطة'] as Pair,
  steps: [
    [['Define the problem', 'حدّد المشكلة'], ['“What is difficult for students?” Everyone shares real problems.', '«ما الصعب على الطلاب؟» يشارك الجميع مشكلات حقيقية.']],
    [['Share ideas', 'شارك الأفكار'], ['“What could help?” Everyone suggests solutions — simple ideas are welcome.', '«ما الذي قد يساعد؟» يقترح الجميع حلولاً — والأفكار البسيطة مرحّب بها.']],
    [['Develop a solution', 'طوّر الحل'], ['The class picks one idea and makes it better together.', 'يختار الصف فكرة واحدة ويحسّنها معاً.']],
    [['Plan the project', 'خطّط للمشروع'], ['The class chooses the best ideas and writes a short project plan.', 'يختار الصف أفضل الأفكار ويكتب خطة مشروع قصيرة.']],
    [['Build and present', 'ابنِ واعرض'], ['AI helps build a first version, and the class discusses it.', 'يساعد الذكاء الاصطناعي في بناء نسخة أولى، ويناقشها الصف.']],
  ] as [Pair, Pair][],
  useTitle: ['How to use it', 'كيف تستخدمه'] as Pair,
  student: {
    title: ['If you are a student', 'إذا كنت طالباً'] as Pair,
    steps: [
      ['Scan the QR code on the screen, or open the website and type the workshop code.', 'امسح رمز QR الظاهر على الشاشة، أو افتح الموقع واكتب رمز الورشة.'],
      ['Type a nickname — or join without a name.', 'اكتب اسماً مستعاراً — أو انضم دون اسم.'],
      ['Follow the task on your phone. It changes automatically when the teacher moves to the next step.', 'اتبع المهمة على هاتفك؛ فهي تتغير تلقائياً عندما ينتقل المعلم إلى الخطوة التالية.'],
      ['Write your idea and press Send. Not sure how to start? Tap one of the ready-made sentence starters.', 'اكتب فكرتك واضغط «أرسل». لست متأكداً كيف تبدأ؟ اضغط على إحدى بدايات الجمل الجاهزة.'],
      ['Open “Team ideas” to read your classmates’ ideas and add comments.', 'افتح «أفكار الفريق» لقراءة أفكار زملائك وإضافة تعليقات.'],
      ['Vote for the best ideas when voting opens.', 'صوّت لأفضل الأفكار عندما يُفتح التصويت.'],
    ] as Pair[],
    tip: ['Tip: choose EN or العربية at the top, and Dark or Light to suit your eyes.', 'نصيحة: اختر EN أو العربية في الأعلى، واختر داكن أو فاتح بما يريح عينيك.'] as Pair,
  },
  presenter: {
    title: ['If you are the teacher (presenter)', 'إذا كنت المعلم (مقدم الورشة)'] as Pair,
    steps: [
      ['Sign in with your username and password.', 'سجّل الدخول باسم المستخدم وكلمة المرور.'],
      ['Click “Create workshop” and choose a challenge — for example “Smart Campus” — or write your own.', 'اضغط «إنشاء ورشة» واختر تحدياً — مثل «الحرم الجامعي الذكي» — أو اكتب تحديك الخاص.'],
      ['Click “Invite” to show the QR code on the projector.', 'اضغط «دعوة» لعرض رمز QR على شاشة العرض.'],
      ['Follow the steps on your screen. Each step tells you what to ask the class and roughly how long it takes.', 'اتبع الخطوات على شاشتك؛ فكل خطوة تخبرك بما تسأل الصف عنه والمدة التقريبية.'],
      ['Click “Next” when the class is ready. Everyone’s phone updates by itself.', 'اضغط «التالي» عندما يكون الصف جاهزاً، وستتحدث هواتف الجميع تلقائياً.'],
      ['At the end, create the project plan and copy the build instructions into an AI tool.', 'في النهاية أنشئ خطة المشروع وانسخ تعليمات البناء إلى أداة ذكاء اصطناعي.'],
    ] as Pair[],
  },
  oneLineTitle: ['In one sentence', 'باختصار'] as Pair,
  oneLine: ['AI Collab Lab helps a whole class think together, share ideas fairly, and use AI wisely to turn a real problem into a real product.', 'يساعد مختبر التعاون بالذكاء الاصطناعي الصف كله على التفكير معاً، ومشاركة الأفكار بعدل، واستخدام الذكاء الاصطناعي بحكمة لتحويل مشكلة حقيقية إلى منتج حقيقي.'] as Pair,
  // Short version for first-time visitors
  welcomeTitle: ['Welcome! New here?', 'أهلاً بك! هل أنت جديد هنا؟'] as Pair,
  welcome: [
    ['A whole class turns a real problem into a product idea — together, with the help of AI.', 'يحوّل الصف كله مشكلة حقيقية إلى فكرة منتج — معاً، وبمساعدة الذكاء الاصطناعي.'],
    ['Students join from their phones with a QR code. No account, no download.', 'ينضم الطلاب من هواتفهم برمز QR، بلا حساب ولا تنزيل.'],
    ['Everyone gets a voice — in English or Arabic.', 'لكل شخص صوت — بالعربية أو الإنجليزية.'],
  ] as Pair[],
};
