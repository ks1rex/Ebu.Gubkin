// Direction 2 — Deep gradient + glassmorphism. window.DIR_GLASS = {css, html}.
window.DIR_GLASS = (function () {
  const css = `
.t-glass{--ink:#f4f1ff;--dim:#bcb4e0;--mint:#5eead4;--lav:#c4b5fd;--pink:#f5a3e8;--gold:#ffd27a;
  font-family:'Sora',sans-serif;color:var(--ink);position:relative;overflow:hidden;
  background:
   radial-gradient(120% 120% at 8% 0%, #3a1d77 0%, transparent 45%),
   radial-gradient(120% 120% at 100% 10%, #7a1d8f 0%, transparent 50%),
   radial-gradient(140% 120% at 50% 110%, #1d2a8f 0%, transparent 55%),
   linear-gradient(160deg,#1a1140 0%, #241551 50%, #2a0f4a 100%);}
.t-glass *{box-sizing:border-box;}
.t-glass .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.55;pointer-events:none;}
.t-glass .orb.a{width:420px;height:420px;background:#7c3aed;top:-120px;left:-80px;}
.t-glass .orb.b{width:380px;height:380px;background:#db2777;top:40px;right:-120px;opacity:.4;}
.t-glass .orb.c{width:460px;height:460px;background:#0ea5e9;bottom:-200px;left:38%;opacity:.32;}
.t-glass .wrap{position:relative;z-index:1;}
.t-glass .glass{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 18px 50px rgba(20,8,50,.45),inset 0 1px 0 rgba(255,255,255,.18);}

/* header */
.t-glass header{display:flex;align-items:center;gap:24px;margin:22px 26px;padding:14px 22px;border-radius:20px;}
.t-glass .brand{display:flex;align-items:center;gap:12px;}
.t-glass .brand img{width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(0,0,0,.4));}
.t-glass .wordmark{font-weight:700;font-size:21px;letter-spacing:-.5px;line-height:1;}
.t-glass .wordmark b{background:linear-gradient(90deg,var(--mint),var(--lav));-webkit-background-clip:text;background-clip:text;color:transparent;}
.t-glass .wordmark span{display:block;font-size:10px;letter-spacing:2px;color:var(--dim);font-weight:400;margin-top:4px;}
.t-glass nav{display:flex;gap:4px;margin-left:6px;}
.t-glass nav a{font-size:14.5px;font-weight:500;color:var(--dim);text-decoration:none;padding:10px 16px;border-radius:12px;transition:.16s;}
.t-glass nav a.on{color:var(--ink);background:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.2);font-weight:600;}
.t-glass nav a:not(.on):hover{color:var(--ink);background:rgba(255,255,255,.06);}
.t-glass .spacer{flex:1;}
.t-glass .search{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  border-radius:14px;padding:11px 15px;color:var(--dim);font-size:13.5px;width:210px;}
.t-glass .wallet{display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:14px;font-weight:600;font-size:14px;
  color:#08221c;background:linear-gradient(135deg,var(--mint),#a7f3d0);box-shadow:0 6px 18px rgba(94,234,212,.3);}
.t-glass .avatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;font-weight:700;font-size:15px;
  color:#fff;background:linear-gradient(135deg,#a78bfa,#f472b6);box-shadow:0 6px 16px rgba(167,139,250,.4);}

/* hero */
.t-glass .hero{margin:6px 26px 22px;padding:34px 34px;border-radius:26px;display:flex;align-items:center;justify-content:space-between;gap:30px;}
.t-glass .hero .eyebrow{font-size:13px;letter-spacing:1px;color:var(--lav);font-weight:600;text-transform:uppercase;}
.t-glass .hero h1{font-size:40px;line-height:1.05;letter-spacing:-1.3px;margin:12px 0 0;font-weight:700;}
.t-glass .hero h1 em{font-style:normal;background:linear-gradient(90deg,var(--mint),var(--pink));-webkit-background-clip:text;background-clip:text;color:transparent;}
.t-glass .hstats{display:flex;gap:30px;margin-top:20px;}
.t-glass .hstats b{display:block;font-size:26px;font-weight:700;}
.t-glass .hstats span{font-size:12px;color:var(--dim);}
.t-glass .cta{display:inline-flex;align-items:center;gap:9px;font-weight:600;font-size:15px;font-family:'Sora';color:#1a1140;
  background:linear-gradient(135deg,#fff,#e9e4ff);border:none;padding:16px 26px;border-radius:16px;cursor:pointer;
  box-shadow:0 10px 30px rgba(0,0,0,.3);white-space:nowrap;}

/* layout */
.t-glass .cols{display:grid;grid-template-columns:1fr 332px;gap:20px;padding:0 26px 40px;}
.t-glass .sectlabel{font-size:13px;letter-spacing:1px;color:var(--dim);text-transform:uppercase;font-weight:600;margin:8px 2px 14px;}

/* categories */
.t-glass .cats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px;}
.t-glass .cat{border-radius:18px;padding:18px;transition:.18s;cursor:pointer;}
.t-glass .cat:hover{transform:translateY(-3px);background:rgba(255,255,255,.1);}
.t-glass .cat .ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-size:19px;margin-bottom:12px;
  background:rgba(255,255,255,.1);}
.t-glass .cat h4{margin:0;font-size:15.5px;font-weight:600;}
.t-glass .cat p{margin:4px 0 0;font-size:12.5px;color:var(--dim);}

/* threads */
.t-glass .thread{display:flex;gap:15px;align-items:center;border-radius:18px;padding:16px 18px;margin-bottom:12px;transition:.16s;cursor:pointer;}
.t-glass .thread:hover{transform:translateX(3px);background:rgba(255,255,255,.1);}
.t-glass .tav{width:44px;height:44px;border-radius:14px;flex-shrink:0;display:grid;place-items:center;font-weight:700;font-size:15px;color:#fff;}
.t-glass .tbody{flex:1;min-width:0;}
.t-glass .ttitle{font-size:15.5px;font-weight:600;line-height:1.3;margin:0;}
.t-glass .tmeta{display:flex;align-items:center;gap:10px;margin-top:7px;font-size:12.5px;color:var(--dim);}
.t-glass .tag{font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;}
.t-glass .tstat{text-align:center;flex-shrink:0;min-width:52px;}
.t-glass .tstat b{display:block;font-size:18px;font-weight:700;}
.t-glass .tstat span{font-size:10.5px;color:var(--dim);}

/* sidebar */
.t-glass .side{display:flex;flex-direction:column;gap:18px;}
.t-glass .panel{border-radius:20px;padding:20px;}
.t-glass .panel h3{margin:0 0 14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;}
.t-glass .lb{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);}
.t-glass .lb:last-child{border-bottom:none;}
.t-glass .rank{font-size:14px;font-weight:700;color:var(--gold);width:18px;}
.t-glass .lbav{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-weight:700;font-size:12px;color:#fff;}
.t-glass .lbname{flex:1;font-size:13.5px;font-weight:500;}
.t-glass .lbtok{font-size:13px;font-weight:600;color:var(--mint);}
.t-glass .tags{display:flex;flex-wrap:wrap;gap:8px;}
.t-glass .ttag{font-size:12.5px;color:var(--lav);background:rgba(255,255,255,.08);padding:6px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.1);}
.t-glass .gost{border-radius:20px;padding:20px;background:linear-gradient(150deg,rgba(94,234,212,.18),rgba(244,114,182,.16));
  border:1px solid rgba(255,255,255,.18);}
.t-glass .gost h3{font-size:18px;font-weight:700;margin:0 0 7px;letter-spacing:-.3px;}
.t-glass .gost p{margin:0 0 16px;font-size:13px;color:var(--dim);line-height:1.55;}
.t-glass .gost button{width:100%;font-family:'Sora';font-weight:600;font-size:14px;color:#08221c;border:none;padding:13px;border-radius:13px;cursor:pointer;
  background:linear-gradient(135deg,var(--mint),#a7f3d0);box-shadow:0 8px 20px rgba(94,234,212,.3);}
.t-glass .online{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--dim);}
.t-glass .dot{width:9px;height:9px;border-radius:50%;background:var(--mint);box-shadow:0 0 12px var(--mint);}
`;

  const av = (txt, grad, cls) => `<div class="${cls}" style="background:${grad}">${txt}</div>`;

  const cats = [
    ['🎓','Учёба и сессия','4.2к тем'],
    ['🛢','Нефтегаз и спецы','1.8к тем'],
    ['💼','Стажировки','920 тем'],
    ['🏠','Общага и быт','1.3к тем'],
    ['🎧','Движ и события','640 тем'],
    ['🛒','Барахолка','2.1к тем'],
  ].map(([i,t,c])=>`<div class="cat glass"><div class="ic">${i}</div><h4>${t}</h4><p>${c}</p></div>`).join('');

  const threads = [
    ['АК','Кто шарит за термех? Горит коллок в пятницу 😭','Учёба','#a78bfa','#ede9ff','Аня К.','5 мин','24','312','linear-gradient(135deg,#a78bfa,#7c3aed)'],
    ['ТР','Стажировка в «Газпром нефть» — реально пройти отбор?','Карьера','#5eead4','#062b25','Тимур Р.','18 мин','56','1.2к','linear-gradient(135deg,#34d399,#0ea5e9)'],
    ['ЛМ','ГОСТ-калькулятор оформил курсач за ночь 🔥','Софт','#f5a3e8','#3a0e34','Лиза М.','32 мин','18','540','linear-gradient(135deg,#f472b6,#a78bfa)'],
    ['МВ','Ищу соседа в общагу на Ленинском, 2 корпус','Быт','#ffd27a','#3a2a06','Макс В.','1 ч','12','201','linear-gradient(135deg,#fbbf24,#f472b6)'],
    ['ББ','Продам чертёжку + готовальню, почти даром','Барахолка','#7dd3fc','#072036','barrel_boy','2 ч','7','98','linear-gradient(135deg,#38bdf8,#6366f1)'],
  ].map(([ini,title,tag,col,tcol,name,time,rep,views,grad])=>`
    <div class="thread glass">
      ${av(ini,grad,'tav')}
      <div class="tbody"><p class="ttitle">${title}</p>
        <div class="tmeta"><span class="tag" style="color:${tcol};background:${col}">#${tag}</span>
        <span>${name}</span><span>·</span><span>${time} назад</span></div></div>
      <div class="tstat"><b>${rep}</b><span>ответов</span></div>
      <div class="tstat"><b style="color:var(--mint)">${views}</b><span>просм.</span></div>
    </div>`).join('');

  const lb = [
    ['1','АК','Аня К.','8 920','linear-gradient(135deg,#a78bfa,#7c3aed)'],
    ['2','ТР','Тимур Р.','7 450','linear-gradient(135deg,#34d399,#0ea5e9)'],
    ['3','ЛМ','Лиза М.','6 210','linear-gradient(135deg,#f472b6,#a78bfa)'],
    ['4','КО','Катя О.','5 880','linear-gradient(135deg,#fbbf24,#f472b6)'],
  ].map(([r,ini,name,tok,grad])=>`<div class="lb"><span class="rank">${r}</span>${av(ini,grad,'lbav')}
      <span class="lbname">${name}</span><span class="lbtok">${tok} ₽</span></div>`).join('');

  const tags = ['термех','сессия2026','газпромнефть','общага','курсач','стипуха'].map(t=>`<span class="ttag">#${t}</span>`).join('');

  const html = `
<div class="t-glass">
  <div class="orb a"></div><div class="orb b"></div><div class="orb c"></div>
  <div class="wrap">
    <header class="glass">
      <div class="brand">
        <img src="assets/logo-mark.png" alt="Ebu.Gubkin">
        <div class="wordmark">Ebu<b>.Gubkin</b><span>для студентов</span></div>
      </div>
      <nav><a class="on" href="#">Форум</a><a href="#">Биржа</a><a href="#">ГОСТ-калькулятор</a><a href="#">Кошелёк</a></nav>
      <div class="spacer"></div>
      <div class="search">⌕&nbsp; поиск по форуму…</div>
      <div class="wallet">1 240 ₽</div>
      <div class="avatar">Я</div>
    </header>

    <div class="hero glass">
      <div>
        <div class="eyebrow">Форум · общая лента</div>
        <h1>Привет, <em>нефтегаз</em>.<br>Что обсуждаем сегодня?</h1>
        <div class="hstats">
          <div><b>4 812</b><span>студентов</span></div>
          <div><b>18 240</b><span>тем</span></div>
          <div><b style="color:var(--mint)">312</b><span>онлайн</span></div>
        </div>
      </div>
      <button class="cta">＋ Создать тему</button>
    </div>

    <div class="cols">
      <div class="main">
        <div class="sectlabel">Категории</div>
        <div class="cats">${cats}</div>
        <div class="sectlabel">Свежие темы</div>
        ${threads}
      </div>
      <div class="side">
        <div class="panel glass"><h3>🏆 Топ за неделю</h3>${lb}</div>
        <div class="gost"><h3>ГОСТ-калькулятор</h3>
          <p>Оформи реферат и курсач по ГОСТ за пару минут. Списывай токены — не нервы.</p>
          <button>Открыть калькулятор →</button></div>
        <div class="panel glass"><h3># В тренде</h3><div class="tags">${tags}</div></div>
        <div class="panel glass"><div class="online"><span class="dot"></span><b style="color:var(--ink)">312 студентов</b>&nbsp;сейчас онлайн</div></div>
      </div>
    </div>
  </div>
</div>`;

  return { css, html };
})();
