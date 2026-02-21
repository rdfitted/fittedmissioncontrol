# Emails Tab - Mission Control

## Overview
New "Emails" tab added to Mission Control dashboard for managing AI-drafted email replies.

## What's New

### 1. **Email Tab Component** (`src/components/email-tab.tsx`)
Three-section layout:
- **Pending Drafts** (top-left) — Cards showing drafts awaiting approval with emerald highlight
- **Recent Inbox** (bottom-left) — Last 15 emails from Gmail, with "Draft Reply" buttons
- **Draft History** (right) — Collapsible history of sent and rejected drafts

### 2. **API Routes** (`src/app/api/emails/`)
- `GET /api/emails/drafts` — Lists all drafts (pending, sent, rejected)
- `POST /api/emails/drafts/:id/approve` — Creates Gmail draft via Google Workspace API, moves to sent/
- `POST /api/emails/drafts/:id/reject` — Moves to rejected/ with reason
- `GET /api/emails/inbox` — Proxies to Gmail API for recent emails
- `POST /api/emails/draft` — Triggers draft generation (placeholder for now)

### 3. **Data Structure**
Draft files stored in: `C:\Users\RDuff\Code Projects\data\email-drafts/`
- `pending/` — Awaiting approval
- `sent/` — Approved (Gmail draft created)
- `rejected/` — Rejected with reason

### 4. **Integration Points**
- **Google Workspace API:**
  - URL: `https://script.google.com/macros/s/AKfycbxH0dpfhJB6UWTH1AUoi0_C1wLi2vw-ay6cFn1q0CTu5FbX7nY1oTCFqqCB-Ff2GjULqQ/exec`
  - Token: `hex-gw-de367888df121a87e8156750`
  - Actions: `gmail.draft`, `gmail.unread`, `gmail.search`

## Design
- Matches existing dark theme (zinc-950 bg, zinc-800 borders)
- Pending drafts have emerald accent (emerald-500/30 border, emerald-950/20 bg)
- Status badges with color coding (emerald = sent, red = rejected)
- Responsive grid layout within tab area

## Usage

### Viewing Drafts
1. Navigate to "Emails" tab in Mission Control
2. Pending drafts appear at top with emerald highlight
3. Click draft card or preview to see full content

### Approving a Draft
1. Click "Approve & Create Draft" button
2. Gmail draft is created via API
3. File moves from `pending/` to `sent/`
4. Badge updates to show "Sent" status

### Rejecting a Draft
1. Click red X button
2. Enter rejection reason (optional)
3. File moves to `rejected/` folder
4. Reason is saved for reference

### Recent Inbox
- Shows last 15 emails from Gmail
- Unread emails have blue highlight
- Click "Draft Reply" to trigger AI draft generation (placeholder for now)

### Draft History
- Click chevron to expand/collapse
- Shows sent + rejected drafts sorted by date
- Color-coded badges (green = sent, red = rejected)

## Sample Drafts
Two example drafts created in `data/email-drafts/pending/`:
- `draft-2026-02-21-001.json` — Billy Carney / QuickBooks issue
- `draft-2026-02-21-002.json` — Criscia Palmotillo / Automation proposal

## Next Steps (for Vault/Backend Team)

### Full Draft Generation Workflow
The `POST /api/emails/draft` endpoint is currently a placeholder. Production implementation needs:

1. **Gmail Search** — Query Gmail API for recent thread
2. **Context Gathering:**
   - Pull Podio contact info
   - Check `memory/clients/` for client context
   - Recent meeting notes if relevant
3. **LLM Generation:**
   - Send context + thread to LLM
   - Generate reply matching Ryan's voice/tone
4. **Save Draft:**
   - Write to `data/email-drafts/pending/{id}.json`
   - Include context sources in `contextUsed` array

### WhatsApp Integration
For `/draft [query]` command via WhatsApp:
- Same workflow as above
- Present draft in WhatsApp with approve/reject options
- Sync state with Mission Control UI

## Files Changed
- ✅ `src/components/email-tab.tsx` — New component
- ✅ `src/app/page.tsx` — Tab registration
- ✅ `src/app/api/emails/drafts/route.ts` — List drafts
- ✅ `src/app/api/emails/drafts/[id]/approve/route.ts` — Approve endpoint
- ✅ `src/app/api/emails/drafts/[id]/reject/route.ts` — Reject endpoint
- ✅ `src/app/api/emails/inbox/route.ts` — Gmail inbox proxy
- ✅ `src/app/api/emails/draft/route.ts` — Draft generation (placeholder)
- ✅ `data/email-drafts/` — Directory structure created

## Testing
- ✅ Build passes (`npm run build`)
- ✅ All routes visible in build output
- ✅ Sample drafts created for UI testing
- ⚠️ Gmail API integration not yet tested (needs real emails)

## Build Output
```
Route (app)
...
├ ƒ /api/emails/draft
├ ƒ /api/emails/drafts
├ ƒ /api/emails/drafts/[id]/approve
├ ƒ /api/emails/drafts/[id]/reject
├ ƒ /api/emails/inbox
...
```

---

**Status:** ✅ Complete — UI and API structure ready
**Next:** Backend team to implement full LLM draft generation workflow
