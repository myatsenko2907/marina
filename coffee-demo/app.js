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

  $$('[data-brand]').forEach((e) => (e.textContent = D.brand.name[0] + D.brand.name.slice(1).toLowerCase()));
  $('#idea').value = D.idea;

  /* ---------- Финмодель ---------- */
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

  const monthsWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'месяц' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'месяца' : 'месяцев');

  function renderFinance() {
    const r = simulate();
    $('#payback-h').textContent = r.payback ? `${r.payback} ${monthsWord(r.payback)}` : 'более 2 лет';
    $('#o-check').textContent = money(model.avgCheck);
    $('#o-checks').textContent = model.checksPerDay;
    $('#kpis').innerHTML = [
      ['Вложения', short(invest)],
      ['Выручка в месяц', short(r.full.revenue)],
      ['Прибыль в месяц', short(r.full.profit)],
      ['Безубыточность', r.breakeven ? `${r.breakeven}-й месяц` : '—'],
      ['Окупаемость', r.payback ? `${r.payback}-й месяц` : '> 24 мес', true],
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
    const pad = { l: 64, r: 12, t: 12, b: 28 };
    const vals = r.rows.map((x) => x.cum);
    const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
    const x = (i) => pad.l + (i / 23) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
    g.font = '12px Inter, sans-serif';
    g.fillStyle = '#b9a593'; g.strokeStyle = '#3a2a20'; g.lineWidth = 1;
    const step = [5e5, 1e6, 2e6, 5e6, 1e7].find((s) => (max - min) / s <= 6) || 2e7;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      g.beginPath(); g.moveTo(pad.l, y(v)); g.lineTo(W - pad.r, y(v)); g.stroke();
      g.fillText(v ? short(v).replace(' ' + D.currency, '') : '0', 4, y(v) + 4);
    }
    g.textAlign = 'center';
    [1, 6, 12, 18, 24].forEach((m) => g.fillText(m + ' мес', Math.min(x(m - 1), W - 24), H - 8));
    g.textAlign = 'left';
    // нулевая линия
    g.strokeStyle = '#8fa37e'; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(pad.l, y(0)); g.lineTo(W - pad.r, y(0)); g.stroke(); g.setLineDash([]);
    // область и линия
    const grad = g.createLinearGradient(0, pad.t, 0, H);
    grad.addColorStop(0, 'rgba(233,184,114,.45)'); grad.addColorStop(1, 'rgba(233,184,114,0)');
    g.beginPath(); g.moveTo(x(0), y(0));
    vals.forEach((v, i) => g.lineTo(x(i), y(v)));
    g.lineTo(x(23), y(0)); g.closePath(); g.fillStyle = grad; g.fill();
    g.beginPath(); vals.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
    g.strokeStyle = '#e9b872'; g.lineWidth = 3; g.stroke();
    if (r.payback) {
      const i = r.payback - 1;
      g.fillStyle = '#e9b872'; g.beginPath(); g.arc(x(i), y(vals[i]), 6, 0, 7); g.fill();
      g.fillStyle = '#f4ebdd'; g.font = '600 13px Inter, sans-serif';
      g.fillText('окупились', Math.min(x(i) + 10, W - 80), y(vals[i]) - 10);
    }
  }

  const sCheck = $('#s-check'), sChecks = $('#s-checks');
  sCheck.value = model.avgCheck; sChecks.value = model.checksPerDay;
  sCheck.oninput = () => { model.avgCheck = +sCheck.value; renderFinance(); };
  sChecks.oninput = () => { model.checksPerDay = +sChecks.value; renderFinance(); };
  window.addEventListener('resize', () => renderFinance());

  $('#inv').innerHTML = D.plan.investments.map(([k, v]) => `<tr><td>${k}</td><td>${money(v)}</td></tr>`).join('') + `<tr><td>Итого</td><td>${money(invest)}</td></tr>`;

  // подставляем посчитанные цифры в лог финансиста
  const base = simulate();
  D.pipeline[1].log = [`Считаю вложения: ${short(invest)}`, 'Строю модель на 24 месяца', `Окупаемость: ${base.payback}-й месяц`];

  /* ---------- Бизнес-план ---------- */
  $('#aud').innerHTML = D.plan.audience.map((a) => `<div class="row"><b>${a.who}</b><span>${a.share}%</span><div class="bar"><i data-w="${a.share}"></i></div><small>${a.note}</small></div>`).join('');
  $('#swot').innerHTML = Object.entries(D.plan.swot).map(([k, list]) => `<div><b>${k}</b><ul>${list.map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('');

  /* ---------- Бренд ---------- */
  $('#logo').innerHTML = `
    <svg viewBox="0 0 360 300" fill="none">
      <g class="draw" stroke="#e9b872" stroke-width="5" stroke-linecap="round">
        <ellipse cx="180" cy="105" rx="58" ry="80" transform="rotate(-28 180 105)"/>
        <path d="M150 40 C 200 80, 160 130, 210 170"/>
      </g>
      <text x="180" y="245" text-anchor="middle" fill="#f4ebdd" font-family="Unbounded" font-size="46" font-weight="700" letter-spacing="10">${D.brand.name}</text>
      <text x="180" y="278" text-anchor="middle" fill="#c8874a" font-family="Inter" font-size="15" letter-spacing="8">${D.brand.descriptor.toUpperCase()}</text>
    </svg>`;
  $('#tagline').textContent = `«${D.brand.tagline}»`;
  $('#palette').innerHTML = D.brand.palette.map((p) => {
    const dark = parseInt(p.hex.slice(1, 3), 16) < 120;
    return `<div class="sw" style="background:${p.hex};color:${dark ? '#f4ebdd' : '#2b1b14'}"><b>${p.name}</b>${p.hex}</div>`;
  }).join('');
  $('#fonts').textContent = D.brand.fonts;
  $('#voice').textContent = D.brand.voice;

  /* ---------- Меню ---------- */
  let mSum = 0;
  $('#menu').innerHTML = D.menu.map((d) => {
    const margin = Math.round((1 - d.cost / d.price) * 100);
    mSum += margin;
    return `<div class="dish reveal">${d.tag ? `<span class="badge">${d.tag}</span>` : ''}
      <div class="top"><b>${d.name}</b><span class="price">${d.price} ${D.currency}</span></div>
      <div class="meta"><span>себестоимость ${d.cost} ${D.currency}</span><span>маржа ${margin}%</span></div>
      <div class="m"><i style="width:${margin}%"></i></div></div>`;
  }).join('');
  $('#avg-margin').textContent = Math.round(mSum / D.menu.length) + '%';

  /* ---------- Видео ---------- */
  $('#videos').innerHTML = D.videos.map((v) => {
    const poster = v.file.replace('video/', 'img/').replace('.mp4', '.jpg');
    return `<div class="vcard reveal">
      <div class="vbox" style="aspect-ratio:${v.ratio}">
        <video src="${v.file}" poster="${poster}" playsinline loop muted preload="metadata"></video>
      </div>
      <div class="vmeta"><b>${v.title}</b><span class="pill">${v.model}</span> <span class="pill">🔊 клик — со звуком</span><code>${v.prompt}</code></div></div>`;
  }).join('');
  // нет файла — показываем заглушку с подсказкой
  $$('#videos video').forEach((v) => v.addEventListener('error', () => {
    const img = new Image();
    img.onerror = () => v.replaceWith(el('div', 'ph', 'Видео ещё не сгенерировано<br>см. README → «Видео»'));
    img.src = v.poster;
  }));
  // клик по видео — включить звук и проиграть с начала
  $$('#videos video').forEach((v) => v.addEventListener('click', () => {
    const on = v.muted;
    $$('#videos video').forEach((o) => (o.muted = true));
    v.muted = !on; if (on) { v.currentTime = 0; v.play(); }
  }));

  /* ---------- Креативы ---------- */
  $('#creatives').innerHTML = D.creatives.map((c) => {
    const bg = !c.bg ? '' : c.bg.endsWith('.mp4')
      ? `<video class="bg" src="${c.bg}" autoplay muted loop playsinline></video>`
      : `<img class="bg" src="${c.bg}" alt="">`;
    return `<div class="cr ${c.kind}${c.color ? ' colorful' : ''} reveal">${bg}<div class="lg">${D.brand.name}</div>
      <div class="k">${c.kicker}</div>
      ${c.price ? `<div class="t">${c.title}</div><div class="bigprice">${c.price} ${D.currency}</div>` : `<div class="t">${c.title}</div>`}
      <div class="c">${c.cta}</div></div>`;
  }).join('');
  const best = D.ads.reduce((b, a, i) => (parseFloat(a.ctr.replace(',', '.')) > parseFloat(D.ads[b].ctr.replace(',', '.')) ? i : b), 0);
  $('#ads').innerHTML = D.ads.map((a, i) => `<div class="ad reveal${i === best ? ' best' : ''}"><b>${a.h}</b><p>${a.t}</p><div class="ctr">Прогноз CTR: ${a.ctr}${i === best ? ' · победитель A/B' : ''}</div></div>`).join('');
  $('#cplan').innerHTML = D.contentPlan.map(([d, t]) => `<div><b>${d}</b>${t}</div>`).join('');

  /* ---------- Чат-бот ---------- */
  const msgs = $('#msgs');
  const push = (cls, text) => { const m = el('div', 'msg ' + cls, text); msgs.append(m); msgs.scrollTop = msgs.scrollHeight; return m; };
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

  /* ---------- Итог ---------- */
  const dl = (o) => `<div><dt>Время</dt><dd>${o.time}</dd></div><div><dt>Стоимость</dt><dd>${o.cost}</dd></div><div><dt>Кто делал</dt><dd style="font-size:clamp(14px,1.6vw,18px)">${o.people}</dd></div>`;
  $('#vs-ai').innerHTML = dl(D.compare.ai);
  $('#vs-old').innerHTML = dl(D.compare.old);

  function confetti() {
    const colors = ['#e9b872', '#c8874a', '#8fa37e', '#f4ebdd'];
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

  /* ---------- Появление слайдов ---------- */
  const slides = $$('.slide');
  const seen = new Set();
  async function typeText(node, text) {
    node.textContent = '';
    for (let i = 1; i <= text.length; i++) { node.textContent = text.slice(0, i); await sleep(14); }
    node.classList.add('finished');
  }
  function onEnter(s) {
    s.classList.add('in');
    const i = slides.indexOf(s);
    $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === i));
    $$('video', s).forEach((v) => v.play().catch(() => {}));
    if (seen.has(s)) return;
    seen.add(s);
    if (i === 0) { typeText($('#summary'), D.plan.summary); setTimeout(() => $$('#aud i').forEach((b) => (b.style.width = b.dataset.w + '%')), 300); }
    if (i === 1) renderFinance();
    if (s.dataset.title === 'ИИ-бариста' && !botStarted) { botStarted = true; setTimeout(() => push('b', D.bot.hello), 400); }
    if (s.classList.contains('final')) confetti();
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && onEnter(e.target)), { threshold: 0.45 });
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

  /* ---------- Запуск конвейера ---------- */
  let phase = 'start';
  const STEP = 1700; // мс на агента — меняйте, чтобы ускорить/замедлить показ
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
    const timer = setInterval(() => {
      // «ускоренное» время: секунда показа = минута работы
      const s = Math.round((Date.now() - t0) / 1000) * 60 / 7;
      $('#timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    }, 200);
    for (let i = 0; i < cards.length; i++) {
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
    $$('#aud i').forEach((b) => (b.style.width = 0));
    $('#results').classList.add('hidden');
    $('#dots').classList.add('hidden');
    $('#run').classList.add('hidden');
    $('#start').classList.remove('hidden');
    $('#pct').textContent = '0%'; $('#fill').style.width = 0;
    window.scrollTo(0, 0);
  }

  /* ---------- Автопоказ ---------- */
  let auto = null;
  function stopAuto() { clearInterval(auto); auto = null; $('#btn-auto').textContent = '▶ Автопоказ'; }
  async function startAuto() {
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

  /* ---------- Управление ---------- */
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
    if (phase === 'run' && (e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); showResults(); } // пропустить анимацию
    if (phase !== 'results') return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(current() + 1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current() - 1); }
  });

  // ссылка вида index.html#results сразу открывает готовые результаты
  if (location.hash === '#results') showResults();

  /* ---------- Живая генерация (только при запуске через server.mjs) ---------- */
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
            st.textContent = 'Готово! Видео сгенерировано за ' + Math.round((Date.now() - t0) / 1000) + ' с';
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
