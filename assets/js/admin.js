// Admin - Vou com Milhas - Ofertas (SECURE: JWT HttpOnly)
const LS_OFERTAS = 'vf_ofertas';
const LS_VIAGENS = 'vf_viagens';
const LS_CONFIG = 'vf_config';
const LS_EMPRESA = 'vf_empresa';
const LS_LEADS = 'vf_leads';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const formatPreco = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDataBR = d => { if(!d) return ''; if(d.includes('/')) return d; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; };

let ofertas = [];
let config = { whatsapp: '5584998979071', nomeEmpresa: 'Vou com Milhas' };
let empresa = {};
let editingId = null;
let filtroStatus = 'ativas';
let imagemTempDataUrl = null;

function isAtiva(o){
  if(o.status==='encerrada'||o.status==='pausada') return false;
  if(o.validadeAte){ const h=new Date(); h.setHours(0,0,0,0); const v=new Date(o.validadeAte); v.setHours(0,0,0,0); if(v<h) return false; }
  return true;
}
function normalizar(v){
  if(v.datas){
    let semJuros=v.parcelasSemJuros; if(semJuros===true) semJuros=6; if(semJuros===false) semJuros=1;
    return { ...v, aeroportoOrigem: v.aeroportoOrigem || v.origem?.slice(0,3).toUpperCase()||'NAT', aeroportoDestino: v.aeroportoDestino || v.destino?.slice(0,3).toUpperCase()||'NAT', milhas: v.milhas||null, parcelas: v.parcelas||null, parcelasSemJuros: semJuros??6, acrescimoPorParcela: v.acrescimoPorParcela??2.5, escalas: v.escalas??0, bagagem: v.bagagem||'10kg' };
  }
  const ciaMap={'Guanabara':'LATAM','Progresso':'Gol','Expresso Cabral':'Azul','Gontijo':'Gol'};
  const tipoMap={'Semileito':'Econômica','Convencional':'Econômica','Leito':'Econômica','Leito Cama':'Econômica','Executivo':'Executiva'};
  return { id:v.id, origem:v.origem, destino:v.destino, aeroportoOrigem: v.origem?.slice(0,3).toUpperCase()||'NAT', aeroportoDestino: v.destino?.slice(0,3).toUpperCase()||'NAT', datas: v.data? formatDataBR(v.data)+(v.hora?` • ${v.hora}`:'' ):'', dataInicio: v.data||new Date().toISOString().slice(0,10), preco:v.preco, precoAntigo:null, milhas:null, parcelas:null, parcelasSemJuros:6, acrescimoPorParcela:2.5, empresa:ciaMap[v.empresa]||'LATAM', tipo:tipoMap[v.tipo]||'Econômica', duracao:v.duracao||'1h10', escalas:0, bagagem:'23kg', imagem:v.imagem, status:'ativa', validadeAte: v.data, destaque:false, vagasTexto: '', descricao:`Voo ${v.origem}→${v.destino}` };
}

async function initAdmin(){
  await loadInitialData();
  await checkAuth();
  bindEvents();
}

