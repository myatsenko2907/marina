// All demo content lives here. Edit texts, numbers and currency without touching the code.
// Figures are illustrative estimates for a classroom demo.
window.DEMO = {
  currency: '₱',
  idea: 'A custom t-shirt printing studio in Davao City: from 1 shirt to 1,000, for schools, companies and festivals',

  brand: {
    name: 'TATAK',
    display: 'Tatak Prints',
    tagline: 'Wear your story, Davao.',
    descriptor: 'davao print studio',
    palette: [
      { name: 'Ink', hex: '#121117' },
      { name: 'Yellow', hex: '#FFD23F' },
      { name: 'Magenta', hex: '#E83F8C' },
      { name: 'Cyan', hex: '#33C3E0' },
      { name: 'Paper', hex: '#F5F3EE' },
    ],
    fonts: 'Unbounded for headlines · Inter for text',
    voice: 'Loud, fun and proudly local. "Tatak" means brand or mark: we help Davao put its mark on everything it wears.',
  },

  pipeline: [
    { icon: '🔎', name: 'Market analyst', log: ['Davao: 20+ universities, 1,000+ student orgs', 'Kadayawan festival: peak demand in August', 'Gap: printers need 7 days, customers want 24 hours'] },
    { icon: '📍', name: 'Location scout', log: ['Comparing 4 districts on 5 factors', 'Rent, traffic, competitors, demand, logistics', 'Winner: Poblacion, near the universities'] },
    { icon: '📊', name: 'Financial analyst', log: ['Startup budget', 'Building a 24-month model', 'Payback month'] },
    { icon: '🎨', name: 'Brand designer', log: ['Generated 40 names → "Tatak Prints"', 'Palette: printing inks, CMYK', 'Logo ready'] },
    { icon: '👕', name: 'Product manager', log: ['12 products: DTF, screen print, merch', 'Unit cost per shirt: blank + ink + film', 'Average margin calculated'] },
    { icon: '🎬', name: 'Video producer · Vivix', log: ['Vivix W1: 15-second TV ad', 'Vivix W1: heat press + screen print clips', 'Vivix A1: owner Jun talks to camera'] },
    { icon: '📱', name: 'SMM manager', log: ['4 Facebook & TikTok creatives', '3 ad variants for A/B test', '7-day content plan + Shopee listing'] },
    { icon: '🤖', name: 'AI order assistant', log: ['Training on prices and lead times', 'Quotes for bulk orders in seconds', 'Assistant ready on Messenger'] },
  ],

  plan: {
    summary: 'A print-on-demand t-shirt studio in Poblacion: fast DTF printing from 1 piece and screen printing for bulk orders, ready in 24 hours. AI helps customers turn a sketch into a design while they wait, and Messenger takes orders 24/7.',
    audience: [
      { who: 'Students & school orgs', share: 45, note: 'class shirts, org shirts, 30–60 pieces' },
      { who: 'Companies & BPO teams', share: 30, note: 'team tees and polos, 50–300 pieces' },
      { who: 'Events & families', share: 25, note: 'Kadayawan, reunions, birthdays' },
    ],
    swot: {
      Strengths: ['24-hour turnaround', 'No minimum order with DTF', 'AI design help while you wait'],
      Weaknesses: ['New brand', 'Small production space'],
      Opportunities: ['Kadayawan festival merch', 'Corporate uniforms', 'Shopee and TikTok Shop'],
      Threats: ['Cheap bulk printers', 'Ready-made shirts from malls'],
    },
    investments: [
      ['DTF printer, powder shaker, dryer', 450000],
      ['2 heat presses + screen printing station', 140000],
      ['Design computers and software', 90000],
      ['Fit-out, signage, display racks', 250000],
      ['First stock: blank shirts, film, ink', 200000],
      ['Launch marketing', 80000],
      ['Cash reserve', 150000],
    ],
    model: {
      avgCheck: 1500, // average order
      checksPerDay: 18, // orders per day at full speed
      rampMonths: 6, // months to reach full speed
      cogsShare: 0.45, // blank shirt + ink + film, share of revenue
      fixedMonthly: 230000, // rent, 5 staff, power for presses, marketing, other
    },
  },

  location: {
    weights: { traffic: 0.2, rent: 0.2, competition: 0.15, demand: 0.3, logistics: 0.15 },
    labels: { traffic: 'Foot traffic', rent: 'Affordable rent', competition: 'Few print shops nearby', demand: 'Schools, offices, events', logistics: 'Parking and delivery access' },
    spots: [
      { name: 'Poblacion', street: 'C.M. Recto Ave, near Ateneo de Davao & UM', rent: 700, x: 60, y: 70, traffic: 9, rentScore: 7, competition: 5, demand: 10, logistics: 7 },
      { name: 'Matina', street: 'MacArthur Hwy, near SM City Davao', rent: 650, x: 28, y: 78, traffic: 8, rentScore: 8, competition: 6, demand: 8, logistics: 8 },
      { name: 'Bajada', street: 'J.P. Laurel Ave, office towers', rent: 950, x: 52, y: 40, traffic: 8, rentScore: 5, competition: 7, demand: 8, logistics: 6 },
      { name: 'Buhangin', street: 'Buhangin Rd, residential', rent: 450, x: 48, y: 16, traffic: 6, rentScore: 9, competition: 7, demand: 6, logistics: 7 },
    ],
    why: [
      'Ateneo de Davao and University of Mindanao within a 10-minute walk',
      'Student orgs order shirts every semester, all year round',
      'Close to San Pedro St, the heart of Kadayawan street parties',
      'Nearby printers take 5–7 days: we deliver in 24 hours',
    ],
  },

  personas: [
    { name: 'Bea, 20', role: 'Org officer, Ateneo de Davao', color: '#FFD23F', quote: 'We need 40 org shirts by Friday and everyone pays separately.', facts: ['Orders twice a semester', 'Budget ₱350 per shirt', 'Collects payment by GCash'], hook: 'Org package: free design + split payments' },
    { name: 'Carlo, 31', role: 'HR officer at a BPO', color: '#33C3E0', quote: 'I need 120 team shirts in all sizes, with an official receipt.', facts: ['3 big orders a year', 'Budget ₱80,000 per order', 'Needs invoice & delivery'], hook: 'Corporate package with a size form' },
    { name: 'Tita Grace, 45', role: 'Family reunion organizer', color: '#E83F8C', quote: 'Everyone wants their own name on the back!', facts: ['Once a year', '30–50 shirts', 'Orders on Facebook'], hook: 'Reunion pack: names printed free' },
  ],

  menu: [
    { name: 'DTF tee, 1 print', price: 350, cost: 170, tag: 'from 1 pc' },
    { name: 'DTF tee, front + back', price: 450, cost: 210, tag: '' },
    { name: 'Screen print tee (50+ pcs)', price: 220, cost: 110, tag: 'bulk' },
    { name: 'Class & org pack, 30 pcs', price: 9900, cost: 5200, tag: 'bestseller' },
    { name: 'Kadayawan festival tee', price: 399, cost: 170, tag: 'seasonal' },
    { name: 'Embroidered company polo', price: 650, cost: 340, tag: '' },
    { name: 'Kids tee', price: 280, cost: 130, tag: '' },
    { name: 'Hoodie, 1 print', price: 950, cost: 520, tag: '' },
    { name: 'Tote bag print', price: 250, cost: 110, tag: '' },
    { name: 'Printed cap', price: 300, cost: 140, tag: '' },
    { name: 'Design with AI', price: 500, cost: 100, tag: 'service' },
    { name: 'Rush, 24 hours', price: 200, cost: 40, tag: 'service' },
  ],

  videos: [
    { file: 'assets/video/hero.mp4', title: 'Heat press reveal', model: 'Vivix W1', ratio: '16 / 9', prompt: 'A heat press lifts and a hand peels the film, revealing a vibrant tropical design on a black t-shirt. Slow motion, punchy colors.' },
    { file: 'assets/video/reel.mp4', title: 'Reel: screen printing', model: 'Vivix W1', ratio: '9 / 16', prompt: 'Macro: a squeegee pulls bright yellow ink across a silk screen, the screen lifts to reveal a crisp bold print.' },
    { file: 'assets/video/avatar.mp4', title: 'Owner Jun talks to camera', model: 'Vivix A1', ratio: '9 / 16', prompt: '"Hey Davao! I’m Jun from Tatak Prints. Bring your design, or let our AI make one with you…"' },
  ],

  ad: {
    file: 'assets/video/ad.mp4',
    poster: 'assets/img/ad.jpg',
    voiceover: '“Your design. Your team. Your Davao. Tatak Prints. One shirt or one thousand. Order on Messenger.”',
    music: 'Music: upbeat Filipino pop · Voice: friendly male narrator',
    shots: [
      { t: 0, title: 'Students sketch a class shirt', note: 'The idea starts on a laptop' },
      { t: 3.7, title: 'The heat press reveal', note: 'The product moment' },
      { t: 7.7, title: 'Jun hands over the shirts', note: 'Fast, friendly, local' },
      { t: 10.8, title: 'Festival in Davao', note: 'Everyone wears the same shirt: the call to action' },
    ],
    endCard: { at: 12.5, title: 'TATAK PRINTS', line: 'One shirt or one thousand', sub: 'C.M. Recto Ave, Poblacion · order on Messenger' },
    stats: [['15 s', 'commercial with voice and music'], ['1', 'text prompt + 1 photo of Jun'], ['≈ 1 min', 'to render in Vivix'], ['0', 'cameras, actors or studio']],
  },

  creatives: [
    { kind: 'story', bg: 'assets/video/reel.mp4', kicker: 'Opening week', title: 'Your first shirt is 50% off', cta: 'Show this story at the counter' },
    { kind: 'post', bg: 'assets/img/owner.jpg', kicker: 'Meet Jun', title: 'Bring a sketch, leave with a shirt', cta: 'C.M. Recto Ave · ready in 24h' },
    { kind: 'post', color: true, kicker: 'Class & org pack', title: '30 shirts for ₱9,900', cta: 'free design · split payment by GCash' },
    { kind: 'banner', bg: 'assets/video/hero.mp4', kicker: 'Kadayawan 2027', title: 'Festival tees, ready in 24 hours', cta: 'Pre-order for your barkada now' },
  ],

  ads: [
    { h: 'Org shirts by Friday', t: 'Send your design today, pick up tomorrow. Free mockup for class and org orders.', ctr: '4.4%' },
    { h: 'One shirt? No problem', t: 'No minimum order. Print your own design from ₱350, ready in 24 hours.', ctr: '3.2%' },
    { h: 'Team shirts for BPOs', t: '120 shirts, all sizes, official receipt and free delivery to your office.', ctr: '2.7%' },
  ],

  contentPlan: [
    ['Mon', 'Reel: satisfying heat press reveal'],
    ['Tue', 'Post: meet Jun, the owner'],
    ['Wed', 'Poll: which Kadayawan design wins?'],
    ['Thu', 'Before/after: sketch → AI design → shirt'],
    ['Fri', 'Giveaway: free shirts for one student org'],
    ['Sat', 'UGC: orgs in their new shirts #TatakDavao'],
    ['Sun', 'TikTok: printing 100 shirts in 1 minute'],
  ],

  delivery: {
    title: 'Tatak Prints · Davao Print Studio',
    text: 'Custom t-shirts, hoodies, caps and tote bags printed in Davao. DTF from 1 piece, screen printing for bulk orders. Free design help with AI. Ready in 24 hours, delivery across Davao City.',
    tags: ['Custom shirts', 'No minimum', '24h rush', 'Free design'],
  },

  roadmap: [
    { when: 'Weeks 1–2', what: 'Register the business', detail: 'DTI name, Mayor’s permit, BIR, barangay clearance' },
    { when: 'Weeks 2–5', what: 'Equipment and fit-out', detail: 'DTF printer, heat presses, display wall' },
    { when: 'Weeks 4–6', what: 'Hire and train', detail: '1 designer, 2 printers, 1 customer care' },
    { when: 'Week 7', what: 'Soft opening', detail: 'Free shirts for 3 university orgs as a test' },
    { when: 'Week 8', what: 'Grand opening', detail: '50% off the first shirt, live printing at the door' },
    { when: 'Weeks 9–12', what: 'Grow', detail: 'Corporate sales, Shopee store, Kadayawan pre-orders' },
  ],

  hiring: {
    title: 'We’re hiring: Graphic designer + print operator 👕',
    text: 'Tatak Prints is opening in Poblacion. We need a designer who loves bold colors and a print operator who isn’t scared of a 200-shirt rush order.',
    perks: ['₱16,000–24,000 / month', 'Free shirts every month', 'Training on DTF and screen printing'],
    questions: ['A customer sends a blurry logo. What do you do?', 'An org needs 60 shirts tomorrow. How do you plan the day?', 'Show us a shirt design for Kadayawan in 10 minutes.'],
  },

  bot: {
    hello: 'Hi, maayong adlaw! I’m the Tatak Prints assistant 👕 Ask me about prices, minimum orders or how fast we print.',
    chips: ['How much is one shirt?', 'Price for 40 org shirts?', 'Can you print by tomorrow?', 'I don’t have a design', 'Do you deliver?'],
    answers: [
      { k: ['one shirt', '1 shirt', 'single', 'minimum', 'how much'], a: 'No minimum! One DTF shirt with your design is ₱350, front and back ₱450. Bring a file or a sketch.' },
      { k: ['org', 'class', '40', '30', '50', 'bulk', 'team'], a: 'For 40 org shirts we recommend our Class & org pack: from ₱330 per shirt with free design and split GCash payments. Send your sizes and we’ll quote in 5 minutes.' },
      { k: ['tomorrow', 'rush', 'fast', 'urgent', '24'], a: 'Yes! Order before 3 PM and we print by the next day. Rush fee is ₱200 per order.' },
      { k: ['design', 'logo', 'sketch', 'idea'], a: 'No problem! Tell us your idea and our designer uses AI to make 3 options in 15 minutes. Design help is free for orders of 10+ shirts.' },
      { k: ['deliver', 'delivery', 'ship', 'pick'], a: 'We deliver across Davao City: free for orders of 30+ shirts, ₱80 otherwise. Or pick up at C.M. Recto Ave, Poblacion.' },
      { k: ['kadayawan', 'festival'], a: 'Kadayawan tees are ₱399 with our festival designs, or ₱450 with your own. Pre-order early: August gets busy!' },
      { k: ['pay', 'gcash', 'maya', 'cash'], a: 'We accept cash, GCash, Maya and bank transfer. Orgs can split payment among members.' },
      { k: ['hour', 'open', 'close', 'time'], a: 'We’re open Monday to Saturday, 9 AM to 8 PM. Messenger orders are answered 24/7 by me.' },
      { k: ['where', 'address', 'location', 'find'], a: 'We’re on C.M. Recto Ave, Poblacion, a short walk from Ateneo de Davao. Look for the yellow TATAK sign.' },
    ],
    fallback: 'Good question! Our team will reply on Messenger in a few minutes 👕',
  },

  compare: {
    ai: { time: '15 minutes', cost: '≈ ₱3,000', people: '1 person + AI' },
    old: { time: '2–3 weeks', cost: '≈ ₱120,000', people: 'consultant, designer, analyst, videographer, SMM' },
  },
};
