// ── House closing playbook ──────────────────────────────────────────────────
// Deterministic, per-lead sales script in the Straight Line / Hormozi voice.
// Zero AI calls: every one of the ~28k leads gets an instant script built from
// its own facts (name, niche, city, site status, live preview link). The
// AI "Generate" button on the prospect page overwrites this with a custom one.
//
// Client-safe on purpose — no supabase imports. Keep it that way.

export type PitchBranch = { clientSays: string; response: string; returnTo?: string; nextStep: string }
export type Pitch = { callScript?: string; email?: string; branches?: PitchBranch[] }

type LeadFacts = {
  business: string
  niche?: string | null
  city?: string | null
  state?: string | null
  priority?: string | null
  website?: string | null
}

/** Mirror of prospect-preview's slugify — duplicated so this stays client-safe. */
function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Niche keyword → the pain that actually moves this vertical. */
const PAIN_LINES: Array<[RegExp, { pain: string; dream: string }]> = [
  [/barber|hair|salon|spa|nail|beauty|lash|tattoo/i, {
    pain: 'people pick whoever has photos and online booking — chairs sit empty while the shop down the street is booked out',
    dream: 'a full book, deposits collected up front, no-shows cut in half',
  }],
  [/restaurant|pizz|cafe|coffee|bakery|cater|food|grill|diner|ice cream/i, {
    pain: 'people check the menu online before they ever walk in — no menu, no visit',
    dream: 'the menu, hours, and reservations one tap away from every Google search',
  }],
  [/dent|orthodon|smile|oral/i, {
    pain: 'patients compare three practices online before they call one — and they call the one that looks established',
    dream: 'new-patient bookings coming in while the front desk is closed',
  }],
  [/gym|fitness|yoga|pilates|crossfit|martial|dance|trainer/i, {
    pain: 'memberships are won on first impression — a weak online presence reads like a weak gym',
    dream: 'trials booked straight from Instagram and Google without a single DM',
  }],
  [/real estate|realty|realtor|mortgage|broker/i, {
    pain: 'every listing you share sends people to a page that sells someone else’s brand',
    dream: 'your own brand capturing every lead your listings generate',
  }],
  [/clean|janitor|maid|pressure wash|carpet/i, {
    pain: 'commercial contracts check you out online before they ever return a quote request',
    dream: 'quote requests landing in your inbox with the size of the job already filled in',
  }],
  [/auto|car|tire|mechanic|collision|body shop|towing|transmission|detail/i, {
    pain: 'when someone’s car breaks down they call the first shop that looks legit on Google — right now that’s not you',
    dream: 'the phone ringing with jobs instead of price-shoppers',
  }],
  [/law|attorney|legal|cpa|account|insurance|loan/i, {
    pain: 'clients hire credibility — and today your credibility is a phone number on a directory page',
    dream: 'consultations booked by people who already decided you look like the safest choice',
  }],
]

const DEFAULT_PAIN = {
  pain: 'customers judge you in five seconds on Google — and right now they’re judging a listing, not a business',
  dream: 'showing up first, looking like the biggest player in town, and booking work while you sleep',
}