async function loadInitialData(){
  try{
    // tenta API primeiro (produção com JWT), fallback para data/*.json + localStorage (dev)
    let ofertasFromApi = null;
    let configFromApi = null;
    let empresaFromApi = null;
    try {
      const r = await fetch('/api/ofertas?t='+Date.now(), { credentials: 'include', cache: 'no-store' });
      if(r.ok) ofertasFromApi = await r.json();
    } catch {}
    try {
      const r = await fetch('/api/config?t='+Date.now(), { cache: 'no-store' });
      if(r.ok) configFromApi = await r.json();
    } catch {}
    try {
      const r = await fetch('/api/empresa?t='+Date.now(), { cache: 'no-store' });
      if(r.ok) empresaFromApi = await r.json();
    } catch {}
    const [ofertasRes, viagensRes, cfgRes, empRes] = await Promise.allSettled([
      fetch('data/ofertas.json'), fetch('data/viagens.json'), fetch('data/config.json'), fetch('data/empresa.json')
    ]);
    let seedOfertas = [];
    if(ofertasFromApi && Array.isArray(ofertasFromApi) && ofertasFromApi.length) seedOfertas = ofertasFromApi;
    else if(ofertasRes.status==='fulfilled' && ofertasRes.value.ok) seedOfertas = await ofertasRes.value.json();
    else if(viagensRes.status==='fulfilled' && viagensRes.value.ok) seedOfertas = (await viagensRes.value.json()).map(normalizar);
    let seedConfig = configFromApi && typeof configFromApi === 'object' && configFromApi.whatsapp ? configFromApi : (cfgRes.status==='fulfilled' && cfgRes.value.ok ? await cfgRes.value.json() : { whatsapp:'5584998979071', nomeEmpresa:'Vou com Milhas' });
    let seedEmpresa = empresaFromApi && typeof empresaFromApi === 'object' && Object.keys(empresaFromApi).length ? empresaFromApi : (empRes.status==='fulfilled' && empRes.value.ok ? await empRes.value.json() : {});

    // Ofertas: prioriza Blob global, não deixa LS stale sobrescrever
    if (ofertasFromApi && Array.isArray(ofertasFromApi)) {
      ofertas = ofertasFromApi.map(normalizar);
      try{ localStorage.setItem(LS_OFERTAS, JSON.stringify(ofertas)); localStorage.setItem(LS_VIAGENS, JSON.stringify(ofertas)); }catch{}
      // se Blob estava vazio e temos seed de arquivo, semeia
      if (ofertas.length === 0 && seedOfertas.length) {
        ofertas = seedOfertas.map(normalizar);
        await persistOfertas();
      }
    } else {
      const lsOfertas = localStorage.getItem(LS_OFERTAS) || localStorage.getItem(LS_VIAGENS);
      if(lsOfertas){
        try{
          const parsed = JSON.parse(lsOfertas);
          if(Array.isArray(parsed) && parsed.length>0) ofertas = parsed.map(normalizar);
          else { ofertas = seedOfertas.map(normalizar); await persistOfertas(); }
        } catch{ ofertas = seedOfertas.map(normalizar); }
      } else {
        ofertas = seedOfertas.map(normalizar);
        await persistOfertas();
      }
    }
    // Config/Empresa globais: prioriza Blob, não deixa LS stale sobrescrever
    if (configFromApi) {
      config = configFromApi;
      try{ localStorage.setItem(LS_CONFIG, JSON.stringify(config)); }catch{}
    } else {
      const lsCfg = localStorage.getItem(LS_CONFIG);
      if(lsCfg){ try{ config = {...seedConfig, ...JSON.parse(lsCfg)}; } catch{ config=seedConfig; } } else { config=seedConfig; persistConfig(); }
    }
    if (empresaFromApi && Object.keys(empresaFromApi).length) {
      empresa = empresaFromApi;
      try{ localStorage.setItem(LS_EMPRESA, JSON.stringify(empresa)); }catch{}
    } else {
      const lsEmp = localStorage.getItem(LS_EMPRESA);
      if(lsEmp){ try{ empresa = {...seedEmpresa, ...JSON.parse(lsEmp)}; } catch{ empresa=seedEmpresa; } } else { empresa=seedEmpresa; persistEmpresa(); }
    }

  } catch(e){
    console.error('loadInitialData falhou',e);
    const lsOfertas = localStorage.getItem(LS_OFERTAS) || localStorage.getItem(LS_VIAGENS);
    if(lsOfertas) try{ ofertas=JSON.parse(lsOfertas).map(normalizar); } catch{ ofertas=[]; }
  }
}
async function persistOfertas(){
  // tenta API (produção segura), fallback localStorage (dev)
  try {
    const r = await fetch('/api/ofertas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(ofertas)
    });
    if(r.ok) {
      localStorage.setItem(LS_OFERTAS, JSON.stringify(ofertas));
      localStorage.setItem(LS_VIAGENS, JSON.stringify(ofertas));
      return;
    }
  } catch {}
  localStorage.setItem(LS_OFERTAS, JSON.stringify(ofertas));
  localStorage.setItem(LS_VIAGENS, JSON.stringify(ofertas));
}
async function persistConfig(){
  localStorage.setItem(LS_CONFIG, JSON.stringify(config));
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config)
    });
  } catch {}
}
async function persistEmpresa(){
  localStorage.setItem(LS_EMPRESA, JSON.stringify(empresa));
  try {
    await fetch('/api/empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(empresa)
    });
  } catch {}
}

// Leads globais via Blob (fallback localStorage) - não zera cache se API retornar vazio por stale
let leadsCache = null;
let leadsCacheTs = 0;
async function fetchLeadsGlobal(force = false){
  try{
    const r = await fetch('/api/leads?t='+Date.now(), { credentials: 'include', cache: 'no-store' });
    if(r.ok){
      const data = await r.json();
      if(Array.isArray(data)){
        // se API retornou vazio mas tínhamos dados, pode ser stale (consistência eventual) - preserva cache
        // só aceita vazio se force=true (após DELETE) ou se cache também vazio/nulo
        const isStaleEmpty = data.length === 0 && leadsCache && leadsCache.length > 0 && !force && (Date.now() - leadsCacheTs < 120000);
        if (!isStaleEmpty) {
          leadsCache = data;
          leadsCacheTs = Date.now();
          try{ localStorage.setItem(LS_LEADS, JSON.stringify(data)); }catch{}
        }
        return leadsCache;
      }
    }
  }catch(e){ /* fallback */ }
  try{
    const ls = JSON.parse(localStorage.getItem(LS_LEADS)||'[]');
    if (leadsCache === null) {
      leadsCache = Array.isArray(ls)? ls : [];
      leadsCacheTs = Date.now();
    }
    return leadsCache;
  }catch{ return leadsCache || []; }
}
function getLeadsSync(){
  if(leadsCache && Array.isArray(leadsCache)) return leadsCache;
  try{ return JSON.parse(localStorage.getItem(LS_LEADS)||'[]'); }catch{ return []; }
}

