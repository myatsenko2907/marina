// All demo content lives here. Edit texts, numbers and currency without touching the code.
// Figures are illustrative estimates for a classroom demo.
window.DEMO = {
  currency: '₱',
  idea: 'A specialty coffee shop in Davao City, about 45 m², 20 seats, near offices, BPO towers and universities',

  brand: {
    name: 'KAPE APO',
    tagline: 'Mountain-grown. Davao-made.',
    descriptor: 'davao coffee lab',
    palette: [
      { name: 'Volcanic', hex: '#2B1B14' },
      { name: 'Crema', hex: '#C8874A' },
      { name: 'Coconut', hex: '#F4EBDD' },
      { name: 'Apo green', hex: '#8FA37E' },
      { name: 'Cacao gold', hex: '#E9B872' },
    ],
    fonts: 'Unbounded for headlines · Inter for text',
    voice: 'Warm, friendly, a little Taglish. No coffee snobbery: we explain simply and joke gently. "Kumusta!" beats "Welcome, valued customer".',
  },

  // Pipeline agents: what the AI "does" at each step
  pipeline: [
    { icon: '🔎', name: 'Market analyst', log: ['Davao City: 1.8M people, growing BPO hub', '40,000+ night-shift workers', 'Gap: almost no specialty coffee open after midnight'] },
    { icon: '📍', name: 'Location scout', log: ['Comparing 4 districts on 5 factors', 'Rent, foot traffic, competitors, night demand', 'Winner: Bajada, J.P. Laurel Ave'] },
    { icon: '📊', name: 'Financial analyst', log: ['Startup budget', 'Building a 24-month model', 'Payback month'] },
    { icon: '🎨', name: 'Brand designer', log: ['Generated 40 names → "Kape Apo"', 'Palette: volcanic + crema + Apo green', 'Logo ready'] },
    { icon: '☕', name: 'Head barista', log: ['12-item menu with local flavors', 'Unit cost for every cup', 'Average margin calculated'] },
    { icon: '🎬', name: 'Video producer · Vivix', log: ['Vivix W1: 4 promo clips', 'Vivix W1: Mt. Apo farm story', 'Vivix A1: barista Mika talks to camera'] },
    { icon: '📱', name: 'SMM manager', log: ['4 social creatives', '3 ad variants for A/B test', '7-day content plan + delivery listing'] },
    { icon: '🤖', name: 'AI barista', log: ['Training the chatbot on the menu', 'Adding FAQ answers', 'Bot is ready for guests'] },
  ],

  plan: {
    summary: 'A specialty coffee shop for Davao’s night economy: grab-and-go plus 20 seats in Bajada, open 6 AM – 2 AM. Beans from Mt. Apo farmers, local flavors on the menu, and a "Night Shift Pass" subscription for BPO teams.',
    audience: [
      { who: 'BPO & office workers', share: 45, note: 'night shift, coffee to go, average check ₱240' },
      { who: 'Students', share: 30, note: 'study with laptops, add a pastry' },
      { who: 'Locals & tourists', share: 25, note: 'weekends, buy Davao cacao as pasalubong' },
    ],
    swot: {
      Strengths: ['Open until 2 AM', 'Single-origin Mt. Apo beans', 'Night Shift Pass keeps regulars'],
      Weaknesses: ['Small seating area', 'New brand, zero awareness'],
      Opportunities: ['Office delivery to BPO towers', 'Corporate passes', 'Own roastery in year 2'],
      Threats: ['Chain cafés in the malls', 'Rising bean prices'],
    },
    investments: [
      ['Fit-out and interior', 800000],
      ['Espresso machine, grinders, equipment', 950000],
      ['Furniture and tableware', 300000],
      ['Launch marketing', 150000],
      ['Permits, first stock', 120000],
      ['Two-month cash reserve', 330000],
    ],
    // Financial model inputs (the sliders change them live)
    model: {
      avgCheck: 210, // average check
      checksPerDay: 160, // checks per day at full speed
      rampMonths: 6, // months to reach full speed
      cogsShare: 0.28, // cost of goods, share of revenue
      fixedMonthly: 360000, // rent, 7 staff, utilities, marketing, other
    },
  },

  location: {
    weights: { traffic: 0.25, rent: 0.2, competition: 0.15, night: 0.25, students: 0.15 },
    labels: { traffic: 'Foot traffic', rent: 'Affordable rent', competition: 'Few competitors', night: 'Night-shift demand', students: 'Students nearby' },
    // x, y: position on the schematic map (0–100)
    spots: [
      { name: 'Bajada', street: 'J.P. Laurel Ave, near Abreeza & BPO towers', rent: 950, x: 52, y: 40, traffic: 9, rentScore: 6, competition: 6, night: 10, students: 6 },
      { name: 'Lanang', street: 'Near SM Lanang & IT park', rent: 1100, x: 72, y: 20, traffic: 8, rentScore: 5, competition: 5, night: 9, students: 4 },
      { name: 'Poblacion', street: 'San Pedro St, near Ateneo de Davao', rent: 650, x: 60, y: 70, traffic: 9, rentScore: 8, competition: 4, night: 5, students: 10 },
      { name: 'Matina', street: 'MacArthur Hwy, near SM City Davao', rent: 600, x: 28, y: 78, traffic: 7, rentScore: 8, competition: 7, night: 6, students: 7 },
    ],
    why: [
      '6 BPO towers within a 7-minute walk: demand at 2 AM',
      'Abreeza Mall brings daytime traffic on weekends',
      'Only 2 specialty cafés nearby, both close by 10 PM',
      'Jeepney and tricycle routes stop at the door',
    ],
  },

  personas: [
    { name: 'Joy, 26', role: 'BPO team lead, night shift', color: '#E9B872', quote: 'I need real coffee at 3 AM, not vending-machine 3-in-1.', facts: ['Visits 5× a week', 'Spends ₱250 per visit', 'Finds places on Facebook & GrabFood'], hook: 'Night Shift Pass + team pre-orders' },
    { name: 'Paolo, 20', role: 'Ateneo student', color: '#8FA37E', quote: 'Fast Wi‑Fi, a socket, and a coffee I can afford.', facts: ['Stays 3 hours', 'Budget ₱150', 'Lives on TikTok'], hook: '10% student discount, study corner' },
    { name: 'Ma’am Liza, 41', role: 'Local business owner', color: '#C8874A', quote: 'A nice place to meet clients and buy pasalubong.', facts: ['Weekly meetings', 'Check ₱450', 'Trusts word of mouth'], hook: 'Meeting table, Davao cacao gift boxes' },
  ],

  menu: [
    { name: 'Espresso', price: 110, cost: 22, tag: '' },
    { name: 'Americano', price: 130, cost: 25, tag: '' },
    { name: 'Cappuccino', price: 160, cost: 38, tag: '' },
    { name: 'Spanish latte', price: 175, cost: 45, tag: 'bestseller' },
    { name: 'Mt. Apo Latte', price: 185, cost: 48, tag: 'signature' },
    { name: 'Calamansi cold brew', price: 170, cost: 35, tag: 'local' },
    { name: 'Iced Davao cacao', price: 160, cost: 42, tag: '' },
    { name: 'Durian frappe', price: 195, cost: 60, tag: 'brave' },
    { name: 'Oat flat white', price: 190, cost: 55, tag: 'vegan' },
    { name: 'Ensaymada', price: 95, cost: 32, tag: '' },
    { name: 'Tuna pandesal melt', price: 120, cost: 40, tag: 'breakfast' },
    { name: 'Ube cheesecake', price: 165, cost: 58, tag: '' },
  ],

  videos: [
    { file: 'assets/video/hero.mp4', title: 'Coffee shop promo', model: 'Vivix W1', ratio: '16 / 9', prompt: 'Cinematic morning in a cozy specialty coffee shop… a barista pours latte art, steam rising, camera slowly pushes in.' },
    { file: 'assets/video/reel.mp4', title: 'Reel: latte art', model: 'Vivix W1', ratio: '9 / 16', prompt: 'Macro close-up: espresso streams into a glass cup, golden crema, milk forms a heart. Dark moody, warm rim light.' },
    { file: 'assets/video/avatar.mp4', title: 'Barista Mika talks to camera', model: 'Vivix A1', ratio: '9 / 16', prompt: '"Hi! I’m Mika, your barista at Kape Apo in Davao. Our whole coffee shop was planned in one evening with AI…"' },
    { file: 'assets/video/origin.mp4', title: 'From Mt. Apo to your cup', model: 'Vivix W1', ratio: '16 / 9', prompt: 'Sunrise on a coffee farm on the slopes of Mount Apo, a farmer picks ripe red cherries, the volcano glows in the background.' },
    { file: 'assets/video/night.mp4', title: 'Open till 2 AM', model: 'Vivix W1', ratio: '9 / 16', prompt: 'Evening on a tropical Davao street: a glowing coffee shop, palm trees, tricycles, office workers in lanyards walk in.' },
  ],

  creatives: [
    { kind: 'story', bg: 'assets/video/reel.mp4', kicker: 'Grand opening · Nov 15', title: 'Your first cup is on us', cta: 'Save this & come by' },
    { kind: 'post', bg: 'assets/img/barista.jpg', kicker: 'Meet Mika', title: 'The best Spanish latte in Bajada', cta: 'J.P. Laurel Ave · open till 2 AM' },
    { kind: 'post', color: true, kicker: 'Signature', title: 'Mt. Apo Latte', price: 185, cta: 'Davao cacao · muscovado · love' },
    { kind: 'banner', bg: 'assets/video/night.mp4', kicker: 'Night Shift Pass', title: '20 coffees for ₱2,900', cta: 'for BPO teams · save ₱500 a month' },
  ],

  ads: [
    { h: 'Real coffee at 2 AM', t: 'Night shift? We’re open till 2 AM, 5 minutes from your tower. First cup free.', ctr: '3.1%' },
    { h: 'Mt. Apo beans, Davao hands', t: 'Single-origin coffee from farmers 60 km away. Taste the mountain in every cup.', ctr: '2.6%' },
    { h: 'Night Shift Pass −15%', t: '20 coffees for ₱2,900. Made for BPO teams who run on caffeine.', ctr: '4.3%' },
  ],

  contentPlan: [
    ['Mon', 'Reel: slow-motion latte art'],
    ['Tue', 'Post: meet barista Mika'],
    ['Wed', 'Story poll: durian frappe — yay or nay?'],
    ['Thu', 'Carousel: from Mt. Apo farm to cup'],
    ['Fri', 'Giveaway: a Night Shift Pass for your team'],
    ['Sat', 'UGC: repost guests with #KapeApoNights'],
    ['Sun', 'TikTok: 3 AM barista life'],
  ],

  delivery: {
    title: 'Kape Apo · Davao Coffee Lab',
    text: 'Specialty coffee from Mt. Apo beans, roasted fresh every week. Try our signature Mt. Apo Latte with Davao cacao, a bright calamansi cold brew, or a warm ensaymada. Open till 2 AM for night owls and night shifts.',
    tags: ['Coffee', 'Local favorite', 'Open late', 'Free delivery to Bajada BPO towers'],
  },

  roadmap: [
    { when: 'Weeks 1–2', what: 'Register the business', detail: 'DTI name, Mayor’s permit, BIR, sanitary permit' },
    { when: 'Weeks 3–6', what: 'Fit-out and equipment', detail: 'Interior, espresso machine, POS system' },
    { when: 'Weeks 5–8', what: 'Hire and train the team', detail: '7 people, 2 shifts, latte art training' },
    { when: 'Week 8', what: 'Soft opening', detail: 'Free tasting for 3 partner BPO companies' },
    { when: 'Week 9', what: 'Grand opening', detail: 'First cup free, live acoustic night' },
    { when: 'Weeks 10–12', what: 'Grow', detail: 'GrabFood & foodpanda, corporate passes' },
  ],

  hiring: {
    title: 'We’re hiring: Night-shift barista ☕🌙',
    text: 'Kape Apo is opening in Bajada and we need two night owls who love coffee and people. No experience? We’ll teach you latte art. You bring a smile and good energy at 1 AM.',
    perks: ['₱18,000–22,000 / month', 'Night differential + free coffee', 'Paid barista training'],
    questions: ['A guest says the coffee is too bitter. What do you do?', 'How do you stay energetic at 1 AM?', 'Make us a drink for a stressed BPO agent. What is it?'],
  },

  // Chatbot script: keywords → answer
  bot: {
    hello: 'Hi, kumusta! I’m the AI barista at Kape Apo ☕ Ask me about the menu, prices or opening hours.',
    chips: ['What do you recommend?', 'Any dairy-free options?', 'What are your hours?', 'Do you have Wi‑Fi?', 'Durian coffee?!'],
    answers: [
      { k: ['recommend', 'suggest', 'best', 'morning', 'try'], a: 'Try our signature Mt. Apo Latte (₱185): Mt. Apo espresso, Davao cacao and a touch of muscovado. Hungry? Add a tuna pandesal melt for ₱120 😉' },
      { k: ['dairy', 'lactose', 'vegan', 'oat', 'milk'], a: 'Of course! Any drink can be made with oat, almond or coconut milk. The favorite is our oat flat white, ₱190 🌱' },
      { k: ['hour', 'open', 'close', 'time', 'late'], a: 'We’re open every day from 6 AM to 2 AM. Night shift? Pre-order on Messenger and your coffee is ready when you arrive.' },
      { k: ['wifi', 'wi‑fi', 'wi-fi', 'internet', 'socket', 'laptop', 'study'], a: 'Yes! Fast fiber Wi‑Fi (password on your receipt) and sockets at every other seat. Students get 10% off with a school ID 🎓' },
      { k: ['durian'], a: 'Yes, Davao-style! Our durian frappe is ₱195. Love it or hate it, but you have to try it once 😄' },
      { k: ['price', 'how much', 'cost', 'menu', 'expensive'], a: 'Espresso is ₱110, cappuccino ₱160, Spanish latte ₱175 and the Mt. Apo Latte ₱185. Our average check is about ₱210.' },
      { k: ['pass', 'discount', 'promo', 'deal'], a: 'Night Shift Pass: 20 coffees for ₱2,900 instead of ₱3,400. And new guests get their first cup free!' },
      { k: ['where', 'address', 'location', 'find'], a: 'We’re on J.P. Laurel Ave in Bajada, a 3-minute walk from Abreeza Mall. Look for the green KAPE APO sign.' },
    ],
    fallback: 'Good question! I’ll pass it to our human barista. Meanwhile, drop by for a cup ☕',
  },

  // Final slide comparison
  compare: {
    ai: { time: '15 minutes', cost: '≈ ₱3,000', people: '1 person + AI' },
    old: { time: '3–4 weeks', cost: '≈ ₱250,000', people: 'consultant, designer, analyst, videographer, SMM' },
  },
};
