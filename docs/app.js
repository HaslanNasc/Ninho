// ============================================================
// NINHO — App principal (vanilla JS, leve, PWA)
// ============================================================
const DB = window.DB;
const $ = s => document.querySelector(s);
const app = $('#app');

// ---------- utils ----------
const esc = s => String(s==null?'':s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const cents = n => (Number(n||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const toCents = v => Math.round(parseFloat(String(v==null?0:v).replace(/\./g,'').replace(',','.'))||0*0) ;
function moneyToCents(v){ if(v==null||v==='') return 0; const s=String(v).replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'); return Math.round((parseFloat(s)||0)*100); }
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d? new Date(d+'T00:00:00').toLocaleDateString('pt-BR'):'';
const daysTo = d => d? Math.ceil((new Date(d+'T00:00:00')-new Date(today()+'T00:00:00'))/864e5):null;

let PROFILE=null, HOUSE=null, MEMBERS={}, UID=null;
const memberName = id => (MEMBERS[id]&&MEMBERS[id].display_name)||'—';
// ---------- mascotes (cachorro, gato, capivara) em SVG ----------
const MASCOTS = {
  cachorro:`<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="#ffe9c7"/><ellipse cx="16" cy="26" rx="7" ry="12" fill="#c8862f"/><ellipse cx="48" cy="26" rx="7" ry="12" fill="#c8862f"/><circle cx="32" cy="32" r="18" fill="#f0b45e"/><ellipse cx="32" cy="40" rx="12" ry="10" fill="#fbdca7"/><circle cx="25" cy="30" r="2.6" fill="#3a2a16"/><circle cx="39" cy="30" r="2.6" fill="#3a2a16"/><ellipse cx="32" cy="38" rx="3.4" ry="2.6" fill="#3a2a16"/><path d="M30 44 q2 4 4 0 z" fill="#ef6f8e"/></svg>`,
  gato:`<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="#e9e3ff"/><path d="M16 16 L22 30 L10 30 Z" fill="#333"/><path d="M48 16 L54 30 L42 30 Z" fill="#333"/><circle cx="32" cy="34" r="18" fill="#333"/><ellipse cx="32" cy="42" rx="12" ry="9" fill="#fff"/><circle cx="25" cy="32" r="3" fill="#7bd389"/><circle cx="39" cy="32" r="3" fill="#7bd389"/><circle cx="25" cy="32" r="1.3" fill="#1b1b1b"/><circle cx="39" cy="32" r="1.3" fill="#1b1b1b"/><ellipse cx="32" cy="39" rx="2" ry="1.4" fill="#ef6f8e"/><path d="M22 40 h-7 M22 43 h-6" stroke="#999" stroke-width="1" stroke-linecap="round"/><path d="M42 40 h7 M42 43 h6" stroke="#999" stroke-width="1" stroke-linecap="round"/></svg>`,
  capivara:`<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="#e9dcc7"/><ellipse cx="20" cy="18" rx="4" ry="3.5" fill="#7d5f3c"/><ellipse cx="44" cy="18" rx="4" ry="3.5" fill="#7d5f3c"/><ellipse cx="32" cy="36" rx="19" ry="17" fill="#9c7a52"/><ellipse cx="32" cy="46" rx="13" ry="9" fill="#b99a6f"/><circle cx="24" cy="31" r="7" fill="none" stroke="#3a2a16" stroke-width="1.6"/><circle cx="40" cy="31" r="7" fill="none" stroke="#3a2a16" stroke-width="1.6"/><line x1="31" y1="31" x2="33" y2="31" stroke="#3a2a16" stroke-width="1.6"/><circle cx="24" cy="31" r="2.2" fill="#3a2a16"/><circle cx="40" cy="31" r="2.2" fill="#3a2a16"/><ellipse cx="32" cy="45" rx="5" ry="3.4" fill="#6b4f30"/><ellipse cx="29.5" cy="44.5" rx="1" ry="1.4" fill="#2a1d0f"/><ellipse cx="34.5" cy="44.5" rx="1" ry="1.4" fill="#2a1d0f"/></svg>`
};
const mascotBox = (key,cls) => `<span class="mascot ${cls||''}">${MASCOTS[key]||MASCOTS.capivara}</span>`;

// ---------- tema de cores escolhido pela usuária ----------
const THEME_KEY='ninho_theme';
const THEMES={roxo:'Roxo',rosa:'Rosa',azul:'Azul',cinza:'Cinza'};
function applyTheme(t){ t=THEMES[t]?t:'roxo'; document.documentElement.setAttribute('data-theme',t); try{localStorage.setItem(THEME_KEY,t);}catch(e){} }
function currentTheme(){ try{ return localStorage.getItem(THEME_KEY)||'roxo'; }catch(e){ return 'roxo'; } }
applyTheme(currentTheme());

function avatarHtml(id){ const m=MEMBERS[id]||{};
  if(m.avatar_url && m.avatar_url.indexOf('mascot:')===0){ return `<span class="avatar">${MASCOTS[m.avatar_url.slice(7)]||MASCOTS.capivara}</span>`; }
  if(m.avatar_url) return `<span class="avatar"><img src="${esc(m.avatar_url)}"></span>`;
  const ini=(m.display_name||'?').trim().charAt(0).toUpperCase(); return `<span class="avatar">${esc(ini)}</span>`; }

// ---------- banner / toast ----------
function toast(msg,type){ let b=document.createElement('div'); b.className='banner '+(type||'ok');
  b.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:999;max-width:90%;box-shadow:var(--shadow)';
  b.textContent=msg; document.body.appendChild(b); setTimeout(()=>b.remove(),3200); }

// ---------- modal / formul\u00e1rio gen\u00e9rico ----------
function closeModal(){ const m=$('#modal'); if(m) m.remove(); }
function openForm(title, fields, values, onSave){
  values = values||{};
  const inp = f => {
    const v = values[f.name]!=null?values[f.name]:(f.def!=null?f.def:'');
    if(f.type==='select') return `<select name="${f.name}">`+f.options.map(o=>{const val=typeof o==='object'?o.v:o,lab=typeof o==='object'?o.l:o;return `<option value="${esc(val)}" ${String(v)===String(val)?'selected':''}>${esc(lab)}</option>`;}).join('')+`</select>`;
    if(f.type==='textarea') return `<textarea name="${f.name}" rows="3">${esc(v)}</textarea>`;
    if(f.type==='checkbox') return `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${f.name}" style="width:auto" ${v?'checked':''}> ${esc(f.cklabel||'Sim')}</label>`;
    if(f.type==='file') return `<input type="file" name="${f.name}" accept="image/*">`;
    return `<input type="${f.type||'text'}" name="${f.name}" value="${esc(v)}" ${f.ph?`placeholder="${esc(f.ph)}"`:''} ${f.required?'required':''}>`;
  };
  const rows=[]; for(let i=0;i<fields.length;i++){ const f=fields[i];
    const cell=`<label class="field"><label>${esc(f.label)}</label>${inp(f)}</label>`;
    if(f.half){ const g=fields[i+1]; if(g&&g.half){ rows.push(`<div class="row">${cell}<label class="field"><label>${esc(g.label)}</label>${inp(g)}</label></div>`); i++; continue; } }
    rows.push(cell);
  }
  const html=`<div class="modal-bg" id="modal"><div class="modal"><h3>${esc(title)}</h3><form id="mform">${rows.join('')}
    <div class="modal-actions"><button type="button" class="btn" id="mcancel">Cancelar</button>
    <button type="submit" class="btn primary">Salvar</button></div></form></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  $('#mcancel').onclick=closeModal;
  $('#modal').onclick=e=>{ if(e.target.id==='modal') closeModal(); };
  $('#mform').onsubmit=async e=>{ e.preventDefault(); const fd=new FormData(e.target); const out={};
    for(const f of fields){ if(f.type==='checkbox'){ out[f.name]=fd.get(f.name)==='on'; }
      else if(f.type==='file'){ const file=fd.get(f.name); if(file&&file.size){ try{ out[f.name]=await DB.upload(file);}catch(err){ toast('Falha no upload: '+err.message,'err'); } } }
      else if(f.money){ out[f.name]=moneyToCents(fd.get(f.name)); }
      else if(f.num){ out[f.name]=parseFloat(String(fd.get(f.name)).replace(',','.'))||0; }
      else out[f.name]=fd.get(f.name); }
    const btn=e.target.querySelector('button[type=submit]'); btn.disabled=true; btn.textContent='Salvando\u2026';
    try{ await onSave(out); closeModal(); }catch(err){ toast(err.message||'Erro ao salvar','err'); btn.disabled=false; btn.textContent='Salvar'; }
  };
}
function confirmBox(msg,onYes){
  const html=`<div class="modal-bg" id="modal"><div class="modal" style="max-width:380px"><h3>Confirmar</h3><p>${esc(msg)}</p>
    <div class="modal-actions"><button class="btn" id="cno">Cancelar</button><button class="btn red" id="cyes">Excluir</button></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  $('#cno').onclick=closeModal; $('#cyes').onclick=async()=>{ try{await onYes();}catch(e){toast(e.message,'err');} closeModal(); };
}

// ---------- cache de listas ----------
const CACHE={};
async function getAll(table,order){ CACHE[table]=await DB.list(table,{order:order||'created_at',asc:false}); return CACHE[table]; }
function mineOrShared(rows){ return rows; } // RLS j\u00e1 filtra; helper sem\u00e2ntico

// ============================================================
// AUTENTICA\u00c7\u00c3O
// ============================================================
function renderAuth(mode){
  mode = mode||'in';
  const demo = !DB.hasSupabase;
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <div class="auth-mascots">${mascotBox('cachorro')}${mascotBox('gato')}${mascotBox('capivara')}</div>
    <h1>Ninho</h1><p class="sub">Casa, finan\u00e7as e rotina \u2014 juntas.</p>
    ${demo?`<div class="banner warn">Modo demonstra\u00e7\u00e3o: os dados ficam s\u00f3 neste navegador. Para login real e sincroniza\u00e7\u00e3o entre celulares, configure o Supabase em <b>config.js</b>.</div>`:''}
    <div id="autherr"></div>
    <form id="authform">
      ${mode==='up'?`<label class="field"><label>Seu nome ou apelido</label><input name="display_name" required placeholder="Ex: Bia"></label>`:''}
      <label class="field"><label>Telefone / WhatsApp</label><input name="phone" required inputmode="tel" placeholder="(11) 90000-0000"></label>
      <label class="field"><label>Senha</label><input name="password" type="password" required minlength="6" placeholder="m\u00ednimo 6 caracteres"></label>
      <button class="btn primary block" type="submit">${mode==='up'?'Criar minha conta':'Entrar'}</button>
    </form>
    <div class="auth-switch">${mode==='up'?'J\u00e1 tem conta? <b id="sw">Entrar</b>':'Ainda n\u00e3o tem conta? <b id="sw">Criar conta</b>'}</div>
  </div></div>`;
  $('#sw').onclick=()=>renderAuth(mode==='up'?'in':'up');
  $('#authform').onsubmit=async e=>{ e.preventDefault(); const fd=new FormData(e.target);
    const data={phone:fd.get('phone'),password:fd.get('password'),display_name:fd.get('display_name')};
    const btn=e.target.querySelector('button'); btn.disabled=true; btn.textContent='Aguarde\u2026';
    try{ if(mode==='up') await DB.signUp(data); else await DB.signIn(data); await boot(); }
    catch(err){ $('#autherr').innerHTML=`<div class="banner err">${esc(err.message||'N\u00e3o foi poss\u00edvel entrar.')}</div>`; btn.disabled=false; btn.textContent=mode==='up'?'Criar minha conta':'Entrar'; }
  };
}

// ============================================================
// SHELL + NAVEGA\u00c7\u00c3O
// ============================================================
const NAV = [
  {id:'dashboard',ico:'\ud83c\udfe0',label:'Dashboard',grp:'Principal'},
  {id:'calendar',ico:'\ud83d\udcc5',label:'Calend\u00e1rio e tarefas',grp:'Principal'},
  {id:'inventory',ico:'\ud83e\uddfa',label:'Invent\u00e1rio / mercado',grp:'Principal'},
  {id:'finances',ico:'\ud83d\udcb0',label:'Minhas finan\u00e7as',grp:'Finan\u00e7as'},
  {id:'accounts',ico:'\ud83c\udfe6',label:'Contas e institui\u00e7\u00f5es',grp:'Finan\u00e7as'},
  {id:'debts',ico:'\ud83e\uddfe',label:'D\u00edvidas e pagamentos',grp:'Finan\u00e7as'},
  {id:'goals',ico:'\ud83d\udc37',label:'Caixinhas e metas',grp:'Finan\u00e7as'},
  {id:'purchases',ico:'\ud83d\udecd\ufe0f',label:'Compras e recibos',grp:'Finan\u00e7as'},
  {id:'reform',ico:'\ud83d\udd28',label:'Reforma da casa',grp:'Casa'},
  {id:'pets',ico:'\ud83d\udc3e',label:'Pets',grp:'Casa'},
  {id:'reports',ico:'\ud83d\udcca',label:'Relat\u00f3rios',grp:'Casa'},
  {id:'profile',ico:'\u2699\ufe0f',label:'Perfil e configura\u00e7\u00f5es',grp:'Casa'}
];
let ROUTE='dashboard';

function renderShell(){
  const navGroup=g=>`<div class="navlabel">${esc(g)}</div><div class="nav">`+
    NAV.filter(n=>n.grp===g).map(n=>`<button data-r="${n.id}" class="${n.id===ROUTE?'active':''}"><span class="ico">${n.ico}</span>${esc(n.label)}</button>`).join('')+`</div>`;
  app.innerHTML=`<div class="shell">
    <aside id="side">
      <div class="brand"><span class="brand-mark">\ud83e\udeb9</span><span><b>Ninho</b><small>Casa & Finan\u00e7as</small></span></div>
      <div class="user-chip">${avatarHtml(UID)}<span><span class="nm">${esc(PROFILE.display_name)}</span><br><span class="hh">${esc(HOUSE.name)}</span></span></div>
      ${['Principal','Finan\u00e7as','Casa'].map(navGroup).join('')}
      <div class="side-note">${DB.hasSupabase?'Sincronizado online \u2601\ufe0f':'Modo local (demo)'}
        <button id="clearcache">Limpar cache do app</button>
        <button id="logout">Sair da conta</button></div>
    </aside>
    <main id="main"></main>
  </div>
  <nav class="tabbar">
    ${[['dashboard','\ud83c\udfe0','In\u00edcio'],['calendar','\ud83d\udcc5','Agenda'],['inventory','\ud83e\uddfa','Mercado'],['__more','\u2630','Outros']]
      .map(([r,i,l])=>`<button data-r="${r}" class="${r===ROUTE?'active':''}"><span class="ico">${i}</span>${l}</button>`).join('')}
  </nav>`;
  app.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ const r=b.dataset.r; if(r==='__more'){ toggleSide(true); return;} go(r); toggleSide(false); });
  $('#logout').onclick=async()=>{ await DB.signOut(); location.reload(); };
  $('#clearcache').onclick=clearCache;
}
function toggleSide(open){ const s=$('#side'); if(!s) return;
  if(open){ s.classList.add('open'); const sc=document.createElement('div'); sc.className='scrim'; sc.id='scrim'; sc.onclick=()=>toggleSide(false); document.body.appendChild(sc);} 
  else { s.classList.remove('open'); const sc=$('#scrim'); if(sc) sc.remove(); } }

async function clearCache(){
  try{ if('caches' in window){ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }
    if('serviceWorker' in navigator){ const rs=await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r=>r.unregister())); }
    toast('Cache limpo. Recarregando\u2026'); setTimeout(()=>location.reload(true),700);
  }catch(e){ toast('N\u00e3o foi poss\u00edvel limpar o cache.','err'); }
}

async function go(route){ ROUTE=route;
  document.querySelectorAll('[data-r]').forEach(b=>b.classList.toggle('active',b.dataset.r===route));
  const m=$('#main'); if(!m) return; m.innerHTML='<div class="empty"><div class="em">\ud83d\udc3e</div>Carregando\u2026</div>';
  try{ await (SCREENS[route]||SCREENS.dashboard)(m); }
  catch(e){ m.innerHTML=`<div class="banner err">Erro ao carregar: ${esc(e.message)}</div>`; }
  try{ window.scrollTo(0,0); }catch(e){}
}

// cabe\u00e7alho de p\u00e1gina padr\u00e3o
function head(title,sub,actions){ return `<div class="top"><div><div style="display:flex;align-items:center;gap:10px">
  <button class="btn small hamb" id="hb">\u2630</button><div><div class="eyebrow">Ninho</div><h1 class="title">${esc(title)}</h1></div></div>
  ${sub?`<p class="subtitle">${esc(sub)}</p>`:''}</div><div class="top-actions">${actions||''}</div></div>`; }
function wireHead(){ const h=$('#hb'); if(h) h.onclick=()=>toggleSide(true); }

function emptyState(em,title,sub,btnLabel,onClick){ const id='es'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const b=document.getElementById(id); if(b)b.onclick=onClick;},0);
  return `<div class="panel empty"><div class="em">${em}</div><h4>${esc(title)}</h4><p>${esc(sub||'')}</p>
    ${btnLabel?`<button class="btn primary" id="${id}" style="margin-top:10px">${esc(btnLabel)}</button>`:''}</div>`; }

// chip de privacidade
function privChip(r){ return r.shared?`<span class="chip sh">Compartilhado</span>`:`<span class="chip priv">Particular</span>`; }
function byField(name,label){ return {name,label}; }
function sharedField(def){ return {name:'shared',type:'checkbox',cklabel:'Compartilhar com a casa',label:'Privacidade',def:!!def}; }
function authorLine(r){ const who=memberName(r.created_by||r.owner_id); const upd=r.updated_by&&r.updated_by!==r.created_by?` \u00b7 atualizado por ${esc(memberName(r.updated_by))}`:''; return `<span class="mt">por ${esc(who)}${upd}</span>`; }

// ============================================================
// TELAS
// ============================================================
const SCREENS = {};

// ---------- DASHBOARD ----------
SCREENS.dashboard = async m => {
  const [accs,debts,goals,inv,evs,reforms] = await Promise.all([
    getAll('accounts'),getAll('debts'),getAll('goals'),getAll('inventory_items'),getAll('events'),getAll('reforms')]);
  const mine = accs.filter(a=>a.owner_id===UID);
  const saldo = mine.reduce((s,a)=>s+(a.is_credit?0:Number(a.balance_cents||0)),0);
  const myDebts = debts.filter(d=>d.owner_id===UID);
  const pend = myDebts.filter(d=>d.status!=='paga');
  const devRest = pend.reduce((s,d)=>s+(Number(d.total_cents||0)-Number(d.paid_cents||0)),0);
  const soon = pend.filter(d=>d.due_date&&daysTo(d.due_date)!=null&&daysTo(d.due_date)<=7);
  const lowInv = inv.filter(i=>i.status==='baixo'||i.status==='acabou');
  const nextEv = evs.filter(e=>e.status!=='concluida'&&e.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  // pizza por conta (saldo positivo)
  const _pc=(getComputedStyle(document.documentElement).getPropertyValue('--primary')||'#7c3aed').trim();
  const palette=[_pc,'#ec4899','#3b82f6','#10b981','#f59e0b','#8b5cf6','#14b8a6','#ef4444'];
  const posAcc = mine.filter(a=>!a.is_credit&&Number(a.balance_cents)>0);
  const totPos = posAcc.reduce((s,a)=>s+Number(a.balance_cents),0)||1;
  let acc=0; const seg = posAcc.map((a,i)=>{const frac=Number(a.balance_cents)/totPos; const from=acc*360; acc+=frac; return `${palette[i%palette.length]} ${from}deg ${acc*360}deg`;}).join(',');
  const pie = posAcc.length?`<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="pie" style="background:conic-gradient(${seg})"></div>
    <div class="legend">${posAcc.map((a,i)=>`<div><span style="background:${palette[i%palette.length]}"></span>${esc(a.name)} \u2014 ${cents(a.balance_cents)}</div>`).join('')}</div></div>`
    : `<p class="subtitle">Cadastre contas com saldo para ver a distribui\u00e7\u00e3o.</p>`;

  m.innerHTML = head('Dashboard','Um resumo da sua vida financeira e da casa.') +
  `<div class="hero"><div><h2>Oi, ${esc(PROFILE.display_name)}! \ud83d\udc4b</h2><p>Aqui est\u00e1 o resumo do seu Ninho hoje.</p></div><div class="pets">${mascotBox('cachorro','sm')}${mascotBox('gato','sm')}${mascotBox('capivara','sm')}</div></div>
  <div class="stats">
    <div class="stat"><div class="k">Saldo pessoal</div><div class="v">${cents(saldo)}</div><div class="d">${mine.length} conta(s)</div></div>
    <div class="stat"><div class="k">D\u00edvidas a pagar</div><div class="v neg">${cents(devRest)}</div><div class="d">${pend.length} pendente(s)</div></div>
    <div class="stat"><div class="k">Vencendo em 7 dias</div><div class="v">${soon.length}</div><div class="d">conta(s)</div></div>
    <div class="stat"><div class="k">Faltando no mercado</div><div class="v">${lowInv.length}</div><div class="d">item(ns)</div></div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>Distribui\u00e7\u00e3o do saldo</h3>${pie}</div>
    <div class="panel"><h3>Pr\u00f3ximos compromissos</h3>${nextEv.length?`<div class="list">`+nextEv.map(e=>`<div class="item"><div class="mn"><div class="nm">${esc(e.title)}</div><div class="mt">${fmtDate(e.date)} ${esc(e.time||'')} \u00b7 ${esc(e.category||'')}</div></div><span class="chip">${esc(e.status)}</span></div>`).join('')+`</div>`:emptyState('\ud83d\udcc5','Sem compromissos','Crie o primeiro no calend\u00e1rio.')}</div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>Contas pr\u00f3ximas do vencimento</h3>${soon.length?`<div class="list">`+soon.map(d=>`<div class="item"><div class="mn"><div class="nm">${esc(d.description)}</div><div class="mt">vence ${fmtDate(d.due_date)} \u00b7 ${esc(d.creditor||'')}</div></div><span class="amount neg">${cents(Number(d.total_cents)-Number(d.paid_cents))}</span></div>`).join('')+`</div>`:emptyState('\u2705','Tudo em dia','Nenhuma conta vencendo nos pr\u00f3ximos 7 dias.')}</div>
    <div class="panel"><h3>Faltando no mercado</h3>${lowInv.length?`<div class="list">`+lowInv.map(i=>`<div class="item"><div class="mn"><div class="nm">${esc(i.name)}</div><div class="mt">tem ${i.qty} ${esc(i.unit)} \u00b7 m\u00ednimo ${i.qty_min}</div></div><span class="chip ${i.status==='acabou'?'late':'pend'}">${i.status==='acabou'?'Acabou':'Baixo'}</span></div>`).join('')+`</div>`:emptyState('\ud83e\uddfa','Mercado ok','Nada em falta agora.')}</div>
  </div>`;
  wireHead();
};

// ---------- CONTAS E INSTITUI\u00c7\u00d5ES ----------
const ACC_TYPES=[{v:'conta',l:'Conta corrente'},{v:'poupanca',l:'Poupan\u00e7a'},{v:'carteira',l:'Carteira/dinheiro'},{v:'cartao',l:'Cart\u00e3o de cr\u00e9dito'},{v:'investimento',l:'Investimento'}];
function accForm(row){ openForm(row?'Editar conta':'Nova conta/institui\u00e7\u00e3o',[
  {name:'name',label:'Nome (ex: Nubank, Carteira)',required:true,half:true},
  {name:'institution',label:'Institui\u00e7\u00e3o/banco',half:true},
  {name:'type',label:'Tipo',type:'select',options:ACC_TYPES,half:true},
  {name:'is_credit',type:'checkbox',cklabel:'\u00c9 cart\u00e3o de cr\u00e9dito',label:'Cr\u00e9dito/D\u00e9bito',half:true},
  {name:'balance_cents',label:'Saldo atual (R$)',money:true},
  sharedField(row&&row.shared)], row?{...row,balance_cents:(row.balance_cents/100).toString().replace('.',',')}:{},
  async out=>{ if(row) await DB.update('accounts',row.id,out); else await DB.insert('accounts',out); go('accounts'); }); }
SCREENS.accounts = async m => {
  const accs = await getAll('accounts');
  m.innerHTML = head('Contas e institui\u00e7\u00f5es','Seus bancos, carteiras e cart\u00f5es.',
    `<button class="btn primary" id="add">+ Nova conta</button>`) +
    (accs.length? `<div class="list">`+accs.map(a=>`<div class="item"><div class="mn"><div class="nm">${esc(a.name)} ${a.is_credit?'<span class="chip">cr\u00e9dito</span>':''}</div>
      <div class="mt">${esc(a.institution||'')} \u00b7 ${esc((ACC_TYPES.find(t=>t.v===a.type)||{}).l||a.type)}</div>${privChip(a)}</div>
      <div class="rt"><span class="amount ${a.is_credit?'neg':'pos'}">${cents(a.balance_cents)}</span>
      <div class="rowbtns"><button class="btn small" data-ed="${a.id}">Editar</button><button class="btn small red" data-del="${a.id}">Excluir</button></div></div></div>`).join('')+`</div>`
      : emptyState('\ud83c\udfe6','Nenhuma conta ainda','Cadastre seus bancos e carteiras.','Adicionar primeira conta',()=>accForm()));
  wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>accForm();
  m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>accForm(accs.find(a=>a.id===b.dataset.ed)));
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmBox('Excluir esta conta?',async()=>{await DB.remove('accounts',b.dataset.del);go('accounts');}));
};

// ---------- MINHAS FINAN\u00c7AS (vis\u00e3o geral) ----------
SCREENS.finances = async m => {
  const [accs,debts,goals] = await Promise.all([getAll('accounts'),getAll('debts'),getAll('goals')]);
  const mine=accs.filter(a=>a.owner_id===UID);
  const saldo=mine.reduce((s,a)=>s+(a.is_credit?0:Number(a.balance_cents)),0);
  const dividas=debts.filter(d=>d.owner_id===UID&&d.status!=='paga').reduce((s,d)=>s+(Number(d.total_cents)-Number(d.paid_cents)),0);
  const guardado=goals.reduce((s,g)=>s+Number(g.saved_cents||0),0);
  m.innerHTML=head('Minhas finan\u00e7as','Vis\u00e3o geral \u2014 s\u00f3 voc\u00ea v\u00ea isto (salvo itens compartilhados).')+
  `<div class="stats"><div class="stat"><div class="k">Saldo total</div><div class="v pos">${cents(saldo)}</div></div>
   <div class="stat"><div class="k">D\u00edvidas</div><div class="v neg">${cents(dividas)}</div></div>
   <div class="stat"><div class="k">Guardado em caixinhas</div><div class="v">${cents(guardado)}</div></div>
   <div class="stat"><div class="k">Patrim\u00f4nio l\u00edquido</div><div class="v">${cents(saldo-dividas)}</div></div></div>
   <div class="panel"><h3>Minhas contas</h3>${mine.length?`<div class="list">`+mine.map(a=>`<div class="item"><div class="mn"><div class="nm">${esc(a.name)}</div><div class="mt">${esc(a.institution||'')}</div></div><span class="amount ${a.is_credit?'neg':'pos'}">${cents(a.balance_cents)}</span></div>`).join('')+`</div>`:'<p class="subtitle">Nenhuma conta cadastrada.</p>'}</div>`;
  wireHead();
};

// ---------- D\u00cdVIDAS E PAGAMENTOS PARCIAIS ----------
function debtForm(row){ openForm(row?'Editar d\u00edvida/conta':'Nova d\u00edvida/conta',[
  {name:'description',label:'Descri\u00e7\u00e3o',required:true},
  {name:'total_cents',label:'Valor total (R$)',money:true,half:true},
  {name:'due_date',label:'Vencimento',type:'date',half:true},
  {name:'creditor',label:'Credor/institui\u00e7\u00e3o',half:true},
  {name:'category',label:'Categoria',half:true},
  {name:'notes',label:'Observa\u00e7\u00f5es',type:'textarea'},
  sharedField(row&&row.shared)], row?{...row,total_cents:(row.total_cents/100).toString().replace('.',',')}:{},
  async out=>{ if(row){ await DB.update('debts',row.id,out);} else { out.paid_cents=0; out.status='pendente'; await DB.insert('debts',out);} go('debts'); }); }
function debtStatus(d){ const rest=Number(d.total_cents)-Number(d.paid_cents);
  if(rest<=0) return 'paga'; if(Number(d.paid_cents)>0) return 'parcial';
  if(d.due_date&&daysTo(d.due_date)<0) return 'vencida'; return 'pendente'; }
async function payDebt(d){
  const accs=await getAll('accounts');
  const payAccs=accs.filter(a=>!a.is_credit);
  const accOpts=[{v:'',l:'N\u00e3o descontar de conta'}].concat(payAccs.map(a=>({v:a.id,l:a.name+' ('+cents(a.balance_cents)+')'})));
  openForm('Pagar \u2014 '+d.description,[
  {name:'amount_cents',label:'Valor do pagamento (R$)',money:true,required:true,def:((Number(d.total_cents)-Number(d.paid_cents))/100).toString().replace('.',',')},
  {name:'from_account',label:'Pagar com qual conta/saldo',type:'select',options:accOpts},
  {name:'paid_at',label:'Data',type:'date',def:today(),half:true},
  {name:'method',label:'Forma de pagamento',type:'select',options:['Pix','D\u00e9bito','Cr\u00e9dito','Dinheiro','Caixinha','Boleto'],half:true},
  {name:'note',label:'Observa\u00e7\u00e3o'}], {},
  async out=>{ const acc=payAccs.find(a=>a.id===out.from_account);
    const methodFull=(out.method||'')+(acc?' \u00b7 '+acc.name:'');
    await DB.insert('payments',{debt_id:d.id,shared:d.shared,payer_id:UID,amount_cents:out.amount_cents,paid_at:out.paid_at,method:methodFull,note:out.note});
    const paid=Number(d.paid_cents)+Number(out.amount_cents);
    const status=paid>=Number(d.total_cents)?'paga':(paid>0?'parcial':'pendente');
    await DB.update('debts',d.id,{paid_cents:paid,status});
    if(acc){ await DB.update('accounts',acc.id,{balance_cents:Number(acc.balance_cents)-Number(out.amount_cents)}); }
    go('debts'); toast(acc?('Pago. Saldo de '+acc.name+' atualizado.'):'Pagamento registrado.'); }); }
// recibo de d\u00edvida em PNG (mostra pago, conta usada e o que falta)
function debtReceipt(d,allPays){
  const pays=(allPays||[]).filter(p=>p.debt_id===d.id).sort((a,b)=>(a.paid_at||'').localeCompare(b.paid_at||''));
  const paid=Number(d.paid_cents), rest=Math.max(0,Number(d.total_cents)-paid);
  const rows=pays.map(p=>`<div class="ln"><span>${fmtDate(p.paid_at)||'\u2014'} \u00b7 ${esc(p.method||'')}</span><b>${cents(p.amount_cents)}</b></div>`).join('')||'<div class="mt">Nenhum pagamento ainda.</div>';
  const html=`<div class="modal-bg" id="modal"><div class="modal" style="max-width:400px"><h3>Recibo</h3>
    <div id="rcpt" class="receipt"><h2>${esc(d.description)}</h2><div class="mt">${esc(d.creditor||'')}${d.due_date?' \u00b7 vence '+fmtDate(d.due_date):''}</div>
    <div class="ln"><span>Valor total</span><b>${cents(d.total_cents)}</b></div>
    <div class="ln"><span>J\u00e1 pago</span><b>${cents(paid)}</b></div>
    <div class="ln tot"><span>Falta</span><span>${cents(rest)}</span></div>
    <div class="mt" style="margin:10px 0 2px"><b>Pagamentos</b></div>${rows}
    <div class="mt" style="margin-top:8px">Ninho \u00b7 resumo informativo (n\u00e3o \u00e9 nota fiscal)</div></div>
    <div class="modal-actions"><button class="btn" id="rcopy">Copiar texto</button><button class="btn primary" id="rpng">Baixar PNG</button>
    <button class="btn green" id="rshare">Compartilhar</button><button class="btn" id="rclose">Fechar</button></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  const txt=`\ud83e\uddfe ${d.description}\nTotal: ${cents(d.total_cents)}\nPago: ${cents(paid)} \u00b7 Falta: ${cents(rest)}\n`+pays.map(p=>`\u2022 ${fmtDate(p.paid_at)} ${p.method||''}: ${cents(p.amount_cents)}`).join('\n');
  $('#rclose').onclick=closeModal; $('#modal').onclick=e=>{if(e.target.id==='modal')closeModal();};
  $('#rcopy').onclick=()=>{navigator.clipboard.writeText(txt).then(()=>toast('Texto copiado!'));};
  const makePng=async()=>{ if(!window.html2canvas) return null; return await html2canvas($('#rcpt'),{backgroundColor:null,scale:2}); };
  $('#rpng').onclick=async()=>{ const c=await makePng(); if(!c){toast('Gerador de imagem indispon\u00edvel.','err');return;} const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='divida_'+(d.description||'ninho').replace(/\W+/g,'_')+'.png'; a.click(); };
  $('#rshare').onclick=async()=>{ try{ const c=await makePng(); if(c&&navigator.canShare){ c.toBlob(async blob=>{ const file=new File([blob],'recibo.png',{type:'image/png'}); if(navigator.canShare({files:[file]})) await navigator.share({files:[file],text:txt}); else await navigator.share({text:txt}); }); } else if(navigator.share){ await navigator.share({text:txt}); } else { navigator.clipboard.writeText(txt); toast('Compartilhamento n\u00e3o suportado; texto copiado.'); } }catch(e){} };
}
SCREENS.debts = async m => {
  const [debts,pays]=await Promise.all([getAll('debts'),getAll('payments')]);
  const rows=debts.map(d=>({...d,st:debtStatus(d)}));
  const stChip={paga:'ok',parcial:'pend',pendente:'',vencida:'late'};
  m.innerHTML=head('D\u00edvidas e pagamentos','Registre d\u00edvidas e pagamentos parciais.',
    `<button class="btn primary" id="add">+ Nova d\u00edvida</button>`)+
    (rows.length?`<div class="list">`+rows.map(d=>{ const rest=Number(d.total_cents)-Number(d.paid_cents); const pc=Math.min(100,Math.round(Number(d.paid_cents)/Math.max(1,Number(d.total_cents))*100));
      return `<div class="item"><div class="mn"><div class="nm">${esc(d.description)} <span class="chip ${stChip[d.st]||''}">${d.st}</span> ${privChip(d)}</div>
      <div class="mt">${esc(d.creditor||'')}${d.due_date?' \u00b7 vence '+fmtDate(d.due_date):''} \u00b7 pago ${cents(d.paid_cents)} de ${cents(d.total_cents)}</div>
      <div class="progress"><i style="width:${pc}%"></i></div>${authorLine(d)}</div>
      <div class="rt"><span class="amount ${rest>0?'neg':'pos'}">${cents(rest)}</span>
      <div class="rowbtns">${d.st!=='paga'?`<button class="btn small green" data-pay="${d.id}">Pagar</button>`:''}<button class="btn small pale" data-r="${d.id}">Recibo</button><button class="btn small" data-ed="${d.id}">Editar</button><button class="btn small red" data-del="${d.id}">Excluir</button></div></div></div>`;}).join('')+`</div>`
      :emptyState('\ud83e\uddfe','Nenhuma d\u00edvida','\u00d3timo! Ou adicione uma para controlar.','Adicionar primeira d\u00edvida',()=>debtForm()));
  wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>debtForm();
  m.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>payDebt(debts.find(d=>d.id===b.dataset.pay)));
  m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>debtReceipt(debts.find(d=>d.id===b.dataset.r),pays));
  m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>debtForm(debts.find(d=>d.id===b.dataset.ed)));
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmBox('Excluir esta d\u00edvida e seus pagamentos?',async()=>{await DB.remove('debts',b.dataset.del);go('debts');}));
};

