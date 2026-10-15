import type {Language} from './workshop';
export const AVATARS=[
 ['boy','Young boy','فتى','people'],['girl','Young girl','فتاة','people'],['man','Gentleman','رجل','people'],['woman','Professional woman','امرأة','people'],['elder','Wise gentleman','رجل كبير السن','people'],['elder-woman','Wise lady','سيدة كبيرة السن','people'],['hijab','Teal elegance','أناقة الحجاب','people'],['omani','Omani gentleman','رجل عُماني','people'],
 ['fox','Clever fox','الثعلب الذكي','animals'],['lion','Friendly lion','الأسد الودود','animals'],['owl','Wise owl','البومة الحكيمة','animals'],['panda','Gentle panda','الباندا اللطيفة','animals'],['cat','Curious cat','القطة الفضولية','animals'],['rabbit','Bright rabbit','الأرنب النشيط','animals'],
 ['knight','Kind knight','الفارس الشجاع','adventure'],['lady','Elegant lady','السيدة الأنيقة','adventure'],['driver','Racing driver','سائقة السباق','adventure'],['pilot','Explorer pilot','الطيار المستكشف','adventure'],['astronaut','Space explorer','مستكشفة الفضاء','adventure'],['robot','Creative robot','الروبوت المبدع','adventure']
] as const;
export type AvatarId=typeof AVATARS[number][0];
export const validAvatar=(value:unknown):value is AvatarId=>typeof value==='string'&&AVATARS.some(a=>a[0]===value);
export const avatarName=(id:string|undefined,lang:Language)=>{const a=AVATARS.find(a=>a[0]===id);return a?(lang==='ar'?a[2]:a[1]):lang==='ar'?'الحروف الأولى':'Initials'};
export type RoomMood='ready'|'thinking'|'writing';
export type Seat={key:string;name:string;avatar:AvatarId|null;lead:boolean;me:boolean;recent:boolean;state:RoomMood;hand:number|null;speaking:boolean;/** When the speaking turn ends (server time), while speaking. */until:number|null};
export type RoomExperience={avatar:AvatarId|null;members:Seat[];manage:boolean;member:boolean;ended:boolean;generated:number;/** Speaking turns pass to the next raised hand by themselves (the leader can turn this off). */autoTurns:boolean;/** Length of a speaking turn, in milliseconds. */turn:number};
