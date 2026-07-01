// Screen 2 — Биржа (marketplace) home. window.SCR_MARKET = { css, html }. Uses GLASS kit.
window.SCR_MARKET = (function () {
  const css = `
.t-glass .mk-hero{margin:0 26px 18px;padding:30px 32px;border-radius:26px;display:flex;align-items:center;justify-content:space-between;gap:26px;}
.t-glass .mk-hero .eyebrow{font-size:13px;letter-spacing:1px;color:var(--lav);font-weight:600;text-transform:uppercase;}
.t-glass .mk-hero h1{font-size:34px;line-height:1.06;letter-spacing:-1px;margin:10px 0 0;font-weight:700;}
.t-glass .mk-hero h1 em{font-style:normal;background:linear-gradient(90deg,var(--mint),var(--pink));-webkit-background-clip:text;background-clip:text;color:transparent;}
.t-glass .mk-hero p{margin:10px 0 0;font-size:14px;color:var(--dim);max-width:440px;line-height:1.5;}
.t-glass .mk-herostats{display:flex;gap:26px;margin-top:18px;}
.t-glass .mk-herostats b{display:block;font-size:24px;font-weight:700;}
.t-glass .mk-herostats span{font-size:12px;color:var(--dim);}

.t-glass .mk-bar{display:flex;align-items:center;gap:12px;margin:0 26px 18px;}
.t-glass .seg{display:flex;gap:4px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:4px;}
.t-glass .seg button{font-family:'Sora';font-weight:600;font-size:14px;color:var(--dim);background:none;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;}
.t-glass .seg button.on{color:#1a1140;background:linear-gradient(135deg,var(--lav),#ddd6fe);}
.t-glass .mk-chips{display:flex;gap:9px;flex-wrap:wrap;flex:1;}

.t-glass .mk-cols{display:grid;grid-template-columns:1fr 300px;gap:20px;padding:0 26px 40px;}
.t-glass .mk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
.t-glass .ord{border-radius:20px;padding:20px;display:flex;flex-direction:column;transition:.16s;cursor:pointer;}
.t-glass .ord:hover{transform:translateY(-3px);background:rgba(255,255,255,.1);}
.t-glass .ord-top{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.t-glass .ord-cat{font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:8px;}
.t-glass .ord-new{margin-left:auto;font-size:11px;font-weight:600;color:var(--mint);}
.t-glass .ord h4{margin:0 0 8px;font-size:16px;font-weight:600;line-height:1.3;}
.t-glass .ord p{margin:0 0 16px;font-size:13px;color:var(--dim);line-height:1.5;flex:1;}
.t-glass .ord-meta{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
.t-glass .ord-meta .m{font-size:12px;color:var(--dim);background:rgba(255,255,255,.06);padding:5px 10px;border-radius:8px;}
.t-glass .ord-foot{display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);}
.t-glass .ord-foot .av-g{width:30px;height:30px;border-radius:9px;font-size:11px;}
.t-glass .ord-foot .who{font-size:12.5px;font-weight:500;}
.t-glass .ord-price{margin-left:auto;text-align:right;}
.t-glass .ord-price b{display:block;font-size:18px;font-weight:700;color:var(--mint);}
.t-glass .ord-price span{font-size:11px;color:var(--dim);}

.t-glass .gig .gig-thumb{height:96px;border-radius:14px;margin-bottom:14px;display:flex;align-items:flex-end;padding:12px;}
.t-glass .gig .badge{font-size:11px;font-weight:600;color:#fff;background:rgba(0,0,0,.35);padding:4px 10px;border-radius:8px;backdrop-filter:blur(6px);}
.t-glass .gig .seller{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.t-glass .gig .seller .av-g{width:26px;height:26px;border-radius:8px;font-size:10px;}
.t-glass .gig .seller .nm{font-size:12.5px;font-weight:500;}
.t-glass .gig .seller .stars{margin-left:auto;}
.t-glass .gig .seller .rv{font-size:11px;color:var(--dim);margin-left:4px;}

.t-glass .side{display:flex;flex-direction:column;gap:16px;}
.t-glass .panel{border-radius:20px;padding:20px;}
.t-glass .panel h3{margin:0 0 14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;}
.t-glass .post-cta{border-radius:20px;padding:22px;background:linear-gradient(150deg,rgba(94,234,212,.18),rgba(244,114,182,.16));border:1px solid rgba(255,255,255,.18);}
.t-glass .post-cta h3{font-size:18px;font-weight:700;margin:0 0 6px;}
.t-glass .post-cta p{margin:0 0 16px;font-size:13px;color:var(--dim);line-height:1.5;}
.t-glass .post-cta .btn{width:100%;justify-content:center;}
.t-glass .lb{display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08);}
.t-glass .lb:last-child{border-bottom:none;}
.t-glass .lb .av-g{width:34px;height:34px;border-radius:11px;font-size:12px;}
.t-glass .lb .nm{flex:1;font-size:13.5px;font-weight:500;}
.t-glass .lb .nm small{display:block;color:var(--dim);font-weight:400;font-size:11px;}
.t-glass .lb .earn{font-size:13px;font-weight:600;color:var(--mint);}
`;

  const av = (t, grad) => `<div class="av-g" style="background:${grad}">${t}</div>`;
  const stars = (n=5) => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;
  const G = {
    a:'linear-gradient(135deg,#a78bfa,#7c3aed)', t:'linear-gradient(135deg,#34d399,#0ea5e9)',
    l:'linear-gradient(135deg,#f472b6,#a78bfa)', m:'linear-gradient(135deg,#fbbf24,#f472b6)',
    s:'linear-gradient(135deg,#38bdf8,#6366f1)', g:'linear-gradient(135deg,#5eead4,#22d3ee)'
  };
  const catColor = { 'Дизайн':'#f5a3e8','Код':'#5eead4','Курсовые':'#c4b5fd','Чертежи':'#7dd3fc','Переводы':'#fbbf24' };
  const cc = (c) => `color:#1a1140;background:${catColor[c]||'#c4b5fd'}`;

  const orders = [
    ['Дизайн','Нужен логотип для студенческого стартапа','Питч-дек в пятницу, нужен минималистичный логотип + айдентика. Есть мудборд.',['⏱ 3 дня','📥 7 откликов'],'МВ','Макс В.',G.m,'2 500'],
    ['Код','Помочь с лабой по Python (pandas)','Анализ датасета, построить графики и сделать выводы. Дедлайн завтра.',['⏱ 1 день','📥 12 откликов'],'КО','Катя О.',G.l,'1 200'],
    ['Чертежи','Начертить деталь в Компас-3D','По эскизу сделать 3D-модель + чертёж с размерами по ГОСТ.',['⏱ 2 дня','📥 4 отклика'],'ДС','Дима С.',G.s,'1 800'],
    ['Переводы','Перевести абстракт статьи на английский','Технический текст по бурению, ~1 страница. Нужен грамотный перевод.',['⏱ 12 часов','📥 9 откликов'],'НП','Нина П.',G.a,'800'],
  ].map(([cat,title,desc,meta,ini,name,grad,price])=>`
    <div class="ord glass">
      <div class="ord-top"><span class="ord-cat" style="${cc(cat)}">${cat}</span><span class="ord-new">● новый</span></div>
      <h4>${title}</h4><p>${desc}</p>
      <div class="ord-meta">${meta.map(m=>`<span class="m">${m}</span>`).join('')}</div>
      <div class="ord-foot">${av(ini,grad)}<span class="who">${name}</span>
        <div class="ord-price"><b>${price} ₽</b><span>бюджет</span></div></div>
    </div>`).join('');

  const gigs = [
    ['Дизайн','linear-gradient(135deg,#7c3aed,#db2777)','Сделаю презентацию к защите диплома','АК','Аня К.',5,'47','от 1 500'],
    ['Код','linear-gradient(135deg,#0ea5e9,#5eead4)','Напишу и отлажу код на C++ / Python','ТР','Тимур Р.',5,'89','от 900'],
  ].map(([cat,bg,title,ini,name,rate,rev,price])=>`
    <div class="ord gig glass">
      <div class="gig-thumb" style="background:${bg}"><span class="badge">${cat} · услуга</span></div>
      <div class="seller">${av(ini,G.t)}<span class="nm">${name}</span>${stars(rate)}<span class="rv">${rev}</span></div>
      <h4>${title}</h4>
      <div class="ord-foot" style="border:none;padding-top:6px"><span class="who" style="color:var(--dim)">Топ-исполнитель</span>
        <div class="ord-price"><b>${price} ₽</b><span>за работу</span></div></div>
    </div>`).join('');

  const lb = [
    ['АК','Аня Котова','Дизайн · 47 сделок','24 800',G.a],
    ['ТР','Тимур Рахимов','Код · 89 сделок','41 200',G.t],
    ['ДС','Дима Соколов','Чертежи · 33 сделки','18 600',G.s],
  ].map(([ini,name,cat,earn,grad])=>`
    <div class="lb">${av(ini,grad)}<span class="nm">${name}<small>${cat}</small></span><span class="earn">${earn} ₽</span></div>`).join('');

  const chips = ['Все','Дизайн','Код','Курсовые','Чертежи','Переводы','Репетиторство']
    .map((c,i)=>`<span class="chip ${i===0?'on':''}">${c}</span>`).join('');

  const html = `
<div class="t-glass">
  ${GLASS.orbs}
  <div class="wrap">
    ${GLASS.header('market')}
    <div class="mk-hero glass">
      <div>
        <div class="eyebrow">Биржа · фриланс между студентами</div>
        <h1>Найди исполнителя или <em>заработай сам</em></h1>
        <p>Заказы и услуги от студентов Губки — дизайн, код, курсовые, чертежи. Оплата рублями, безопасная сделка.</p>
        <div class="mk-herostats">
          <div><b>1 340</b><span>активных заказов</span></div>
          <div><b>890</b><span>исполнителей</span></div>
          <div><b style="color:var(--mint)">4.9</b><span>средний рейтинг</span></div>
        </div>
      </div>
      <button class="btn pri">＋ Разместить заказ</button>
    </div>

    <div class="mk-bar">
      <div class="seg"><button class="on">Заказы</button><button>Услуги</button></div>
      <div class="mk-chips">${chips}</div>
      <span class="chip">⇅ Сортировка</span>
    </div>

    <div class="mk-cols">
      <div class="mk-grid">
        ${orders}
        ${gigs}
      </div>
      <div class="side">
        <div class="post-cta">
          <h3>Есть навык? 💸</h3>
          <p>Размести услугу и получай заказы от студентов прямо в кошелёк.</p>
          <button class="btn mint">Стать исполнителем</button>
        </div>
        <div class="panel glass">
          <h3>🏆 Топ исполнителей</h3>
          ${lb}
        </div>
        <div class="panel glass">
          <h3>🛡 Как это работает</h3>
          <div class="lb" style="border:none"><span class="nm" style="line-height:1.5">Деньги резервируются при заказе и переходят исполнителю только после приёмки работы.</span></div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  return { css, html };
})();