// ---------- CAIXINHAS / METAS ----------
function goalForm(row){ openForm(row?'Editar caixinha':'Nova caixinha/meta',[
  {name:'name',label:'Nome (ex: Natal, Viagem)',required:true},
  {name:'target_cents',label:'Meta (R$)',money:true},
  sharedField(row&&row.shared)], row?{...row,target_cents:(row.target_cents/100).toString().replace('.',',')}:{},
  async out=>{ if(row) await DB.update('goals',row.id,out); else { out.saved_cents=0; await DB.insert('goals',out);} go('goals'); }); }
async function contribGoal(g){ openForm('Guardar/retirar \u2014 '+g.name,[
  {name:'amount_cents',label:'Valor (R$) \u2014 use sinal para retirar? N\u00e3o: use o bot\u00e3o',money:true,required:true},
  {name:'kind',label:'Opera\u00e7\u00e3o',type:'select',options:[{v:'in',l:'Guardar (entrada)'},{v:'out',l:'Retirar (sa\u00edda)'}]},
  {name:'note',label:'Observa\u00e7\u00e3o'}],{},
  async out=>{ const delta=out.kind==='out'?-out.amount_cents:out.amount_cents;
    await DB.insert('payments',{goal_id:g.id,amount_cents:delta,note:out.note,shared:g.shared,payer_id:UID});
    await DB.update('goals',g.id,{saved_cents:Math.max(0,Number(g.saved_cents)+delta)}); go('goals'); toast('Caixinha atualizada.'); }); }