export function buildDefaultPlaybook(lead: LeadFacts): Pitch {
  const business = lead.business.trim()
  const previewUrl = `https://seliem.dev/for/${slug(business)}`
  const town = lead.city ? lead.city.trim() : 'town'
  const nicheLabel = (lead.niche || 'business').trim().toLowerCase()
  const noSite = (lead.priority || '').trim().startsWith('1') || !lead.website
  const { pain, dream } = PAIN_LINES.find(([re]) => re.test(lead.niche || ''))?.[1] || DEFAULT_PAIN

  const siteAngle = noSite
    ? `Right now ${business} has no real website. Not a bad one — none. Every single day, ${pain}.`
    : `I looked at what ${business} has online. It exists — but it’s not doing its job. ${pain[0].toUpperCase()}${pain.slice(1)}.`

  const callScript = `1. GATEKEEPER / DECISION-MAKER CHECK
"Hey — quick one. Who handles the website and the marketing for ${business}? ... Perfect, that’s exactly who I need. Is that you?"
[If gatekeeper: "Totally get it. Tell them Mohamed built something for ${business} — it’s already live, they’ll want to see it. Best number or time to catch them?"]

2. PATTERN-INTERRUPT OPENER  [confident, unhurried]
"This is Mohamed from Seliem.dev — and before you hang up: I’m not calling to sell you a website. [pause 1s] I already built yours. It’s live on my screen right now with ${business}’s name on it. Give me thirty seconds and I’ll text you the link so you’re looking at it while we talk. Fair enough?"
CLIENT RESPONSE: (curiosity / confusion is the goal — either works)

3. REASON FOR CALLING  [slow down]
"Here’s why ${business} specifically. ${siteAngle} I build sites for ${nicheLabel}s, so instead of cold-calling you with a pitch deck, I did the work first. Texting the link now — ${previewUrl}. Open it. That’s your name on it."
[Send the link. Wait. Let them react — say NOTHING until they do.]

4. DISCOVERY  [lean in, genuinely curious]
"While you’re looking — when a new customer finds you today, where do they land? Google listing? Facebook?"
CLIENT RESPONSE: (listen for: word of mouth / Facebook / old site / nothing)
"And when they get there — can they book you, or do they have to call and hope you pick up?"
CLIENT RESPONSE:
"Last one: roughly how many jobs a month do you think slip to the competitor who just... looked more established online?"
[pause 2s — let that number sit. Their number closes the deal, not yours.]

5. VALUE STACK  [certainty, faster tempo]
"So here’s what the real version of that preview does for ${business}: you show up when ${town} searches for a ${nicheLabel}. Customers see the quality of your work before they ever call. They book you straight from the site — nights, weekends, while you’re on a job. That’s ${dream}. The preview you’re looking at took me one build cycle — the real one carries your photos, your services, your reviews."

6. PRICE, ANCHORED  [matter-of-fact, no apology]
"One lost job a month probably costs you more than this whole project. A full business site is from $900 — flat. Landing page from $500 if you want to start lean. Booking and automation from $1,500 when you’re ready. Half up front, half when you love it. And there’s no monthly trap — optional care plan from $30 if you ever want it."

7. DIRECT CLOSE  [lower voice, slow]
"Look — you’ve seen the preview. It’s already half real. Worst case, you tell me no and keep the concept as free inspiration — costs you nothing. Best case, ${business} finally looks like what it actually is. Let’s lock fifteen minutes and I’ll walk you through making it yours — cal.com/seliem.dev, or I’ll just book it right now while we’re on. What’s better, tomorrow morning or afternoon?"

8. CONFIRM NEXT STEP
"Done — [day/time]. I’m texting you the calendar invite and the preview link together so it’s all in one thread. One thing before I go: have two or three photos of your best work ready. That’s all I need from you. Talk then."`

  const branches: PitchBranch[] = [
    {
      clientSays: 'Interested',
      response: `"That’s the right instinct — and you haven’t even seen the real version. [faster] Here’s the move: fifteen minutes, I walk you through the preview, we swap in your photos and services, and you see exactly what goes live. Tomorrow morning or afternoon?"`,
      returnTo: 'Stage 8 — confirm the exact time and the photo homework.',
      nextStep: 'Booked discovery call on cal.com/seliem.dev with calendar invite sent during the call.',
    },
    {
      clientSays: 'How much?',
      response: `"Fair question — and I’ll give it to you straight, no dancing. From $900 flat for the full site, $500 if you start with a landing page. Half up front. [pause] But do the other math first: what does ONE customer who picked the other guy cost you? Because that’s the bill you’re already paying every month."`,
      returnTo: 'Stage 5 — stack the value, then re-close at Stage 7.',
      nextStep: 'Reframe price against cost of inaction, then ask for the 15-minute call.',
    },
    {
      clientSays: 'We already have a website / a guy',
      response: `"Love that — means you already believe in this. So here’s a free second opinion: open ${previewUrl} next to your current site. [pause] If yours wins, fire me before you ever hire me. If mine wins... that gap is what customers see every day. Which one would YOU call?"`,
      returnTo: 'Stage 4 — discovery on what their current site actually converts.',
      nextStep: 'Side-by-side comparison on the spot; book the call if the preview wins.',
    },
    {
      clientSays: 'Send me information',
      response: `"Better — I’ll send you the actual thing. It’s already in your texts: ${previewUrl}. That’s not a brochure, that’s YOUR site, live. [lean in] Open it right now while I’m on — takes ten seconds and then you’ll know if this call was worth it."`,
      returnTo: 'Stage 3 — react to the preview together, then discovery.',
      nextStep: 'Link opened during the call; convert "send info" into a live reaction.',
    },
    {
      clientSays: 'I need to think about it',
      response: `"Totally fine — and just so you’re thinking about the right thing: the preview stays live either way, so there’s nothing to lose by looking. [slow] What’s the one thing you’d need to see to know this is a yes? ... Perfect. Fifteen minutes Thursday, I show you exactly that. If it’s not there, you walk."`,
      returnTo: 'Stage 7 — close on the specific concern they named.',
      nextStep: 'Named the real objection and booked a follow-up with a concrete condition.',
    },
    {
      clientSays: 'Not interested',
      response: `"No problem — I only push when there’s a fit. The preview stays up at ${previewUrl}; keep it as free inspiration, no strings. If business ever slows and you wonder why the other shop is booked out — you know where I am. Have a good one."`,
      returnTo: 'End the call — do not loop unless they re-engage on their own.',
      nextStep: 'Respectful exit; lead keeps the link, mark status Not a fit.',
    },
  ]

  const email = `Subject: I already built ${business} a website (it’s live)

Hey — Mohamed from Seliem.dev.

Instead of pitching you, I did the work first: ${previewUrl}

That’s a live concept with ${business}’s name on it. If you hate it, keep it as free inspiration — costs you nothing. If you like it, 15 minutes and I’ll show you what the real version looks like with your photos and services: cal.com/seliem.dev

Sites from $900, landing pages from $500. Half up front, half when you love it.

— Mohamed`

  return { callScript, email, branches }
}
