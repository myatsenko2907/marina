// All demo content lives here. Edit texts, numbers and currency without touching the code.
// Figures are illustrative estimates for a classroom demo: replace the Toril numbers with your real ones.
window.DEMO = {
  currency: '₱',
  idea: 'Our neighborhood pharmacy in Toril, Davao City is doing well. Where should we open the second branch, and how?',

  brand: {
    name: 'LUNASCARE',
    display: 'LunasCare',
    tagline: 'Your health, closer to home.',
    descriptor: 'pharmacy · davao',
    palette: [
      { name: 'Deep green', hex: '#0D2A20' },
      { name: 'Lunas green', hex: '#2FA36F' },
      { name: 'Clean white', hex: '#EEF7F2' },
      { name: 'Mint', hex: '#6FDCA3' },
      { name: 'Sun', hex: '#F2C56B' },
    ],
    fonts: 'Unbounded for headlines · Inter for text',
    voice: 'Caring, clear and neighborly. We explain medicines simply, speak Bisaya and English, and never upsell what you don’t need.',
  },

  pipeline: [
    { icon: '📈', name: 'Branch analyst', log: ['Reading Toril branch sales: 12 months', 'Top sellers: maintenance meds, 41% of revenue', 'Seniors bring 1 in 3 transactions'] },
    { icon: '📍', name: 'Location scout', log: ['Comparing 4 districts for branch #2', 'Checking distance from Toril: no cannibalization', 'Winner: Mintal, near the public market'] },
    { icon: '📊', name: 'Financial analyst', log: ['Branch budget', 'Building a 24-month model', 'Payback month'] },
    { icon: '📋', name: 'Compliance officer', log: ['FDA License to Operate for the new branch', 'Pharmacist-in-charge (PRC license)', 'Senior & PWD 20% discount rules'] },
    { icon: '💊', name: 'Category manager', log: ['Assortment of 1,200 SKUs from Toril data', 'Generic-first pricing', 'Average margin calculated'] },
    { icon: '🎬', name: 'Video producer · Vivix', log: ['Vivix W1: 15-second TV ad', 'Vivix W1: branch exterior + reel', 'Vivix A1: pharmacist Ana talks to camera'] },
    { icon: '📱', name: 'SMM manager', log: ['4 Facebook creatives', '3 ad variants for A/B test', '7-day content plan + Google Maps listing'] },
    { icon: '🤖', name: 'AI pharmacy assistant', log: ['Training on stock, prices, discounts', 'Safety rules: no diagnosis, Rx checks', 'Assistant ready on Messenger'] },
  ],

  benchmark: {
    title: 'Branch #1, Toril: what the AI learned from your data',
    rows: [
      ['Transactions per day', '210', 'steady for 12 months'],
      ['Average basket', '₱350', 'seniors spend ₱620'],
      ['Monthly revenue', '₱2.2M', '41% maintenance meds'],
      ['Gross margin', '24%', 'after senior/PWD discounts'],
    ],
    note: 'Sample figures for the demo. Put your real Toril numbers in data.js and the plan follows them.',
  },

  plan: {
    summary: 'Open branch #2 of our Toril pharmacy in Mintal: 35 m², open 7 AM – 10 PM, one licensed pharmacist and three assistants. We copy what already works in Toril (generic-first prices, pharmacist advice, care for seniors) and add refill reminders and Messenger orders.',
    audience: [
      { who: 'Seniors & chronic patients', share: 40, note: 'monthly maintenance meds, ₱600+ per visit' },
      { who: 'Families', share: 35, note: 'fever, cough, vitamins for kids' },
      { who: 'Students & young workers', share: 25, note: 'UP Mindanao, vitamins, personal care' },
    ],
    swot: {
      Strengths: ['Proven model from Toril', 'Existing suppliers & bulk prices', 'Pharmacist-led advice'],
      Weaknesses: ['Unknown brand in Mintal', 'Initial stock ties up cash'],
      Opportunities: ['Refill Club for seniors', 'Messenger orders + tricycle delivery', 'Partner with nearby clinics'],
      Threats: ['Big chains expanding west', 'Online pharmacies'],
    },
    investments: [
      ['Fit-out, signage, aircon', 650000],
      ['Shelving, medicine fridge, counter', 450000],
      ['POS & shared inventory system', 120000],
      ['Initial stock (≈1,200 SKUs)', 1600000],
      ['FDA LTO, permits, fees', 60000],
      ['Launch marketing', 120000],
      ['Cash reserve', 300000],
    ],
    model: {
      avgCheck: 340, // average basket
      checksPerDay: 190, // transactions per day at full speed
      rampMonths: 8, // months to reach full speed
      cogsShare: 0.76, // cost of goods incl. senior/PWD discounts
      fixedMonthly: 210000, // rent, pharmacist + 3 assistants, utilities, other
    },
  },

  location: {
    weights: { traffic: 0.2, rent: 0.15, competition: 0.2, demand: 0.3, distance: 0.15 },
    labels: { traffic: 'Foot traffic', rent: 'Affordable rent', competition: 'Few pharmacies nearby', demand: 'Clinics, seniors, households', distance: 'Far enough from Toril' },
    existing: { name: 'Toril', x: 30, y: 84 },
    spots: [
      { name: 'Mintal', street: 'Near Mintal public market & UP Mindanao', rent: 450, x: 30, y: 44, traffic: 8, rentScore: 8, competition: 7, demand: 9, distance: 9 },
      { name: 'Catalunan Grande', street: 'Along Catalunan Grande Rd, new subdivisions', rent: 500, x: 46, y: 60, traffic: 6, rentScore: 7, competition: 8, demand: 8, distance: 7 },
      { name: 'Ulas', street: 'Ulas crossing, McArthur Hwy', rent: 600, x: 54, y: 72, traffic: 9, rentScore: 6, competition: 4, demand: 7, distance: 6 },
      { name: 'Calinan', street: 'Calinan poblacion', rent: 350, x: 18, y: 14, traffic: 7, rentScore: 9, competition: 6, demand: 6, distance: 10 },
    ],
    why: [
      'Mintal public market and 2 clinics within 300 m',
      'UP Mindanao students and staff walk past daily',
      'Nearest chain pharmacy closes at 8 PM: we stay open till 10',
      '25 minutes from Toril: shared deliveries and stock transfers, no cannibalization',
    ],
  },

  personas: [
    { name: 'Lola Remedios, 68', role: 'Retired teacher, Mintal', color: '#6FDCA3', quote: 'I take three maintenance medicines. I want a pharmacist who knows my name.', facts: ['Refills every month', 'Spends ₱2,400 a month', 'Uses her senior citizen ID'], hook: 'Refill Club: SMS reminders + reserved stock' },
    { name: 'Mark, 34', role: 'Tricycle driver, father of 3', color: '#F2C56B', quote: 'When the kids have fever I need something that works and doesn’t cost too much.', facts: ['Buys generics', 'Budget ₱300', 'Comes after 7 PM'], hook: 'Generic alternatives explained, open till 10 PM' },
    { name: 'Jenny, 24', role: 'UP Mindanao staff', color: '#2FA36F', quote: 'I order on Messenger and pick up on my way home.', facts: ['Vitamins & personal care', 'Pays with GCash', 'Lives on Facebook'], hook: 'Messenger reserve & pick-up, GCash' },
  ],

  menu: [
    { name: 'Paracetamol 500mg ×10', price: 25, cost: 14, tag: 'generic' },
    { name: 'Amlodipine 5mg ×30', price: 180, cost: 120, tag: 'maintenance' },
    { name: 'Metformin 500mg ×30', price: 150, cost: 100, tag: 'maintenance' },
    { name: 'Losartan 50mg ×30', price: 240, cost: 160, tag: 'maintenance' },
    { name: 'Amoxicillin 500mg ×21', price: 160, cost: 110, tag: 'Rx' },
    { name: 'Cetirizine 10mg ×10', price: 60, cost: 34, tag: '' },
    { name: 'Vitamin C 500mg ×100', price: 280, cost: 175, tag: 'vitamins' },
    { name: 'Vitamin B-complex ×30', price: 220, cost: 140, tag: '' },
    { name: 'Oral rehydration salts ×5', price: 75, cost: 46, tag: '' },
    { name: 'Adult diapers ×10', price: 420, cost: 310, tag: '' },
    { name: 'Digital BP monitor', price: 1650, cost: 1180, tag: '' },
    { name: 'Blood sugar test', price: 80, cost: 25, tag: 'service' },
  ],

  videos: [
    { file: 'assets/video/store.mp4', title: 'Branch #2 in Mintal', model: 'Vivix W1', ratio: '16 / 9', prompt: 'Exterior of a small modern neighborhood pharmacy in Mintal, Davao, glowing green cross sign, palm trees and tricycles, a mother and child walk in.' },
    { file: 'assets/video/reel.mp4', title: 'Reel: care in every detail', model: 'Vivix W1', ratio: '9 / 16', prompt: 'A pharmacist’s hands arrange medicine boxes, then sort vitamins into a weekly pill organizer for a senior. Clean, bright, calm.' },
    { file: 'assets/video/avatar.mp4', title: 'Pharmacist Ana talks to camera', model: 'Vivix A1', ratio: '9 / 16', prompt: '"Hi! I’m Ana, your pharmacist. After years of caring for families in Toril, we’re opening our second branch in Mintal…"' },
  ],

  ad: {
    file: 'assets/video/ad.mp4',
    poster: 'assets/img/ad.jpg',
    voiceover: '“Trusted in Toril. Now in Mintal too. LunasCare Pharmacy. Your health, closer to home.”',
    music: 'Music: soft hopeful piano · Voice: warm female narrator',
    shots: [
      { t: 0, title: 'Lola walks to the pharmacy', note: 'A neighborhood morning in Davao' },
      { t: 3.9, title: 'Free BP check', note: 'Care before selling' },
      { t: 8.0, title: 'Ana explains the dosage', note: 'The pharmacist people trust' },
      { t: 11.8, title: 'Open till 10 PM', note: 'The new branch at night, the call to action' },
    ],
    endCard: { at: 12.5, title: 'LUNASCARE', line: 'Now in Mintal too', sub: 'Near Mintal public market · open 7 AM – 10 PM' },
    stats: [['15 s', 'commercial with voice and music'], ['1', 'text prompt + 1 photo of Ana'], ['≈ 1 min', 'to render in Vivix'], ['0', 'cameras, actors or studio']],
  },

  creatives: [
    { kind: 'story', bg: 'assets/video/reel.mp4', kicker: 'Grand opening · Mintal', title: 'Free BP & sugar check all week', cta: 'Bring your lola and lolo' },
    { kind: 'post', bg: 'assets/img/pharmacist.jpg', kicker: 'Meet Ana, RPh', title: 'Ask me anything about your medicines', cta: 'Near Mintal public market' },
    { kind: 'post', color: true, kicker: 'Seniors & PWD', title: '20% off + VAT exempt, every day', cta: 'Just show your OSCA or PWD ID' },
    { kind: 'banner', bg: 'assets/video/store.mp4', kicker: 'Refill Club', title: 'Never run out of maintenance meds', cta: 'Free SMS reminders · stock reserved for you' },
  ],

  ads: [
    { h: 'Now in Mintal too', t: 'The pharmacy Toril trusts is now near Mintal public market. Free BP check on opening week.', ctr: '3.4%' },
    { h: 'Generic first, always', t: 'Same active ingredient, lower price. Our pharmacist explains the difference in 1 minute.', ctr: '2.9%' },
    { h: 'Refill Club for seniors', t: 'We remind you by SMS and keep your maintenance meds reserved. Free to join.', ctr: '4.2%' },
  ],

  contentPlan: [
    ['Mon', 'Reel: how we prepare a weekly pill organizer'],
    ['Tue', 'Post: meet pharmacist Ana'],
    ['Wed', 'Tip: generic vs branded, explained'],
    ['Thu', 'Live Q&A on Facebook: high blood pressure'],
    ['Fri', 'Refill Club sign-up drive'],
    ['Sat', 'Free BP check day at the branch'],
    ['Sun', 'Family health tip in Bisaya'],
  ],

  delivery: {
    title: 'LunasCare Pharmacy · Mintal',
    text: 'Neighborhood pharmacy near Mintal public market. Generic and branded medicines, vitamins and medical supplies. Free BP checks, Messenger orders and 20% senior & PWD discount. Open 7 AM – 10 PM.',
    tags: ['Pharmacy', 'Open till 10 PM', 'GCash accepted', 'Senior & PWD discount'],
  },

  roadmap: [
    { when: 'Weeks 1–3', what: 'Secure the space', detail: 'Lease in Mintal, DTI branch, Mayor’s permit, BIR' },
    { when: 'Weeks 2–8', what: 'FDA License to Operate', detail: 'File early: drugstore LTO for the new branch' },
    { when: 'Weeks 4–7', what: 'Fit-out and systems', detail: 'Shelving, medicine fridge, shared inventory with Toril' },
    { when: 'Weeks 6–9', what: 'Hire and train', detail: '1 pharmacist (PRC) + 3 assistants, trained in Toril' },
    { when: 'Week 10', what: 'Soft opening', detail: 'Free BP and sugar checks for the neighborhood' },
    { when: 'Weeks 11–13', what: 'Grow', detail: 'Refill Club, clinic partnerships, Messenger orders' },
  ],

  hiring: {
    title: 'We’re hiring: Pharmacist (RPh) for our Mintal branch 💊',
    text: 'LunasCare is opening its second branch near Mintal public market. We need a licensed pharmacist who loves helping families and explains medicines simply.',
    perks: ['₱25,000–32,000 / month', 'HMO + 13th month pay', 'Paid training at our Toril branch'],
    questions: ['A senior asks for a cheaper option for her branded maintenance drug. What do you do?', 'A customer wants antibiotics without a prescription. How do you say no kindly?', 'How would you grow the Refill Club in your first month?'],
  },

  bot: {
    hello: 'Maayong adlaw! I’m the LunasCare assistant 💊 Ask me about medicines in stock, prices, discounts or opening hours.',
    chips: ['Do you have amlodipine?', 'Senior discount?', 'Can I order on Messenger?', 'Antibiotics without Rx?', 'What are your hours?'],
    answers: [
      { k: ['amlodipine', 'losartan', 'metformin', 'maintenance', 'stock', 'available', 'have'], a: 'Yes! Amlodipine 5mg is in stock: generic ₱180 for 30 tablets. Join our free Refill Club and we’ll remind you before you run out.' },
      { k: ['senior', 'pwd', 'discount', 'osca'], a: 'Seniors and PWD get 20% off plus VAT exemption on medicines. Just show your OSCA or PWD ID at the counter.' },
      { k: ['messenger', 'order', 'deliver', 'pick'], a: 'Yes! Send your list on Messenger, we prepare it in 15 minutes. Pick up, or tricycle delivery within Mintal for ₱30.' },
      { k: ['antibiotic', 'amoxicillin', 'prescription', 'rx'], a: 'Sorry, antibiotics need a doctor’s prescription by law. Bring your prescription and our pharmacist will help you right away.' },
      { k: ['hour', 'open', 'close', 'time'], a: 'We’re open every day from 7 AM to 10 PM, including Sundays and holidays.' },
      { k: ['bp', 'blood pressure', 'sugar', 'check'], a: 'Free blood pressure checks every day. Blood sugar test is ₱80, results in 2 minutes.' },
      { k: ['where', 'address', 'location', 'find'], a: 'We’re near Mintal public market, beside the jeepney stop. Look for the green cross sign.' },
      { k: ['gcash', 'pay', 'card'], a: 'We accept cash, GCash and Maya.' },
      { k: ['dose', 'dosage', 'sick', 'pain', 'fever'], a: 'For dosage and symptoms, please talk to our pharmacist Ana in person or call the branch. In an emergency, call 911.' },
    ],
    fallback: 'Good question! Our pharmacist will answer you on Messenger shortly. In an emergency, call 911.',
  },

  compare: {
    ai: { time: '15 minutes', cost: '≈ ₱3,000', people: '1 owner + AI' },
    old: { time: '4–6 weeks', cost: '≈ ₱150,000', people: 'business consultant, analyst, designer, marketer, videographer' },
  },
};
