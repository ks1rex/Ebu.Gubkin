// Screen 1 — Forum thread page. window.SCR_THREAD = { css, html }. Uses GLASS kit.
window.SCR_THREAD = (function () {
  const css = `
.t-glass .th-cols{display:grid;grid-template-columns:1fr 300px;gap:20px;}
.t-glass .th-head{border-radius:24px;padding:26px 28px;margin-bottom:18px;}
.t-glass .th-tags{display:flex;gap:8px;margin-bottom:14px;}
.t-glass .th-tag{font-size:12px;font-weight:600;padding:5px 11px;border-radius:9px;color:#1a1140;background:linear-gradient(135deg,var(--lav),#ddd6fe);}
.t-glass .th-tag.s{background:rgba(255,255,255,.1);color:var(--lav);}
.t-glass .th-head h1{font-size:30px;line-height:1.18;letter-spacing:-.6px;margin:0 0 16px;font-weight:700;}
.t-glass .th-byline{display:flex;align-items:center;gap:12px;}
.t-glass .th-byline .av-g{width:44px;height:44px;border-radius:13px;font-size:15px;}
.t-glass .th-byline .nm{font-weight:600;font-size:14.5px;}
.t-glass .th-byline .mt{font-size:12.5px;color:var(--dim);}
.t-glass .th-byline .stat{margin-left:auto;display:flex;gap:22px;text-align:right;}
.t-glass .th-byline .stat b{display:block;font-size:18px;font-weight:700;}
.t-glass .th-byline .stat span{font-size:11px;color:var(--dim);}

.t-glass .post{border-radius:20px;padding:22px 24px;margin-bottom:14px;display:flex;gap:16px;}
.t-glass .post.op{border:1px solid rgba(196,181,253,.35);background:rgba(124,58,237,.12);}
.t-glass .post .av-g{width:46px;height:46px;border-radius:14px;font-size:16px;}
.t-glass .post .pbody{flex:1;min-width:0;}
.t-glass .phead{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.t-glass .phead .nm{font-weight:600;font-size:15px;}
.t-glass .phead .role{font-size:11px;font-weight:600;padding:3px 9px;border-radius:7px;color:#08221c;background:var(--mint);}
.t-glass .phead .role.op{background:var(--gold);}
.t-glass .phead .tm{font-size:12.5px;color:var(--dim);margin-left:auto;}
.t-glass .ptext{font-size:14.5px;line-height:1.6;color:#e6e1f7;margin:0;}
.t-glass .ptext code{background:rgba(255,255,255,.1);padding:2px 7px;border-radius:6px;font-size:13px;color:var(--mint);}
.t-glass .quote{border-left:3px solid var(--lav);background:rgba(255,255,255,.05);padding:10px 14px;border-radius:0 10px 10px 0;
  margin:12px 0;font-size:13.5px;color:var(--dim);}
.t-glass .react{display:flex;align-items:center;gap:9px;margin-top:16px;flex-wrap:wrap;}
.t-glass .rx{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:7px 12px;border-radius:11px;cursor:pointer;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:var(--ink);transition:.14s;}
.t-glass .rx:hover{background:rgba(255,255,255,.13);}
.t-glass .rx.act{background:rgba(94,234,212,.16);border-color:rgba(94,234,212,.4);color:var(--mint);}
.t-glass .rxsp{flex:1;}
.t-glass .rxlink{font-size:13px;font-weight:500;color:var(--dim);cursor:pointer;}
.t-glass .rxlink:hover{color:var(--ink);}

.t-glass .reply{border-radius:22px;padding:20px 22px;margin-top:6px;}
.t-glass .reply h3{margin:0 0 14px;font-size:16px;font-weight:600;}
.t-glass .rform{display:flex;gap:14px;}
.t-glass .rform .av-g{width:44px;height:44px;border-radius:13px;font-size:15px;}
.t-glass .rwrap{flex:1;}
.t-glass .rfield{width:100%;min-height:96px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
  color:var(--ink);font-family:'Sora';font-size:14px;padding:14px 16px;resize:none;line-height:1.5;}
.t-glass .rfield::placeholder{color:var(--dim2);}
.t-glass .rbar{display:flex;align-items:center;gap:10px;margin-top:12px;}
.t-glass .rtools{display:flex;gap:8px;color:var(--dim);}
.t-glass .rtool{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);cursor:pointer;}

.t-glass .side{display:flex;flex-direction:column;gap:16px;}
.t-glass .panel{border-radius:20px;padding:20px;}
.t-glass .panel h3{margin:0 0 14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;}
.t-glass .author-card{text-align:center;}
.t-glass .author-card .av-g{width:64px;height:64px;border-radius:18px;font-size:22px;margin:0 auto 12px;}
.t-glass .author-card .nm{font-weight:600;font-size:16px;}
.t-glass .author-card .sub{font-size:12.5px;color:var(--dim);margin-top:3px;}
.t-glass .author-card .row{display:flex;justify-content:space-around;margin:16px 0;}
.t-glass .author-card .row b{display:block;font-size:17px;font-weight:700;}
.t-glass .author-card .row span{font-size:11px;color:var(--dim);}
.t-glass .relrow{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px;line-height:1.4;}
.t-glass .relrow:last-child{border-bottom:none;}
.t-glass .relrow .dotnum{color:var(--lav);font-weight:700;}
.t-glass .relrow span{color:var(--dim);}
`;

  const av = (t, grad, cls='av-g') => `<div class="${cls}" style="background:${grad}">${t}</div>`;
  const G = {
    a:'linear-gradient(135deg,#a78bfa,#7c3aed)', t:'linear-gradient(135deg,#34d399,#0ea5e9)',
    l:'linear-gradient(135deg,#f472b6,#a78bfa)', m:'linear-gradient(135deg,#fbbf24,#f472b6)',
    me:'linear-gradient(135deg,#a78bfa,#f472b6)'
  };

  const html = `
<div class="t-glass">
  ${GLASS.orbs}
  <div class="wrap">
    ${GLASS.header('forum')}
    <div class="crumb"><a href="#">Форум</a><span class="sep">/</span><a href="#">Учёба и сессия</a><span class="sep">/</span><span style="color:var(--ink)">Термех</span></div>
    <div class="page">
      <div class="th-cols">
        <div class="main">
          <div class="th-head glass">
            <div class="th-tags"><span class="th-tag">#термех</span><span class="th-tag s">#сессия2026</span><span class="th-tag s">#помогите</span></div>
            <h1>Кто шарит за термех? Горит коллок в пятницу 😭</h1>
            <div class="th-byline">
              ${av('АК',G.a)}
              <div><div class="nm">Аня Котова</div><div class="mt">3 курс · РГФ · 2 часа назад</div></div>
              <div class="stat">
                <div><b>24</b><span>ответа</span></div>
                <div><b style="color:var(--mint)">312</b><span>просмотров</span></div>
                <div><b style="color:var(--gold)">37</b><span>реакций</span></div>
              </div>
            </div>
          </div>

          <div class="post op glass">
            ${av('АК',G.a)}
            <div class="pbody">
              <div class="phead"><span class="nm">Аня Котова</span><span class="role op">Автор</span><span class="tm">2 ч назад</span></div>
              <p class="ptext">Ребят, в пятницу коллоквиум по теоретической механике — кинематика точки и твёрдого тела. Совсем не догоняю тему с <code>мгновенным центром скоростей</code>. Может, кто-то объяснит на пальцах или скинет норм конспект/видео? За адекватную помощь закину рублей 🙏</p>
              <div class="react">
                <span class="rx act">👍 24</span><span class="rx">🔥 8</span><span class="rx">❤️ 5</span>
                <span class="rxsp"></span><span class="rxlink">↩ Ответить</span><span class="rxlink">⚑ Пожаловаться</span><span class="rxlink">↗ Поделиться</span>
              </div>
            </div>
          </div>

          <div class="post glass">
            ${av('ТР',G.t)}
            <div class="pbody">
              <div class="phead"><span class="nm">Тимур Рахимов</span><span class="role">Ментор</span><span class="tm">1 ч назад</span></div>
              <p class="ptext">МЦС — это точка тела, скорость которой в данный момент равна нулю. Главное правило: проводишь перпендикуляры к векторам скоростей двух точек — где пересеклись, там и центр. Дальше всё тело вращается вокруг него.</p>
              <div class="quote">«не догоняю тему с мгновенным центром скоростей» — на видео Иродова с 14-й минуты прям по полочкам</div>
              <div class="react">
                <span class="rx act">👍 18</span><span class="rx">🔥 6</span><span class="rx">🎯 3</span>
                <span class="rxsp"></span><span class="rxlink">↩ Ответить</span><span class="rxlink">↗ Поделиться</span>
              </div>
            </div>
          </div>

          <div class="post glass">
            ${av('ЛМ',G.l)}
            <div class="pbody">
              <div class="phead"><span class="nm">Лиза Маркова</span><span class="tm">48 мин назад</span></div>
              <p class="ptext">Держи мой конспект с прошлого года, там все типовые задачи с коллока разобраны 📎 <code>termeh_kollok.pdf</code>. Удачи, сама в пятницу сдаю 😅</p>
              <div class="react">
                <span class="rx act">❤️ 12</span><span class="rx">🙏 9</span>
                <span class="rxsp"></span><span class="rxlink">↩ Ответить</span><span class="rxlink">↗ Поделиться</span>
              </div>
            </div>
          </div>

          <div class="reply glass">
            <h3>Ваш ответ</h3>
            <div class="rform">
              ${av('Я',G.me)}
              <div class="rwrap">
                <textarea class="rfield" placeholder="Поделись знаниями или поддержи — отвечай по делу 🙂"></textarea>
                <div class="rbar">
                  <div class="rtools"><span class="rtool">📎</span><span class="rtool">😊</span><span class="rtool">@</span><span class="rtool">{ }</span></div>
                  <span class="rxsp"></span>
                  <button class="btn ghost">Предпросмотр</button>
                  <button class="btn mint">Отправить ответ</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="side">
          <div class="panel glass author-card">
            ${av('АК',G.a)}
            <div class="nm">Аня Котова</div>
            <div class="sub">@anya_k · 3 курс РГФ</div>
            <div class="row">
              <div><b>8 920</b><span>репутация</span></div>
              <div><b>142</b><span>темы</span></div>
              <div><b>1.1к</b><span>ответы</span></div>
            </div>
            <button class="btn ghost" style="width:100%;justify-content:center">＋ Подписаться</button>
          </div>
          <div class="panel glass">
            <h3>🔗 Похожие темы</h3>
            <div class="relrow"><span class="dotnum">1</span><div>Шпоры по сопромату за 2 курс<br><span>· 56 ответов</span></div></div>
            <div class="relrow"><span class="dotnum">2</span><div>Как сдать матан Иванову с первого раза<br><span>· 89 ответов</span></div></div>
            <div class="relrow"><span class="dotnum">3</span><div>Сборник задач по термеху — где скачать<br><span>· 31 ответ</span></div></div>
          </div>
          <div class="panel glass">
            <h3>📌 Об этой теме</h3>
            <div class="relrow"><span>Создана</span><div style="margin-left:auto;color:var(--ink)">сегодня, 14:20</div></div>
            <div class="relrow"><span>Категория</span><div style="margin-left:auto;color:var(--ink)">Учёба и сессия</div></div>
            <div class="relrow"><span>Участников</span><div style="margin-left:auto;color:var(--ink)">11</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  return { css, html };
})();