async function checkAuth(){
  const login=$('#login-screen'), dash=$('#dashboard');
  try {
    const r = await fetch('/api/auth', { credentials: 'include' });
    if(r.ok){
      const data = await r.json();
      if(data.ok){
        login.classList.add('hidden'); dash.classList.remove('hidden'); renderAll();
        // auto-refresh leads globais a cada 15s quando no dashboard
        if(!window.__leadsInterval){
          window.__leadsInterval = setInterval(()=> {
            if(dash.classList.contains('hidden')) return;
            renderStats();
            const leadsTab = $('#tab-leads');
            if(leadsTab && !leadsTab.classList.contains('hidden')) renderLeads();
          }, 15000);
          // atualiza ao voltar para a aba do navegador
          document.addEventListener('visibilitychange', ()=>{
            if(document.visibilityState==='visible' && !dash.classList.contains('hidden')){
              renderStats(); const lt=$('#tab-leads'); if(lt && !lt.classList.contains('hidden')) renderLeads();
            }
          });
        }
        return;
      }
    }
  } catch {}
  // fallback dev: verifica localStorage legado (para file:// sem backend)
  const legacy = localStorage.getItem('vf_auth');
  if(legacy==='ok' && location.protocol==='file:'){
    login.classList.add('hidden'); dash.classList.remove('hidden'); renderAll(); return;
  }
  login.classList.remove('hidden'); dash.classList.add('hidden');
}

function bindEvents(){
  $('#form-login')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const u=$('#login-user').value.trim(), p=$('#login-pass').value;
    const btn=e.submitter || document.querySelector('#form-login button[type="submit"]');
    if(btn){ btn.disabled=true; btn.textContent='Entrando...'; }
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user: u, pass: p })
      });
      const data = await r.json();
      if(r.ok && data.ok){
        localStorage.setItem('vf_auth','ok');
        toast('Bem-vindo, Vou com Milhas!','success');
        await checkAuth();
        return;
      }
      toast(data.error || 'Usuário ou senha inválidos','warn');
      shake($('#login-card'));
    } catch {
      // fallback dev sem backend: tenta localStorage legado se senha for admin123 (só dev)
      toast('Servidor de login não disponível (dev).','warn');
    } finally {
      if(btn){ btn.disabled=false; btn.innerHTML='Entrar no painel <i data-lucide="arrow-right" class="w-4 h-4"></i>'; lucide.createIcons(); }
    }
  });
  $('#btn-logout')?.addEventListener('click', async ()=>{
    try { await fetch('/api/logout', { method:'POST', credentials:'include' }); } catch {}
    localStorage.removeItem('vf_auth');
    toast('Saiu','info');
    checkAuth();
  });

  // tabs
  $$('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tab=btn.dataset.tab;
      $$('.tab-btn').forEach(b=>{ b.classList.remove('bg-slate-900','text-white'); b.classList.add('bg-white','text-slate-600','border','border-slate-200'); });
      btn.classList.remove('bg-white','text-slate-600','border','border-slate-200'); btn.classList.add('bg-slate-900','text-white');
      $$('.tab-panel').forEach(p=> p.classList.add('hidden'));
      $(`#tab-${tab}`)?.classList.remove('hidden');
      if(tab==='leads') renderLeads();
      if(tab==='config') renderConfig();
      if(tab==='empresa') renderEmpresaTab();
      // atualiza stats ao trocar de aba (leads globais podem ter mudado)
      if(tab==='leads') renderStats();
    });
  });

  // filtros status
  $$('.filtro-status').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      filtroStatus=btn.dataset.filtro;
      $$('.filtro-status').forEach(b=>{ b.classList.remove('bg-[#1E3145]','text-white'); b.classList.add('bg-white','text-slate-600','border','border-slate-200'); });
      btn.classList.remove('bg-white','text-slate-600','border','border-slate-200'); btn.classList.add('bg-[#1E3145]','text-white');
      renderOfertas();
    });
  });
  $('#busca-ofertas')?.addEventListener('input', renderOfertas);

  // modal + imagem dispositivo
  $('#btn-nova-oferta')?.addEventListener('click', ()=> openModal());
  $('#btn-fechar-modal')?.addEventListener('click', closeModal);
  $('#modal-oferta')?.addEventListener('click', e=>{ if(e.target.id==='modal-oferta') closeModal(); });
  $('#form-oferta')?.addEventListener('submit', salvarOferta);
  $('#f-imagem-file')?.addEventListener('change', handleImagemFile);
  $('#f-imagem')?.addEventListener('input', previewUrl);
  $('#btn-remover-imagem')?.addEventListener('click', removerImagem);

  // config
  $('#form-config')?.addEventListener('submit', e=>{
    e.preventDefault();
    const whatsapp=$('#cfg-whatsapp').value.trim().replace(/\D/g,'');
    const nome=$('#cfg-nome').value.trim();
    if(!whatsapp) return toast('Informe WhatsApp','warn');
    config.whatsapp=whatsapp; config.nomeEmpresa=nome||'Vou com Milhas';
    persistConfig(); renderConfig(); renderStats(); toast('Salvo! Já refletiu no site.','success');
  });
  // empresa
  $('#form-empresa')?.addEventListener('submit', e=>{
    e.preventDefault();
    empresa.nome=$('#emp-nome').value.trim()||'Vou com Milhas';
    empresa.slogan=$('#emp-slogan').value.trim();
    empresa.instagram=$('#emp-instagram').value.trim();
    empresa.instagramUrl=$('#emp-instagram').value.trim().startsWith('http')?$('#emp-instagram').value.trim():`https://www.instagram.com/${$('#emp-instagram').value.trim().replace('@','')}`;
    empresa.canalLink=empresa.instagramUrl;
    empresa.sobre=$('#emp-sobre').value.trim();
    persistEmpresa(); renderEmpresaTab(); toast('Empresa atualizada!','success');
  });

  // export/import
  $('#btn-export')?.addEventListener('click', exportar);
  $('#btn-import')?.addEventListener('click', ()=> $('#input-import').click());
  $('#input-import')?.addEventListener('change', importar);
  $('#btn-reset')?.addEventListener('click', resetar);
  $('#btn-limpar-leads')?.addEventListener('click', limparLeads);
  $('#btn-copiar-todas')?.addEventListener('click', copiarTodasAtivas);
}

