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
npm run build
```

The verification script creates disposable local test workshops and checks server authorization, moderation, stage controls, vote budgets, SSE, and closure. `WORKSHOP_TEST_ORIGIN` can select a dedicated test server; do not run it against a live audience workshop.

## Architecture and reliability

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
