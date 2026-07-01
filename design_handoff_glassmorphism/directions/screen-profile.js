// Screen 3 — User profile page. window.SCR_PROFILE = { css, html }. Uses GLASS kit.
window.SCR_PROFILE = (function () {
  const css = `
.t-glass .pf-hero{margin:0 26px 18px;border-radius:26px;overflow:hidden;}
.t-glass .pf-cover{height:140px;background:linear-gradient(120deg,#7c3aed,#db2777 55%,#0ea5e9);position:relative;}
.t-glass .pf-cover::after{content:'';position:absolute;inset:0;background:radial-gradient(120% 160% at 80% -20%,rgba(255,255,255,.25),transparent 60%);}
.t-glass .pf-body{padding:0 30px 26px;display:flex;gap:22px;align-items:flex-end;margin-top:-48px;position:relative;}
.t-glass .pf-av{width:104px;height:104px;border-radius:28px;display:grid;place-items:center;font-size:38px;font-weight:700;color:#fff;
  background:linear-gradient(135deg,#a78bfa,#f472b6);border:4px solid rgba(36,21,81,.6);box-shadow:0 14px 36px rgba(0,0,0,.4);flex-shrink:0;}
.t-glass .pf-id{flex:1;padding-bottom:6px;}
.t-glass .pf-id h1{font-size:26px;font-weight:700;letter-spacing:-.5px;margin:0;display:flex;align-items:center;gap:10px;}
.t-glass .pf-verify{font-size:12px;font-weight:600;color:#08221c;background:var(--mint);padding:3px 10px;border-radius:8px;}
.t-glass .pf-handle{font-size:14px;color:var(--dim);margin-top:4px;}
.t-glass .pf-bio{font-size:14px;color:#e6e1f7;line-height:1.5;margin-top:10px;max-width:520px;}
.t-glass .pf-actions{display:flex;gap:10px;padding-bottom:6px;}

.t-glass .pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:0 26px 18px;}
.t-glass .pf-stat{border-radius:18px;padding:18px 20px;}
.t-glass .pf-stat b{display:block;font-size:26px;font-weight:700;letter-spacing:-.5px;}
.t-glass .pf-stat span{font-size:12.5px;color:var(--dim);}

.t-glass .pf-cols{display:grid;grid-template-columns:1fr 300px;gap:20px;padding:0 26px 40px;}
.t-glass .tabs{display:flex;gap:4px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:5px;margin-bottom:16px;}
.t-glass .tabs button{flex:1;font-family:'Sora';font-weight:600;font-size:14px;color:var(--dim);background:none;border:none;padding:10px;border-radius:10px;cursor:pointer;}
.t-glass .tabs button.on{color:var(--ink);background:rgba(255,255,255,.12);}

.t-glass .feed{border-radius:20px;padding:8px 8px;}
.t-glass .act{display:flex;gap:14px;padding:15px 16px;border-radius:14px;}
.t-glass .act+.act{border-top:1px solid rgba(255,255,255,.08);}
.t-glass .act .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:17px;flex-shrink:0;background:rgba(255,255,255,.08);}
.t-glass .act .txt{flex:1;font-size:14px;line-height:1.45;}
.t-glass .act .txt b{font-weight:600;}
.t-glass .act .txt .sub{color:var(--dim);font-size:12.5px;margin-top:3px;}
.t-glass .act .tm{font-size:12px;color:var(--dim);white-space:nowrap;}
.t-glass .act .amt{font-weight:700;color:var(--mint);font-size:14px;white-space:nowrap;}

.t-glass .reviews{margin-top:18px;}
.t-glass .rev{border-radius:16px;padding:16px 18px;margin-bottom:12px;}
.t-glass .rev-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.t-glass .rev-top .av-g{width:34px;height:34px;border-radius:10px;font-size:12px;}
.t-glass .rev-top .nm{font-weight:600;font-size:13.5px;}
.t-glass .rev-top .stars{margin-left:auto;}
.t-glass .rev p{margin:0;font-size:13.5px;color:#e6e1f7;line-height:1.5;}

.t-glass .side{display:flex;flex-direction:column;gap:16px;}
.t-glass .panel{border-radius:20px;padding:20px;}
.t-glass .panel h3{margin:0 0 14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;}
.t-glass .level{text-align:center;}
.t-glass .level .ring{width:96px;height:96px;border-radius:50%;margin:0 auto 12px;display:grid;place-items:center;
  background:conic-gradient(var(--mint) 0 78%, rgba(255,255,255,.1) 78% 100%);}
.t-glass .level .ring i{width:78px;height:78px;border-radius:50%;background:#241551;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:22px;}
.t-glass .level .lv{font-weight:600;font-size:15px;}
.t-glass .level .nx{font-size:12px;color:var(--dim);margin-top:4px;}
.t-glass .badges{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.t-glass .badge2{aspect-ratio:1;border-radius:14px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);}
.t-glass .skills{display:flex;flex-wrap:wrap;gap:8px;}
.t-glass .skill{font-size:12.5px;color:var(--lav);background:rgba(255,255,255,.08);padding:6px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.1);}
`;

  const av = (t, grad) => `<div class="av-g" style="background:${grad}">${t}</div>`;
  const stars = (n=5) => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;
  const G = {
    a:'linear-gradient(135deg,#a78bfa,#7c3aed)', t:'linear-gradient(135deg,#34d399,#0ea5e9)',
    l:'linear-gradient(135deg,#f472b6,#a78bfa)', m:'linear-gradient(135deg,#fbbf24,#f472b6)'
  };

  const acts = [
    ['💬','Ответила в теме <b>«Кто шарит за термех?»</b>','Учёба и сессия','2 ч','','+12 ₽'],
    ['✅','Выполнила заказ <b>«Презентация к защите»</b>','Биржа · сделка закрыта','1 д','','+1 500 ₽'],
    ['🔥','Создала тему <b>«Гайд по оформлению ВКР 2026»</b>','Учёба и сессия · 89 ответов','2 д','',''],
    ['⭐','Получила отзыв 5★ от <b>Макс В.</b>','Биржа','3 д','',''],
  ].map(([ic,txt,sub,tm,_,amt])=>`
    <div class="act">
      <div class="ic">${ic}</div>
      <div class="txt"><div>${txt}</div><div class="sub">${sub}</div></div>
      ${amt?`<div class="amt">${amt}</div>`:`<div class="tm">${tm}</div>`}
    </div>`).join('');

  const reviews = [
    ['МВ',G.m,'Макс В.',5,'Сделала логотип быстрее срока, плюс накидала пару бонусных вариантов. Топ! 🔥'],
    ['КО',G.l,'Катя О.',5,'Очень выручила с презентацией, оформлено идеально по требованиям кафедры.'],
  ].map(([ini,grad,name,rate,text])=>`
    <div class="rev glass">
      <div class="rev-top">${av(ini,grad)}<span class="nm">${name}</span>${stars(rate)}</div>
      <p>${text}</p>
    </div>`).join('');

  const skills = ['Графдизайн','Figma','Презентации','Брендинг','Иллюстрация','Вёрстка']
    .map(s=>`<span class="skill">${s}</span>`).join('');

  const html = `
<div class="t-glass">
  ${GLASS.orbs}
  <div class="wrap">
    ${GLASS.header('')}
    <div class="page" style="padding-bottom:0">
      <div class="pf-hero glass">
        <div class="pf-cover"></div>
        <div class="pf-body">
          <div class="pf-av">АК</div>
          <div class="pf-id">
            <h1>Аня Котова <span class="pf-verify">✓ студент</span></h1>
            <div class="pf-handle">@anya_k · РГУ нефти и газа · 3 курс, РГФ</div>
            <div class="pf-bio">Дизайнер-самоучка, делаю презентации и айдентику для студпроектов. Шарю за термех и оформление по ГОСТ 😌</div>
          </div>
          <div class="pf-actions">
            <button class="btn ghost">✉ Написать</button>
            <button class="btn pri">＋ Подписаться</button>
          </div>
        </div>
      </div>
    </div>

    <div class="pf-stats">
      <div class="pf-stat glass"><b>8 920</b><span>репутация</span></div>
      <div class="pf-stat glass"><b>142</b><span>темы на форуме</span></div>
      <div class="pf-stat glass"><b style="color:var(--mint)">47</b><span>сделок на бирже</span></div>
      <div class="pf-stat glass"><b style="color:var(--gold)">4.9 ★</b><span>средний рейтинг</span></div>
    </div>

    <div class="pf-cols">
      <div class="main">
        <div class="tabs"><button class="on">Активность</button><button>Темы</button><button>Услуги</button><button>Отзывы</button></div>
        <div class="feed glass">${acts}</div>
        <div class="reviews">
          <div class="sectlabel">Отзывы с биржи</div>
          ${reviews}
        </div>
      </div>
      <div class="side">
        <div class="panel glass level">
          <div class="ring"><i>7</i></div>
          <div class="lv">Уровень 7 · Знаток</div>
          <div class="nx">До 8 уровня — 1 080 очков репутации</div>
        </div>
        <div class="panel glass">
          <h3>🏅 Достижения</h3>
          <div class="badges">
            <div class="badge2" title="100 ответов">💬</div>
            <div class="badge2" title="Топ-дизайнер">🎨</div>
            <div class="badge2" title="50 сделок">🤝</div>
            <div class="badge2" title="Огонь недели">🔥</div>
            <div class="badge2" title="Ментор">🎓</div>
            <div class="badge2" title="Ранняя пташка">🌅</div>
          </div>
        </div>
        <div class="panel glass">
          <h3># Навыки</h3>
          <div class="skills">${skills}</div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  return { css, html };
})();
