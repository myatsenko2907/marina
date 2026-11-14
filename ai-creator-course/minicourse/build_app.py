"""Збирає платформу мінікурсу «AI Creator: Старт» у app/index.html з lessons.py.

Запуск: python3 build_app.py
Налаштування (ціна, посилання на оплату, коди доступу, посилання на курс) — в об'єкті CONFIG у шаблоні нижче.
"""
import json, pathlib, subprocess
from lessons import LESSONS, HOST

HERE = pathlib.Path(__file__).parent


def minutes(lid):
    f = HERE / "app" / "media" / f"{lid}.mp4"
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout
    return max(1, round(float(out or 0) / 60))


EXAMPLES = [("01-serum", "Сироватка біля басейну", "Наїзд + крапля"), ("02-candle", "Свічка на підвіконні", "Статика + дим"), ("03-headphones", "Навушники в студії", "Орбіта"), ("04-coffee", "Кава на терасі", "Золота година"), ("05-perfume", "Парфуми з тіні", "Розкриття світлом"), ("06-sneakers", "Кросівок", "Легкий поворот")]
EXAMPLES = [("reel-final", "Готовий ролик з уроку 2", "Хук + товар + оффер")] + EXAMPLES[:5]

data = [{k: l[k] for k in ("id", "n", "title", "subtitle", "result", "tools", "guide", "prompts", "task")} | {"duration": minutes(l["id"])} for l in LESSONS]

