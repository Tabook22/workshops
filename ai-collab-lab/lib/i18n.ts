/**
 * Bilingual (English / Arabic) support shared by every screen.
 *
 * - `uiLang` is the language the interface is currently shown in. It drives <html lang dir>,
 *   so right-to-left layout, fonts and the Help dialog follow it everywhere.
 * - A visitor's explicit choice (the EN / العربية switch) is remembered per browser.
 *   Inside a workshop the presenter's workshop language is used until the visitor picks one.
 * - Server messages stay English in the API; `translateError` shows them in Arabic.
 */
import {useSyncExternalStore} from 'react';

export type UiLang = 'en' | 'ar';
const KEY = 'ai-collab-lang';
const listeners = new Set<() => void>();
let current: UiLang = 'en';
let initialised = false;

export function storedLang(): UiLang | null {
  try { const v = localStorage.getItem(KEY); return v === 'en' || v === 'ar' ? v : null; } catch { return null; }
}
function init() {
  if (initialised || typeof document === 'undefined') return;
  initialised = true;
  current = storedLang() || (document.documentElement.lang === 'ar' ? 'ar' : 'en');
}
function apply(lang: UiLang) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
/** Show the interface in `lang`. `persist` records it as this visitor's own choice. */
export function setUiLang(lang: UiLang, persist = false) {
  init();
  if (persist) { try { localStorage.setItem(KEY, lang); } catch { /* private mode */ } }
  apply(lang);
  if (lang === current) return;
  current = lang;
  listeners.forEach(l => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { const v = storedLang(); if (v) setUiLang(v); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
/** Current interface language, for code outside React rendering (e.g. request helpers). */
export function getUiLang(): UiLang { init(); return current; }
export function useUiLang(): UiLang {
  return useSyncExternalStore(subscribe, () => { init(); return current; }, () => 'en');
}
/** Pick the English or Arabic text. */
export const tx = (lang: string, en: string, ar: string) => (lang === 'ar' ? ar : en);

const errors: Record<string, string> = {
  'Workshop not found. Check the session code.': 'لم يتم العثور على الورشة. تحقق من رمز الجلسة.',
  'Workshop not found.': 'لم يتم العثور على الورشة.',
  'Room not found.': 'لم يتم العثور على الغرفة.',
  'This team joins by invitation. Ask the team for its invite link.': 'ينضم الأعضاء لهذا الفريق بالدعوة. اطلب رابط الدعوة من الفريق.',
  'Only the room lead can manage members.': 'قائد الغرفة فقط يمكنه إدارة الأعضاء.',
  'Member not found.': 'لم يتم العثور على العضو.',
  'Hand over the lead before leaving the team.': 'سلّم القيادة قبل مغادرة الفريق.',
  'Only a member can lead the room.': 'يمكن لعضو فقط أن يقود الغرفة.',
  'This team keeps its discussion private.': 'يحتفظ هذا الفريق بنقاشه خاصاً.',
  'Invalid upload.': 'رفع غير صالح.',
  'The file is too large (3 MB at most).': 'الملف كبير جداً (3 ميغابايت كحد أقصى).',
  'Files can be shared in team rooms.': 'يمكن مشاركة الملفات في غرف الفرق.',
  'Visitors can read and comment. Join this room as a member to share files.': 'يمكن للزوار القراءة والتعليق. انضم إلى هذه الغرفة كعضو لمشاركة الملفات.',
  'Share a PNG, JPEG, GIF or WebP image, or a PDF.': 'شارك صورة PNG أو JPEG أو GIF أو WebP، أو ملف PDF.',
  'This room has reached its file limit.': 'وصلت هذه الغرفة إلى الحد الأقصى للملفات.',
  'You have reached your file limit in this room.': 'وصلت إلى الحد الأقصى لملفاتك في هذه الغرفة.',
  'Unable to save the file right now. Please retry.': 'تعذّر حفظ الملف الآن. يرجى المحاولة مجدداً.',
  'File not found.': 'لم يتم العثور على الملف.',
  'You can only remove your own files.': 'يمكنك إزالة ملفاتك فقط.',
  'Vote from the main workshop.': 'صوّت من الورشة الرئيسية.',
  'Showcase voting is closed.': 'تصويت عرض المشاريع مغلق.',
  'Vote for another team’s project, not your own.': 'صوّت لمشروع فريق آخر، لا لفريقك.',
  'The report could not be prepared. Please retry.': 'تعذّر إعداد التقرير. يرجى المحاولة مجدداً.',
  'Visiting other rooms is turned off.': 'زيارة الغرف الأخرى غير مفعّلة.',
  'Create rooms from the main workshop.': 'أنشئ الغرف من الورشة الرئيسية.',
  'Only the presenter can create rooms in this workshop.': 'مقدم الورشة فقط يمكنه إنشاء الغرف في هذه الورشة.',
  'Give the room a name.': 'اكتب اسماً للغرفة.',
  'This workshop has reached its room limit.': 'وصلت هذه الورشة إلى الحد الأقصى للغرف.',
  'Use the main workshop.': 'استخدم الورشة الرئيسية.',
  'Type the room code to confirm.': 'اكتب رمز الغرفة للتأكيد.',
  'Visitors can read and comment. Join this room as a member to add ideas or vote.': 'يمكن للزوار القراءة والتعليق. انضم إلى هذه الغرفة كعضو لإضافة الأفكار أو التصويت.',
  'The workshop connection is unavailable. Your work is safe. Please retry.': 'الاتصال بالورشة غير متاح حالياً. عملك محفوظ. يرجى المحاولة مجدداً.',
  'Invalid request origin.': 'مصدر الطلب غير صالح.',
  'Request too large.': 'الطلب كبير جداً.',
  'Invalid request.': 'طلب غير صالح.',
  'The presenter key is incorrect.': 'مفتاح مقدم الورشة غير صحيح.',
  'This workshop has ended.': 'انتهت هذه الورشة.',
  'Please enter a nickname.': 'يرجى إدخال اسم مستعار.',
  'Presenter access required.': 'يتطلب هذا صلاحية مقدم الورشة.',
  'Presenter login required.': 'يرجى تسجيل دخول مقدم الورشة.',
  'Shortlist and approve at least one idea before voting.': 'وافق على فكرة واحدة على الأقل وأضفها إلى القائمة المختصرة قبل التصويت.',
  'Another presenter control changed. Please retry.': 'تغيّر إعداد آخر للورشة للتو. يرجى المحاولة مجدداً.',
  'Sample ideas can only be added to an empty workshop.': 'يمكن إضافة الأفكار التجريبية إلى ورشة فارغة فقط.',
  'Idea not found.': 'لم يتم العثور على الفكرة.',
  'Shortlist an idea, not a comment.': 'أضف فكرة إلى القائمة المختصرة، وليس تعليقاً.',
  'Close voting before changing finalists.': 'أغلق التصويت قبل تغيير الأفكار المرشحة.',
  'Approve this idea first.': 'وافق على هذه الفكرة أولاً.',
  'Title and contribution are required.': 'العنوان والمشاركة مطلوبان.',
  'Close voting before merging ideas.': 'أغلق التصويت قبل دمج الأفكار.',
  'Choose a different approved idea.': 'اختر فكرة معتمدة مختلفة.',
  'Combined text exceeds 1500 characters. Shorten the ideas before merging.': 'يتجاوز النص المدمج 1500 حرف. اختصر الأفكار قبل الدمج.',
  'Unknown moderation action.': 'إجراء إشراف غير معروف.',
  'Join the workshop first.': 'انضم إلى الورشة أولاً.',
  'The workshop is paused. Please wait for the presenter.': 'الورشة متوقفة مؤقتاً. يرجى انتظار مقدم الورشة.',
  'Editing is closed.': 'التعديل مغلق.',
  'A title and at least three characters are required.': 'يلزم عنوان وثلاثة أحرف على الأقل.',
  'You can only edit your own ideas.': 'يمكنك تعديل أفكارك فقط.',
  'This idea cannot be edited. Ask the presenter for help.': 'لا يمكن تعديل هذه الفكرة. اطلب المساعدة من مقدم الورشة.',
  'The workshop changed. Please refresh and retry.': 'تغيّرت الورشة. يرجى التحديث والمحاولة مجدداً.',
  'Discussion is closed.': 'النقاش مغلق.',
  'Please write at least three characters.': 'يرجى كتابة ثلاثة أحرف على الأقل.',
  'Invalid comment identifier.': 'معرّف التعليق غير صالح.',
  'This idea is unavailable, discussion is closed, or your comment limit is reached.': 'هذه الفكرة غير متاحة، أو النقاش مغلق، أو وصلت إلى الحد الأقصى للتعليقات.',
  'Submissions are closed.': 'المشاركات مغلقة.',
  'Submissions are not open at this stage.': 'المشاركات غير مفتوحة في هذه المرحلة.',
  'Wait for the presenter to select an idea.': 'انتظر حتى يختار مقدم الورشة فكرة.',
  'The selected idea is no longer available.': 'الفكرة المختارة لم تعد متاحة.',
  'Invalid submission identifier.': 'معرّف المشاركة غير صالح.',
  'Submission limit reached or the stage has changed.': 'وصلت إلى حد المشاركات أو تغيّرت المرحلة.',
  'Voting is closed, this idea is unavailable, or you have used your votes.': 'التصويت مغلق، أو الفكرة غير متاحة، أو استخدمت جميع أصواتك.',
  'Reflection is not available.': 'التأمل غير متاح حالياً.',
  'Unknown action.': 'إجراء غير معروف.',
  'Type the workshop code to confirm.': 'اكتب رمز الورشة للتأكيد.',
  'Presenter accounts are not enabled on this server.': 'حسابات مقدمي الورش غير مفعّلة على هذا الخادم.',
  'Your current password is incorrect.': 'كلمة المرور الحالية غير صحيحة.',
  'Username must be 3–40 letters, numbers or . _ - @': 'يجب أن يتكون اسم المستخدم من 3 إلى 40 حرفاً أو رقماً أو . _ - @',
  'The new password must be at least 10 characters.': 'يجب ألا تقل كلمة المرور الجديدة عن 10 أحرف.',
  'Choose a password that does not contain the username or repeat one character.': 'اختر كلمة مرور لا تحتوي على اسم المستخدم ولا تكرر حرفاً واحداً.',
  'Nothing to change.': 'لا يوجد ما يُغيَّر.',
  'Choose a translation service.': 'اختر خدمة ترجمة.',
  'Enter the LibreTranslate server address (https://…).': 'أدخل عنوان خادم LibreTranslate (https://…).',
  'Enter the API key for this service.': 'أدخل مفتاح API لهذه الخدمة.',
  'The logo needs some text.': 'يحتاج الشعار إلى نص.',
  'The application name is required.': 'اسم التطبيق مطلوب.',
  'Use a version such as 2.0.0 or 2.1-beta.': 'استخدم رقم إصدار مثل 2.0.0 أو 2.1-beta.',
  'Dates must look like 2026-10-09.': 'يجب أن تكون التواريخ بصيغة 2026-10-09.',
  'Enter a valid contact email or leave it empty.': 'أدخل بريد تواصل صحيحاً أو اتركه فارغاً.',
  'The website must start with https:// or http://.': 'يجب أن يبدأ الموقع بـ https:// أو http://.',
  'Unable to save right now. Keep your text and retry.': 'تعذّر الحفظ الآن. احتفظ بنصك وحاول مجدداً.',
  'The workshop service did not respond. Your text is still here — please retry.': 'لم تستجب خدمة الورشة. نصك ما زال هنا — يرجى المحاولة مجدداً.',
  'Unable to save. Please retry.': 'تعذّر الحفظ. يرجى المحاولة مجدداً.',
  'Login service unavailable.': 'خدمة تسجيل الدخول غير متاحة.',
  'Too many login attempts. Try again in 15 minutes.': 'محاولات تسجيل دخول كثيرة. حاول مجدداً بعد 15 دقيقة.',
  'Incorrect username or password.': 'اسم المستخدم أو كلمة المرور غير صحيحة.',
  'Clipboard is unavailable. Select the text and copy it manually.': 'الحافظة غير متاحة. حدّد النص وانسخه يدوياً.',
  'Failed to fetch': 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
};
/** Arabic for known messages; unknown messages are shown unchanged. */
export function translateError(message: string, lang: string) {
  if (lang !== 'ar' || !message) return message;
  return errors[message] || errors[message.trim()] || message;
}
