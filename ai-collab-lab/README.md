# AI COLLAB LAB

A live UTAS workshop platform: Think · Share · Improve · Vote · Build.

## Run a workshop

1. Open **Presenter login → Create workshop**. The healthcare challenge is preconfigured; choose a different challenge or edit any field.
2. Save the **presenter key** displayed once after creation. Download it or copy it somewhere private. It recovers control on another device. Students never need this key.
3. Choose **Invite students** and show the QR screen. Students enter a nickname or join anonymously.
4. Move through the nine stages using the sidebar, Back/Next, or projector shortcuts. Students automatically follow the stage.
5. At Solutions and Improve, choose **Spotlight** on an approved contribution to give everyone a shared target.
6. Approve pending contributions when moderation is enabled. Shortlist approved ideas, then start voting. Vote limits are enforced on the server.
7. Open **Generate product**, select finalists, generate and edit the canvas, review the development prompt, then **Save our product**. Copy or download the prompt for an AI coding tool.
8. Run Reflection, show Workplace skills and Final reveal, then End workshop. Download the workshop JSON to retain a portable record.

**Projection shortcuts:** Right/Left change stages; Q shows QR; I shows ideas; V shows results; F enters fullscreen; Escape leaves fullscreen. Visible controls are always provided. The public `/project?code=…` view has no presenter controls. The presenter console's projection view has a small control bar.

**Emergency:** pause, stop submissions, close voting, hide the wall, show QR, or restore the current stage. Timer expiry is advisory and never deletes content.

## Learning features

