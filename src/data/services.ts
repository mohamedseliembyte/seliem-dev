// ── Service catalogue ───────────────────────────────────────────────────────
// One entry per capability. Powers /services, /services/[slug], the homepage
// Services grid, and the sitemap — so a new service only has to be added here.
//
// Copy rule: everything here describes what the engagement includes. No client
// counts, results or testimonials live in this file — those only get written
// once they're real.

export type Service = {
  slug: string
  name: string
  category: string
  tagline: string
  /** One-line summary used on cards and in meta descriptions. */
  summary: string
  overview: string[]
  deliverables: string[]
  outcomes: string[]
  faqs: { q: string; a: string }[]
  startingAt: string
  related: string[]
}

export const services: Service[] = [
  {
    slug: 'web-design-development',
    name: 'Web Design & Development',
    category: 'Build',
    tagline: 'A site built from scratch, engineered to convert.',
    summary: 'Custom websites and web apps — no templates, no page builders.',
    overview: [
      'Every site is designed and coded from scratch around your business, not dropped into a theme. That means it loads fast, works properly on phones, and is built around the one thing that matters: turning a visitor into a booked job.',
      'You get a site that looks like the quality of work you actually do — and one that keeps working after launch, because it is built on modern, maintainable foundations rather than a pile of plugins.',
    ],
    deliverables: [
      'Custom design — your brand, not a template',
      'Mobile-first build, tested on real screen sizes',
      'Booking, quote forms and lead alerts wired up',
      'Technical SEO, analytics and search-console setup',
      'Speed and accessibility passes before launch',
      'Domain, hosting and deployment handled end to end',
    ],
    outcomes: [
      'Show up looking established next to every competitor in town',
      'Turn traffic into enquiries instead of dead ends',
      'Own a site you can grow, not one you have to rebuild in a year',
    ],
    faqs: [
      { q: 'How long does a build take?', a: 'Most business sites go live in about a week once we have your photos, services and copy. Larger builds are scoped up front so you know the timeline before anything starts.' },
      { q: 'Do I own the site?', a: 'Yes. The site, the domain and the content are yours. There is no platform lock-in and no hostage situation if you ever move on.' },
      { q: 'What do you need from me?', a: 'Photos of your work, your list of services, and about twenty minutes on a call. We write and structure the rest, then you review before it goes live.' },
    ],
    startingAt: '$500',
    related: ['redesign-migration', 'branding-creative', 'hosting-care'],
  },
  {
    slug: 'advertising-paid-media',
    name: 'Advertising & Paid Media',
    category: 'Demand',
    tagline: 'Campaigns built, launched and actually managed.',
    summary: 'Google, Meta and local search campaigns with tracking that proves the spend.',
    overview: [
      'Running ads without tracking is just donating money. Campaigns are built with conversion tracking wired in from day one, so you can see which clicks became phone calls and which became nothing.',
      'That includes the parts most people skip: the landing page the ad points at, the call and form tracking behind it, and the weekly pruning of what is not working.',
    ],
    deliverables: [
      'Google Search, Performance Max and Meta campaign setup',
      'Conversion tracking for calls, forms and bookings',
      'Landing pages built for the campaign, not the homepage',
      'Ad copy and creative variations to test',
      'Audience, geography and budget structure',
      'Ongoing management with plain-English reporting',
    ],
    outcomes: [
      'Know what every dollar of ad spend actually returned',
      'Stop paying for clicks that were never going to call',
      'Turn the tap up or down without rebuilding everything',
    ],
    faqs: [
      { q: 'Is ad spend included?', a: 'No — you pay the ad platforms directly, so the budget stays in your name and under your control. Management is billed separately and quoted before we start.' },
      { q: 'What budget makes sense to start?', a: 'It depends entirely on your market and job value. We work that out together on the call rather than pushing a number at you, and we will say plainly if ads are the wrong move right now.' },
      { q: 'How soon do ads work?', a: 'Search campaigns can produce calls quickly, but the first few weeks are largely learning and pruning. Anyone promising guaranteed results in a fixed window is guessing.' },
    ],
    startingAt: 'Custom',
    related: ['marketing-seo', 'web-design-development', 'ai-automations'],
  },
  {
    slug: 'marketing-seo',
    name: 'Marketing & SEO',
    category: 'Demand',
    tagline: 'The compounding work that makes customers find you first.',
    summary: 'Local SEO, Google Business, content, email and social.',
    overview: [
      'Most local customers pick from whoever appears first when they search. Local SEO is the unglamorous work that decides whether that is you or the shop down the street — and unlike ads, it keeps paying after you stop spending.',
      'Work runs across your Google Business Profile, the structure and content of your site, reviews, and the ongoing content that gives search engines a reason to rank you.',
    ],
    deliverables: [
      'Google Business Profile setup and optimization',
      'Local SEO: citations, categories, service areas',
      'On-page SEO, structured data and site architecture',
      'Content plan and written pages that target real searches',
      'Review generation flow',
      'Email and social groundwork where it fits',
    ],
    outcomes: [
      'Get found by people already searching for what you sell',
      'Build an asset that keeps working after the invoice is paid',
      'Look credible before a customer ever calls',
    ],
    faqs: [
      { q: 'How long until SEO works?', a: 'Realistically months, not days — Google Business and local fixes move fastest, broader ranking takes longer. Anyone promising page one in thirty days is selling you something.' },
      { q: 'Can you guarantee rankings?', a: 'No, and nobody honestly can — Google does not sell that. What we can do is the work that consistently moves rankings and show you exactly what changed.' },
    ],
    startingAt: 'Custom',
    related: ['advertising-paid-media', 'web-design-development', 'hosting-care'],
  },
  {
    slug: 'ai-automations',
    name: 'AI Automations',
    category: 'Automate',
    tagline: 'Systems that answer, qualify and book while you work.',
    summary: 'AI receptionists, instant follow-up, booking and review automation.',
    overview: [
      'Most local businesses lose work to the same thing: nobody picked up, or nobody followed up. Automations close that gap — an AI receptionist that answers instantly, follow-up that fires within seconds, and booking that happens without a phone call.',
      'These are built around your real process, not a generic chatbot dropped on a page. It knows your services, your hours and what to do with a lead once it has one.',
    ],
    deliverables: [
      'AI chat that answers questions and captures leads',
      'Instant lead response by SMS or email',
      'Booking and calendar integration',
      'Review requests triggered after a completed job',
      'Missed-call follow-up',
      'Handoff rules so real humans get the calls that matter',
    ],
    outcomes: [
      'Stop losing jobs to the competitor who answered first',
      'Capture enquiries at 11pm, on weekends, and mid-job',
      'Cut the admin work that eats your evenings',
    ],
    faqs: [
      { q: 'Will it sound like a robot?', a: 'It is written in your voice with your actual services and policies, and it hands off to you when a question needs a real answer. The goal is faster service, not pretending to be human.' },
      { q: 'What if it gets something wrong?', a: 'It is scoped to what it actually knows and told to escalate rather than guess. You review the behaviour before it goes live and can change it any time.' },
    ],
    startingAt: '$1,500',
    related: ['ai-infrastructure', 'web-design-development', 'hosting-care'],
  },
  {
    slug: 'ai-infrastructure',
    name: 'AI Infrastructure',
    category: 'Automate',
    tagline: 'Custom AI built on your data, wired into your tools.',
    summary: 'Internal assistants, knowledge systems, integrations and pipelines.',
    overview: [
      'Beyond chat widgets: the systems that make AI genuinely useful inside a business. Assistants that know your documents, pipelines that process intake, and integrations that connect the tools you already pay for.',
      'Built with the boring parts done properly — model routing with fallbacks so one provider outage does not take you down, caching so costs stay sane, and monitoring so you know when something breaks.',
    ],
    deliverables: [
      'Internal assistants trained on your own documents',
      'Document, intake and data processing pipelines',
      'CRM, API and webhook integrations',
      'Retrieval systems over your knowledge base',
      'Model routing with provider fallbacks and cost controls',
      'Monitoring, logging and ongoing tuning',
    ],
    outcomes: [
      'Put institutional knowledge behind a question box',
      'Kill the repetitive data entry between your systems',
      'Run on infrastructure that degrades gracefully instead of breaking',
    ],
    faqs: [
      { q: 'Where does my data live?', a: 'Scoped and agreed before anything is built. We use your own accounts and storage wherever practical, and you keep ownership and access throughout.' },
      { q: 'Is this only for big companies?', a: 'No. The most common version is small — one assistant over one messy pile of documents that everyone keeps asking about.' },
    ],
    startingAt: 'Custom',
    related: ['ai-automations', 'web-design-development', 'hosting-care'],
  },
  {
    slug: 'app-development-launch',
    name: 'Apps & App Store Launch',
    category: 'Build',
    tagline: 'Get your app built, published and live on the stores.',
    summary: 'iOS and Android apps built, or your existing app published and connected.',
    overview: [
      'Two kinds of work here. If you have an app or a web app already, we handle the part most people get stuck on: packaging it, setting up the developer accounts, passing App Store and Play Store review, and pointing your own domain at it.',
      'If you do not have one yet, we build it — usually alongside the website so they share the same brand, booking and back end rather than becoming two systems you maintain separately.',
    ],
    deliverables: [
      'iOS and Android builds from your site or from scratch',
      'App Store and Google Play submission, including review fixes',
      'Developer account setup and signing certificates',
      'Custom domain and deep links wired to the app',
      'Store listing: icon, screenshots, description',
      'Update releases and version management',
    ],
    outcomes: [
      'Be on the home screen instead of buried in a browser tab',
      'Get through store review without weeks of rejections',
      'Push updates without rebuilding from scratch each time',
    ],
    faqs: [
      { q: 'I already have a website — can it become an app?', a: 'Usually yes. Plenty of sites can be packaged into a real installable app, and we will tell you honestly whether that is the right call for yours or whether a native build serves you better.' },
      { q: 'Who owns the developer account?', a: 'You do. It is registered in your business name so the app stays yours, and Apple and Google bill you directly for their developer fees.' },
      { q: 'How long does store approval take?', a: 'Review itself is typically days, but first submissions often come back with fixes needed. We handle those rounds — that is the part we are actually being paid for.' },
    ],
    startingAt: 'Custom',
    related: ['web-design-development', 'ai-automations', 'hosting-care'],
  },
  {
    slug: 'branding-creative',
    name: 'Branding & Creative',
    category: 'Build',
    tagline: 'Look like the quality of work you actually deliver.',
    summary: 'Identity, logo, photography direction and the copy that carries it.',
    overview: [
      'A lot of good businesses lose work purely because they look smaller than they are. Branding fixes the first impression — the mark, the colours, the type, and the words that make someone trust you before you have spoken.',
      'Practical and applied, not a fifty-page brand bible nobody opens: the assets you actually use on a site, a van, an invoice and a profile.',
    ],
    deliverables: [
      'Logo and identity system',
      'Colour, type and visual direction',
      'Photography direction and shot list',
      'Messaging and website copy',
      'Social and profile assets',
      'Simple usage guide so it stays consistent',
    ],
    outcomes: [
      'Stop looking like a side project',
      'Charge what the work is worth',
      'Show up consistently everywhere a customer checks you',
    ],
    faqs: [
      { q: 'Can you work with my existing logo?', a: 'Yes — plenty of projects keep the logo and fix everything around it. If the logo is genuinely holding you back we will say so, and why.' },
      { q: 'Do you shoot photography?', a: 'We direct it — shot lists, framing and what to capture — so a local photographer or even a good phone gets usable results. Stock is a last resort, since real photos of real work convert better.' },
    ],
    startingAt: 'Custom',
    related: ['web-design-development', 'marketing-seo', 'redesign-migration'],
  },
  {
    slug: 'redesign-migration',
    name: 'Redesign & Migration',
    category: 'Build',
    tagline: 'Rebuild what is costing you customers — without losing rankings.',
    summary: 'Rescue a failing site or move off a platform holding you back.',
    overview: [
      'If your site is slow, awkward on phones, or simply looks dated, it is quietly costing you work every week. A redesign rebuilds it properly while keeping what already earns you traffic.',
      'Migrations are handled carefully: redirects mapped, existing rankings preserved, and content moved without the traffic cliff that usually follows a rushed replatform.',
    ],
    deliverables: [
      'Audit of what is currently working and what is not',
      'Full rebuild on modern foundations',
      'Content migration with redirect mapping',
      'Ranking and traffic preservation',
      'Speed, mobile and accessibility fixes',
      'Launch plan with rollback safety',
    ],
    outcomes: [
      'Keep the traffic you already earned',
      'Escape a platform charging you monthly for a site you dislike',
      'Fix the mobile experience most of your visitors are on',
    ],
    faqs: [
      { q: 'Will I lose my Google rankings?', a: 'Not if the migration is done properly — that is exactly what redirect mapping is for. Rankings usually wobble briefly and settle; a botched migration is what causes lasting damage.' },
      { q: 'Can you move me off Wix, Squarespace or GoDaddy?', a: 'Yes. That is one of the most common projects, and you end up owning the result instead of renting it.' },
    ],
    startingAt: '$900',
    related: ['web-design-development', 'marketing-seo', 'hosting-care'],
  },
  {
    slug: 'hosting-care',
    name: 'Hosting, Care & Support',
    category: 'Run',
    tagline: 'The whole system kept running, without you thinking about it.',
    summary: 'Domains, hosting, email, security, updates and monitoring.',
    overview: [
      'A website is not a one-time purchase — domains expire, plugins break, forms silently stop sending. Care plans exist so those failures get caught by us instead of by a customer who could not reach you.',
      'Covers the infrastructure and the small ongoing changes: new services, new photos, seasonal updates, and the technical housekeeping that keeps everything fast and secure.',
    ],
    deliverables: [
      'Domain, DNS and hosting managed',
      'Business email setup',
      'SSL, security and backups',
      'Uptime and form monitoring',
      'Content updates and small changes',
      'Direct support when something needs a human',
    ],
    outcomes: [
      'Never discover your contact form has been broken for a month',
      'One person to call when anything digital breaks',
      'Keep the site current without learning a CMS',
    ],
    faqs: [
      { q: 'Is a care plan required?', a: 'No — you can take the site and host it anywhere. Most people keep it because it is cheaper than fixing things reactively.' },
      { q: 'What if I want to leave?', a: 'You take everything with you: domain, code and content. No lock-in and no exit fee.' },
    ],
    startingAt: '$30/mo',
    related: ['web-design-development', 'ai-automations', 'marketing-seo'],
  },
]

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug)
}
