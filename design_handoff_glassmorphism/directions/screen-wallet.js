// Screen 4 — Wallet page. window.SCR_WALLET = { css, html }. Uses GLASS kit.
window.SCR_WALLET = (function () {
  const css = `
.t-glass .wl-cols{display:grid;grid-template-columns:1fr 320px;gap:20px;padding:0 26px 40px;}
.t-glass .wl-bal{border-radius:26px;padding:28px 30px;margin-bottom:18px;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(124,58,237,.5),rgba(219,39,119,.4) 60%,rgba(14,165,233,.4));
  border:1px solid rgba(255,255,255,.2);box-shadow:0 18px 50px rgba(20,8,50,.5),inset 0 1px 0 rgba(255,255,255,.25);}
.t-glass .wl-bal::after{content:'';position:absolute;width:280px;height:280px;border-radius:50%;right:-80px;top:-120px;
  background:radial-gradient(circle,rgba(255,255,255,.25),transparent 70%);pointer-events:none;}
.t-glass .wl-bal .lbl{font-size:13px;color:rgba(255,255,255,.8);font-weight:500;letter-spacing:.5px;}
.t-glass .wl-bal .big{font-size:54px;font-weight:800;letter-spacing:-2px;line-height:1;margin:8px 0 4px;display:flex;align-items:baseline;gap:10px;}
.t-glass .wl-bal .big .cur{font-size:26px;font-weight:600;opacity:.85;}
.t-glass .wl-bal .approx{font-size:13px;color:rgba(255,255,255,.75);}
.t-glass .wl-acts{display:flex;gap:10px;margin-top:22px;}
.t-glass .wl-acts .btn{flex:1;justify-content:center;}

.t-glass .wl-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px;}
.t-glass .mini{border-radius:18px;padding:18px 20px;}
.t-glass .mini .t{font-size:12.5px;color:var(--dim);display:flex;align-items:center;gap:7px;}
.t-glass .mini b{display:block;font-size:24px;font-weight:700;margin-top:8px;letter-spacing:-.5px;}

.t-glass .wl-spark{border-radius:20px;padding:20px 22px;margin-bottom:18px;}
.t-glass .wl-spark .sh{display:flex;align-items:center;margin-bottom:16px;}
.t-glass .wl-spark h3{margin:0;font-size:15px;font-weight:600;}
.t-glass .wl-spark .leg{margin-left:auto;font-size:12px;color:var(--dim);display:flex;gap:14px;}
.t-glass .wl-spark .leg i{font-style:normal;display:inline-flex;align-items:center;gap:6px;}
.t-glass .wl-spark .leg .d{width:9px;height:9px;border-radius:3px;display:inline-block;}
.t-glass .bars{display:flex;align-items:flex-end;gap:14px;height:120px;}
.t-glass .barcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;}
.t-glass .barpair{flex:1;width:100%;display:flex;gap:5px;align-items:flex-end;justify-content:center;}
.t-glass .barpair span{width:14px;border-radius:5px 5px 0 0;}
.t-glass .barcol small{font-size:11px;color:var(--dim);}

.t-glass .tx-head{display:flex;align-items:center;margin:0 2px 14px;}
.t-glass .tx-head .sectlabel{margin:0;}
.t-glass .tx-head .filt{margin-left:auto;display:flex;gap:8px;}
.t-glass .txlist{border-radius:20px;padding:8px;}
.t-glass .tx{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;}
.t-glass .tx+.tx{border-top:1px solid rgba(255,255,255,.08);}
.t-glass .tx .ic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-size:18px;flex-shrink:0;}
.t-glass .tx .ic.in{background:rgba(94,234,212,.15);}
.t-glass .tx .ic.out{background:rgba(251,113,133,.15);}
.t-glass .tx .info{flex:1;min-width:0;}
.t-glass .tx .info .nm{font-weight:600;font-size:14.5px;}
.t-glass .tx .info .sub{font-size:12.5px;color:var(--dim);margin-top:2px;}
.t-glass .tx .status{font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;}
.t-glass .tx .status.ok{color:var(--mint);background:rgba(94,234,212,.12);}
.t-glass .tx .status.pend{color:var(--gold);background:rgba(255,210,122,.12);}
.t-glass .tx .amt{font-weight:700;font-size:16px;white-space:nowrap;min-width:96px;text-align:right;}
.t-glass .tx .amt.in{color:var(--mint);}
.t-glass .tx .amt.out{color:var(--ink);}

.t-glass .side{display:flex;flex-direction:column;gap:16px;}
.t-glass .panel{border-radius:20px;padding:20px;}
.t-glass .panel h3{margin:0 0 14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;}
.t-glass .pack{display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.05);margin-bottom:10px;cursor:pointer;transition:.14s;}
.t-glass .pack:hover{background:rgba(255,255,255,.1);}
.t-glass .pack.best{border-color:rgba(94,234,212,.4);background:rgba(94,234,212,.08);}
.t-glass .pack .pk-t{font-weight:700;font-size:16px;}
.t-glass .pack .pk-s{font-size:12px;color:var(--dim);}
.t-glass .pack .pk-p{margin-left:auto;font-weight:600;font-size:14px;color:var(--mint);}
.t-glass .pack .pk-tag{font-size:10px;font-weight:600;color:#08221c;background:var(--mint);padding:2px 8px;border-radius:7px;margin-left:6px;}
`;

  const tx = (dir,ic,nm,sub,status,statusCls,amt) => `
    <div class="tx">
      <div class="ic ${dir}">${ic}</div>
      <div class="info"><div class="nm">${nm}</div><div class="sub">${sub}</div></div>
      <span class="status ${statusCls}">${status}</span>
      <div class="amt ${dir}">${dir==='in'?'+':'−'}${amt} ₽</div>
    </div>`;

  const txs = [
    tx('in','✅','Оплата за «Презентацию к защите»','от Макс В. · Биржа','завершено','ok','1 500'),
    tx('out','◈','Покупка ГОСТ-токенов','ГОСТ-калькулятор · пакет 50 ₮','завершено','ok','120'),
    tx('in','💬','Награда за лучший ответ','тема «Гайд по ВКР 2026»','завершено','ok','50'),
    tx('out','🛒','Покупка конспектов','barrel_boy · Барахолка','завершено','ok','200'),
    tx('in','⏳','Заказ «Логотип для стартапа»','от Нина П. · в резерве','в работе','pend','2 500'),
    tx('out','↗','Перевод другу','→ @timur_r','завершено','ok','300'),
  ].join('');

  const months = [
    ['Янв',60,30],['Фев',45,55],['Мар',80,40],['Апр',50,65],['Май',95,50],['Июн',70,35],
  ].map(([m,inH,outH])=>`
    <div class="barcol"><div class="barpair">
      <span style="height:${inH}%;background:linear-gradient(180deg,#5eead4,#22d3ee)"></span>
      <span style="height:${outH}%;background:linear-gradient(180deg,#f472b6,#c4b5fd)"></span>
    </div><small>${m}</small></div>`).join('');

  const html = `
<div class="t-glass">
  ${GLASS.orbs}
  <div class="wrap">
    ${GLASS.header('wallet')}
    <div class="crumb"><span style="color:var(--ink)">Кошелёк</span></div>
    <div class="wl-cols">
      <div class="main">
        <div class="wl-bal">
          <div class="lbl">Текущий баланс</div>
          <div class="big">1 240 <span class="cur">₽</span></div>
          <div class="approx">Доступно к выводу и оплате на платформе · рубли</div>
          <div class="wl-acts">
            <button class="btn mint">＋ Пополнить</button>
            <button class="btn ghost">↗ Вывести</button>
            <button class="btn ghost">⇄ Перевести</button>
          </div>
        </div>

        <div class="wl-mini">
          <div class="mini glass"><div class="t">↓ Получено за месяц</div><b style="color:var(--mint)">+4 100 ₽</b></div>
          <div class="mini glass"><div class="t">↑ Потрачено за месяц</div><b>−1 820 ₽</b></div>
          <div class="mini glass"><div class="t">⏳ В резерве</div><b style="color:var(--gold)">2 500 ₽</b></div>
        </div>

        <div class="wl-spark glass">
          <div class="sh"><h3>Движение средств</h3>
            <div class="leg"><i><span class="d" style="background:#5eead4"></span>поступления</i><i><span class="d" style="background:#f472b6"></span>траты</i></div>
          </div>
          <div class="bars">${months}</div>
        </div>

        <div class="tx-head">
          <div class="sectlabel">История транзакций</div>
          <div class="filt"><span class="chip on">Все</span><span class="chip">Доходы</span><span class="chip">Расходы</span></div>
        </div>
        <div class="txlist glass">${txs}</div>
      </div>

      <div class="side">
        <div class="panel glass">
          <h3>◈ Купить ГОСТ-токены</h3>
          <div style="font-size:12px;color:var(--dim);margin:-6px 0 14px">Курс 1 ₮ = 10 ₽ · списывается с баланса</div>
          <div class="pack"><div><div class="pk-t">10 ₮</div><div class="pk-s">хватит на реферат</div></div><div class="pk-p">100 ₽</div></div>
          <div class="pack best"><div><div class="pk-t">60 ₮ <span class="pk-tag">+20%</span></div><div class="pk-s">популярный · 50 + 10 бонус</div></div><div class="pk-p">500 ₽</div></div>
          <div class="pack"><div><div class="pk-t">130 ₮ <span class="pk-tag">+30%</span></div><div class="pk-s">на весь семестр · 100 + 30</div></div><div class="pk-p">1 000 ₽</div></div>
          <button class="btn mint" style="width:100%;justify-content:center;margin-top:6px">Купить с баланса</button>
        </div>
        <div class="panel glass">
          <h3>📊 Сводка</h3>
          <div class="tx" style="padding:10px 0;border:none"><div class="info"><div class="sub">Всего заработано</div></div><div class="amt in" style="font-size:14px">+24 800 ₽</div></div>
          <div class="tx" style="padding:10px 0;border-top:1px solid rgba(255,255,255,.08)"><div class="info"><div class="sub">Всего потрачено</div></div><div class="amt" style="font-size:14px">−9 340 ₽</div></div>
          <div class="tx" style="padding:10px 0;border-top:1px solid rgba(255,255,255,.08)"><div class="info"><div class="sub">Сделок на бирже</div></div><div class="amt out" style="font-size:14px">47</div></div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  return { css, html };
})();