SCREENS.goals = async m => {
  const goals=await getAll('goals');
  m.innerHTML=head('Caixinhas e metas','Guarde dinheiro para objetivos \u2014 sozinha ou com a casa.',
    `<button class="btn primary" id="add">+ Nova caixinha</button>`)+
    (goals.length?`<div class="grid2">`+goals.map(g=>{const pc=Math.min(100,Math.round(Number(g.saved_cents)/Math.max(1,Number(g.target_cents))*100));
      return `<div class="panel"><h3>${esc(g.name)} ${privChip(g)}</h3><div class="amount">${cents(g.saved_cents)} <span class="mt">de ${cents(g.target_cents)}</span></div>
      <div class="progress"><i style="width:${pc}%"></i></div>${authorLine(g)}
      <div class="rowbtns" style="margin-top:10px"><button class="btn small green" data-c="${g.id}">Guardar/retirar</button><button class="btn small" data-ed="${g.id}">Editar</button><button class="btn small red" data-del="${g.id}">Excluir</button></div></div>`;}).join('')+`</div>`
      :emptyState('\ud83d\udc37','Nenhuma caixinha','Crie uma meta como \u201cNatal\u201d e guarde aos poucos.','Criar primeira caixinha',()=>goalForm()));
  wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>goalForm();
  m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>contribGoal(goals.find(g=>g.id===b.dataset.c)));
  m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>goalForm(goals.find(g=>g.id===b.dataset.ed)));
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmBox('Excluir esta caixinha?',async()=>{await DB.remove('goals',b.dataset.del);go('goals');}));
};