async function renderAll(){ await renderStats(); renderOfertas(); renderConfig(); renderEmpresaTab(); await renderLeads(); }

async function renderStats(){
  const ativas=ofertas.filter(isAtiva).length;
  const encerradas=ofertas.length - ativas;
  const destaques=ofertas.filter(o=>o.destaque && isAtiva(o)).length;
  const leads=await fetchLeadsGlobal();
  const hoje=new Date().toISOString().slice(0,10);
  const leadsHoje=leads.filter(l=> (l.createdAt||'').slice(0,10)===hoje).length;
  $('#stat-ativas').textContent=ativas;
  $('#stat-encerradas').textContent=encerradas;
  $('#stat-destaques').textContent=destaques;
  $('#stat-leads').textContent=leads.length;
  $('#stat-leads-hoje').textContent=leadsHoje;
  $('#stat-whatsapp-preview').textContent=config.whatsapp||'5584998979071';
  if(typeof gsap!=='undefined') gsap.from('.stat-card',{y:10,opacity:0,duration:0.4,stagger:0.06,ease:'power2.out'});
}

function getFiltradas(){
  let lista=[...ofertas];
  const busca=($('#busca-ofertas')?.value||'').toLowerCase().trim();
  if(busca) lista=lista.filter(o=> `${o.origem} ${o.destino} ${o.datas} ${o.empresa}`.toLowerCase().includes(busca));
  if(filtroStatus==='ativas') lista=lista.filter(isAtiva);
  else if(filtroStatus==='encerradas') lista=lista.filter(o=> !isAtiva(o));
  else if(filtroStatus==='destaque') lista=lista.filter(o=> o.destaque && isAtiva(o));
  return lista.sort((a,b)=> (a.dataInicio||'').localeCompare(b.dataInicio||''));
}

