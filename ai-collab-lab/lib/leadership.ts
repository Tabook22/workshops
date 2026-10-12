import type { Leadership } from './workshop';

/** Keep exactly one lead in a non-empty room. Retain the existing lead, otherwise
 * select the earliest remaining member (id breaks simultaneous-join ties). */
export function repairLeader(db:D1Database,code:string) {
 return db.prepare("UPDATE participants SET role=CASE WHEN id=(SELECT id FROM participants WHERE code=? AND role!='guest' ORDER BY role='lead' DESC,created,id LIMIT 1) THEN 'lead' ELSE 'member' END WHERE code=? AND role!='guest'").bind(code,code);
}
export function clearLeadershipVotes(db:D1Database,code:string) {
 return db.prepare('DELETE FROM leadership_votes WHERE code=?').bind(code);
}

/** Ballots are private: members see candidate totals and only their own choice.
 * Joining/leaving or a manual handover clears ballots so a changed roster starts fresh. */
export async function leadershipSnapshot(db:D1Database,code:string,participant:string):Promise<Leadership> {
 const result=await db.batch([
  db.prepare("SELECT p.id,p.nickname,p.role,(SELECT COUNT(*) FROM leadership_votes v JOIN participants voter ON voter.id=v.participant AND voter.code=v.code AND voter.role!='guest' WHERE v.code=p.code AND v.candidate=p.id) AS votes FROM participants p WHERE p.code=? AND p.role!='guest' ORDER BY p.role='lead' DESC,p.created,p.id").bind(code),
  db.prepare('SELECT candidate FROM leadership_votes WHERE code=? AND participant=?').bind(code,participant)
 ]);
 const members=(result[0].results as {id:string;nickname:string;role:string;votes:number}[]).map(p=>({id:p.id,name:p.nickname,lead:p.role==='lead',votes:p.votes}));
 return {members,required:Math.floor(members.length/2)+1,ballots:members.reduce((n,p)=>n+p.votes,0),myVote:(result[1].results[0] as {candidate:string}|undefined)?.candidate||null};
}

/** All three statements run in one database transaction. Candidate and voter must
 * still belong to the room at write time; a strict majority elects immediately. */
export function leadershipBallot(db:D1Database,code:string,participant:string,candidate:string) {
 const active="EXISTS(SELECT 1 FROM sessions room JOIN sessions parent ON parent.code=room.parent WHERE room.code=? AND json_extract(room.config,'$.ended')=0 AND json_extract(room.config,'$.paused')=0 AND json_extract(parent.config,'$.ended')=0)";
 const winner=`SELECT v.candidate FROM leadership_votes v JOIN participants voter ON voter.id=v.participant AND voter.code=v.code AND voter.role!='guest' JOIN participants nominee ON nominee.id=v.candidate AND nominee.code=v.code AND nominee.role!='guest' WHERE v.code=? AND ${active} GROUP BY v.candidate HAVING COUNT(*)>(SELECT COUNT(*)/2 FROM participants WHERE code=? AND role!='guest') LIMIT 1`;
 return [
  db.prepare(`INSERT INTO leadership_votes (code,participant,candidate) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM participants WHERE code=? AND id=? AND role!='guest') AND EXISTS(SELECT 1 FROM participants WHERE code=? AND id=? AND role!='guest') AND ${active} ON CONFLICT(code,participant) DO UPDATE SET candidate=excluded.candidate`).bind(code,participant,candidate,code,participant,code,candidate,code),
  db.prepare(`UPDATE participants SET role=CASE WHEN id=(${winner}) THEN 'lead' ELSE 'member' END WHERE code=? AND role!='guest' AND EXISTS(${winner})`).bind(code,code,code,code,code,code,code),
  db.prepare(`DELETE FROM leadership_votes WHERE code=? AND EXISTS(${winner})`).bind(code,code,code,code)
 ];
}
