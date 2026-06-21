// Shared glassmorphism kit for all Ebu.Gubkin screens. window.GLASS = { css, header(active), orbs }.
// Scope class is `.t-glass` (same as the chosen forum direction) so atoms match exactly.
window.GLASS = (function () {
  const css = `
.t-glass{--ink:#f4f1ff;--dim:#bcb4e0;--dim2:#9a92c0;--mint:#5eead4;--lav:#c4b5fd;--pink:#f5a3e8;--gold:#ffd27a;--red:#fb7185;
  font-family:'Sora',sans-serif;color:var(--ink);position:relative;overflow:hidden;min-height:100%;
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
.t-glass nav a{font-size:14.5px;font-weight:500;color:var(--dim);text-decoration:none;padding:10px 16px;border-radius:12px;transition:.16s;white-space:nowrap;}
.t-glass nav a.on{color:var(--ink);background:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.2);font-weight:600;}
.t-glass nav a:not(.on):hover{color:var(--ink);background:rgba(255,255,255,.06);}
.t-glass .spacer{flex:1;}
.t-glass .search{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  border-radius:14px;padding:11px 15px;color:var(--dim);font-size:13.5px;width:200px;}
.t-glass .wallet{display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:14px;font-weight:600;font-size:14px;
  color:#08221c;background:linear-gradient(135deg,var(--mint),#a7f3d0);box-shadow:0 6px 18px rgba(94,234,212,.3);white-space:nowrap;}
.t-glass .avatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;font-weight:700;font-size:15px;flex-shrink:0;
  color:#fff;background:linear-gradient(135deg,#a78bfa,#f472b6);box-shadow:0 6px 16px rgba(167,139,250,.4);}

/* generic atoms */
.t-glass .page{padding:0 26px 40px;}
.t-glass .crumb{display:flex;align-items:center;gap:8px;margin:0 28px 14px;font-size:13px;color:var(--dim);font-weight:500;}
.t-glass .crumb a{color:var(--dim);text-decoration:none;}
.t-glass .crumb a:hover{color:var(--ink);}
.t-glass .crumb .sep{opacity:.5;}
.t-glass .btn{display:inline-flex;align-items:center;gap:8px;font-family:'Sora';font-weight:600;font-size:14px;border:none;cursor:pointer;border-radius:13px;padding:12px 20px;white-space:nowrap;}
.t-glass .btn.pri{color:#1a1140;background:linear-gradient(135deg,#fff,#e9e4ff);box-shadow:0 10px 26px rgba(0,0,0,.28);}
.t-glass .btn.mint{color:#08221c;background:linear-gradient(135deg,var(--mint),#a7f3d0);box-shadow:0 8px 20px rgba(94,234,212,.3);}
.t-glass .btn.ghost{color:var(--ink);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);}
.t-glass .sectlabel{font-size:13px;letter-spacing:1px;color:var(--dim);text-transform:uppercase;font-weight:600;margin:8px 2px 14px;}
.t-glass .chip{font-size:13px;font-weight:500;color:var(--lav);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  padding:8px 14px;border-radius:11px;cursor:pointer;white-space:nowrap;transition:.14s;}
.t-glass .chip.on{color:#1a1140;background:linear-gradient(135deg,var(--lav),#ddd6fe);border-color:transparent;font-weight:600;}
.t-glass .chip:not(.on):hover{background:rgba(255,255,255,.12);color:var(--ink);}
.t-glass .av-g{display:grid;place-items:center;font-weight:700;color:#fff;flex-shrink:0;}
.t-glass .stars{display:inline-flex;gap:1px;color:var(--gold);font-size:13px;}
`;

  const orbs = `<div class="orb a"></div><div class="orb b"></div><div class="orb c"></div>`;

  function header(active) {
    const items = [['Форум','forum'],['Биржа','market'],['ГОСТ-калькулятор','gost'],['Кошелёк','wallet']];
    const nav = items.map(([t,k]) => `<a class="${k===active?'on':''}" href="#">${t}</a>`).join('');
    return `
<header class="glass">
  <div class="brand">
    <img src="assets/logo-mark.png" alt="Ebu.Gubkin">
    <div class="wordmark">Ebu<b>.Gubkin</b><span>для студентов</span></div>
  </div>
  <nav>${nav}</nav>
  <div class="spacer"></div>
  <div class="search">⌕&nbsp; поиск…</div>
  <div class="wallet">1 240 ₽</div>
  <div class="avatar">Я</div>
</header>`;
  }

  return { css, orbs, header };
})();