function renderOfertas(){
  const tbody=$('#tbody-ofertas');
  if(!tbody) return;
  const lista=getFiltradas();
  $('#contador-ofertas').textContent=`${lista.length} oferta(s) • ${ofertas.filter(isAtiva).length} ativas no site`;
  if(lista.length===0){
    tbody.innerHTML=`<tr><td colspan="6" class="py-10 text-center text-slate-500">Nenhuma oferta neste filtro. Tente <strong>Todas</strong> ou crie uma nova.</td></tr>`;
    return;
  }
  tbody.innerHTML=lista.map(o=>{
    const ativa=isAtiva(o);
    const validadeBadge=(()=>{
      if(!o.validadeAte) return '<span class="text-xs text-slate-400">—</span>';
      const h=new Date(); h.setHours(0,0,0,0); const v=new Date(o.validadeAte); v.setHours(0,0,0,0);
      const diff=Math.ceil((v-h)/86400000);
      if(!ativa) return '<span class="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">Encerrada</span>';
      if(diff===0) return '<span class="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">Encerra hoje</span>';
      if(diff<=2) return `<span class="px-2 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">em ${diff}d</span>`;
      return `<span class="text-xs text-slate-600">${formatDataBR(o.validadeAte)}</span>`;
    })();
    const statusToggle = ativa
      ? `<button onclick="toggleStatus(${o.id})" class="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">Ativa • Clique para encerrar</button>`
      : `<button onclick="toggleStatus(${o.id})" class="px-3 py-1.5 rounded-full bg-slate-800 text-white text-xs font-bold hover:bg-black">Encerrada • Reativar</button>`;
    return `<tr class="border-b border-slate-100 hover:bg-slate-50/70 ${!ativa?'opacity-60':''}">
      <td class="py-3 px-3">
        <div class="font-semibold text-sm flex items-center gap-1.5">${o.origem} → ${o.destino} ${o.destaque?'<span class="px-1.5 py-0.5 rounded bg-amber-400 text-[#1E3145] text-[10px] font-bold">🔥</span>':''}</div>
        <div class="text-xs text-slate-500">${o.datas} • ${o.empresa} • ${o.tipo}</div>
        <div class="text-xs text-slate-400 truncate max-w-[220px]">${o.descricao||''}</div>
      </td>
      <td class="py-3 px-3">
        <div class="font-semibold text-sm">${formatPreco(o.preco)}</div>
        ${o.precoAntigo?`<div class="text-xs text-slate-400 line-through">${formatPreco(o.precoAntigo)}</div>`:''}
        <div class="text-xs text-slate-500">${o.vagasTexto||''}</div>
      </td>
      <td class="py-3 px-3 text-xs">${validadeBadge}</td>
      <td class="py-3 px-3">${statusToggle}</td>
      <td class="py-3 px-3">
        <div class="flex flex-wrap gap-1.5 justify-end">
          <button onclick="copiarLinkCanal(${o.id})" class="w-8 h-8 rounded-full bg-[#F9A521] text-[#1E3145] flex items-center justify-center hover:bg-yellow-400" title="Copiar link para canal"><i data-lucide="link-2" class="w-3.5 h-3.5"></i></button>
          <button onclick="duplicarOferta(${o.id})" class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50" title="Duplicar"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
          <button onclick="editarOferta(${o.id})" class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-black" title="Editar"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button onclick="excluirOferta(${o.id})" class="w-8 h-8 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-100" title="Excluir"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function renderConfig(){
  $('#cfg-whatsapp').value=config.whatsapp||'';
  $('#cfg-nome').value=config.nomeEmpresa||'';
  const wa=(config.whatsapp||'').replace(/\D/g,'');
  $('#cfg-preview').textContent=`https://wa.me/${wa}?text=Olá...`;
  const l=$('#cfg-preview-link'); if(l) l.href=`https://wa.me/${wa}`;
}
function renderEmpresaTab(){
  if(!$('#emp-nome')) return;
  $('#emp-nome').value=empresa.nome||'Vou com Milhas';
  $('#emp-slogan').value=empresa.slogan||'';
  $('#emp-instagram').value=empresa.instagram||'@vou_com_milhas';
  $('#emp-sobre').value=empresa.sobre||'';
  $('#emp-preview-nome').textContent=empresa.nome||'Vou com Milhas';
  $('#emp-preview-link').textContent=empresa.instagramUrl||'https://www.instagram.com/vou_com_milhas';
  $('#emp-preview-link').href=empresa.instagramUrl||'https://www.instagram.com/vou_com_milhas';
}
async function renderLeads(){
  const container=$('#lista-leads'); if(!container) return;
  const leadsRaw = await fetchLeadsGlobal();
  const leads=leadsRaw.slice().reverse();
  $('#leads-count').textContent=`${leads.length} leads`;
  if(leads.length===0){ container.innerHTML=`<div class="py-10 text-center text-slate-500 text-sm">Nenhum lead ainda. Quando cliente clicar em Consultar no WhatsApp, aparece aqui.</div>`; return; }
  container.innerHTML=leads.map(l=>{
    const d=new Date(l.createdAt); const dataStr=!isNaN(d)? d.toLocaleString('pt-BR') : (l.createdAt||'');
    const tel = l.telefone? ` • 📞 ${l.telefone}` : '';
    const assentos = l.assentos? ` • 💺 ${l.assentos}` : '';
    const msg=`Olá ${l.nome||''}! Vi seu interesse em ${l.rota||l.ofertaId} Datas ${l.datas||''}. Posso confirmar?`;
    return `<div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${l.rota||'Oferta #'+(l.ofertaId||l.viagemId)} • ${l.datas||l.data||''} • ${l.preco||''}${assentos}</div>
        <div class="text-xs text-slate-500 truncate">${l.nome?`👤 ${l.nome}`:'👤 Sem nome'}${tel} • ${dataStr}</div>
      </div>
      <div class="flex gap-2 shrink-0">
        <a href="https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" class="px-3 py-2 rounded-full bg-[#25D366] text-white text-xs font-semibold inline-flex items-center gap-1"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Responder</a>
        <button onclick="copiarLead('${encodeURIComponent(msg)}')" class="px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold">Copiar</button>
      </div>
    </div>`;
  }).join('');
  if(typeof lucide!=='undefined') lucide.createIcons();
}

// Imagem helpers - dispositivo ou link
function handleImagemFile(e){
  const file=e.target.files[0];
  const nomeEl=$('#f-imagem-file-nome');
  const preview=$('#f-imagem-preview');
  const btnRem=$('#btn-remover-imagem');
  if(!file){ imagemTempDataUrl=null; if(nomeEl) nomeEl.textContent=''; return; }
  if(!file.type.startsWith('image/')) return toast('Escolha apenas JPG/PNG','warn');
  if(file.size> 5*1024*1024) return toast('Imagem muito grande (max 5MB)','warn');
  if(nomeEl) nomeEl.textContent=file.name;
  const reader=new FileReader();
  reader.onload=()=>{
    compressImage(reader.result, 800, 0.7).then(dataUrl=>{
      imagemTempDataUrl=dataUrl;
      if(preview){ preview.src=dataUrl; preview.classList.remove('hidden'); }
      if(btnRem) btnRem.classList.remove('hidden');
      $('#f-imagem').value='';
    }).catch(()=> toast('Falha ao processar imagem','warn'));
  };
  reader.readAsDataURL(file);
}
function previewUrl(){
  const url=$('#f-imagem').value.trim();
  const preview=$('#f-imagem-preview');
  const btnRem=$('#btn-remover-imagem');
  if(url && url.startsWith('http')){
    if(preview){ preview.src=url; preview.classList.remove('hidden'); preview.onerror=()=>{ preview.classList.add('hidden'); }; }
    if(btnRem) btnRem.classList.remove('hidden');
    const fileInput=$('#f-imagem-file'); if(fileInput) fileInput.value='';
    const nomeEl=$('#f-imagem-file-nome'); if(nomeEl) nomeEl.textContent='';
    imagemTempDataUrl=null;
  } else if(!url && !imagemTempDataUrl){
    if(preview) preview.classList.add('hidden');
    if(btnRem) btnRem.classList.add('hidden');
  }
}
function removerImagem(){
  imagemTempDataUrl=null;
  const fileInput=$('#f-imagem-file'); if(fileInput) fileInput.value='';
  const nomeEl=$('#f-imagem-file-nome'); if(nomeEl) nomeEl.textContent='';
  $('#f-imagem').value='';
  const preview=$('#f-imagem-preview'); if(preview){ preview.src=''; preview.classList.add('hidden'); }
  $('#btn-remover-imagem')?.classList.add('hidden');
  toast('Imagem removida','info');
}
function compressImage(dataUrl, maxW, quality){
  return new Promise((resolve, reject)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width, h=img.height;
      if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      try{ resolve(canvas.toDataURL('image/jpeg', quality)); } catch(e){ reject(e); }
    };
    img.onerror=reject;
    img.src=dataUrl;
  });
}