TEMPLATE = r"""<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>AI Creator Старт</title>
<meta name="description" content="Мінікурс AI Creator: Старт — 2 уроки з відео, конспектом і завданнями. Перше рекламне AI-фото і перший AI-ролик.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800;900&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* Макет: світла платформа у стилі лендингу; продаюча сторінка → кабінет → уроки → фініш */
  :root{color-scheme:light;--bg:#FBFAF8;--card:#fff;--ink:#121317;--sub:#5E6270;--line:#E8E6E1;--hot:#FF4A1C;--pink:#FF2D78;--amber:#FFB01F;--ok:#12A150;
    --grad:linear-gradient(100deg,#FF4A1C 0%,#FF2D78 55%,#FFB01F 110%);--display:'Unbounded',system-ui,sans-serif;--text:'Manrope',system-ui,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  [hidden]{display:none!important}
  body{background:var(--bg);color:var(--ink);font:500 17px/1.55 var(--text);-webkit-font-smoothing:antialiased;overflow-x:hidden}
  a{color:inherit}
  img,video{max-width:100%;display:block}
  .wrap{width:100%;max-width:1160px;margin:0 auto;padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
  h1,h2,h3,h4{font-family:var(--display);letter-spacing:-.03em;line-height:1.05;text-wrap:balance}
  h2{font-size:clamp(28px,4.4vw,48px);font-weight:800;margin-bottom:14px}
  h3{font-size:20px;font-weight:700;letter-spacing:-.015em}
  .g{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .lead{font-size:18px;color:var(--sub);max-width:640px}
  .tag{display:inline-flex;align-items:center;gap:8px;font:800 12px/1 var(--text);letter-spacing:.12em;text-transform:uppercase;padding:9px 14px;border-radius:999px;background:#fff;border:1px solid var(--line);margin-bottom:18px}
  .tag::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--grad)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 26px;border-radius:999px;font:800 16px/1.1 var(--text);text-decoration:none;border:0;cursor:pointer;transition:transform .2s,box-shadow .2s;text-align:center}
  .btn:hover{transform:translateY(-2px)}
  .btn:focus-visible,input:focus-visible,summary:focus-visible,.chk:focus-within{outline:3px solid var(--ink);outline-offset:3px}
  .btn-hot{background:var(--grad);color:#fff;box-shadow:0 14px 30px -12px rgba(255,45,120,.65)}
  .btn-ghost{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}
  .btn-ghost:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
  .btn-dark{background:var(--ink);color:#fff}
  .btn svg{width:18px;height:18px}
  .ico{width:22px;height:22px;flex:none}
  section{padding-block:72px}

  header{position:sticky;top:env(safe-area-inset-top,0px);z-index:40;background:rgba(251,250,248,.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(18,19,23,.06)}
  body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:50;background:var(--bg)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:66px;gap:12px}
  .logo{display:flex;align-items:center;gap:10px;font:800 17px/1 var(--display);text-decoration:none;letter-spacing:-.02em}
  .logo i{width:30px;height:30px;border-radius:9px;background:var(--grad);display:grid;place-items:center;color:#fff;font:900 11px var(--display);font-style:normal}
  .logo small{font:800 11px var(--text);letter-spacing:.1em;text-transform:uppercase;color:var(--pink);background:#FFE4EE;padding:4px 7px;border-radius:6px}
  .nav .btn{min-height:42px;padding:0 18px;font-size:14px}
  .navprog{display:none;align-items:center;gap:10px;font:700 13px var(--text);color:var(--sub)}
  .bar{width:120px;height:8px;border-radius:8px;background:#ECE9E3;overflow:hidden}
  .bar i{display:block;height:100%;background:var(--grad);border-radius:8px;transition:width .4s}

  /* продаюча */
  .hero{position:relative;overflow:hidden;padding-block:56px 64px}
  .hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(40% 50% at 88% 15%,rgba(255,45,120,.18),transparent 70%),radial-gradient(40% 50% at 70% 95%,rgba(255,176,31,.2),transparent 70%)}
  .hero-grid{display:grid;gap:40px;align-items:center}
  .hero-grid>*{min-width:0}
  .hero h1{font-size:clamp(38px,6.2vw,76px);font-weight:900;letter-spacing:-.045em;line-height:1;margin-bottom:20px}
  .hero .lead{margin-bottom:26px}
  .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
  .price-chip{display:flex;align-items:baseline;gap:10px;margin-top:22px}
  .price-chip b{font:900 40px var(--display);letter-spacing:-.04em}
  .price-chip s{color:var(--sub);font-weight:700}
  .price-chip span{font-size:14px;color:var(--sub);font-weight:700}
  .player-mock{position:relative;border-radius:24px;overflow:hidden;box-shadow:0 30px 70px -30px rgba(18,19,23,.5);background:#111;aspect-ratio:16/9;max-width:100%}
  .player-mock img{width:100%;height:100%;object-fit:cover}
  .player-mock .pl{position:absolute;inset:0;margin:auto;width:76px;height:76px;border-radius:50%;background:var(--grad);display:grid;place-items:center;box-shadow:0 0 0 10px rgba(255,255,255,.35)}
  .player-mock .pl svg{width:26px;height:26px;color:#fff;margin-left:4px}
  .glass{position:absolute;left:14px;top:14px;background:rgba(255,255,255,.88);backdrop-filter:blur(10px);border-radius:14px;padding:10px 14px;font:800 13px/1.3 var(--text)}
  .glass small{display:block;font-weight:600;color:var(--sub)}
  .lcards{display:grid;gap:16px;margin-top:36px}
  .lcard{background:var(--card);border:1px solid var(--line);border-radius:26px;overflow:hidden;display:grid}
  .lcard img{width:100%;aspect-ratio:16/9;object-fit:cover}
  .lcard .in{padding:22px 24px;display:grid;gap:10px}
  .lcard .n{font:800 12px var(--text);letter-spacing:.1em;text-transform:uppercase;color:var(--pink)}
  .lcard p{color:var(--sub);font-size:15px}
  .res{display:flex;gap:10px;align-items:flex-start;background:var(--bg);border-radius:14px;padding:12px 14px;font-weight:700;font-size:15px}
  .res svg{color:var(--ok);margin-top:2px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chips span{font:700 13px var(--text);background:var(--bg);border:1px solid var(--line);padding:6px 10px;border-radius:999px}
  .inside{display:grid;gap:14px;margin-top:36px}
  .ins{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:24px}
  .ins .ic{width:50px;height:50px;border-radius:16px;background:var(--grad);color:#fff;display:grid;place-items:center;margin-bottom:14px}
  .ins p{color:var(--sub);font-size:15px;margin-top:6px}
  .host{display:grid;gap:24px;align-items:center;background:var(--ink);color:#fff;border-radius:30px;padding:30px;position:relative;overflow:hidden}
  .host::before{content:"";position:absolute;right:-90px;top:-90px;width:300px;height:300px;border-radius:50%;background:var(--grad);opacity:.8;filter:blur(8px)}
  .host>*{position:relative}
  .host img{width:150px;height:150px}
  .host p{color:#C9CBD2}
  .buy{display:grid;gap:20px;background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box;border:2px solid transparent;border-radius:30px;padding:30px;box-shadow:0 30px 60px -36px rgba(255,45,120,.5)}
  .buy ul{list-style:none;display:grid;gap:10px}
  .buy li{display:flex;gap:10px;font-weight:700}
  .buy li svg{color:var(--ok)}
  .buy .big{font:900 56px/1 var(--display);letter-spacing:-.05em}
  .code{display:flex;gap:8px;flex-wrap:wrap}
  .code input{flex:1;min-width:180px;min-height:52px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg);font:700 16px var(--text);padding:0 14px;text-transform:uppercase}
  .err{color:#C2331B;font-weight:700;font-size:14px}
  .faq{display:grid;gap:10px;margin-top:30px;max-width:860px}
  .faq details{background:#fff;border:1px solid var(--line);border-radius:18px}
  .faq summary{list-style:none;cursor:pointer;padding:18px 22px;font-weight:800;display:flex;justify-content:space-between;gap:12px}
  .faq summary::-webkit-details-marker{display:none}
  .faq .a{padding:0 22px 18px;color:var(--sub)}

  /* кабінет */
  .dash-head{display:grid;gap:20px;align-items:end;padding-block:44px 10px}
  .progress{background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px 22px}
  .progress b{font:800 28px var(--display)}
  .progress .bar{width:100%;height:10px;margin-top:10px}
  .status{font:800 12px var(--text);letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-radius:999px;background:var(--bg);border:1px solid var(--line);justify-self:start}
  .status.done{background:#E2F5EA;color:#0B6A35;border-color:transparent}
  .status.go{background:#FFE4EE;color:#B0154F;border-color:transparent}

  /* урок */
  .lesson{padding-block:30px 60px}
  .crumbs{display:flex;gap:8px;align-items:center;font:700 14px var(--text);color:var(--sub);margin-bottom:16px}
  .crumbs a{text-decoration:none}
  .crumbs a:hover{color:var(--ink)}
  .lhead h1{font-size:clamp(28px,4.6vw,52px);font-weight:900;letter-spacing:-.04em;margin-bottom:8px}
  .video{margin-top:22px;border-radius:24px;overflow:hidden;background:#111;box-shadow:0 30px 70px -36px rgba(18,19,23,.6)}
  .video video{width:100%;aspect-ratio:16/9;background:#111}
  .meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
  .tabs{display:flex;gap:8px;margin-top:30px;overflow-x:auto;padding-bottom:4px}
  .tabs button{flex:none;font:800 15px var(--text);border:0;background:#fff;border:1.5px solid var(--line);border-radius:999px;padding:12px 18px;cursor:pointer;color:var(--sub)}
  .tabs button[aria-selected=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
  .panel{margin-top:18px;display:grid;gap:14px}
  .gblock{background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px 24px}
  .gblock h3{margin-bottom:12px}
  .gblock ul{list-style:none;display:grid;gap:9px}
  .gblock li{padding-left:24px;position:relative;color:#33363F}
  .gblock li::before{content:"";position:absolute;left:2px;top:10px;width:9px;height:9px;border-radius:50%;background:var(--grad)}
  .pr{background:var(--ink);color:#EDEEF1;border-radius:22px;padding:20px 22px;display:grid;gap:12px}
  .pr-h{display:flex;justify-content:space-between;align-items:center;gap:10px}
  .pr-h b{font:700 16px var(--display)}
  .pr p{font-size:15px;line-height:1.6;color:#D5D7DD}
  .copy{flex:none;font:800 13px var(--text);border:0;border-radius:999px;padding:9px 14px;background:#fff;color:var(--ink);cursor:pointer}
  .copy.ok{background:var(--ok);color:#fff}
  .taskbox{background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box;border:2px solid transparent;border-radius:24px;padding:24px;display:grid;gap:14px}
  .chk{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;background:var(--bg);cursor:pointer;font-weight:700}
  .chk input{width:22px;height:22px;accent-color:var(--pink);flex:none;margin-top:1px}
  .chk.on{background:#E9F7EF}
  .crit{background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px 24px}
  .crit li{list-style:none;display:flex;gap:10px;margin-top:8px;color:#33363F}
  .crit svg{color:var(--ok);flex:none;margin-top:3px}
  .finish-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:24px}
  .note{font-size:14px;color:var(--sub)}

  /* фініш */
  .fin{padding-block:60px}
  .fin-card{border-radius:34px;padding:40px 26px;background:var(--ink);color:#fff;position:relative;overflow:hidden;display:grid;gap:24px}
  .fin-card::before{content:"";position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:var(--grad);opacity:.85;filter:blur(10px)}
  .fin-card>*{position:relative}
  .fin-card h1{font-size:clamp(34px,5.6vw,64px);font-weight:900;letter-spacing:-.045em}
  .fin-card p{color:#C9CBD2;font-size:18px;max-width:620px}
  .made{display:grid;gap:12px}
  .made div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px 18px;display:flex;gap:12px;align-items:center;font-weight:700}
  .made svg{color:var(--amber)}
  .next{display:grid;gap:14px;margin-top:24px}
  .next div{background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px}
  .next b{font:900 34px var(--display);letter-spacing:-.04em}
  .next p{color:var(--sub);font-size:15px}
  .offer{margin-top:20px;border-radius:24px;padding:24px;background:var(--grad);color:#fff;display:grid;gap:14px}
  .offer h3{font-size:24px}
  .offer .btn{background:#fff;color:var(--ink);justify-self:start}

  .exg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:26px}
  .ex{position:relative;border-radius:20px;overflow:hidden;aspect-ratio:9/16;background:#111;max-width:100%}
  .ex video{width:100%;height:100%;object-fit:cover}
  .ex figcaption{position:absolute;left:0;right:0;bottom:0;padding:40px 12px 12px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff}
  .ex b{display:block;font:700 14px/1.2 var(--display)}
  .ex small{font-size:12px;opacity:.85}
  @media (min-width:760px){.exg{grid-template-columns:repeat(6,1fr)}}
  footer{padding-block:30px 40px;border-top:1px solid var(--line);font-size:14px;color:var(--sub)}
  footer .wrap{display:flex;flex-wrap:wrap;gap:10px 24px;justify-content:space-between}
  .toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;font-size:14px;z-index:60;box-shadow:0 14px 30px -12px rgba(0,0,0,.5)}

  @media (min-width:760px){
    .lcards{grid-template-columns:1fr 1fr}
    .inside{grid-template-columns:repeat(4,1fr)}
    .host{grid-template-columns:auto 1fr;padding:40px}
    .buy{grid-template-columns:1.1fr 1fr;align-items:center;padding:40px}
    .dash-head{grid-template-columns:1.4fr 1fr}
    .next{grid-template-columns:repeat(3,1fr)}
    .made{grid-template-columns:repeat(2,1fr)}
    .fin-card{padding:56px}
    .offer{grid-template-columns:1fr auto;align-items:center;padding:30px}
    .navprog{display:flex}
  }
  @media (min-width:1000px){
    .hero-grid{grid-template-columns:1fr 1.05fr}
    .lpanel{display:grid;grid-template-columns:1.25fr 1fr;gap:24px;align-items:start}
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="chk" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M4 12.5l5 5L20 6.5"/></symbol>
  <symbol id="arr" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="play" viewBox="0 0 24 24"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></symbol>
  <symbol id="plus" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M12 5v14M5 12h14"/></symbol>
</svg>

<header>
  <div class="wrap nav">
    <a class="logo" href="#home"><i>AI</i>AI Creator <small>Старт</small></a>
    <div class="navprog" id="navprog"><span id="navprogtxt">0 з 2 уроків</span><span class="bar"><i id="navbar" style="width:0"></i></span></div>
    <a class="btn btn-hot" id="navbtn" href="#buy">Купити за 499 грн</a>
  </div>
</header>

<main id="app"></main>

<footer><div class="wrap"><span>© 2026 AI Creator</span><span><a href="#">Договір оферти</a> · <a href="#">Політика конфіденційності</a></span></div></footer>

<script>
  // ====== Налаштування: міняти тут ======
  const CONFIG = {
    price: 499,
    oldPrice: 990,
    payUrl: '',                       // посилання на оплату (WayForPay, LiqPay, Monobank). Порожньо = показ форми коду
    accessCodes: ['START499'],        // коди доступу після оплати (демо; для продажу — перевірка на сервері)
    courseUrl: 'https://claude.ai/artifact/4fT84JQdjLSiZytL7oUESU',  // лендинг основного курсу
    host: __HOST__
  };
  const LESSONS = __LESSONS__;
  const EXAMPLES = __EXAMPLES__;
  const exGrid = () => `<div class="exg">${EXAMPLES.map(([f, t, m]) => `<figure class="ex"><video data-src="media/vivix/${f}.mp4" poster="media/vivix/${f}.jpg" muted loop playsinline></video><figcaption><b>${esc(t)}</b><small>${esc(m)}</small></figcaption></figure>`).join('')}</div>`;
  function liveVideos(){ const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), {rootMargin: '150px'}); document.querySelectorAll('video[data-src]').forEach(v => io.observe(v)); }

  // ====== Стан (лише в браузері учня) ======
  const store = {
    get(k, d){ try { const v = localStorage.getItem('aic.' + k); return v ? JSON.parse(v) : d; } catch(_) { return d; } },
    set(k, v){ try { localStorage.setItem('aic.' + k, JSON.stringify(v)); } catch(_) {} }
  };
  let state = store.get('state', {access:false, done:{}, checks:{}});
  const save = () => store.set('state', state);
  const doneCount = () => LESSONS.filter(l => state.done[l.id]).length;

  const $app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ic = id => `<svg class="ico"><use href="#${id}"/></svg>`;
  function toast(t){ const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

  function nav(){
    const n = doneCount();
    document.getElementById('navprogtxt').textContent = `${n} з ${LESSONS.length} уроків`;
    document.getElementById('navbar').style.width = (n / LESSONS.length * 100) + '%';
    document.getElementById('navprog').hidden = !state.access;
    const b = document.getElementById('navbtn');
    if (state.access) { b.textContent = n === LESSONS.length ? 'Основний курс' : 'Мої уроки'; b.href = n === LESSONS.length ? '#finish' : '#home'; }
    else { b.textContent = `Купити за ${CONFIG.price} грн`; b.href = '#buy'; }
  }

  // ====== Продаюча сторінка ======
  function sales(){
    const cards = LESSONS.map(l => `
      <article class="lcard"><img src="media/${l.id}.jpg" alt="Обкладинка уроку ${l.n}" loading="lazy">
        <div class="in"><span class="n">Урок ${l.n} · ~${l.duration} хв відео</span><h3>${esc(l.title)}</h3><p>${esc(l.subtitle)}</p>
        <div class="res">${ic('chk')}<span>Результат: ${esc(l.result)}</span></div>
        <div class="chips">${l.tools.map(t => `<span>${esc(t)}</span>`).join('')}</div></div></article>`).join('');
    $app.innerHTML = `
    <section class="hero"><div class="wrap hero-grid">
      <div>
        <span class="tag">Мінікурс · 2 уроки</span>
        <h1>Твої перші <span class="g">AI-роботи</span> за один вечір</h1>
        <p class="lead">Два практичні уроки з відео, конспектом і завданнями. Ти зробиш рекламні фото свого товару і перший AI-ролик для Reels. Без досвіду і безкоштовними нейромережами.</p>
        <div class="row"><a class="btn btn-hot" href="#buy">Отримати доступ ${ic('arr')}</a><a class="btn btn-ghost" href="#lessons">Що всередині</a></div>
        <div class="price-chip"><b>${CONFIG.price} грн</b><s>${CONFIG.oldPrice} грн</s><span>доступ назавжди</span></div>
      </div>
      <div class="player-mock"><img src="media/${LESSONS[0].id}.jpg" alt="Відеоурок з AI-ментором ${esc(CONFIG.host.name)}"><span class="pl">${ic('play')}</span>
        <div class="glass">${esc(CONFIG.host.name)}, ${esc(CONFIG.host.role)}<small>Відеоуроки з поясненнями і прикладами</small></div></div>
    </div></section>

    <section id="lessons" style="padding-top:0"><div class="wrap">
      <span class="tag">Програма</span><h2>2 уроки — 2 <span class="g">реальні роботи</span></h2>
      <p class="lead">Кожен урок закінчується готовою роботою, яку можна показати в портфоліо або клієнту.</p>
      <div class="lcards">${cards}</div>
    </div></section>

    <section style="padding-top:0"><div class="wrap">
      <span class="tag">Урок 2</span><h2>Такі ролики ти навчишся робити <span class="g">з одного фото</span></h2>
      <p class="lead">Усі приклади згенеровані нейромережею: без камери, студії і моделей.</p>
      ${exGrid()}
    </div></section>

    <section style="padding-top:0"><div class="wrap">
      <span class="tag">Формат</span><h2>Що в кожному <span class="g">уроці</span></h2>
      <div class="inside">
        <div class="ins"><div class="ic">${ic('play')}</div><h3>Відео з AI-ментором</h3><p>5–6 хвилин: пояснення, демонстрація наживо і готові приклади.</p></div>
        <div class="ins"><div class="ic"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h6M9 15h6"/></svg></div><h3>Конспект</h3><p>Усі кроки текстом, щоб повертатися під час роботи.</p></div>
        <div class="ins"><div class="ic"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg></div><h3>Готові промпти</h3><p>Шаблони, які копіюєш в один клік і підставляєш свій товар.</p></div>
        <div class="ins"><div class="ic">${ic('chk')}</div><h3>Завдання з чек-листом</h3><p>Критерії якості, щоб робота виглядала професійно.</p></div>
      </div>
    </div></section>

    <section style="padding-top:0"><div class="wrap"><div class="host">
      <img src="media/host.png" alt="AI-ментор ${esc(CONFIG.host.name)}">
      <div><span class="tag" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff">Хто веде</span>
      <h2>${esc(CONFIG.host.name)}, <span class="g">AI-ментор</span></h2>
      <p>Пояснює просто, показує на прикладах і дає формули, які працюють у будь-якій нейромережі. Цей мінікурс — перші 2 уроки з основного курсу AI Creator на 4 місяці.</p></div>
    </div></div></section>

    <section id="buy" style="padding-top:0"><div class="wrap"><div class="buy">
      <div><span class="tag">Доступ</span><h2>AI Creator: <span class="g">Старт</span></h2>
        <ul><li>${ic('chk')}2 відеоуроки з AI-ментором</li><li>${ic('chk')}Конспекти і 10 готових промптів</li><li>${ic('chk')}Завдання з чек-листами і критеріями</li><li>${ic('chk')}Доступ назавжди, з телефона і комп'ютера</li></ul></div>
      <div style="display:grid;gap:14px">
        <div><s style="color:var(--sub);font-weight:700">${CONFIG.oldPrice} грн</s><div class="big">${CONFIG.price} грн</div></div>
        <a class="btn btn-hot" id="paybtn" href="${esc(CONFIG.payUrl || '#buy')}" target="_blank" rel="noopener">Оплатити ${CONFIG.price} грн ${ic('arr')}</a>
        <form class="code" id="codeform" novalidate><input id="code" aria-label="Код доступу" placeholder="Код доступу після оплати" autocomplete="off"><button class="btn btn-dark" type="submit">Увійти</button></form>
        <p class="err" id="codeerr" hidden>Код не підходить. Перевір лист після оплати.</p>
        <p class="note">Після оплати код доступу надійде на пошту або в месенджер.</p>
      </div>
    </div></div></section>

    <section style="padding-top:0"><div class="wrap">
      <span class="tag">Питання</span><h2>Перед покупкою</h2>
      <div class="faq">
        <details><summary>Потрібен досвід?${ic('plus')}</summary><div class="a">Ні. Уроки розраховані на тих, хто ніколи не працював з нейромережами.</div></details>
        <details><summary>Які сервіси потрібні і скільки вони коштують?${ic('plus')}</summary><div class="a">Gemini, Canva, Kling або Veo, Suno і CapCut. У всіх є безкоштовні тарифи, яких вистачає на завдання уроків.</div></details>
        <details><summary>Скільки часу займе?${ic('plus')}</summary><div class="a">Близько 10 хвилин відео і 1–2 години практики на обидва уроки. Можна пройти за один вечір.</div></details>
        <details><summary>Що далі після мінікурсу?${ic('plus')}</summary><div class="a">Якщо сподобається, приходь на основний курс AI Creator: 4 місяці, 32 заняття, 70+ робіт у портфоліо, реальні замовлення від брендів.</div></details>
      </div>
    </div></section>`;
    const f = document.getElementById('codeform');
    f.addEventListener('submit', ev => {
      ev.preventDefault();
      const c = document.getElementById('code').value.trim().toUpperCase();
      if (CONFIG.accessCodes.includes(c)) { state.access = true; save(); toast('Доступ відкрито'); location.hash = '#home'; route(); }
      else document.getElementById('codeerr').hidden = false;
    });
    liveVideos();
    if (!CONFIG.payUrl) document.getElementById('paybtn').addEventListener('click', ev => { ev.preventDefault(); document.getElementById('code').focus(); toast('Посилання на оплату ще не підключене'); });
  }

  // ====== Кабінет ======
  function dash(){
    const n = doneCount();
    const cards = LESSONS.map((l, i) => {
      const done = state.done[l.id], open = i === 0 || state.done[LESSONS[i-1].id] || done;
      return `<article class="lcard"><img src="media/${l.id}.jpg" alt="Обкладинка уроку ${l.n}">
        <div class="in"><span class="status ${done ? 'done' : 'go'}">${done ? 'Виконано' : open ? 'Доступний' : 'Після уроку 1'}</span>
        <h3>Урок ${l.n}. ${esc(l.title)}</h3><p>${esc(l.subtitle)}</p>
        <div class="res">${ic('chk')}<span>${esc(l.result)}</span></div>
        <a class="btn ${done ? 'btn-ghost' : 'btn-hot'}" href="#${l.id}">${done ? 'Переглянути ще раз' : 'Почати урок'} ${ic('arr')}</a></div></article>`;
    }).join('');
    $app.innerHTML = `<div class="wrap">
      <div class="dash-head"><div><span class="tag">Мій кабінет</span><h2>Привіт! Почнемо з <span class="g">першої роботи</span></h2><p class="lead">Дивись відео, повторюй кроки з конспекту і виконуй завдання. Порядок важливий: у другому уроці ти оживиш фото з першого.</p></div>
      <div class="progress"><span class="note">Прогрес</span><div><b>${n} / ${LESSONS.length}</b> уроків</div><div class="bar"><i style="width:${n / LESSONS.length * 100}%"></i></div></div></div>
      <div class="lcards" style="margin-bottom:60px">${cards}</div>
      ${n === LESSONS.length ? `<div class="offer" style="margin-bottom:60px"><div><h3>Ти пройшов мінікурс!</h3><p>Подивись, що буде далі.</p></div><a class="btn" href="#finish">Далі ${ic('arr')}</a></div>` : ''}
    </div>`;
  }

  // ====== Урок ======
  function lesson(l){
    const i = LESSONS.indexOf(l), next = LESSONS[i + 1];
    const checks = state.checks[l.id] || {};
    const guide = l.guide.map(([h, items]) => `<div class="gblock"><h3>${esc(h)}</h3><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
    const prompts = l.prompts.map(([h, p], k) => `<div class="pr"><div class="pr-h"><b>${esc(h)}</b><button class="copy" data-k="${k}" type="button">Копіювати</button></div><p>${esc(p)}</p></div>`).join('');
    const steps = l.task.steps.map((s, k) => `<label class="chk ${checks[k] ? 'on' : ''}"><input type="checkbox" data-k="${k}" ${checks[k] ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('');
    $app.innerHTML = `<div class="wrap lesson">
      <nav class="crumbs"><a href="#home">Мої уроки</a><span>/</span><span>Урок ${l.n}</span></nav>
      <div class="lhead"><span class="tag">Урок ${l.n} з ${LESSONS.length}</span><h1>${esc(l.title)}</h1><p class="lead">${esc(l.subtitle)}</p></div>
      <div class="video"><video id="vid" controls playsinline preload="metadata" poster="media/${l.id}.jpg"><source src="media/${l.id}.mp4" type="video/mp4"><track kind="captions" src="media/${l.id}.vtt" srclang="uk" label="Українська"></video></div>
      <div class="meta"><span class="chips">${l.tools.map(t => `<span>${esc(t)}</span>`).join('')}</span></div>
      <div class="res" style="margin-top:14px">${ic('chk')}<span>Результат уроку: ${esc(l.result)}</span></div>
      ${l.id === 'lesson-2' ? `<div style="margin-top:30px"><h3>Приклади: такі ролики роблять за формулою руху</h3>${exGrid()}</div>` : ''}
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="true" data-t="guide">Конспект</button>
        <button role="tab" aria-selected="false" data-t="prompts">Промпти</button>
        <button role="tab" aria-selected="false" data-t="task">Завдання</button>
      </div>
      <div class="panel" data-p="guide">${guide}</div>
      <div class="panel" data-p="prompts" hidden>${prompts}<p class="note">Підстав у шаблон свій товар і сцену. Змінюй одну частину формули за раз.</p></div>
      <div class="panel" data-p="task" hidden><div class="lpanel">
        <div class="taskbox"><h3>${esc(l.task.goal)}</h3>${steps}</div>
        <div class="crit"><h3>Критерії якості</h3><ul>${l.task.criteria.map(c => `<li>${ic('chk')}<span>${esc(c)}</span></li>`).join('')}</ul>
        <p class="note" style="margin-top:14px">Збережи роботи в окрему папку «Портфоліо». На основному курсі куратор розбирає кожну.</p></div>
      </div></div>
      <div class="finish-row">
        <button class="btn ${state.done[l.id] ? 'btn-ghost' : 'btn-hot'}" id="donebtn" type="button">${state.done[l.id] ? 'Урок виконано ✓' : 'Завершити урок'}</button>
        ${next ? `<a class="btn btn-ghost" href="#${next.id}">Урок ${next.n} ${ic('arr')}</a>` : `<a class="btn btn-ghost" href="#finish">Що далі ${ic('arr')}</a>`}
        <span class="note" id="donehint">${Object.values(checks).filter(Boolean).length} з ${l.task.steps.length} кроків завдання виконано</span>
      </div>
    </div>`;
    liveVideos();
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
      document.querySelectorAll('.panel').forEach(p => p.hidden = p.dataset.p !== b.dataset.t);
    }));
    document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', () => {
      const t = l.prompts[+b.dataset.k][1];
      const ok = () => { b.textContent = 'Скопійовано'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'Копіювати'; b.classList.remove('ok'); }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, () => { const r = document.createRange(); r.selectNodeContents(b.closest('.pr').querySelector('p')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Текст виділено, скопіюй вручну'); });
    }));
    document.querySelectorAll('.chk input').forEach(c => c.addEventListener('change', () => {
      state.checks[l.id] = state.checks[l.id] || {}; state.checks[l.id][c.dataset.k] = c.checked; save();
      c.closest('.chk').classList.toggle('on', c.checked);
      document.getElementById('donehint').textContent = `${Object.values(state.checks[l.id]).filter(Boolean).length} з ${l.task.steps.length} кроків завдання виконано`;
    }));
    document.getElementById('donebtn').addEventListener('click', () => {
      state.done[l.id] = true; save(); nav(); toast(`Урок ${l.n} виконано!`);
      location.hash = next ? '#home' : '#finish';
    });
  }

  // ====== Фініш ======
  function finish(){
    $app.innerHTML = `<div class="wrap fin">
      <div class="fin-card">
        <span class="tag" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff;justify-self:start">Мінікурс пройдено</span>
        <h1>Ти вже <span class="g">AI Creator</span></h1>
        <p>За один вечір ти зробив те, за що бізнес платить фотографам і відеографам. Це перші роботи у твоєму портфоліо.</p>
        <div class="made"><div>${ic('chk')}3 рекламні фото товару</div><div>${ic('chk')}Банер для Instagram</div><div>${ic('chk')}Рекламний AI-ролик для Reels</div><div>${ic('chk')}Формули промптів для фото і відео</div></div>
      </div>
      <h2 style="margin-top:56px">Це <span class="g">крапля в морі</span></h2>
      <p class="lead">На основному курсі AI Creator за 4 місяці ти пройдеш шлях від перших робіт до клієнтів.</p>
      <div class="next">
        <div><b class="g">70+</b><p>робіт у портфоліо: фото, ролики, AI-аватари, мультфільми, реклама</p></div>
        <div><b class="g">32</b><p>живих заняття з ментором-практиком і перевіркою кожного завдання</p></div>
        <div><b class="g">Брифи</b><p>реальні замовлення від брендів, Demo Day і перші клієнти на Upwork</p></div>
      </div>
      <div class="offer"><div><h3>Вартість мінікурсу зараховуємо в оплату основного курсу</h3><p>Залиш заявку, і менеджер розповість про старт найближчого потоку.</p></div>
        <a class="btn" href="${esc(CONFIG.courseUrl)}" target="_blank" rel="noopener">Дізнатися про курс ${ic('arr')}</a></div>
    </div>`;
  }

  // ====== Маршрути ======
  function route(){
    nav();
    const h = location.hash.replace('#', '');
    const l = LESSONS.find(x => x.id === h);
    if (h === 'demo') { state.access = true; save(); history.replaceState(null, '', '#home'); nav(); }  // демо-доступ для перегляду команди
    if (!state.access) { sales(); if (h === 'buy' || h === 'lessons') document.getElementById(h)?.scrollIntoView(); else scrollTo(0, 0); return; }
    if (l) lesson(l); else if (h === 'finish') finish(); else dash();
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();
</script>
</body>
</html>
"""

html = TEMPLATE.replace("__EXAMPLES__", json.dumps(EXAMPLES, ensure_ascii=False)).replace("__LESSONS__", json.dumps(data, ensure_ascii=False)).replace("__HOST__", json.dumps(HOST, ensure_ascii=False))
(HERE / "app" / "index.html").write_text(html)
print("ok", len(html))
