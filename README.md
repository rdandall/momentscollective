# Moments Collective — AI Creative Brief Assistant

An embeddable AI-powered widget that conducts a warm creative conversation with potential clients, generates a professional Creative Brief, and emails it to Rob — all in one flow.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required values:
```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
ROB_EMAIL=rob@momentscollective.com
FROM_EMAIL=briefs@momentscollective.com
```

### 3. Configure the widget

Open `widget/brief-widget.js` and update the two constants at the top:
```javascript
const API_BASE = 'https://YOUR-VERCEL-URL.vercel.app';
const BOOKING_URL = 'https://calendly.com/your-actual-link';
```

---

## Development

Open `widget/brief-widget-dev.html` directly in a browser to test the widget UI.

For full API testing, deploy to Vercel (see below) and update `API_BASE`.

---

## Deployment (Vercel)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Vercel auto-detects the `/api` folder — no framework config needed
4. Add environment variables in the Vercel dashboard under Project Settings → Environment Variables
5. Deploy

Every `git push` to `main` triggers a new deployment automatically.

### Resend setup (for emails)
1. Create a free account at [resend.com](https://resend.com)
2. Add `momentscollective.com` as a verified domain
3. Add the DNS records Resend provides (SPF + DKIM)
4. Copy your API key to the `RESEND_API_KEY` env var

---

## Embedding on Rob's site

Add this single line before `</body>` on any page of momentscollective.com:

```html
<script src="https://YOUR-VERCEL-URL.vercel.app/widget/brief-widget.js" defer></script>
```

That's it. The widget self-installs with no dependencies.

---

## How it works

1. Visitor sees a **"Tell Us Your Story"** button fixed to the bottom-right corner
2. They click → a slide-in panel opens with a chat interface
3. An AI producer (powered by Claude) conducts a warm creative interview covering:
   - Project type
   - Brand / client details
   - The story they want to tell
   - Desired outcome (followers, awareness, conversions, etc.)
   - Tone & aesthetic references
   - Deliverables & scope
   - Timeline
   - Budget range
   - Special requirements
4. After 6+ exchanges covering 6+ areas, Claude generates a **Creative Brief** document
5. The brief renders beautifully inside the chat (cinematic dark aesthetic)
6. A **"Book a Call with Rob →"** CTA appears
7. The brief is simultaneously **emailed to Rob** with all details
8. The conversation survives page navigation within the site (sessionStorage)

---

## File structure

```
momentscollective/
├── vercel.json              # Vercel config (function timeouts, CORS)
├── .env.example             # Environment variable template
├── package.json             # Dependencies
├── api/
│   ├── chat.js              # Claude API proxy + brief detection
│   └── send-brief.js        # Resend email dispatch
└── widget/
    ├── brief-widget.js      # The embeddable IIFE widget
    └── brief-widget-dev.html # Dev harness for testing the widget
```