// ---------- INVENT\u00c1RIO / MERCADO (compartilhado) ----------
const UNITS=['un','pacote','caixa','garrafa','lata','kg','g','litro','ml','d\u00fazia'];
const INV_ST=[{v:'disponivel',l:'Dispon\u00edvel'},{v:'baixo',l:'Estoque baixo'},{v:'acabou',l:'Acabou/comprar'},{v:'comprado',l:'Comprado'}];
// categorias fixas de mercado
const MKT_CATS=['Aliment\u00edcio','Frutas','Verduras','Carnes','Latic\u00ednios','Padaria','Bebidas','Limpeza','Higiene','Beb\u00ea','Pet','Casa','Outros'];
// carrinho de mercado (sess\u00e3o local no aparelho)
const CART_KEY='ninho_cart';
const cartLoad=()=>{ try{ return JSON.parse(localStorage.getItem(CART_KEY)||'[]'); }catch(e){ return []; } };
const cartSave=c=>localStorage.setItem(CART_KEY,JSON.stringify(c));
let INV_TAB='inventario';
function invForm(row){ openForm(row?'Editar item':'Novo item de mercado',[
  {name:'name',label:'Produto',required:true,half:true},
  {name:'category',label:'Categoria',type:'select',options:MKT_CATS,half:true},
  {name:'qty',label:'Quantidade atual',num:true,type:'number',half:true},
  {name:'unit',label:'Unidade',type:'select',options:UNITS,half:true},
  {name:'qty_min',label:'Quantidade m\u00ednima',num:true,type:'number',half:true},
  {name:'qty_buy',label:'Comprar (qtd)',num:true,type:'number',half:true},
  {name:'status',label:'Estado',type:'select',options:INV_ST},
  {name:'note',label:'Observa\u00e7\u00e3o',type:'textarea'}], row||{unit:'un',status:'disponivel',qty:0,qty_min:0},
  async out=>{ if(row) await DB.update('inventory_items',row.id,out); else await DB.insert('inventory_items',out); go('inventory'); }); }
SCREENS.inventory = async m => {
  let inv=await getAll('inventory_items');
  const tabsBar=`<div class="filters">
    <button class="btn ${INV_TAB==='inventario'?'primary':''}" data-it="inventario">\ud83d\udce6 Invent\u00e1rio</button>
    <button class="btn ${INV_TAB==='mercado'?'primary':''}" data-it="mercado">\ud83d\uded2 Mercado</button></div>`;
  if(INV_TAB==='mercado'){ mercadoTab(m,inv,tabsBar); return; }
  const rank={acabou:0,baixo:1,disponivel:2,comprado:3};
  inv.sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9));
  const stC={acabou:'late',baixo:'pend',comprado:'ok',disponivel:''};
  m.innerHTML=head('Invent\u00e1rio / mercado','O que tem em casa e o que est\u00e1 acabando.',
    `<button class="btn primary" id="add">+ Novo item</button>`)+tabsBar+
    `<div class="filters"><input id="q" placeholder="Buscar item\u2026"></div>`+
    (inv.length?`<div class="list" id="ilist">`+inv.map(i=>`<div class="item" data-nm="${esc((i.name||'').toLowerCase())}"><div class="mn"><div class="nm">${esc(i.name)} <span class="chip ${stC[i.status]||''}">${(INV_ST.find(s=>s.v===i.status)||{}).l||i.status}</span></div>
      <div class="mt">${i.qty} ${esc(i.unit)} ${i.qty_min?'\u00b7 m\u00edn '+i.qty_min:''} ${i.qty_buy?'\u00b7 comprar '+i.qty_buy:''} ${esc(i.category||'')}</div>
      <span class="mt">atualizado por ${esc(memberName(i.updated_by||i.created_by))}</span></div>
      <div class="rt"><div class="rowbtns">${i.status!=='comprado'?`<button class="btn small green" data-buy="${i.id}">Comprei</button>`:''}<button class="btn small" data-ed="${i.id}">Editar</button><button class="btn small red" data-del="${i.id}">Excluir</button></div></div></div>`).join('')+`</div>`
      :emptyState('\ud83e\uddfa','Mercado vazio','Adicione o que costuma faltar em casa.','Adicionar item',()=>invForm()));
  wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>invForm();
  m.querySelectorAll('[data-it]').forEach(b=>b.onclick=()=>{INV_TAB=b.dataset.it;go('inventory');});
  const q=$('#q'); if(q) q.oninput=()=>{const v=q.value.toLowerCase(); m.querySelectorAll('#ilist .item').forEach(it=>it.style.display=it.dataset.nm.includes(v)?'':'none');};
  m.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{await DB.update('inventory_items',b.dataset.buy,{status:'comprado'});go('inventory');});
  m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>invForm(inv.find(i=>i.id===b.dataset.ed)));
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmBox('Excluir este item?',async()=>{await DB.remove('inventory_items',b.dataset.del);go('inventory');}));
};

