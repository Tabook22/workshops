export const boardKinds=[['announcement','Announcement','إعلان'],['idea','Shared idea','فكرة مشتركة'],['request','Help request','طلب مساعدة']] as const;
export type BoardKind=typeof boardKinds[number][0];
export type BoardPost={id:string;code:string;nickname:string;room:string|null;team:string;kind:string;parent:string|null;title:string;text:string;status:string;pinned:number;resolved:number;created:number;updated:number;mine:boolean;audio?:string|null;replies?:BoardPost[]};
export type BoardData={code:string;name:string;enabled:boolean;open:boolean;moderated:boolean;admin:boolean;canPost:boolean;team:string;posts:BoardPost[];next:string|null;total:number;generated:number};
