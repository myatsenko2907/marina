(() => {
  const D = window.DEMO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const money = (n) => Math.round(n).toLocaleString('ru-RU') + ' ' + D.currency;
  const short = (n) => {
    const a = Math.abs(n);
    const s = a >= 1e6 ? (a / 1e6).toFixed(1).replace('.', ',') + ' млн' : a >= 1e3 ? Math.round(a / 1e3) + ' тыс' : Math.round(a) + '';
    return (n < 0 ? '−' : '') + s + ' ' + D.currency;
  };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const brandName = D.brand.display || D.brand.name.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');

  $$('[data-brand]').forEach((e) => (e.textContent = brandName));
  $('#idea').value = D.idea;

  /* ---------- Location analysis ---------- */
  const L = D.location;
  const factorKey = new Proxy({}, { get: (_, f) => (f === 'rent' ? 'rentScore' : f) });
  const spots = L.spots.map((s) => ({ ...s, score: Object.entries(L.weights).reduce((t, [f, w]) => t + w * s[factorKey[f]], 0) }))
    .sort((a, b) => b.score - a.score);
  const winner = spots[0];
  $('#loc-winner').textContent = winner.name;
  $('#loc-title').textContent = `Победитель: ${winner.name} · ${winner.street}`;
  $('#loc-why').innerHTML = L.why.map((w) => `<li>${w}</li>`).join('');
  $('#loc-rank').innerHTML = spots.map((s, i) => `<div class="row${i === 0 ? ' top' : ''}">
      <b>${s.name}</b><span>${s.score.toFixed(1)}</span>
      <div class="bar"><i data-w="${s.score * 10}"></i></div>
      <small>${s.street} · ${L.rentLabel} ${money(s.rent)}${L.rentUnit}</small></div>`).join('');
  $('#loc-matrix').innerHTML =
    `<thead><tr><th>Фактор</th><th>Вес</th>${spots.map((s, i) => `<th${i === 0 ? ' class="hl"' : ''}>${s.name}</th>`).join('')}</tr></thead><tbody>` +
    Object.entries(L.weights).map(([f, w]) => `<tr><td>${L.labels[f]}</td><td>${Math.round(w * 100)}%</td>${spots.map((s, i) => `<td${i === 0 ? ' class="hl"' : ''}>${s[factorKey[f]]}</td>`).join('')}</tr>`).join('') +
    `<tr class="total"><td>Итоговая оценка</td><td></td>${spots.map((s, i) => `<td${i === 0 ? ' class="hl"' : ''}>${s.score.toFixed(1)}</td>`).join('')}</tr></tbody>`;
  // schematic map of Kyiv: the Dnipro splits the right and left banks
  $('#map').innerHTML = `
    <rect x="0" y="0" width="100" height="100" class="land"/>
    <path class="dnipro" d="M60 0 C 66 18, 58 36, 64 54 S 72 82, 68 100"/>
    <text class="sea-label" x="66" y="30" transform="rotate(70 66 30)">Днепр</text>
    <text class="sea-label" x="18" y="96" style="fill:var(--muted)">Правый берег</text>
    <text class="sea-label" x="88" y="96" style="fill:var(--muted)">Левый берег</text>
    <path class="road" d="M10 50 C 30 46, 50 44, 64 50 S 85 60, 96 58"/>
    ${spots.slice().reverse().map((s) => `<g class="pin${s === winner ? ' win' : ''}" transform="translate(${s.x} ${s.y})">
        ${s === winner ? '<circle class="pulse" r="4"/>' : ''}
        <circle r="2.4"/>
        ${s.x > 65 ? `<text x="4" y="8" text-anchor="end">` : `<text x="4" y="1.4">`}${s.name} · ${s.score.toFixed(1)}</text></g>`).join('')}`;

  /* ---------- Цена против такси ---------- */
  const T = D.taxi;
  const fare = (o, km) => o.base + o.perKm * km;
  const savePct = (km) => Math.round((1 - fare(T.tuk, km) / fare(T.taxi, km)) * 100);
  $('#tx-avg').textContent = Math.round(T.trips.reduce((t, [km]) => t + savePct(km), 0) / T.trips.length) + '%';
  $('#tx-note').textContent = T.note;
  const renderFare = (km) => {
    $('#o-km').textContent = km + ' км';
    $('#tx-tuk').textContent = money(fare(T.tuk, km));
    $('#tx-taxi').textContent = money(fare(T.taxi, km));
    $('#tx-save').innerHTML = `Экономия <b>${money(fare(T.taxi, km) - fare(T.tuk, km))}</b> · −${savePct(km)}%`;
  };
  $('#s-km').oninput = (e) => renderFare(+e.target.value);
  renderFare(+$('#s-km').value);
  const maxFare = fare(T.taxi, Math.max(...T.trips.map(([km]) => km)));
  $('#tx-bars').innerHTML = T.trips.map(([km, label]) => `<div class="txrow"><div class="txlab"><b>${label}</b><small>${km} км · −${savePct(km)}%</small></div>
      <div class="txb tuk"><i data-w="${(fare(T.tuk, km) / maxFare) * 100}"></i><span>${money(fare(T.tuk, km))}</span></div>
      <div class="txb taxi"><i data-w="${(fare(T.taxi, km) / maxFare) * 100}"></i><span>${money(fare(T.taxi, km))}</span></div></div>`).join('') +
    `<div class="txlegend"><span class="tuk">${T.tuk.label}</span><span class="taxi">${T.taxi.label}</span></div>`;
  $('#tx-why').innerHTML = T.why.map(([h, t]) => `<div class="card reveal"><h3>${h}</h3><p class="muted" style="margin:0">${t}</p></div>`).join('');

  /* ---------- Personas ---------- */
  $('#personas').innerHTML = D.personas.map((p) => `<div class="card persona reveal">
      <div class="ph-head"><div class="ava" style="background:${p.color}">${p.name[0]}</div><div><b>${p.name}</b><small>${p.role}</small></div></div>
      <blockquote>«${p.quote}»</blockquote>
      <ul>${p.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      <div class="hook"><span>Чем зацепим</span>${p.hook}</div></div>`).join('');

  /* ---------- Financial model ---------- */
  const invest = D.plan.investments.reduce((s, [, v]) => s + v, 0);
  const model = { ...D.plan.model };

  function simulate() {
    const rows = [];
    let cum = -invest, breakeven = null, payback = null;
    for (let m = 1; m <= 24; m++) {
      const ramp = Math.min(1, 0.45 + 0.55 * (m - 1) / Math.max(1, model.rampMonths - 1));
      const revenue = model.checksPerDay * ramp * model.avgCheck * 30;
      const profit = revenue * (1 - model.cogsShare) - model.fixedMonthly;
      cum += profit;
      if (breakeven == null && profit > 0) breakeven = m;
      if (payback == null && cum >= 0) payback = m;
      rows.push({ m, revenue, profit, cum });
    }
    return { rows, breakeven, payback, full: rows[23] };
  }
  const ord = (n) => n + '-й';
  const monthsWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'месяц' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'месяца' : 'месяцев');

  function renderFinance() {
    const r = simulate();
    $('#payback-h').textContent = r.payback ? `${r.payback} ${monthsWord(r.payback)}` : 'больше 2 лет';
    $('#o-check').textContent = money(model.avgCheck);
    $('#o-checks').textContent = model.checksPerDay;
    $('#kpis').innerHTML = [
      ['Вложения', short(invest)],
      ['Выручка в месяц', short(r.full.revenue)],
      ['Прибыль в месяц', short(r.full.profit)],
      ['Безубыточность', r.breakeven ? `${ord(r.breakeven)} месяц` : '—'],
      ['Окупаемость', r.payback ? `${ord(r.payback)} месяц` : '> 24 мес', true],
    ].map(([k, v, hl]) => `<div class="kpi${hl ? ' hl' : ''}"><span>${k}</span><b>${v}</b></div>`).join('');
    drawChart(r);
  }

  function drawChart(r) {
    const c = $('#chart');
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    if (!W) return;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const pad = { l: 56, r: 12, t: 12, b: 28 };
    const vals = r.rows.map((x) => x.cum);
    const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
    const x = (i) => pad.l + (i / 23) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
    g.font = '12px Inter, sans-serif';
    g.fillStyle = '#aaa69c'; g.strokeStyle = '#363530'; g.lineWidth = 1;
    const step = [5e5, 1e6, 2e6, 5e6, 1e7].find((s) => (max - min) / s <= 6) || 2e7;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      g.beginPath(); g.moveTo(pad.l, y(v)); g.lineTo(W - pad.r, y(v)); g.stroke();
      g.fillText(v ? short(v) : '0', 4, y(v) + 4);
    }
    g.textAlign = 'center';
    [1, 6, 12, 18, 24].forEach((m) => g.fillText(m + ' мес', Math.min(x(m - 1), W - 24), H - 8));
    g.textAlign = 'left';
    // zero line
    g.strokeStyle = '#3fb8af'; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(pad.l, y(0)); g.lineTo(W - pad.r, y(0)); g.stroke(); g.setLineDash([]);
    // area and line
    const grad = g.createLinearGradient(0, pad.t, 0, H);
    grad.addColorStop(0, 'rgba(247,201,72,.45)'); grad.addColorStop(1, 'rgba(247,201,72,0)');
    g.beginPath(); g.moveTo(x(0), y(0));
    vals.forEach((v, i) => g.lineTo(x(i), y(v)));
    g.lineTo(x(23), y(0)); g.closePath(); g.fillStyle = grad; g.fill();
    g.beginPath(); vals.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
    g.strokeStyle = '#f7c948'; g.lineWidth = 3; g.stroke();
    if (r.payback) {
      const i = r.payback - 1;
      g.fillStyle = '#f7c948'; g.beginPath(); g.arc(x(i), y(vals[i]), 6, 0, 7); g.fill();
      g.fillStyle = '#f4f2ec'; g.font = '600 13px Inter, sans-serif';
      g.fillText('окупились', Math.min(x(i) + 10, W - 80), y(vals[i]) - 10);
    }
  }

  const sCheck = $('#s-check'), sChecks = $('#s-checks');
  sCheck.value = model.avgCheck; sChecks.value = model.checksPerDay;
  sCheck.oninput = () => { model.avgCheck = +sCheck.value; renderFinance(); };
  sChecks.oninput = () => { model.checksPerDay = +sChecks.value; renderFinance(); };
  window.addEventListener('resize', () => renderFinance());

  $('#inv').innerHTML = D.plan.investments.map(([k, v]) => `<tr><td>${k}</td><td>${money(v)}</td></tr>`).join('') + `<tr><td>Итого</td><td>${money(invest)}</td></tr>`;

  /* ---------- Business plan ---------- */
  $('#aud').innerHTML = D.plan.audience.map((a) => `<div class="row"><b>${a.who}</b><span>${a.share}%</span><div class="bar"><i data-w="${a.share}"></i></div><small>${a.note}</small></div>`).join('');
  $('#swot').innerHTML = Object.entries(D.plan.swot).map(([k, list]) => `<div><b>${k}</b><ul>${list.map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('');

  /* ---------- Brand ---------- */
  $('#logo').innerHTML = `
    <svg viewBox="0 0 360 300" fill="none">
      <g class="draw" stroke="#f7c948" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M110 160 V110 C 110 80, 130 62, 160 62 H 250 V160"/>
        <path d="M110 110 H 70 L 82 150 H 110"/>
        <path d="M150 62 V 160 M 196 92 H 240 V 130 H 196 Z"/>
        <circle cx="96" cy="176" r="16"/><circle cx="226" cy="176" r="16"/>
      </g>
      <text x="180" y="240" text-anchor="middle" fill="#f4f2ec" font-family="Unbounded, sans-serif" font-size="40" font-weight="700" letter-spacing="8">${D.brand.name}</text>
      <text x="180" y="274" text-anchor="middle" fill="#ff8a1f" font-family="Inter, sans-serif" font-size="14" letter-spacing="7">${D.brand.descriptor.toUpperCase()}</text>
    </svg>`;
  $('#tagline').textContent = `«${D.brand.tagline}»`;
  $('#palette').innerHTML = D.brand.palette.map((p) => {
    const dark = parseInt(p.hex.slice(1, 3), 16) < 120;
    return `<div class="sw" style="background:${p.hex};color:${dark ? '#f4f2ec' : '#1b1b18'}"><b>${p.name}</b>${p.hex}</div>`;
  }).join('');
  $('#fonts').textContent = D.brand.fonts;
  $('#voice').textContent = D.brand.voice;

  /* ---------- Menu ---------- */
  let mSum = 0;
  $('#menu').innerHTML = D.menu.map((d) => {
    const margin = Math.round((1 - d.cost / d.price) * 100);
    mSum += margin;
    return `<div class="dish reveal">${d.tag ? `<span class="badge">${d.tag}</span>` : ''}
      <div class="top"><b>${d.name}</b><span class="price">${money(d.price)}</span></div>
      <div class="meta"><span>себестоимость ${money(d.cost)}</span><span>маржа ${margin}%</span></div>
      <div class="m"><i style="width:${margin}%"></i></div></div>`;
  }).join('');
  const avgMargin = Math.round(mSum / D.menu.length);
  $('#avg-margin').textContent = avgMargin + '%';

  // fill computed numbers into the agent logs
  const base = simulate();
  D.pipeline[3].log = [`Вложения: ${short(invest)}`, 'Строю модель на 24 месяца', `Окупаемость: ${ord(base.payback)} месяц`];
  D.pipeline[4].log = [D.pipeline[4].log[0], D.pipeline[4].log[1], `Средняя маржа: ${avgMargin}%`];

  /* ---------- Video ---------- */
  $('#videos').innerHTML = D.videos.map((v) => {
    const poster = v.file.replace('video/', 'img/').replace('.mp4', '.jpg');
    return `<div class="vcard reveal">
      <div class="vbox" style="aspect-ratio:${v.ratio}">
        <video src="${v.file}" poster="${poster}" playsinline loop muted preload="metadata"></video>
      </div>
      <div class="vmeta"><b>${v.title}</b><span class="pill">${v.model}</span> <span class="pill">🔊 клик — со звуком</span><code>${v.prompt}</code></div></div>`;
  }).join('') + `<div class="card howto reveal"><h3>Как это сделано</h3><ol>
      <li><b>ИИ пишет запрос</b>сцена, камера, свет и звук в одном абзаце</li>
      <li><b>Vivix W1 рендерит ролик</b>8–10 секунд видео со звуком примерно за минуту</li>
      <li><b>Vivix A1 оживляет Сергея</b>одно фото и текст превращаются в говорящего водителя</li></ol>
      <div class="stat"><b>${D.videos.length}</b> ролика · <b>0</b> камер · <b>0</b> актёров</div></div>`;
  // missing file → show a placeholder with a hint
  $$('#videos video').forEach((v) => v.addEventListener('error', () => {
    const img = new Image();
    img.onerror = () => v.replaceWith(el('div', 'ph', 'Видео ещё не сгенерировано<br>см. README'));
    img.src = v.poster;
  }));
  // click a video to unmute it and play from the start
  $$('#videos video').forEach((v) => v.addEventListener('click', () => {
    const on = v.muted;
    $$('#videos video').forEach((o) => (o.muted = true));
    v.muted = !on; if (on) { v.currentTime = 0; v.play(); }
  }));

  /* ---------- 15-second ad ---------- */
  const AD = D.ad;
  if (AD) {
    const v = $('#advideo'), player = $('#adplayer');
    v.src = AD.file; v.poster = AD.poster;
    const fmt = (t) => '0:' + String(Math.floor(t)).padStart(2, '0');
    $('#shots').innerHTML = AD.shots.map((sh, i) => `<li><button type="button" data-i="${i}"><span class="tc">${fmt(sh.t)}</span><b>${sh.title}</b><small>${sh.note}</small></button></li>`).join('');
    $('#vo').textContent = AD.voiceover;
    $('#admusic').textContent = AD.music;
    $('#adstats').innerHTML = AD.stats.map(([k, t]) => `<div><b>${k}</b>${t}</div>`).join('');
    $('#endcard').innerHTML = `<b>${AD.endCard.title}</b><span>${AD.endCard.line}</span><small>${AD.endCard.sub}</small>`;
    const play = (from) => {
      $$('video').forEach((o) => o !== v && (o.muted = true));
      if (from != null) v.currentTime = from;
      v.muted = false;
      v.play().catch(() => {});
    };
    $('#adplay').onclick = () => play(v.ended ? 0 : null);
    v.onclick = () => (v.paused ? play(null) : v.pause());
    v.onplay = () => player.classList.add('playing');
    v.onpause = () => player.classList.remove('playing');
    v.onended = () => { player.classList.remove('playing'); $('#adplay').textContent = '↺ Смотреть ещё раз'; };
    v.onloadedmetadata = () => { $('#admarks').innerHTML = AD.shots.slice(1).map((sh) => `<span style="left:${(sh.t / v.duration) * 100}%"></span>`).join(''); };
    v.ontimeupdate = () => {
      const t = v.currentTime;
      $('#adprogress').style.width = (t / (v.duration || 15)) * 100 + '%';
      $('#endcard').classList.toggle('on', t >= AD.endCard.at);
      const cur = AD.shots.reduce((c, sh, i) => (t >= sh.t ? i : c), 0);
      $$('#shots button').forEach((b, i) => b.classList.toggle('on', i === cur));
    };
    $$('#shots button').forEach((b) => (b.onclick = () => play(AD.shots[+b.dataset.i].t)));
  }

  /* ---------- Creatives ---------- */
  $('#creatives').innerHTML = D.creatives.map((c) => {
    const bg = !c.bg ? '' : c.bg.endsWith('.mp4')
      ? `<video class="bg" src="${c.bg}" autoplay muted loop playsinline></video>`
      : `<img class="bg" src="${c.bg}" alt="">`;
    return `<div class="cr ${c.kind}${c.color ? ' colorful' : ''} reveal">${bg}<div class="lg">${D.brand.name}</div>
      <div class="k">${c.kicker}</div>
      ${c.price ? `<div class="t">${c.title}</div><div class="bigprice">${money(c.price)}</div>` : `<div class="t">${c.title}</div>`}
      <div class="c">${c.cta}</div></div>`;
  }).join('');
  const best = D.ads.reduce((b, a, i) => (parseFloat(a.ctr) > parseFloat(D.ads[b].ctr) ? i : b), 0);
  $('#ads').innerHTML = D.ads.map((a, i) => `<div class="ad reveal${i === best ? ' best' : ''}"><b>${a.h}</b><p>${a.t}</p><div class="ctr">Прогноз CTR: ${a.ctr}${i === best ? ' · победитель A/B' : ''}</div></div>`).join('');
  $('#cplan').innerHTML = D.contentPlan.map(([d, t]) => `<div><b>${d}</b>${t}</div>`).join('');
  $('#listing').innerHTML = `<div class="lhead"><div class="lav">🛺</div><div><b>${D.delivery.title}</b><small>★ 4.9 · Такси и поездки · ежедневно</small></div></div>
    <p>${D.delivery.text}</p><div class="tags">${D.delivery.tags.map((t) => `<span>${t}</span>`).join('')}</div>`;

  /* ---------- Launch plan ---------- */
  $('#roadmap').innerHTML = D.roadmap.map((r) => `<li><span>${r.when}</span><b>${r.what}</b><small>${r.detail}</small></li>`).join('');
  const H = D.hiring;
  $('#job').innerHTML = `<div><h3>Вакансия от ИИ</h3><div class="jtitle">${H.title}</div><p>${H.text}</p>
      <div class="tags">${H.perks.map((p) => `<span>${p}</span>`).join('')}</div></div>
    <div><h3>Вопросы на собеседовании</h3><ol class="qs">${H.questions.map((q) => `<li>${q}</li>`).join('')}</ol></div>`;

  /* ---------- Chatbot ---------- */
  const msgs = $('#msgs');
  const push = (cls, text) => { const m = el('div', 'msg ' + cls); m.textContent = text; msgs.append(m); msgs.scrollTop = msgs.scrollHeight; return m; };
  let botStarted = false;
  async function ask(q) {
    if (!q.trim()) return;
    push('u', q);
    const typing = push('b dots', '');
    await sleep(900);
    const t = q.toLowerCase();
    const hit = D.bot.answers.find((a) => a.k.some((k) => t.includes(k)));
    typing.classList.remove('dots');
    const answer = hit ? hit.a : D.bot.fallback;
    for (let i = 1; i <= answer.length; i += 2) { typing.textContent = answer.slice(0, i); await sleep(12); }
    typing.textContent = answer;
    msgs.scrollTop = msgs.scrollHeight;
  }
  $('#chips').innerHTML = D.bot.chips.map((c) => `<button type="button">${c}</button>`).join('');
  $$('#chips button').forEach((b) => (b.onclick = () => ask(b.textContent)));
  $('#compose').onsubmit = (e) => { e.preventDefault(); const i = $('#ask'); ask(i.value); i.value = ''; };

  /* ---------- Summary ---------- */
  const dl = (o) => `<div><dt>Время</dt><dd>${o.time}</dd></div><div><dt>Стоимость</dt><dd>${o.cost}</dd></div><div><dt>Кто делал</dt><dd style="font-size:clamp(14px,1.6vw,18px)">${o.people}</dd></div>`;
  $('#vs-ai').innerHTML = dl(D.compare.ai);
  $('#vs-old').innerHTML = dl(D.compare.old);

  function confetti() {
    const colors = ['#f7c948', '#ff8a1f', '#3fb8af', '#f4f2ec'];
    for (let i = 0; i < 90; i++) {
      const c = el('i', 'confetti');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % 4];
      c.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
      c.style.animationDelay = Math.random() * 0.8 + 's';
      document.body.append(c);
      setTimeout(() => c.remove(), 6000);
    }
  }

  /* ---------- Slide reveal ---------- */
  const slides = $$('.slide');
  const seen = new Set();
  async function typeText(node, text) {
    node.textContent = '';
    for (let i = 1; i <= text.length; i++) { node.textContent = text.slice(0, i); await sleep(12); }
    node.classList.add('finished');
  }
  const fillBars = (s) => setTimeout(() => $$('.bar i, .txb i', s).forEach((b) => (b.style.width = b.dataset.w + '%')), 300);
  function onEnter(s) {
    s.classList.add('in');
    const i = slides.indexOf(s);
    $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === i));
    $$('video', s).forEach((v) => v.id !== 'advideo' && v.play().catch(() => {}));
    if (seen.has(s)) return;
    seen.add(s);
    fillBars(s);
    if (s.dataset.title === 'Бизнес-план') typeText($('#summary'), D.plan.summary);
    if (s.dataset.title === 'Финмодель') renderFinance();
    if (s.dataset.title === 'Чат-бот' && !botStarted) { botStarted = true; setTimeout(() => push('b', D.bot.hello), 400); }
    if (s.classList.contains('final')) confetti();
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && onEnter(e.target)), { threshold: 0.35 });
  slides.forEach((s) => io.observe(s));

  $('#dots').innerHTML = slides.map((s) => `<button title="${s.dataset.title}"></button>`).join('');
  $$('#dots button').forEach((b, i) => (b.onclick = () => go(i)));

  let cur = 0;
  function current() {
    const mid = window.innerHeight / 2;
    const i = slides.findIndex((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
    return i < 0 ? cur : i;
  }
  function go(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides[cur].scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- Agent pipeline ---------- */
  let phase = 'start';
  const STEP = 1500; // ms per agent: change to speed up or slow down the show
  async function runPipeline() {
    if (phase !== 'start') return;
    phase = 'run';
    $('#start').classList.add('hidden');
    $('#run').classList.remove('hidden');
    window.scrollTo(0, 0);
    const box = $('#agents');
    box.innerHTML = D.pipeline.map((a) => `<div class="agent"><div class="head"><span class="ico">${a.icon}</span>${a.name}<span class="state">ожидает</span></div><ul></ul><div class="bar"></div></div>`).join('');
    const cards = $$('.agent', box);
    const t0 = Date.now();
    const total = STEP * cards.length;
    const timer = setInterval(() => {
      // "accelerated" clock: the show squeezes ~15 minutes of AI work into a few seconds
      const sec = Math.min(1, (Date.now() - t0) / total) * 15 * 60;
      $('#timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    }, 100);
    for (let i = 0; i < cards.length; i++) {
      if (phase !== 'run') break;
      const c = cards[i];
      c.classList.add('active');
      $('.state', c).textContent = 'работает…';
      const bar = $('.bar', c);
      bar.style.transition = `width ${STEP}ms linear`;
      requestAnimationFrame(() => (bar.style.width = '100%'));
      for (const line of D.pipeline[i].log) {
        $('ul', c).append(el('li', '', line));
        await sleep(STEP / D.pipeline[i].log.length);
      }
      c.classList.remove('active'); c.classList.add('done');
      $('.state', c).textContent = '✓ готово';
      const pct = Math.round(((i + 1) / cards.length) * 100);
      $('#pct').textContent = pct + '%';
      $('#fill').style.width = pct + '%';
    }
    clearInterval(timer);
    if (phase !== 'run') return;
    await sleep(700);
    showResults();
  }

  function showResults() {
    phase = 'results';
    $('#run').classList.add('hidden');
    $('#start').classList.add('hidden');
    $('#results').classList.remove('hidden');
    $('#dots').classList.remove('hidden');
    go(0);
  }

  function reset() {
    stopAuto();
    phase = 'start';
    seen.clear();
    botStarted = false;
    msgs.innerHTML = '';
    slides.forEach((s) => s.classList.remove('in'));
    $('#summary').classList.remove('finished');
    $$('.slide .bar i').forEach((b) => (b.style.width = 0));
    $('#results').classList.add('hidden');
    $('#dots').classList.add('hidden');
    $('#run').classList.add('hidden');
    $('#start').classList.remove('hidden');
    $('#pct').textContent = '0%'; $('#fill').style.width = 0;
    window.scrollTo(0, 0);
  }

  /* ---------- Autoplay ---------- */
  let auto = null;
  function stopAuto() { clearInterval(auto); auto = null; $('#btn-auto').textContent = '▶ Автопоказ'; }
  function startAuto() {
    $('#btn-auto').textContent = '⏸ Пауза';
    auto = setInterval(() => {
      if (phase !== 'results') return;
      const i = current();
      if (i >= slides.length - 1) return stopAuto();
      go(i + 1);
    }, 9000);
    if (phase === 'start') runPipeline();
  }
  $('#btn-auto').onclick = () => (auto ? stopAuto() : startAuto());

  /* ---------- Controls ---------- */
  $('#btn-go').onclick = runPipeline;
  $('#btn-reset').onclick = reset;
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
  $('#btn-full').onclick = fullscreen;

  document.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (phase === 'start' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); return runPipeline(); }
    if (typing) return;
    if (e.key === 'f' || e.key === 'а') fullscreen();
    if (e.key === 'r' || e.key === 'к') reset();
    if (phase === 'start' && e.key === ' ') { e.preventDefault(); runPipeline(); }
    if (phase === 'run' && (e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); showResults(); } // skip the animation
    if (phase !== 'results') return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(current() + 1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current() - 1); }
  });

  // index.html#results opens the finished results right away
  if (location.hash === '#results') showResults();

  /* ---------- Live generation (only when served by server.mjs) ---------- */
  fetch('api/status').then((r) => r.json()).then((s) => {
    if (!s.live) return;
    $('#live').classList.remove('hidden');
    $('#live-go').onclick = async () => {
      const prompt = $('#live-prompt').value.trim();
      if (!prompt) return;
      const st = $('#live-status');
      st.textContent = 'Отправляю задание в Vivix…';
      try {
        const job = await (await fetch('api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })).json();
        if (job.error) throw new Error(job.error);
        const t0 = Date.now();
        for (;;) {
          await sleep(4000);
          const j = await (await fetch('api/video/' + job.job_id)).json();
          st.textContent = `Vivix генерирует видео… ${Math.round((Date.now() - t0) / 1000)} с (${j.status})`;
          if (j.status === 'succeeded') {
            st.textContent = 'Готово! Сгенерировано за ' + Math.round((Date.now() - t0) / 1000) + ' с';
            const card = el('div', 'vcard', `<div class="vbox" style="aspect-ratio:16/9"><video src="${j.video_url}" autoplay controls playsinline></video></div><div class="vmeta"><b>Только что</b><span class="pill">Vivix W1 · live</span><code></code></div>`);
            $('code', card).textContent = prompt;
            $('#videos').prepend(card);
            break;
          }
          if (j.status === 'failed' || j.error) throw new Error(j.error?.message || j.error || 'ошибка генерации');
        }
      } catch (err) { st.textContent = 'Не получилось: ' + err.message; }
    };
  }).catch(() => {});
})();