// Aba Mercado: carrinho que soma os valores enquanto faz a compra
function cartAdd(preset){ openForm('Adicionar ao mercado',[
  {name:'name',label:'Produto',required:true,half:true},
  {name:'category',label:'Categoria',type:'select',options:MKT_CATS,half:true},
  {name:'qty',label:'Quantidade',type:'number',num:true,def:1,half:true},
  {name:'price_cents',label:'Pre\u00e7o por unidade (R$)',money:true,half:true}], preset||{qty:1,category:'Aliment\u00edcio'},
  async out=>{ const c=cartLoad(); c.push({name:out.name,category:out.category,qty:Number(out.qty)||1,price_cents:Number(out.price_cents)||0}); cartSave(c); go('inventory'); }); }
function mercadoTab(m,inv,tabsBar){
  const cart=cartLoad();
  const total=cart.reduce((s,i)=>s+Number(i.price_cents||0)*Number(i.qty||1),0);
  const faltando=inv.filter(i=>i.status==='baixo'||i.status==='acabou');
  const sugg=faltando.length?`<div class="panel"><h3>Est\u00e1 faltando em casa</h3><div class="rowbtns">`+
    faltando.map(i=>`<button class="btn small pale" data-sg="${esc(i.name)}|${esc(i.category||'')}">+ ${esc(i.name)}</button>`).join('')+`</div></div>`:'';
  const lines=cart.length?`<div class="list">`+cart.map((i,ix)=>`<div class="item"><div class="mn"><div class="nm">${esc(i.name)}</div>
      <div class="mt">${i.qty} \u00d7 ${cents(i.price_cents)} \u00b7 ${esc(i.category||'')}</div></div>
      <div class="rt"><span class="amount">${cents(Number(i.price_cents)*Number(i.qty))}</span><div class="rowbtns"><button class="btn small red" data-rm="${ix}">x</button></div></div></div>`).join('')+`</div>`
    :'<p class="subtitle">Lista vazia. Toque em \u201c+ Item\u201d para come\u00e7ar.</p>';
  m.innerHTML=head('Mercado','Some os valores enquanto faz a compra.',
    `<button class="btn primary" id="cadd">+ Item</button>`)+tabsBar+sugg+
    `<div class="panel"><h3>Carrinho <span class="amount">${cents(total)}</span></h3>${lines}
     <div class="rowbtns" style="margin-top:12px"><button class="btn green" id="cfin">Finalizar e salvar</button><button class="btn red" id="cclr">Limpar lista</button></div></div>`;
  wireHead();
  m.querySelectorAll('[data-it]').forEach(b=>b.onclick=()=>{INV_TAB=b.dataset.it;go('inventory');});
  const cb=$('#cadd'); if(cb) cb.onclick=()=>cartAdd();
  m.querySelectorAll('[data-sg]').forEach(b=>b.onclick=()=>{const [nm,cat]=b.dataset.sg.split('|');cartAdd({name:nm,category:cat||'Aliment\u00edcio',qty:1});});
  m.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const c=cartLoad();c.splice(Number(b.dataset.rm),1);cartSave(c);go('inventory');});
  const clr=$('#cclr'); if(clr) clr.onclick=()=>confirmBox('Limpar toda a lista de mercado?',()=>{cartSave([]);go('inventory');});
  const fin=$('#cfin'); if(fin) fin.onclick=()=>{ const c=cartLoad(); if(!c.length){toast('Lista vazia.');return;}
    const tot=c.reduce((s,i)=>s+Number(i.price_cents)*Number(i.qty),0);
    confirmBox('Salvar esta compra de '+cents(tot)+' em \u201cCompras\u201d e limpar a lista?',async()=>{
      try{ await DB.insert('purchases',{product:'Mercado '+fmtDate(today()),category:'Mercado',total_cents:tot,store:'',method:'\u00c0 vista',installments:1,installment_cents:tot,paid_installments:1,buy_date:today(),shared:true}); }catch(e){}
      cartSave([]); toast('Compra salva em Compras!'); go('inventory'); }); };
}

// ---------- COMPRAS E RECIBOS ----------
function purForm(row){ openForm(row?'Editar compra':'Nova compra',[
  {name:'product',label:'Produto',required:true,half:true},
  {name:'category',label:'Categoria',half:true},
  {name:'total_cents',label:'Pre\u00e7o total (R$)',money:true,half:true},
  {name:'store',label:'Loja',half:true},
  {name:'link',label:'Link (se online)'},
  {name:'buy_date',label:'Data da compra',type:'date',half:true},
  {name:'method',label:'Forma de pagamento',type:'select',options:['\u00c0 vista','Parcelado','Pix','Cr\u00e9dito','D\u00e9bito','Boleto'],half:true},
  {name:'account',label:'Banco/cart\u00e3o usado',half:true},
  {name:'installments',label:'Qtd. parcelas',type:'number',num:true,def:1,half:true},
  {name:'paid_installments',label:'Parcelas pagas',type:'number',num:true,def:0,half:true},
  {name:'photo_url',label:'Foto (opcional)',type:'file'},
  sharedField(row&&row.shared)], row?{...row,total_cents:(row.total_cents/100).toString().replace('.',',')}:{installments:1,paid_installments:0},
  async out=>{ out.installments=Math.max(1,parseInt(out.installments)||1); out.installment_cents=Math.round(out.total_cents/out.installments);
    if(row){ if(!out.photo_url) delete out.photo_url; await DB.update('purchases',row.id,out);} else await DB.insert('purchases',out); go('purchases'); }); }
