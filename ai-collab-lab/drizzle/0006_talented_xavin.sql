CREATE TABLE `leadership_votes` (
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`candidate` text NOT NULL,
	PRIMARY KEY(`code`, `participant`)
);
--> statement-breakpoint
CREATE INDEX `idx_leadership_votes_candidate` ON `leadership_votes` (`code`,`candidate`);
--> statement-breakpoint
-- Repair legacy rooms without touching ideas, files, or existing valid leadership.
UPDATE participants AS p SET role=CASE WHEN p.id=(
 SELECT id FROM participants WHERE code=p.code AND role!='guest'
 ORDER BY role='lead' DESC,created,id LIMIT 1
) THEN 'lead' ELSE 'member' END
WHERE p.role!='guest' AND p.code IN (SELECT code FROM sessions WHERE parent IS NOT NULL);