// Modal
function openModal(id=null){
  editingId=id;
  const isEdit=id!==null;
  $('#modal-title').textContent=isEdit?'Editar oferta':'Nova oferta';
  $('#btn-salvar-oferta').textContent=isEdit?'Salvar alterações':'Publicar oferta';
  imagemTempDataUrl=null;
  const fileInput=$('#f-imagem-file'); if(fileInput) fileInput.value='';
  const nomeEl=$('#f-imagem-file-nome'); if(nomeEl) nomeEl.textContent='';
  const preview=$('#f-imagem-preview'); if(preview){ preview.src=''; preview.classList.add('hidden'); }
  $('#btn-remover-imagem')?.classList.add('hidden');

  if(isEdit){
    const o=ofertas.find(x=>x.id===id); if(!o) return;
    $('#f-origem').value=o.origem; $('#f-destino').value=o.destino; $('#f-aeroOrigem').value=o.aeroportoOrigem||''; $('#f-aeroDestino').value=o.aeroportoDestino||''; $('#f-datas').value=o.datas; $('#f-dataInicio').value=o.dataInicio;
    $('#f-validade').value=o.validadeAte||''; $('#f-preco').value=o.preco; $('#f-parcelas').value=o.parcelas||''; $('#f-parcelasSemJuros').value=o.parcelasSemJuros??6; $('#f-acrescimo').value=o.acrescimoPorParcela||''; $('#f-milhas').value=o.milhas||''; $('#f-precoAntigo').value=o.precoAntigo||'';
    $('#f-empresa').value=o.empresa; $('#f-tipo').value=o.tipo; $('#f-duracao').value=o.duracao; $('#f-escalas').value=o.escalas??0; $('#f-bagagem').value=o.bagagem||'10kg';
    $('#f-imagem').value=o.imagem.startsWith('data:')?'':o.imagem;
    if(o.imagem.startsWith('data:')){ imagemTempDataUrl=o.imagem; if(preview){ preview.src=o.imagem; preview.classList.remove('hidden'); } $('#btn-remover-imagem')?.classList.remove('hidden'); }
    else if(o.imagem){ if(preview){ preview.src=o.imagem; preview.classList.remove('hidden'); } $('#btn-remover-imagem')?.classList.remove('hidden'); }
    $('#f-status').value=o.status; $('#f-destaque').checked=!!o.destaque; $('#f-vagasTexto').value=o.vagasTexto||''; $('#f-descricao').value=o.descricao||'';
  } else {
    $('#form-oferta').reset();
    $('#f-tipo').value='Econômica'; $('#f-status').value='ativa'; $('#f-destaque').checked=false;
    const hoje=new Date(); const futuro=new Date(); futuro.setDate(hoje.getDate()+2);
    $('#f-dataInicio').value=hoje.toISOString().slice(0,10);
    $('#f-validade').value=futuro.toISOString().slice(0,10);
    $('#f-datas').value='';
    $('#f-parcelasSemJuros').value=6;
  }
  $('#modal-oferta').classList.remove('hidden'); $('#modal-oferta').classList.add('flex');
  if(typeof gsap!=='undefined') gsap.from('#modal-card',{y:20,opacity:0,duration:0.3,ease:'power3.out'});
  setTimeout(()=> lucide.createIcons(), 50);
}
function closeModal(){ $('#modal-oferta').classList.add('hidden'); $('#modal-oferta').classList.remove('flex'); editingId=null; imagemTempDataUrl=null; }

