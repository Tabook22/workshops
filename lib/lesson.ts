export const lessonSteps=[['Define the problem','حدد المشكلة',1],['Share ideas','شارك الأفكار',2],['Develop a solution','طور الحل',4],['Plan the project','خطط للمشروع',7],['Build & present','ابنِ واعرض',8]] as const;
export function lessonIndex(stage:number){return stage<=1?0:stage===2?1:stage<=6?2:stage===7?3:4}