function purReceipt(p){ const paid=p.paid_installments*p.installment_cents; const rest=Number(p.total_cents)-paid;
  const lines=[['Produto',p.product],['Loja',p.store||'\u2014'],['Pagamento',p.method||'\u2014'],
    ['Parcelas',`${p.paid_installments}/${p.installments} pagas`],['Valor da parcela',cents(p.installment_cents)],
    ['Pago',cents(paid)],['Falta',cents(rest)]];
  const html=`<div class="modal-bg" id="modal"><div class="modal" style="max-width:400px"><h3>Recibo</h3>
    <div id="rcpt" class="receipt"><h2>${esc(p.product)}</h2><div class="mt">${esc(p.store||'')} \u00b7 ${fmtDate(p.buy_date)||''}</div>
    ${lines.map(l=>`<div class="ln"><span>${esc(l[0])}</span><b>${esc(l[1])}</b></div>`).join('')}
    <div class="ln tot"><span>Total</span><span>${cents(p.total_cents)}</span></div>
    <div class="mt" style="margin-top:8px">Ninho \u00b7 resumo informativo (n\u00e3o \u00e9 nota fiscal)</div></div>
    <div class="modal-actions"><button class="btn" id="rcopy">Copiar texto</button><button class="btn primary" id="rpng">Baixar PNG</button>
    <button class="btn green" id="rshare">Compartilhar</button><button class="btn" id="rclose">Fechar</button></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  const txt=`\ud83e\udeb9 ${p.product}\n${p.store||''}\nTotal: ${cents(p.total_cents)}\n${p.method||''} \u2014 ${p.paid_installments}/${p.installments} parcelas\nPago: ${cents(paid)} \u00b7 Falta: ${cents(rest)}`;
  $('#rclose').onclick=closeModal; $('#modal').onclick=e=>{if(e.target.id==='modal')closeModal();};
  $('#rcopy').onclick=()=>{navigator.clipboard.writeText(txt).then(()=>toast('Texto copiado!'));};
  const makePng=async()=>{ if(!window.html2canvas) return null; const c=await html2canvas($('#rcpt'),{backgroundColor:null,scale:2}); return c; };
  $('#rpng').onclick=async()=>{ const c=await makePng(); if(!c){toast('Gerador de imagem indispon\u00edvel.','err');return;} const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='recibo_'+(p.product||'ninho').replace(/\W+/g,'_')+'.png'; a.click(); };
  $('#rshare').onclick=async()=>{ try{ const c=await makePng(); if(c&&navigator.canShare){ c.toBlob(async blob=>{ const file=new File([blob],'recibo.png',{type:'image/png'}); if(navigator.canShare({files:[file]})) await navigator.share({files:[file],text:txt}); else await navigator.share({text:txt}); }); } else if(navigator.share){ await navigator.share({text:txt}); } else { navigator.clipboard.writeText(txt); toast('Compartilhamento n\u00e3o suportado; texto copiado.'); } }catch(e){} };
}
SCREENS.purchases = async m => {
  const pur=await getAll('purchases');
  m.innerHTML=head('Compras e recibos','Planeje compras, parcelas e gere recibos em PNG.',
    `<button class="btn primary" id="add">+ Nova compra</button>`)+
    (pur.length?`<div class="list">`+pur.map(p=>{const paid=p.paid_installments*p.installment_cents;const rest=Number(p.total_cents)-paid;
      return `<div class="item"><div class="mn"><div class="nm">${esc(p.product)} ${privChip(p)}</div>
      <div class="mt">${esc(p.store||'')} \u00b7 ${esc(p.method||'')} \u00b7 ${p.paid_installments}/${p.installments} parcelas \u00b7 falta ${cents(rest)}</div>${authorLine(p)}</div>
      <div class="rt"><span class="amount">${cents(p.total_cents)}</span><div class="rowbtns"><button class="btn small pale" data-r="${p.id}">Recibo</button><button class="btn small" data-ed="${p.id}">Editar</button><button class="btn small red" data-del="${p.id}">Excluir</button></div></div></div>`;}).join('')+`</div>`
      :emptyState('\ud83d\udecd\ufe0f','Nenhuma compra','Registre compras \u00e0 vista ou parceladas.','Adicionar compra',()=>purForm()));
  wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>purForm();
  m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>purReceipt(pur.find(p=>p.id===b.dataset.r)));
  m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>purForm(pur.find(p=>p.id===b.dataset.ed)));
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmBox('Excluir esta compra?',async()=>{await DB.remove('purchases',b.dataset.del);go('purchases');}));
};

// ---------- REFORMA (compartilhada) ----------
const REF_ST=[{v:'planejada',l:'Planejada'},{v:'andamento',l:'Em andamento'},{v:'pausada',l:'Pausada'},{v:'concluida',l:'Conclu\u00edda'}];
let REFORM_SEL=null;
function reformForm(row){ openForm(row?'Editar reforma':'Nova reforma',[
  {name:'name',label:'Nome (ex: Troca da janela)',required:true,half:true},
  {name:'area',label:'C\u00f4modo/\u00e1rea',half:true},
  {name:'description',label:'Descri\u00e7\u00e3o',type:'textarea'},
  {name:'budget_cents',label:'Or\u00e7amento estimado (R$)',money:true,half:true},
  {name:'status',label:'Estado',type:'select',options:REF_ST,half:true},
  {name:'start_date',label:'In\u00edcio',type:'date',half:true},
  {name:'est_end',label:'Previs\u00e3o fim',type:'date',half:true},
  {name:'cover_url',label:'Foto de capa',type:'file'}], row?{...row,budget_cents:(row.budget_cents/100).toString().replace('.',',')}:{status:'planejada'},
  async out=>{ if(row){ if(!out.cover_url) delete out.cover_url; await DB.update('reforms',row.id,out);} else await DB.insert('reforms',out); go('reform'); }); }
async function reformPay(r){ openForm('Registrar pagamento \u2014 '+r.name,[
  {name:'amount_cents',label:'Valor (R$)',money:true,required:true,half:true},
  {name:'paid_at',label:'Data',type:'date',def:today(),half:true},
  {name:'method',label:'Forma/parcela',half:true},
  {name:'note',label:'Descri\u00e7\u00e3o (ex: 2\u00aa parcela janela)',half:true}],{},
  async out=>{ out.reform_id=r.id; out.shared=true; out.payer_id=UID; await DB.insert('payments',out); go('reform'); toast('Pagamento registrado.'); }); }
SCREENS.reform = async m => {
  const [reforms,pays]=await Promise.all([getAll('reforms'),getAll('payments')]);
  if(REFORM_SEL&&!reforms.find(r=>r.id===REFORM_SEL)) REFORM_SEL=null;
  if(!REFORM_SEL){
    m.innerHTML=head('Reforma da casa','Projetos, or\u00e7amento, parcelas e quem pagou.',
      `<button class="btn primary" id="add">+ Nova reforma</button>`)+
      (reforms.length?`<div class="grid2">`+reforms.map(r=>{const paid=pays.filter(p=>p.reform_id===r.id).reduce((s,p)=>s+Number(p.amount_cents),0);const pc=Math.min(100,Math.round(paid/Math.max(1,Number(r.budget_cents))*100));
        return `<div class="panel"><h3>${esc(r.icon||'\ud83d\udd28')} ${esc(r.name)} <span class="chip">${(REF_ST.find(s=>s.v===r.status)||{}).l||r.status}</span></h3>
        <div class="mt">${esc(r.area||'')}</div><div class="amount">${cents(paid)} <span class="mt">de ${cents(r.budget_cents)} \u00b7 falta ${cents(Math.max(0,Number(r.budget_cents)-paid))}</span></div>
        <div class="progress"><i style="width:${pc}%"></i></div>${authorLine(r)}
        <div class="rowbtns" style="margin-top:10px"><button class="btn small primary" data-open="${r.id}">Abrir</button><button class="btn small green" data-pay="${r.id}">+ Pagamento</button><button class="btn small" data-ed="${r.id}">Editar</button></div></div>`;}).join('')+`</div>`
        :emptyState('\ud83d\udd28','Nenhuma reforma','Crie um projeto como \u201cPintura\u201d ou \u201cBanheiro\u201d.','Criar reforma',()=>reformForm()));
    wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>reformForm();
    m.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{REFORM_SEL=b.dataset.open;go('reform');});
    m.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>reformPay(reforms.find(r=>r.id===b.dataset.pay)));
    m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>reformForm(reforms.find(r=>r.id===b.dataset.ed)));
    return;
  }
  // detalhe
  const r=reforms.find(x=>x.id===REFORM_SEL);
  const items=(await DB.list('reform_items',{eq:{reform_id:r.id},order:'created_at'}));
  const rp=pays.filter(p=>p.reform_id===r.id).sort((a,b)=>(b.paid_at||'').localeCompare(a.paid_at||''));
  const paid=rp.reduce((s,p)=>s+Number(p.amount_cents),0);
  m.innerHTML=head(r.name,r.area||'',`<button class="btn" id="back">\u2190 Voltar</button><button class="btn green" id="pay">+ Pagamento</button>`)+
  (r.cover_url?`<img src="${esc(r.cover_url)}" style="width:100%;max-height:220px;object-fit:cover;border-radius:16px;margin-bottom:14px">`:'')+
  `<div class="stats"><div class="stat"><div class="k">Or\u00e7amento</div><div class="v">${cents(r.budget_cents)}</div></div>
   <div class="stat"><div class="k">Pago</div><div class="v pos">${cents(paid)}</div></div>
   <div class="stat"><div class="k">Falta</div><div class="v neg">${cents(Math.max(0,Number(r.budget_cents)-paid))}</div></div>
   <div class="stat"><div class="k">Estado</div><div class="v" style="font-size:17px">${(REF_ST.find(s=>s.v===r.status)||{}).l}</div></div></div>
   <div class="panel"><h3>Materiais e compras <button class="btn small" id="additem">+ Item</button></h3>
   ${items.length?`<div class="list">`+items.map(i=>`<div class="item"><div class="mn"><div class="nm">${esc(i.name)}</div><div class="mt">${esc(i.kind)} \u00b7 ${esc(i.store||'')} \u00b7 ${i.installments>1?i.installments+'x':'\u00e0 vista'}</div></div><span class="amount">${cents(i.total_cents)}</span></div>`).join('')+`</div>`:'<p class="subtitle">Sem itens ainda.</p>'}</div>
   <div class="panel"><h3>Pagamentos (quem pagou)</h3>${rp.length?`<div class="list">`+rp.map(p=>`<div class="item"><div class="mn"><div class="nm">${esc(p.note||p.method||'Pagamento')}</div><div class="mt">${fmtDate(p.paid_at)} \u00b7 ${esc(memberName(p.payer_id))}</div></div><div class="rt"><span class="amount">${cents(p.amount_cents)}</span><button class="btn small red" data-dp="${p.id}">x</button></div></div>`).join('')+`</div>`:'<p class="subtitle">Nenhum pagamento registrado.</p>'}</div>
   <div class="panel"><button class="btn ${r.status==='concluida'?'':'green'}" id="done">${r.status==='concluida'?'Reabrir reforma':'Marcar como conclu\u00edda'}</button> <button class="btn" id="edit">Editar</button> <button class="btn red" id="delr">Excluir reforma</button></div>`;
  wireHead();
  $('#back').onclick=()=>{REFORM_SEL=null;go('reform');};
  $('#pay').onclick=()=>reformPay(r);
  $('#edit').onclick=()=>reformForm(r);
  $('#done').onclick=async()=>{await DB.update('reforms',r.id,{status:r.status==='concluida'?'andamento':'concluida'});go('reform');};
  $('#delr').onclick=()=>confirmBox('Excluir a reforma e seus registros?',async()=>{await DB.remove('reforms',r.id);REFORM_SEL=null;go('reform');});
  $('#additem').onclick=()=>openForm('Novo item da reforma',[
    {name:'name',label:'Item/servi\u00e7o',required:true,half:true},
    {name:'kind',label:'Tipo',type:'select',options:['material','servi\u00e7o','m\u00e3o de obra','compra'],half:true},
    {name:'store',label:'Loja/fornecedor',half:true},{name:'total_cents',label:'Valor (R$)',money:true,half:true},
    {name:'installments',label:'Parcelas',type:'number',num:true,def:1},{name:'link',label:'Link/comprovante'}],{installments:1},
    async out=>{out.reform_id=r.id; await DB.insert('reform_items',out); go('reform');});
  m.querySelectorAll('[data-dp]').forEach(b=>b.onclick=()=>confirmBox('Remover este pagamento?',async()=>{await DB.remove('payments',b.dataset.dp);go('reform');}));
};

// ---------- PETS ----------
const CARE=[{v:'med',l:'Rem\u00e9dio'},{v:'vet',l:'Vet/vacina'},{v:'food',l:'Alimenta\u00e7\u00e3o'},{v:'hygiene',l:'Higiene'},{v:'clothes',l:'Roupinha/acess\u00f3rio'},{v:'toy',l:'Brinquedo'},{v:'buy',l:'Comprar'}];
let PET_SEL=null;
function petForm(row){ openForm(row?'Editar pet':'Novo pet',[
  {name:'name',label:'Nome',required:true,half:true},
  {name:'species',label:'Esp\u00e9cie (gato/cachorro)',half:true},
  {name:'info',label:'Informa\u00e7\u00f5es (ra\u00e7a, idade)'},
  {name:'notes',label:'Notas',type:'textarea'},
  {name:'photo_url',label:'Foto',type:'file'}], row||{},
  async out=>{ if(row){if(!out.photo_url)delete out.photo_url; await DB.update('pets',row.id,out);} else await DB.insert('pets',out); go('pets'); }); }
function careForm(pet){ openForm('Novo cuidado \u2014 '+pet.name,[
  {name:'kind',label:'Tipo',type:'select',options:CARE},
  {name:'name',label:'Nome/descri\u00e7\u00e3o',required:true},
  {name:'instructions',label:'Instru\u00e7\u00f5es (voc\u00ea define)',type:'textarea'},
  {name:'frequency',label:'Frequ\u00eancia',half:true},
  {name:'start_date',label:'In\u00edcio',type:'date',half:true},
  {name:'end_date',label:'Fim',type:'date',half:true},
  {name:'reminder',type:'checkbox',cklabel:'Criar lembrete',label:'Lembrete',half:true}],{kind:'med'},
  async out=>{ out.pet_id=pet.id;
    const care=await DB.insert('pet_care',out);
    if(out.reminder&&out.start_date){ await DB.insert('events',{title:pet.name+': '+out.name,description:out.instructions||'',date:out.start_date,category:'pets',shared:true,status:'pendente'}); }
    go('pets'); }); }
SCREENS.pets = async m => {
  const pets=await getAll('pets');
  if(PET_SEL&&!pets.find(p=>p.id===PET_SEL)) PET_SEL=null;
  if(!PET_SEL){
    m.innerHTML=head('Pets','Cuidados, rem\u00e9dios, higiene e compras dos bichinhos.',
      `<button class="btn primary" id="add">+ Novo pet</button>`)+
      (pets.length?`<div class="grid3">`+pets.map(p=>`<div class="panel" style="text-align:center"><div style="font-size:46px">${p.photo_url?`<img src="${esc(p.photo_url)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover">`:(p.species||'').includes('gat')?mascotBox('gato'):(p.species||'').includes('capi')?mascotBox('capivara'):mascotBox('cachorro')}</div>
        <h3 style="justify-content:center">${esc(p.name)}</h3><div class="mt">${esc(p.info||p.species||'')}</div>
        <button class="btn small primary" data-open="${p.id}" style="margin-top:8px">Abrir ficha</button></div>`).join('')+`</div>`
        :emptyState('\ud83d\udc3e','Nenhum pet','Cadastre seu gato ou cachorro.','Adicionar pet',()=>petForm()));
    wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>petForm();
    m.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{PET_SEL=b.dataset.open;go('pets');});
    return;
  }
  const p=pets.find(x=>x.id===PET_SEL);
  const care=await DB.list('pet_care',{eq:{pet_id:p.id},order:'created_at'});
  const grp={}; care.forEach(c=>(grp[c.kind]=grp[c.kind]||[]).push(c));
  m.innerHTML=head(p.name,p.info||p.species||'',`<button class="btn" id="back">\u2190 Voltar</button><button class="btn primary" id="addc">+ Cuidado</button><button class="btn" id="edit">Editar</button>`)+
    CARE.map(k=>{const list=grp[k.v]||[]; if(!list.length) return ''; return `<div class="panel"><h3>${esc(k.l)}</h3><div class="list">`+list.map(c=>`<div class="item"><div class="mn"><div class="nm">${esc(c.name)}</div><div class="mt">${esc(c.instructions||'')} ${c.frequency?'\u00b7 '+esc(c.frequency):''} ${c.start_date?'\u00b7 '+fmtDate(c.start_date):''}</div></div><button class="btn small red" data-dc="${c.id}">x</button></div>`).join('')+`</div></div>`;}).join('')+
    (care.length?'':emptyState('\ud83e\uddb4','Sem cuidados ainda','Adicione rem\u00e9dios, higiene, roupinhas e brinquedos.','Adicionar cuidado',()=>careForm(p)))+
    `<div class="panel"><button class="btn red" id="delp">Excluir pet</button></div>`;
  wireHead();
  $('#back').onclick=()=>{PET_SEL=null;go('pets');};
  $('#addc').onclick=()=>careForm(p); $('#edit').onclick=()=>petForm(p);
  $('#delp').onclick=()=>confirmBox('Excluir este pet e seus cuidados?',async()=>{await DB.remove('pets',p.id);PET_SEL=null;go('pets');});
  m.querySelectorAll('[data-dc]').forEach(b=>b.onclick=()=>confirmBox('Remover cuidado?',async()=>{await DB.remove('pet_care',b.dataset.dc);go('pets');}));
};

// ---------- CALEND\u00c1RIO E TAREFAS ----------
const EV_CAT=['pessoal','casa','reforma','pets','externo'];
function evForm(row){ openForm(row?'Editar compromisso':'Novo compromisso/tarefa',[
  {name:'title',label:'T\u00edtulo',required:true},
  {name:'date',label:'Data',type:'date',half:true},{name:'time',label:'Hora',type:'time',half:true},
  {name:'category',label:'Categoria',type:'select',options:EV_CAT,half:true},
  {name:'place',label:'Local',half:true},
  {name:'description',label:'Descri\u00e7\u00e3o',type:'textarea'},
  sharedField(row?row.shared:true)], row||{category:'casa',shared:true,date:today()},
  async out=>{ if(row) await DB.update('events',row.id,out); else { out.status='pendente'; await DB.insert('events',out);} go('calendar'); }); }
let EV_TAB='pendentes';
SCREENS.calendar = async m => {
  const evs=await getAll('events');
  const now=today();
  const tabs={pendentes:e=>e.status==='pendente',concluidos:e=>e.status==='concluida',todos:()=>true};
  let list=evs.filter(tabs[EV_TAB]).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  const catIco={pessoal:'\ud83d\udc64',casa:'\ud83c\udfe0',reforma:'\ud83d\udd28',pets:'\ud83d\udc3e',externo:'\ud83d\udccd'};
  m.innerHTML=head('Calend\u00e1rio e tarefas','Compromissos e tarefas \u2014 mais pr\u00f3ximos primeiro.',
    `<button class="btn primary" id="add">+ Novo</button>`)+
    `<div class="filters">${['pendentes','concluidos','todos'].map(t=>`<button class="btn ${t===EV_TAB?'primary':''}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>`+
    (list.length?`<div class="list">`+list.map(e=>{const late=e.status==='pendente'&&e.date&&e.date<now; return `<div class="item"><div class="mn"><div class="nm">${catIco[e.category]||'\ud83d\udcc5'} ${esc(e.title)} ${late?'<span class="chip late">atrasada</span>':''} ${privChip(e)}</div>
      <div class="mt">${fmtDate(e.date)} ${esc(e.time||'')} ${e.place?'\u00b7 '+esc(e.place):''} \u00b7 por ${esc(memberName(e.created_by||e.owner_id))}</div></div>
      <div class="rt"><div class="rowbtns">${e.status!=='concluida'?`<button class="btn small green" data-ok="${e.id}">Concluir</button>`:`<button class="btn small" data-reopen="${e.id}">Reabrir</button>`}<button class="btn small" data-ed="${e.id}">Editar</button><button class="btn small red" data-del="${e.id}">x</button></div></div></div>`;}).join('')+`</div>`
      :emptyState('\ud83d\udcc5','Nada aqui','Crie um compromisso ou tarefa.','Criar compromisso',()=>evForm()));
  wireHead(); const ab=$('#add'); if(ab) ab.onclick=()=>evForm();
  m.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{EV_TAB=b.dataset.tab;go('calendar');});
  m.querySelectorAll('[data-ok]').forEach(b=>b.onclick=async()=>{await DB.update('events',b.dataset.ok,{status:'concluida'});go('calendar');});
  m.querySelectorAll('[data-reopen]').forEach(b=>b.onclick=async()=>{await DB.update('events',b.dataset.reopen,{status:'pendente'});go('calendar');});
  m.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>evForm(evs.find(e=>e.id===b.dataset.ed)));
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmBox('Excluir este compromisso?',async()=>{await DB.remove('events',b.dataset.del);go('calendar');}));
};