async function salvarOferta(e){
  e.preventDefault();
  const origem=$('#f-origem').value.trim(), destino=$('#f-destino').value.trim(), datas=$('#f-datas').value.trim(), dataInicio=$('#f-dataInicio').value;
  const validadeAte=$('#f-validade').value, preco=parseFloat($('#f-preco').value), precoAntigo=parseFloat($('#f-precoAntigo').value)||null;
  const parcelas=parseInt($('#f-parcelas')?.value)||null, parcelasSemJuros=parseInt($('#f-parcelasSemJuros')?.value)||6, acrescimoPorParcela=parseFloat($('#f-acrescimo')?.value)||0;
  const milhas=parseInt($('#f-milhas')?.value)||null, aeroportoOrigem=$('#f-aeroOrigem')?.value.trim().toUpperCase()||origem.slice(0,3).toUpperCase(), aeroportoDestino=$('#f-aeroDestino')?.value.trim().toUpperCase()||destino.slice(0,3).toUpperCase();
  const empresaV=$('#f-empresa').value, tipo=$('#f-tipo').value, duracao=$('#f-duracao').value.trim(), escalas=parseInt($('#f-escalas')?.value)||0, bagagem=$('#f-bagagem')?.value||'10kg';
  let imagem='';
  if(imagemTempDataUrl) imagem=imagemTempDataUrl;
  else imagem=$('#f-imagem').value.trim()||'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80';
  if(imagem.startsWith('data:') && imagem.length > 1.5*1024*1024) return toast('Imagem grande demais após compressão (>1.5MB). Use JPG menor.','warn');
  // se imagem é dataURL e backend existe, faz upload para Blob e usa URL
  if(imagem.startsWith('data:')){
    try{
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dataUrl: imagem, filename: `oferta-${Date.now()}.jpg` })
      });
      if(upRes.ok){
        const upData = await upRes.json();
        if(upData.url) imagem = upData.url;
      }
    } catch {}
  }
  const status=$('#f-status').value, destaque=$('#f-destaque').checked, vagasTexto=$('#f-vagasTexto').value.trim(), descricao=$('#f-descricao').value.trim();
  if(!origem||!destino||!datas||!dataInicio||!validadeAte||isNaN(preco)||!empresaV||!duracao) return toast('Preencha origem, destino, datas, data início, validade e preço','warn');
  if(editingId!==null){
    const idx=ofertas.findIndex(o=>o.id===editingId);
    if(idx>=0) ofertas[idx]={...ofertas[idx], origem,destino,datas,dataInicio,validadeAte,preco,precoAntigo,parcelas,parcelasSemJuros,acrescimoPorParcela,milhas,aeroportoOrigem,aeroportoDestino,empresa:empresaV,tipo,duracao,escalas,bagagem,imagem,status,destaque,vagasTexto,descricao};
    toast('Oferta atualizada!','success');
  } else {
    const newId=ofertas.length? Math.max(...ofertas.map(o=>o.id))+1:1;
    ofertas.push({id:newId, origem,destino,datas,dataInicio,preco,precoAntigo,parcelas,parcelasSemJuros,acrescimoPorParcela,milhas,aeroportoOrigem,aeroportoDestino,empresa:empresaV,tipo,duracao,escalas,bagagem,imagem,status,validadeAte,destaque,vagasTexto,descricao});
    toast('Oferta publicada! Copie o link para o canal.','success');
    setTimeout(()=> { if(confirm('Oferta publicada! Copiar link para o canal agora?')) copiarLinkCanal(newId); }, 400);
  }
  await persistOfertas(); closeModal(); renderAll();
}