- **Student coach** (stages 1–4, 7): a goal, tap-to-insert sentence starters, a strong worked example and a "think deeper" prompt. A live quality meter checks four transparent rules (clear, names who, explains why/how, concrete detail) in English and Arabic. It never blocks submission. Content lives in `lib/learning.ts`.
- **Facilitator notes** beside each guided step: learning goal, a question to ask the room, a facilitation tip, suggested time and the workplace skills practised.
- **Human / AI / Together sorting activity** (stages 6–7) builds AI literacy, with an explanation for every answer.
- **"What the room is saying"** word cloud and a live activity feed on the presenter and projector screens. These are plain word counts, not AI analysis.
- **Prompt-quality checklist** next to the build prompt, plus a reflection insight explaining how each skill was practised.
- **Readable Markdown report** export in addition to the JSON record.
- **Dark and light templates** with a Dark / Light / Auto switch on every screen. Auto (the default) follows the device setting and updates live; an explicit choice is remembered per browser. Light is recommended for projectors in bright rooms. All colours are tokens in `app/design-system.css` (`:root` for dark, `:root[data-theme=light]` for light), so the palette can be re-branded in one place.
- **Bilingual interface (English / العربية)** on every screen, with true right-to-left layout, Arabic typography and Arabic server messages (`lib/i18n.ts`). Visitors choose with the EN / العربية switch, remembered per device. Inside a workshop the presenter's workshop language is the default; a student's own choice (including bilingual mode) wins. New workshops created from the Arabic interface start with Arabic challenge text, and the product canvas starts in the workshop language. The AI build prompt stays in English for AI coding tools and requires Arabic RTL support in the product.
- **Workshop dashboard** (presenter login): Cards or List view; filter All / Active / Ended; sort by newest, oldest, name, participants, ideas or status; drag the handle (or use arrow keys) to arrange your own order, saved per browser. Each workshop can be edited, ended or reopened, backed up as JSON, or deleted. Several can be selected to back up, end or delete together. Deleting is permanent: it requires typing the workshop code (or DELETE for several), offers a backup first, and removes all participants, contributions, votes and reflections in one transaction (`deleteWorkshop` action, presenter only).
- **Team rooms** (Team rooms button in the presenter header, or the Team rooms switch in workshop settings): besides the shared class project, teams develop their own projects in separate rooms. A room is a linked sub-workshop (code `UTAS-123456-R1`, table `sessions.parent`, migration `0003_rooms`), so every stage, the idea wall, comments, voting, translation and the project brief work inside each room. The presenter creates rooms (quick start: N teams, or named rooms with a project focus) and students can start their own if allowed. Students join a team from the **Team rooms** tab or with the room's own link/QR, which also works for people new to the workshop. One team per student: joining another team turns the old membership into a visit, keeping its ideas. **Visitors** (guests) read and comment in other rooms but cannot post ideas or vote; the presenter can turn visiting off. The first member is the **room lead**: from "Lead the room" on their phone they get the guided presenter tools for that room only (they cannot end or delete it). The presenter overview shows each room's stage, members, ideas and pending items, opens or projects any room, moves every room to a stage, pauses/resumes all rooms and sends a message shown in every room; a Rooms screen can be shown on the projector. The room manager (in the workshop and from the dashboard's rooms button on every workshop) searches and sorts rooms (order created, name, members, ideas, progress, needs approval; remembered per browser), edits a room's name, project focus and question, and chooses what each room's screen shows (current step, idea wall, voting results or join QR), for one room or all at once. **Rooms views** (`lib/rooms-visual.tsx`): Map (an illustrated floor plan where each team is a coloured room with its members inside, the lead crowned, visitors, contributions, messages, votes, pending items, a nine-step progress track, last activity and a live glow), Cards and List (a status table); the choice is remembered per browser. Clicking a room opens its details: status counters, all admin actions, the people in it (lead, members, visitors) and a live activity feed of every idea and message. Students get the Map and Cards views in their Team rooms tab, and the projector Rooms screen shows the map. **Room files**: members, room leads and the presenter share PNG, JPEG, GIF or WebP images and PDFs (3 MB at most; 15 per person, 150 per room) from the room's Files tab or the room details. Large photos are resized on the device; files are sent in 96 KB pieces because the VPS proxy limits requests to 128 KB, and the type is checked from the file's bytes. Files live in the database (`uploads`, migration `0004_uploads`), so SQLite backups include them and deleting a room or workshop removes them. In moderated rooms a file waits for approval; visitors can view but not share. Files appear in the room activity feed, as a count on the map and in the list. Images are served inline with a sandboxing Content-Security-Policy and `nosniff`; PDFs download. **Team showcase** (Team rooms → Team showcase): each team's project brief (from its product canvas) is presented on the projector one team at a time with Previous/Next; Open class voting lets every student cast one changeable vote for the best team project from the main workshop on their phone, never for their own team (stored as `room:<code>` votes in the main workshop, separate from idea votes and hidden while voting unless live results are on); Show results reveals the ranking. Export → **All teams report** downloads one Markdown file with the main workshop, the showcase results and every room's ideas and brief. Ending, reopening or deleting the workshop applies to its rooms. Verified by `scripts/verify-rooms.mjs`.
- **Admin settings** (dashboard → Settings, presenter login required): change the logo text and highlighted part (live preview), application name and tagline in English and Arabic, version, release and creation dates, and the About page content (description, organization, credits, contact email, website). Stored in the `app_settings` table (migration `0001_app_settings`), served publicly by `/api/app` and shown on every screen. **Admin account**: change the username and/or password; requires the current password, enforces at least 10 characters, writes `presenter-auth.json` atomically (mode 600) as a salted scrypt hash and rotates the signing secret so other devices are signed out. Verified by `scripts/verify-admin-settings.mjs` (local servers only; it restores the original credentials).
- **Home page wording** (Settings → Home page): every text on the landing page — headline, description, buttons, illustration bubbles, the five steps, highlights and footer — can be edited in English and Arabic without changing the layout. Audience presets (Students, Employees, General public) fill the form with suitable wording to fine-tune before saving; per-field reset and Restore original wording are available. Stored as `app_settings` key `landing`; defaults live in `lib/landing-content.ts`.
- **Plain-language introduction** (English / Arabic): what the app is, why it matters, the five steps and how students and teachers use it. Shown on the About page, as a one-time welcome window on the landing page and as a small “New here?” banner on the student join page. The wording lives in `lib/intro.ts`.
- **About page** at `/about`: name, version, description, dates, organization and highlights, bilingual and linked from the landing page, Help and the presenter sidebar.
- **Automatic translation** (Settings → Translation): shows everything people write — challenge name, question, description, ideas and comments — in each viewer's chosen language (Arabic ↔ English), so Arabic and English speakers take part equally. Choose DeepL (recommended; free plan), Google Cloud Translation, a self-hosted LibreTranslate, or Claude (official Anthropic SDK, default model `claude-opus-5-5`, server-side refusal fallback enabled). Keys stay on the server and are shown masked. Each text is translated once and cached in the `translations` table (migration `0002_translations`) for everyone; `/api/translate` only accepts text already visible in the workshop; pending ideas are never sent; a per-workshop daily character limit caps cost. Originals are never changed — editing and JSON export use the author's wording, and every viewer can choose Show original. Off by default. Verified by `scripts/verify-translation.mjs` (needs a LibreTranslate-compatible URL; a mock works).
- Mixed Arabic/English text uses `unicode-bidi: plaintext`, so English inside the Arabic interface keeps its punctuation in place (and vice versa).
- Student drafts are kept per stage in session storage, so a stage change or reload no longer erases unsent text.

Live streams share one cached workshop read (max 1 s, in-flight requests coalesced, invalidated on every write; explicit GETs bypass it). This cuts database work from one 7-query batch per viewer every 2 s to roughly one per workshop. See `lib/snapshot.ts`.

## Local development

Requires Node 22.13+ and npm. Install with `npm install`.

```powershell
node node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config wrangler.local.json --persist-to .wrangler/state --file drizzle/0000_aberrant_storm.sql
npm run dev
```

Apply local migrations before creating sessions. To make the local preview reachable from phones on the same trusted Wi-Fi, use `node scripts/run-framework.mjs dev --host 0.0.0.0` and open the laptop's LAN address on the presenter device before displaying the QR code. Firewall and campus network client isolation may prevent LAN use; the hosted URL is the preferred workshop option. A loopback QR code only works on the laptop.

```powershell
node node_modules/typescript/bin/tsc --noEmit
node scripts/verify-workshop.mjs
node scripts/verify-rooms.mjs
npm run build
```

The verification script creates disposable local test workshops and checks server authorization, moderation, stage controls, vote budgets, SSE, and closure. `WORKSHOP_TEST_ORIGIN` can select a dedicated test server; do not run it against a live audience workshop.

## Architecture and reliability

Idea-map bubbles support pointer dragging with a movement threshold so a tap opens the idea while a drag only rearranges it. Alt + arrow keys move the focused bubble (Shift increases the step). Color, size and positions are stored in the browser per workshop; these personal arrangements do not change other participants' maps. Customize bubble selects appearance controls; Reset map restores defaults. Own-idea editing is server-authorized, respects session pause/closure and resubmits moderated edits for approval. Shortlisted contributions cannot be edited by students, protecting the meaning of existing ballots.

Clicking an idea bubble opens a focused discussion dialog with the full contribution, author, approved comments and comment composer. Discover includes an Open idea & discuss action. Shortlisted ideas offer voting inside the dialog only during the voting stage, with the server enforcing pause, session closure, quotas and duplicate-vote rules. The dialog supports Escape, keyboard focus containment and a return-to-exploring action; closing a typed comment draft asks before discarding it.

Team ideas now opens an interactive explorer: Discover presents one contribution at a time with previous/next navigation and a surprise option; Idea map displays color-coded contribution bubbles and actual parent relationships, with zoom and pages of up to ten nodes. Selecting a bubble updates the central preview and focused discussion. Phones default to Discover for readable text. Search and category filters apply to both modes. Map connections represent recorded parent IDs, not inferred semantic similarity. English/Arabic controls, keyboard-operable buttons and reduced-motion styling are included.

Students have separate Your task and Team ideas tabs. The shared wall includes searchable, filtered contribution cards and comment threads, with incremental pagination. Each workshop code defines one shared team; separate teams work in team rooms (see Learning features). Comments use the existing ideas table with `type=comment` and a parent idea ID, so no schema migration is required. Comments are excluded from idea statistics and cannot be shortlisted. Moderation, workshop membership, parent visibility, pause, closure and a 20-comment limit per participant per idea are enforced by the server. Retry IDs make comment posting idempotent. Pending comments are visible only to their author and the presenter; other students see them after approval.

### Hostinger VPS deployment at /workshops

Presenter access on the VPS uses the configured username and password, a salted scrypt password hash, and a signed HttpOnly/Secure cookie lasting 12 hours. The private credentials file is `/home/nasser/apps/workshops/shared/presenter-auth.json` (mode 600), referenced by `PRESENTER_AUTH_FILE`; it is excluded from release archives and source control. Presenter login lists existing workshops and authorizes account-wide management. Legacy workshop keys cannot authorize VPS access when account authentication is enabled. Students still join without accounts. Ten failed login attempts per IP are limited for 15 minutes. Sign out clears the browser session cookie.

Use `scripts/verify-presenter-auth.mjs` with `WORKSHOP_TEST_ORIGIN` and a securely supplied `WORKSHOP_PRESENTER_PASSWORD` to verify authentication. The full workshop verifier also accepts that password environment variable. Never put passwords in source control or public assets.

`npm run build:vps` produces a self-contained release in `dist/vps`, requiring Node 22.16+ with no server-side npm install. The shared workshop API uses a native SQLite adapter with WAL, atomic vote statements and checksum-verified Drizzle migrations. Every client link, QR code, API call and event stream uses `/workshops`.

The VPS release is installed under `/home/nasser/apps/workshops/releases/20261006-01`; `current` points to the active release. The user service is `workshops.service` (`systemctl --user status workshops`), bound to `127.0.0.1:3800`. User lingering is enabled so it starts after reboot. Persistent data lives in `/home/nasser/apps/workshops/shared/workshops.sqlite`, outside release directories. Back up it with SQLite's online backup API rather than copying a live WAL database alone. Never overwrite this database when updating the app.

The Nginx installer is `sudo sh /home/nasser/apps/workshops/current/deploy/install-nginx.sh`. It adds only a workshop include to the existing HTTPS vhost, backs up the original configuration, validates before reload and restores it on validation failure. SSE buffering is disabled. The public health endpoint is `https://nasserdiary.com/workshops/healthz`. The original Sites deployment has separate data; no sessions are automatically migrated between providers.

To verify a VPS release, set `WORKSHOP_TEST_ORIGIN=http://127.0.0.1:3800/workshops` and run `node scripts/verify-workshop.mjs`. It creates and closes disposable sessions. Preserve release directories for rollback: update `current` to a tested release and restart the user service. Database schema rollbacks require separate review; do not reverse migrations blindly.

- React 19 + TypeScript + Vinext/Vite, deployed as a Cloudflare Worker.
- Durable D1 database; generated Drizzle migrations own schema changes.
- Server-Sent Events deliver snapshots about every two seconds. The browser reconnects automatically, with snapshot polling fallback and refresh when the tab becomes visible.
- A random presenter capability key is hashed in D1; HttpOnly same-site cookies authorize presenter/student actions. No student accounts or AI keys are required. Presenter keys and student tokens never appear in public snapshots.
- Student submission IDs make retries idempotent. Database statements enforce unique ballots, vote budgets, stage gates, pause, closure and per-stage submission limits.
- Votes are unique per browser participant and idea. Anonymous participation cannot guarantee one physical person across different browsers/devices; supervised workshop use is assumed.
- Participants is the number of people who joined, not a claim about currently connected phones. Submitted contributions survive reconnection and deployment.
- Large idea walls paginate; projector pages rotate every 15 seconds. Reduced-motion settings disable visual transitions.
- Arabic uses RTL layout and shared translation tables. Custom challenge text is supplied by the presenter; it is not automatically translated.
- Product generation uses transparent local templates. `lib/workshop.ts` is the integration seam for future **server-side** AI assistance. No AI-generated analysis is claimed, and there is no external AI dependency.

## Operational limits

This MVP is intended for supervised workshops. Keep presenter keys private and avoid collecting sensitive health/student records. Joining and public workshop content are accessible to anyone with the session code. There is no institutional SSO, email recovery, multi-device identity enforcement, or automated abuse classifier. Moderation is manual. Load testing at a full 100+ person event has not been performed; rehearse on the actual campus network before the session.

The Site must permit anonymous public visitors for QR joining without accounts. Hosting access and persistent resources are managed through Sites; production database migrations apply during publishing. Source and lockfile are included for ongoing maintenance.

Presenter idea wall: choose Cards, Bubbles, or List above the live wall. Each workshop's display choice is remembered on this browser. Bubbles retain zoom, dragging and customization; clicking one opens presenter moderation controls. The presenter layout does not change students' views.