// ---------- RELAT\u00d3RIOS / EXPORTA\u00c7\u00c3O ----------
SCREENS.reports = async m => {
  const tables=['accounts','debts','goals','payments','inventory_items','reforms','reform_items','events','pets','pet_care','purchases'];
  const data={}; for(const t of tables) data[t]=await DB.list(t,{order:'created_at'});
  const accs=data.accounts||[], debts=data.debts||[], goals=data.goals||[], pays=data.payments||[],
        inv=data.inventory_items||[], reforms=data.reforms||[], ritems=data.reform_items||[],
        events=data.events||[], pets=data.pets||[], petcare=data.pet_care||[], purchases=data.purchases||[];
  const saldo = accs.filter(a=>!a.is_credit).reduce((s,a)=>s+Number(a.balance_cents||0),0);
  const dividasAbertas = debts.filter(d=>d.status!=='paga');
  const emAberto = dividasAbertas.reduce((s,d)=>s+(Number(d.total_cents)-Number(d.paid_cents)),0);
  const totalGasto = pays.reduce((s,p)=>s+Math.max(0,Number(p.amount_cents||0)),0);
  const comprasTotal = purchases.reduce((s,p)=>s+Number(p.total_cents||0),0);
  const invBaixo = inv.filter(i=>i.status==='baixo'||i.status==='acabou');
  const proxEventos = events.filter(e=>e.status!=='concluida'&&e.date).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,8);

  function sec(title,inner){ if(!inner) return ''; return `<div class="rp-sec"><h2>${esc(title)}</h2>${inner}</div>`; }
  function tbl(rows){ if(!rows.length) return ''; return `<table class="rp-tbl">${rows.join('')}</table>`; }
  function rowKV(a,b){ return `<tr><td>${a}</td><td class="rp-r">${b}</td></tr>`; }

  const reportBody = `
    <div class="rp-head">
      <div class="rp-logo">\uD83D\uDC31 \uD83D\uDC36 \uD83D\uDC15</div>
      <div><div class="rp-title">${esc(HOUSE.name||'Ninho')}</div>
      <div class="rp-sub">Resumo de ${esc(PROFILE.display_name||'')} \u00b7 ${esc(new Date().toLocaleDateString('pt-BR'))}</div></div>
    </div>
    <div class="rp-cards">
      <div class="rp-card"><div class="rp-k">Saldo em contas</div><div class="rp-v">${cents(saldo)}</div></div>
      <div class="rp-card"><div class="rp-k">D\u00edvidas em aberto</div><div class="rp-v">${cents(emAberto)}</div></div>
      <div class="rp-card"><div class="rp-k">Total movimentado</div><div class="rp-v">${cents(totalGasto)}</div></div>
      <div class="rp-card"><div class="rp-k">Compras (total)</div><div class="rp-v">${cents(comprasTotal)}</div></div>
    </div>
    ${sec('D\u00edvidas', tbl(dividasAbertas.map(d=>rowKV(
        esc(d.description||'\u2014')+(d.due_date?` <span class="rp-dim">(vence ${fmtDate(d.due_date)})</span>`:''),
        `faltam <b>${cents(Number(d.total_cents)-Number(d.paid_cents))}</b> <span class="rp-dim">de ${cents(d.total_cents)}</span>`))))}
    ${sec('Caixinhas e metas', tbl(goals.map(g=>rowKV(
        esc(g.name||'\u2014'),
        `<b>${cents(g.saved_cents)}</b> <span class="rp-dim">de ${cents(g.target_cents)}</span>`))))}
    ${sec('Reformas', tbl(reforms.map(r=>{ const pago=ritems.filter(i=>i.reform_id===r.id).reduce((s,i)=>s+Number(i.total_cents||0),0);
        return rowKV(esc(r.name||'\u2014'), `gasto <b>${cents(pago)}</b> <span class="rp-dim">de ${cents(r.budget_cents)}</span>`); })))}
    ${sec('Mercado / faltando em casa', invBaixo.length? tbl(invBaixo.map(i=>rowKV(
        esc(i.name||'\u2014'), `<b>${esc(i.status==='acabou'?'acabou':'est\u00e1 baixo')}</b>`))) : '')}
    ${sec('Pets e cuidados', pets.length? tbl(pets.map(p=>{ const c=petcare.filter(x=>x.pet_id===p.id);
        return rowKV(esc(p.name||'\u2014')+(p.species?` <span class="rp-dim">(${esc(p.species)})</span>`:''),
          c.length? esc(c.map(x=>x.name).join(', ')) : '<span class="rp-dim">sem cuidados</span>'); })) : '')}
    ${sec('Pr\u00f3ximos compromissos', proxEventos.length? tbl(proxEventos.map(e=>rowKV(
        esc(e.title||'\u2014'), `<span class="rp-dim">${fmtDate(e.date)}${e.time?' '+esc(e.time):''}</span>`))) : '')}
    ${sec('Compras recentes', purchases.length? tbl(purchases.slice(-8).reverse().map(p=>rowKV(
        esc(p.product||'\u2014')+(p.store?` <span class="rp-dim">(${esc(p.store)})</span>`:''), `<b>${cents(p.total_cents)}</b>`))) : '')}
    <div class="rp-foot">Gerado pelo Ninho \u00b7 ${esc(new Date().toLocaleString('pt-BR'))}</div>`;

  const RP_CSS = `
    #report{background:#fff;color:#1f2433;border-radius:16px;padding:20px;max-width:720px;margin:0 auto;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.45}
    #report .rp-head{display:flex;align-items:center;gap:12px;border-bottom:3px solid #eceaf5;padding-bottom:12px;margin-bottom:14px}
    #report .rp-logo{font-size:26px}
    #report .rp-title{font-size:22px;font-weight:800;color:#6d28d9}
    #report .rp-sub{color:#6b7280;font-size:13px}
    #report .rp-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:8px}
    #report .rp-card{background:#f4f2fb;border:1px solid #e9e5f7;border-radius:12px;padding:12px}
    #report .rp-k{color:#6b7280;font-size:12px}
    #report .rp-v{font-size:19px;font-weight:800;color:#6d28d9;margin-top:2px}
    #report .rp-sec{margin-top:16px}
    #report .rp-sec h2{font-size:15px;color:#ec4899;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}
    #report .rp-tbl{width:100%;border-collapse:collapse}
    #report .rp-tbl td{padding:7px 2px;border-bottom:1px solid #f0edf9;font-size:14px;vertical-align:top}
    #report .rp-r{text-align:right;white-space:nowrap;padding-left:10px}
    #report .rp-dim{color:#6b7280;font-weight:400;font-size:12px}
    #report .rp-foot{margin-top:18px;color:#9aa0ad;font-size:11px;text-align:center}`;

  m.innerHTML=head('Relat\u00f3rios','Um resumo bonito para ver, baixar e enviar.')+
  `<style>${RP_CSS}</style>
   <div class="panel"><h3>Baixar resumo</h3>
     <p class="subtitle">Em imagem ou PDF, f\u00e1cil de ver no celular e mandar no WhatsApp.</p>
     <div class="rowbtns">
       <button class="btn primary" id="exppng">Baixar imagem (PNG)</button>
       <button class="btn green" id="exppdf">Baixar PDF</button>
       <button class="btn" id="expjson">Baixar JSON (backup)</button>
     </div></div>
   <div id="report">${reportBody}</div>`;
  wireHead();

  $('#expjson').onclick=()=>{ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ninho_backup_'+today()+'.json'; a.click(); };

  $('#exppng').onclick=async()=>{ if(!window.html2canvas){ toast('Gerador de imagem indispon\u00edvel (precisa de internet).','err'); return; }
    toast('Gerando imagem\u2026');
    try{ const c=await html2canvas($('#report'),{backgroundColor:'#ffffff',scale:2}); const a=document.createElement('a');
      a.href=c.toDataURL('image/png'); a.download='ninho_resumo_'+today()+'.png'; a.click(); }
    catch(e){ toast('N\u00e3o consegui gerar a imagem.','err'); } };

  $('#exppdf').onclick=()=>{ const doc=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">`+
     `<meta name="viewport" content="width=device-width,initial-scale=1"><title>Ninho \u2014 Resumo</title>`+
     `<style>body{margin:0;background:#fff;padding:16px}${RP_CSS} @media print{@page{margin:12mm}}</style></head>`+
     `<body><div id="report">${reportBody}</div>`+
     `<scr`+`ipt>window.onload=function(){setTimeout(function(){window.print();},400);};</scr`+`ipt></body></html>`;
    const w=window.open('','_blank');
    if(!w){ toast('Permita abrir a janela para salvar o PDF.','err'); return; }
    w.document.open(); w.document.write(doc); w.document.close(); };
};