// Ações globais
window.editarOferta=id=> openModal(id);
window.excluirOferta=async id=>{ if(!confirm('Excluir esta oferta?')) return; ofertas=ofertas.filter(o=>o.id!==id); await persistOfertas(); renderAll(); toast('Excluída','info'); };
window.duplicarOferta=async id=>{
  const o=ofertas.find(x=>x.id===id); if(!o) return;
  const newId=ofertas.length? Math.max(...ofertas.map(x=>x.id))+1:1;
  const nova={...o, id:newId, status:'ativa', validadeAte: (()=>{ const d=new Date(); d.setDate(d.getDate()+2); return d.toISOString().slice(0,10); })()};
  ofertas.push(nova); await persistOfertas(); renderAll(); toast('Duplicada! Edite datas se precisar.','success');
};
window.toggleStatus=async id=>{
  const o=ofertas.find(x=>x.id===id); if(!o) return;
  const eraAtiva=isAtiva(o);
  if(eraAtiva){
    if(!confirm(`Encerrar oferta ${o.origem}→${o.destino} (${o.datas})? Ela sumirá do site em 1s.`)) return;
    o.status='encerrada'; o.encerradaEm=new Date().toISOString();
    toast('Oferta encerrada! Saiu do site.','info');
    await persistOfertas(); renderAll();
    if(confirm('Oferta encerrada. Copiar mensagem de ENCERRADA para o canal?')) copiarLinkCanal(id, true);
  } else {
    // Reativar com modal para atualizar datas/preço (evita reativar desatualizada)
    toast('Atualize datas, validade e preço antes de reativar','warn');
    openModal(id);
    // Preenche validade com amanhã se vencida, mas deixa usuário confirmar
    setTimeout(()=>{
      const vInput=$('#f-validade');
      const h=new Date(); h.setHours(0,0,0,0); const v=new Date(o.validadeAte); v.setHours(0,0,0,0);
      if(v<h && vInput){
        const amanha=new Date(); amanha.setDate(amanha.getDate()+1);
        vInput.value=amanha.toISOString().slice(0,10);
        vInput.classList.add('ring-2','ring-amber-400');
        setTimeout(()=> vInput.classList.remove('ring-2','ring-amber-400'), 2000);
      }
      const statusSel=$('#f-status');
      if(statusSel) statusSel.value='ativa';
    }, 100);
  }
};
window.copiarLinkCanal=(id, encerrada=false)=>{
  const o=ofertas.find(x=>x.id===id); if(!o) return;
  const link=`${location.origin}/api/og?id=${id}`;
  let msg='';
  if(encerrada || !isAtiva(o)){
    msg=`⛔ ENCERRADA - ${o.origem}→${o.destino} ${o.datas} por ${formatPreco(o.preco)} esgotou! Fique no canal para a próxima: ${link}`;
  } else {
    msg=`✈️ OFERTA VOU COM MILHAS - ${o.origem}→${o.destino} ${o.datas} por ${formatPreco(o.preco)}${o.precoAntigo?` (de ${formatPreco(o.precoAntigo)})`:''} Detalhes: ${link} - Consulte no WhatsApp!`;
  }
  navigator.clipboard.writeText(msg).then(()=> toast('Link copiado para o canal!','success'));
};
window.copiarLead=msgEnc=>{ const m=decodeURIComponent(msgEnc); navigator.clipboard.writeText(m).then(()=> toast('Copiado!','success')); };
window.copiarTodasAtivas=()=>{
  const ativas=ofertas.filter(isAtiva);
  if(ativas.length===0) return toast('Nenhuma oferta ativa','warn');
  const txt=ativas.map(o=> `• ${o.origem}→${o.destino} ${o.datas} ${formatPreco(o.preco)} - ${location.origin}/api/og?id=${o.id}`).join('\n');
  navigator.clipboard.writeText(`✈️ OFERTAS ATIVAS VOU COM MILHAS\n${txt}\n\nConsulte no WhatsApp: https://wa.me/${config.whatsapp}`).then(()=> toast('Todas as ofertas copiadas!','success'));
};

function exportar(){
  const blob=new Blob([JSON.stringify(ofertas,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`ofertas-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  toast('Exportado!','success');
}
function importar(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async ()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!Array.isArray(data)) throw new Error('JSON deve ser array');
      data.forEach(o=>{ if(!o.origem||!o.destino) throw new Error('Oferta inválida'); });
      ofertas=data.map(normalizar); await persistOfertas(); renderAll(); toast(`${data.length} ofertas importadas!`,'success');
    } catch(err){ toast('Erro: '+err.message,'warn'); }
    e.target.value='';
  };
  reader.readAsText(file);
}
async function resetar(){
  if(!confirm('Isso vai apagar todas as alterações e voltar para as 10 ofertas originais. Continuar?')) return;
  try{ await fetch('/api/ofertas', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify([]) }); } catch{}
  localStorage.removeItem(LS_OFERTAS); localStorage.removeItem(LS_VIAGENS); location.reload();
}
async function limparLeads(){
  if(!confirm('Limpar histórico de leads?')) return;
  try{
    const r = await fetch('/api/leads', { method:'DELETE', credentials:'include' });
    if(r.ok){
      leadsCache = [];
      localStorage.removeItem(LS_LEADS);
      await renderLeads(); await renderStats();
      toast('Leads limpos (Blob)','info');
      return;
    }
  }catch(e){}
  localStorage.removeItem(LS_LEADS); leadsCache=[]; await renderLeads(); await renderStats(); toast('Leads limpos (local)','info');
}
function toast(msg,type='info'){
  let el=$('#toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium shadow-xl'; document.body.appendChild(el); }
  el.textContent=msg;
  el.className=`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium shadow-xl transition-all ${type==='warn'?'bg-amber-500 text-white':type==='success'?'bg-emerald-600 text-white':'bg-slate-900 text-white'}`;
  el.style.opacity='1'; el.style.transform='translate(-50%,0)';
  clearTimeout(el._t); el._t=setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translate(-50%,10px)'; },3000);
}
function shake(el){ if(!el||typeof gsap==='undefined') return; gsap.fromTo(el,{x:0},{x:6,duration:0.06,repeat:5,yoyo:true,ease:'none',onComplete:()=>gsap.set(el,{x:0})}); }

document.addEventListener('DOMContentLoaded', initAdmin);