// ---------- PERFIL E CONFIGURA\u00c7\u00d5ES ----------
SCREENS.profile = async m => {
  const members=await DB.members();
  m.innerHTML=head('Perfil e configura\u00e7\u00f5es','Seu perfil, a casa e os membros.')+
  `<div class="panel"><h3>Meu perfil</h3>
    <label class="field"><label>Nome de exibi\u00e7\u00e3o</label><input id="pname" value="${esc(PROFILE.display_name||'')}"></label>
    <label class="field"><label>Apelido/usu\u00e1rio</label><input id="puser" value="${esc(PROFILE.username||'')}"></label>
    <label class="field"><label>Foto de perfil</label><input id="pavatar" type="file" accept="image/*"></label>
    <div class="field"><label>Ou escolha um mascote como foto</label>
      <div class="mascot-pick">
        <button type="button" class="mascot-opt${PROFILE.avatar_url==='mascot:cachorro'?' sel':''}" data-mascot="cachorro">${MASCOTS.cachorro}<small>Cachorro</small></button>
        <button type="button" class="mascot-opt${PROFILE.avatar_url==='mascot:gato'?' sel':''}" data-mascot="gato">${MASCOTS.gato}<small>Gato</small></button>
        <button type="button" class="mascot-opt${PROFILE.avatar_url==='mascot:capivara'?' sel':''}" data-mascot="capivara">${MASCOTS.capivara}<small>Capivara</small></button>
      </div></div>
    <button class="btn primary" id="savep">Salvar perfil</button></div>
  <div class="panel"><h3>Aparência</h3>
    <p class="subtitle">Escolha a cor do app. A mudança é salva neste aparelho.</p>
    <div class="theme-pick">
      <button type="button" class="theme-opt${currentTheme()==='roxo'?' sel':''}" data-theme="roxo"><span style="background:#7c3aed"></span>Roxo</button>
      <button type="button" class="theme-opt${currentTheme()==='rosa'?' sel':''}" data-theme="rosa"><span style="background:#ec4899"></span>Rosa</button>
      <button type="button" class="theme-opt${currentTheme()==='azul'?' sel':''}" data-theme="azul"><span style="background:#3b82f6"></span>Azul</button>
      <button type="button" class="theme-opt${currentTheme()==='cinza'?' sel':''}" data-theme="cinza"><span style="background:#4b5563"></span>Cinza</button>
    </div></div>
  <div class="panel"><h3>Nossa casa</h3>
    <label class="field"><label>Nome do espa\u00e7o</label><input id="hname" value="${esc(HOUSE.name||'')}"></label>
    <button class="btn" id="saveh">Salvar nome</button>
    <h3 style="margin-top:16px">Membros</h3><div class="list">${members.map(mm=>`<div class="item"><div class="mn"><div class="nm">${esc(mm.display_name||'\u2014')}</div><div class="mt">${esc(mm.role||'')}</div></div></div>`).join('')}</div>
    <h3 style="margin-top:16px">Convidar a Bianca</h3>
    <p class="subtitle">Gere um c\u00f3digo e envie para ela entrar na mesma casa.</p>
    <div class="rowbtns"><button class="btn primary" id="inv">Gerar c\u00f3digo de convite</button></div><div id="invout"></div>
    <div class="row" style="margin-top:12px;display:flex;gap:8px"><input id="joincode" placeholder="Tenho um c\u00f3digo\u2026" style="flex:1;border:1px solid var(--line);border-radius:11px;padding:10px"><button class="btn" id="join">Entrar</button></div>
  </div>
  ${!DB.hasSupabase?'<div class="banner warn">Para convites e sincroniza\u00e7\u00e3o reais entre celulares, configure o Supabase (veja o README).</div>':''}`;
  wireHead();
  let pickedMascot=null;
  m.querySelectorAll('.mascot-opt').forEach(b=>b.onclick=()=>{ pickedMascot=b.dataset.mascot; m.querySelectorAll('.mascot-opt').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); });
  m.querySelectorAll('.theme-opt').forEach(b=>b.onclick=()=>{ applyTheme(b.dataset.theme); toast('Cor do app alterada.'); go('profile'); });
  $('#savep').onclick=async()=>{ const patch={display_name:$('#pname').value,username:$('#puser').value};
    const f=$('#pavatar').files[0]; if(f){try{patch.avatar_url=await DB.upload(f);}catch(e){}}
    else if(pickedMascot){ patch.avatar_url='mascot:'+pickedMascot; }
    await DB.saveProfile(patch); PROFILE={...PROFILE,...patch}; MEMBERS[UID]={...MEMBERS[UID],...patch}; toast('Perfil salvo.'); renderShell(); go('profile'); };
  $('#saveh').onclick=async()=>{ try{ await DB.update('households',HOUSE.id,{name:$('#hname').value}); }catch(e){} HOUSE.name=$('#hname').value; toast('Nome da casa salvo.'); renderShell(); go('profile'); };
  $('#inv').onclick=async()=>{ try{ const code=await DB.createInvite(); $('#invout').innerHTML=`<div class="banner ok">C\u00f3digo: <b>${esc(code)}</b> \u2014 v\u00e1lido por 7 dias.</div>`; }catch(e){ toast(e.message,'err'); } };
  $('#join').onclick=async()=>{ const c=$('#joincode').value.trim(); if(!c) return; try{ await DB.joinInvite(c); HOUSE=await DB.myHousehold(); toast('Voc\u00ea entrou na casa!'); go('dashboard'); }catch(e){ toast(e.message,'err'); } };
};

// ============================================================
// BOOT
// ============================================================
async function boot(){
  const u = await DB.currentUser();
  if(!u){ renderAuth('in'); return; }
  UID = u.id;
  PROFILE = await DB.myProfile();
  HOUSE = await DB.myHousehold();
  const mem = await DB.members(); MEMBERS={}; mem.forEach(x=>MEMBERS[x.id]=x);
  if(!MEMBERS[UID]) MEMBERS[UID]=PROFILE;
  renderShell();
  await go('dashboard');
  // sincroniza\u00e7\u00e3o em tempo real
  DB.subscribe(table=>{ if(table) delete CACHE[table]; if(document.getElementById('main')) go(ROUTE); });
}

// Service worker (atualiza\u00e7\u00e3o sem travar ao voltar)
if('serviceWorker' in navigator){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
boot();
