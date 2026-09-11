// Viaje Fácil - App Logic - OFERTAS (pivot de Viagens -> Ofertas)
let viagensData = []; // mantém nome legado para compatibilidade (agora são ofertas)
let ofertasData = []; // alias
let configData = {};
let empresaData = {};
let assentosSelecionados = [];
let viagemAtual = null; // oferta atual em detalhes/oferta.html

const WHATSAPP_FALLBACK = '5584998979071';

// Fallback embarcado - 10 ofertas AéREAS com parcelamento (Vou com Milhas) - Opção A: parcela em destaque
const OFERTAS_FALLBACK = [
  { id: 1, origem: "Natal", destino: "João Pessoa", aeroportoOrigem:"NAT", aeroportoDestino:"JPA", datas: "10 a 15/09", dataInicio: "2026-09-10", preco: 285, parcelas:12, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:12000, precoAntigo: 420, empresa: "LATAM", tipo: "Econômica", duracao: "0h55", escalas:0, bagagem:"23kg + 10kg", imagem: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", status: "ativa", validadeAte: "2026-09-12", destaque: true, vagasTexto: "", descricao: "Voo direto NAT→JPA. Emissão com milhas LATAM Pass." },
  { id: 2, origem: "Natal", destino: "Recife", aeroportoOrigem:"NAT", aeroportoDestino:"REC", datas: "11 a 14/09", dataInicio: "2026-09-11", preco: 195, parcelas:10, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:8500, precoAntigo: 310, empresa: "Gol", tipo: "Econômica", duracao: "1h10", escalas:0, bagagem:"23kg", imagem: "https://images.unsplash.com/photo-1476514525535-07fb6b4ae8dd?w=800&q=80", status: "ativa", validadeAte: "2026-09-13", destaque: true, vagasTexto: "8 vagas restantes", descricao: "Ponte aérea nordeste. Bagagem despachada inclusa." },
  { id: 3, origem: "Natal", destino: "Fortaleza", aeroportoOrigem:"NAT", aeroportoDestino:"FOR", datas: "10 a 18/09", dataInicio: "2026-09-10", preco: 245, parcelas:12, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:10000, precoAntigo: 380, empresa: "Azul", tipo: "Econômica", duracao: "1h20", escalas:0, bagagem:"10kg", imagem: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80", status: "ativa", validadeAte: "2026-09-11", destaque: false, vagasTexto: "", descricao: "Voo direto com Azul. Marque assento no check-in." },
  { id: 4, origem: "João Pessoa", destino: "Natal", aeroportoOrigem:"JPA", aeroportoDestino:"NAT", datas: "12 a 16/09", dataInicio: "2026-09-12", preco: 285, parcelas:6, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:12000, precoAntigo: null, empresa: "LATAM", tipo: "Econômica", duracao: "0h55", escalas:0, bagagem:"23kg + 10kg", imagem: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", status: "ativa", validadeAte: "2026-09-14", destaque: false, vagasTexto: "", descricao: "Volta JPA→NAT. Consulte horários no WhatsApp." },
  { id: 5, origem: "Recife", destino: "Natal", aeroportoOrigem:"REC", aeroportoDestino:"NAT", datas: "12 a 15/09", dataInicio: "2026-09-12", preco: 195, parcelas:10, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:8500, precoAntigo: 280, empresa: "Gol", tipo: "Econômica", duracao: "1h10", escalas:0, bagagem:"23kg", imagem: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80", status: "ativa", validadeAte: "2026-09-13", destaque: false, vagasTexto: "", descricao: "Tarifa especial retorno." },
  { id: 6, origem: "Natal", destino: "Mossoró", aeroportoOrigem:"NAT", aeroportoDestino:"MVF", datas: "10 a 13/09", dataInicio: "2026-09-10", preco: 325, parcelas:12, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:14000, precoAntigo: 450, empresa: "Azul", tipo: "Econômica", duracao: "1h00", escalas:1, bagagem:"10kg", imagem: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80", status: "encerrada", validadeAte: "2026-09-09", destaque: false, vagasTexto: "", descricao: "Oferta encerrada - esgotou em 2h! Fique no canal." },
  { id: 7, origem: "Natal", destino: "João Pessoa", aeroportoOrigem:"NAT", aeroportoDestino:"JPA", datas: "11/09 - 15h", dataInicio: "2026-09-11", preco: 310, parcelas:12, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:12000, precoAntigo: null, empresa: "Gol", tipo: "Executiva", duracao: "0h55", escalas:0, bagagem:"32kg + 10kg", imagem: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80", status: "ativa", validadeAte: "2026-09-12", destaque: false, vagasTexto: "", descricao: "Executiva com milhas. Refeição a bordo." },
  { id: 8, origem: "Fortaleza", destino: "Natal", aeroportoOrigem:"FOR", aeroportoDestino:"NAT", datas: "13 a 16/09", dataInicio: "2026-09-13", preco: 350, parcelas:12, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:15000, precoAntigo: 520, empresa: "LATAM", tipo: "Econômica Premium", duracao: "1h20", escalas:0, bagagem:"23kg", imagem: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", status: "ativa", validadeAte: "2026-09-12", destaque: true, vagasTexto: "", descricao: "Premium com 40% off em milhas." },
  { id: 9, origem: "Natal", destino: "Salvador", aeroportoOrigem:"NAT", aeroportoDestino:"SSA", datas: "14 a 20/09", dataInicio: "2026-09-14", preco: 420, parcelas:10, parcelasSemJuros:6, acrescimoPorParcela:2.5, milhas:18000, precoAntigo: 650, empresa: "Gol", tipo: "Econômica", duracao: "2h10", escalas:0, bagagem:"23kg", imagem: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", status: "ativa", validadeAte: "2026-09-13", destaque: true, vagasTexto: "", descricao: "Voo direto NAT→SSA. Parcela no Pix." },
  { id: 10, origem: "Mossoró", destino: "Natal", aeroportoOrigem:"MVF", aeroportoDestino:"NAT", datas: "11 a 14/09", dataInicio: "2026-09-11", preco: 325, parcelas:5, parcelasSemJuros:6, milhas:14000, precoAntigo: null, empresa: "Azul", tipo: "Econômica", duracao: "1h00", escalas:1, bagagem:"10kg", imagem: "https://images.unsplash.com/photo-1501786223405-6d024d7f6ebf?w=800&q=80", status: "ativa", validadeAte: "2026-09-12", destaque: false, vagasTexto: "", descricao: "Retorno MVF→NAT com 1 escala." }
];
const VIAGENS_FALLBACK = OFERTAS_FALLBACK; // compat

// Helpers
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const formatPreco = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = d => {
  if (!d) return '';
  if (d.includes('/')) return d;
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
};
const vagasLivres = v => {
  // compat: se for oferta nova, vagas = 46 - ocupados ou só vagasTexto
  if (v.vagasTexto !== undefined) return v.status === 'ativa' ? 10 : 0;
  return (v.totalAssentos || 46) - (v.ocupados?.length || 0);
};
function isAtiva(o) {
  if (o.status === 'encerrada' || o.status === 'pausada') return false;
  if (o.validadeAte) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const val = new Date(o.validadeAte); val.setHours(0,0,0,0);
    if (val < hoje) return false;
  }
  return true;
}
function calculaParcela(o, parcelasEscolhidas){
  const n = parcelasEscolhidas || o.parcelas;
  if(!n || !o.preco) return null;
  const semJuros = o.parcelasSemJuros ?? 6;
  const acrescimo = o.acrescimoPorParcela || 0;
  const extras = Math.max(0, n - semJuros);
  const total = o.preco * (1 + extras * acrescimo / 100);
  return { valor: total / n, total, extras, semJuros: extras===0 };
}
function normalizarOferta(v) {
  // migra viagens antigas para ofertas aéreas + parcelas 18x com acréscimo
  if (v.datas && v.aeroportoOrigem) {
    let semJuros = v.parcelasSemJuros;
    if(semJuros===true) semJuros=6;
    if(semJuros===false) semJuros=1;
    if(semJuros==null) semJuros=6;
    return { ...v, parcelas: v.parcelas || null, parcelasSemJuros: semJuros, acrescimoPorParcela: v.acrescimoPorParcela ?? 2.5, milhas: v.milhas||null, escalas: v.escalas??0, bagagem: v.bagagem||'10kg' };
  }
  if (v.datas) {
    // já é oferta mas pode faltar campos aéreos/parcelas
    let semJuros = v.parcelasSemJuros;
    if(semJuros===true) semJuros=6;
    if(semJuros===false) semJuros=1;
    return {
      ...v,
      aeroportoOrigem: v.aeroportoOrigem || v.origem?.slice(0,3).toUpperCase() || 'NAT',
      aeroportoDestino: v.aeroportoDestino || v.destino?.slice(0,3).toUpperCase() || 'GRU',
      milhas: v.milhas || null,
      parcelas: v.parcelas || null,
      parcelasSemJuros: semJuros ?? 6,
      acrescimoPorParcela: v.acrescimoPorParcela ?? 2.5,
      escalas: v.escalas ?? 0,
      bagagem: v.bagagem || '10kg'
    };
  }
  // viagem legada ônibus -> oferta aérea
  const ciaMap = { 'Guanabara':'LATAM', 'Progresso':'Gol', 'Expresso Cabral':'Azul', 'Gontijo':'Gol' };
  const tipoMap = { 'Semileito':'Econômica', 'Convencional':'Econômica', 'Leito':'Econômica', 'Leito Cama':'Econômica', 'Executivo':'Executiva' };
  return {
    id: v.id,
    origem: v.origem,
    destino: v.destino,
    aeroportoOrigem: v.origem?.slice(0,3).toUpperCase() || 'NAT',
    aeroportoDestino: v.destino?.slice(0,3).toUpperCase() || 'NAT',
    datas: v.data ? formatData(v.data) + (v.hora ? ` • ${v.hora}` : '') : '',
    dataInicio: v.data || '2026-09-10',
    preco: v.preco,
    milhas: null,
    precoAntigo: null,
    empresa: ciaMap[v.empresa] || 'LATAM',
    tipo: tipoMap[v.tipo] || 'Econômica',
    duracao: v.duracao || '1h20',
    escalas: 0,
    bagagem: '23kg',
    imagem: v.imagem,
    status: (v.ocupados && (46 - v.ocupados.length)===0) ? 'encerrada' : 'ativa',
    validadeAte: v.data,
    destaque: false,
    vagasTexto: '',
    descricao: `Voo ${v.origem}→${v.destino} com ${tipoMap[v.tipo]||'Econômica'}`
  };
}

// Load data - ofertas + empresa + config com cache bust - OFERTAS GLOBAIS via /api/ofertas
async function loadData() {
  const fetchWithTimeout = (url, ms=4000) => Promise.race([
    fetch(url + (url.includes('?') ? '&' : '?') + `t=${Date.now()}`, { cache: 'no-store' }),
    new Promise((_, rej) => setTimeout(()=> rej(new Error('timeout '+url)), ms))
  ]);
  let ofertasJson = null;
  let empresaJson = null;
  let configJson = null;
  let veioDaApi = false;
  try {
    // 1) Tenta API global primeiro (qualquer dispositivo vê o mesmo catálogo)
    try {
      const apiRes = await fetchWithTimeout('/api/ofertas');
      if (apiRes && apiRes.ok) {
        const apiData = await apiRes.json();
        if (Array.isArray(apiData) && apiData.length) {
          ofertasJson = apiData;
          veioDaApi = true;
          console.log(`[ViajeFacil] ofertas via /api/ofertas (Blob global) ${ofertasJson.length}`);
        } else if (Array.isArray(apiData) && apiData.length === 0) {
          console.warn('[ViajeFacil] /api/ofertas retornou vazio, fallback para data/*.json');
        }
      }
    } catch (e) { console.warn('api/ofertas falhou, fallback para data/*.json', e.message); }
    // 2) Fallback para arquivos estáticos se API vazia/falhou
    if (!ofertasJson) {
      let ofertasRes = null;
      try { ofertasRes = await fetchWithTimeout('data/ofertas.json'); } catch(e) { console.warn('ofertas.json falhou, tentando viagens.json', e); }
      if (ofertasRes && ofertasRes.ok) {
        ofertasJson = await ofertasRes.json();
      } else {
        const violRes = await fetchWithTimeout('data/viagens.json');
        if (violRes.ok) ofertasJson = await violRes.json();
      }
    }
    // empresa - tenta Blob global primeiro
    let empresaFromApi = null;
    try {
      const empApiRes = await fetchWithTimeout('/api/empresa');
      if (empApiRes && empApiRes.ok) {
        const apiEmp = await empApiRes.json();
        if (apiEmp && typeof apiEmp === 'object' && Object.keys(apiEmp).length) {
          empresaJson = apiEmp;
          empresaFromApi = true;
          console.log('[ViajeFacil] empresa via /api/empresa (Blob global)');
        }
      }
    } catch {}
    if (!empresaFromApi) {
      try {
        const empRes = await fetchWithTimeout('data/empresa.json');
        if (empRes.ok) empresaJson = await empRes.json();
      } catch(e) { console.warn('empresa.json falhou', e); }
    }
    // config - tenta Blob global primeiro
    let configFromApi = null;
    try {
      const cfgApiRes = await fetchWithTimeout('/api/config');
      if (cfgApiRes && cfgApiRes.ok) {
        const apiCfg = await cfgApiRes.json();
        if (apiCfg && typeof apiCfg === 'object' && apiCfg.whatsapp) {
          configJson = apiCfg;
          configFromApi = true;
          console.log('[ViajeFacil] config via /api/config (Blob global)');
        }
      }
    } catch {}
    if (!configFromApi) {
      try {
        const cfgRes = await fetchWithTimeout('data/config.json');
        if (cfgRes.ok) configJson = await cfgRes.json();
      } catch(e) {}
    }
    if (!ofertasJson) throw new Error('nenhum ofertas/viagens json');
    // normaliza
    ofertasJson = ofertasJson.map(normalizarOferta);
    // localStorage overrides limpando corrompido
    try {
      const lsRaw = localStorage.getItem('vf_viagens') || localStorage.getItem('vf_ofertas');
      if (lsRaw === '[]' || lsRaw === 'null' || lsRaw === '""') {
        console.warn('vf_ofertas corrompido, removendo');
        localStorage.removeItem('vf_viagens'); localStorage.removeItem('vf_ofertas');
      }
    } catch(_){}
    try {
      // Só usa localStorage se NÃO veio da API global (evita stale per-device sobrescrever Blob)
      if (!veioDaApi) {
        const lsOfertas = localStorage.getItem('vf_ofertas') || localStorage.getItem('vf_viagens');
        if (lsOfertas) {
          const parsed = JSON.parse(lsOfertas);
          if (Array.isArray(parsed) && parsed.length > 0) ofertasJson = parsed.map(normalizarOferta);
          else if (Array.isArray(parsed) && parsed.length===0) console.warn('vf_ofertas vazio, mantendo seed');
        }
      } else {
        // veio da API global: limpa LS stale e sincroniza
        try { localStorage.setItem('vf_ofertas', JSON.stringify(ofertasJson)); } catch {}
      }
      // Só usa LS se não veio da API global (evita stale per-device)
      if (!configFromApi) {
        const lsConfig = localStorage.getItem('vf_config');
        if (lsConfig) {
          const pc = JSON.parse(lsConfig);
          if (pc && pc.whatsapp) configJson = { ...(configJson||{}), ...pc };
        }
      } else {
        try { localStorage.setItem('vf_config', JSON.stringify(configJson)); } catch {}
      }
      if (!empresaFromApi) {
        const lsEmpresa = localStorage.getItem('vf_empresa');
        if (lsEmpresa) {
          const pe = JSON.parse(lsEmpresa);
          if (pe) empresaJson = { ...(empresaJson||{}), ...pe };
        }
      } else {
        try { localStorage.setItem('vf_empresa', JSON.stringify(empresaJson)); } catch {}
      }
    } catch(e) { console.warn('localStorage override falhou', e); }

    viagensData = ofertasJson;
    ofertasData = ofertasJson;
    if (empresaJson) empresaData = empresaJson;
    if (configJson) configData = configJson;
    if (!configData.whatsapp) configData.whatsapp = WHATSAPP_FALLBACK;
    if (!empresaData.whatsapp) empresaData.whatsapp = configData.whatsapp;
    console.log(`[ViajeFacil] ${viagensData.length} ofertas carregadas via fetch`);
  } catch (e) {
    console.error('Erro ao carregar ofertas via fetch, fallback', e);
    try {
      const lsOfertas = localStorage.getItem('vf_ofertas') || localStorage.getItem('vf_viagens');
      if (lsOfertas) {
        const parsed = JSON.parse(lsOfertas);
        if (Array.isArray(parsed) && parsed.length>0) {
          viagensData = parsed.map(normalizarOferta);
          ofertasData = viagensData;
          const lsConfig = localStorage.getItem('vf_config');
          if (lsConfig) configData = JSON.parse(lsConfig);
          const lsEmpresa = localStorage.getItem('vf_empresa');
          if (lsEmpresa) empresaData = JSON.parse(lsEmpresa);
          console.log(`[ViajeFacil] ${viagensData.length} ofertas via localStorage`);
          return;
        }
      }
    } catch(_){}
    if (!viagensData.length) {
      viagensData = OFERTAS_FALLBACK;
      ofertasData = OFERTAS_FALLBACK;
      empresaData = { whatsapp: WHATSAPP_FALLBACK, nome: 'Viaje Fácil' };
      configData = { whatsapp: WHATSAPP_FALLBACK, nomeEmpresa: 'Viaje Fácil' };
      console.warn('[ViajeFacil] Usando OFERTAS_FALLBACK embarcado');
      if (location.protocol === 'file:') setTimeout(()=> toast('Abra via Live Server para ver todas as ofertas.', 'warn'), 800);
    }
    if (!configData.whatsapp) configData.whatsapp = WHATSAPP_FALLBACK;
  }
  // expõe global para admin
  window.ofertasData = viagensData;
  window.empresaData = empresaData;
}

// INDEX PAGE LOGIC - sempre mostra ofertas ATIVAS no feed
async function initIndex() {
  try { await loadData(); } catch(e){ console.error('initIndex falhou',e); if(!viagensData.length) viagensData=OFERTAS_FALLBACK; }
  if (!viagensData || viagensData.length===0) {
    viagensData = OFERTAS_FALLBACK; ofertasData = OFERTAS_FALLBACK;
    try{ localStorage.removeItem('vf_ofertas'); localStorage.removeItem('vf_viagens'); }catch(_){}
  }
  if (location.protocol === 'file:') {
    const aviso=document.createElement('div');
    aviso.className='max-w-[1280px] mx-auto mt-2 mx-4 sm:mx-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2';
    aviso.innerHTML='<span>⚠️ Você abriu via <strong>file://</strong>. Abra com <strong>Live Server</strong> no VS Code.</span>';
    document.querySelector('.hero-section')?.before(aviso);
  }
  console.log('[ViajeFacil] initIndex ofertas', viagensData.length);
  popularFiltros();
  renderEmpresa();
  const ativas = viagensData.filter(isAtiva).sort((a,b)=> (a.dataInicio||'').localeCompare(b.dataInicio||''));
  renderViagens(ativas);
  const contador=document.getElementById('contador-resultados');
  if(contador) contador.textContent = `${ativas.length} ofertas disponíveis`;
  bindBusca();
  bindSwiper();
  setTimeout(()=>{
    const grid=document.getElementById('grid-viagens');
    if(grid && grid.innerHTML.includes('Buscando')) {
      console.warn('[ViajeFacil] fallback render forçado');
      renderViagens(ativas);
    }
  }, 1000);
}

function popularFiltros(){
  const origens=[...new Set(viagensData.map(v=>v.origem))];
  const destinos=[...new Set(viagensData.map(v=>v.destino))];
  const ol=$('#origem-list'); const dl=$('#destino-list');
  if(ol) ol.innerHTML=origens.map(o=>`<option value="${o}">`).join('');
  if(dl) dl.innerHTML=destinos.map(d=>`<option value="${d}">`).join('');
}

function bindBusca(){
  const form=$('#form-busca'); if(!form) return;
  form.addEventListener('submit', e=>{ e.preventDefault(); filtrar(); });
  ['origem-input','destino-input','data-input'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', filtrar);
  });
  const limpar=$('#btn-limpar');
  if(limpar) limpar.addEventListener('click', ()=>{
    form.reset();
    const ativas=viagensData.filter(isAtiva);
    renderViagens(ativas);
    const c=$('#contador-resultados'); if(c) c.textContent=`${ativas.length} ofertas disponíveis`;
  });
}

function filtrar(){
  const origem=($('#origem-input')?.value||'').toLowerCase().trim();
  const destino=($('#destino-input')?.value||'').toLowerCase().trim();
  const data=$('#data-input')?.value||'';
  let base=viagensData.filter(isAtiva);
  let filtradas=base.filter(o=>{
    const mO=!origem||o.origem.toLowerCase().includes(origem);
    const mD=!destino||o.destino.toLowerCase().includes(destino);
    const mData=!data||o.dataInicio===data||o.validadeAte===data;
    return mO&&mD&&mData;
  });
  renderViagens(filtradas);
  const c=$('#contador-resultados');
  if(filtradas.length===0){ if(c) c.textContent='Nenhuma oferta encontrada para essa busca.'; }
  else { if(c) c.textContent=`${filtradas.length} oferta(s) encontrada(s)`; }
  document.querySelector('#resultados')?.scrollIntoView({behavior:'smooth', block:'start'});
}

// renderEmpresa - bloco confiança
function renderEmpresa(){
  const sec=$('#empresa-bloco');
  if(!sec) return;
  const emp=empresaData;
  if(!emp || !emp.nome) return;
  // preenche dinamicamente se existir placeholders
  const set = (id, val) => { const el=document.getElementById(id); if(el && val) el.textContent=val; };
  set('empresa-nome', emp.nome);
  set('empresa-slogan', emp.slogan);
  set('empresa-sobre', emp.sobre);
  set('empresa-cnpj', emp.cnpj ? `CNPJ ${emp.cnpj}` : '');
  set('empresa-anos', emp.anos || '');
  set('empresa-horario', emp.horario || '');
  set('empresa-endereco', emp.endereco || '');
  const canalBtn=$('#empresa-canal-btn');
  if(canalBtn && emp.canalLink) canalBtn.href=emp.canalLink;
  const canalNome=$('#empresa-canal-nome');
  if(canalNome && emp.canalNome) canalNome.textContent=emp.canalNome;
  // diferenciais
  const difContainer=$('#empresa-diferenciais');
  if(difContainer && emp.diferenciais) {
    difContainer.innerHTML=emp.diferenciais.map(d=>`
      <div class="bg-white rounded-2xl border border-slate-200 p-5 text-center">
        <div class="w-10 h-10 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><i data-lucide="${d.icon}" class="w-5 h-5"></i></div>
        <h4 class="font-display font-semibold text-sm">${d.titulo}</h4>
        <p class="text-xs text-slate-500 mt-1">${d.desc}</p>
      </div>
    `).join('');
  }
  const depoContainer=$('#empresa-depoimentos');
  if(depoContainer && emp.depoimentos){
    depoContainer.innerHTML=emp.depoimentos.map(d=>`
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex gap-1 text-amber-500 text-sm">${'★'.repeat(d.nota||5)}</div>
        <p class="text-sm text-slate-700 mt-2">“${d.texto}”</p>
        <div class="text-xs text-slate-500 mt-2 font-medium">${d.nome}</div>
      </div>
    `).join('');
  }
  if(typeof lucide!=='undefined') try{lucide.createIcons();}catch(_){}
}

function renderViagens(lista){
  const container=$('#grid-viagens');
  const contador=$('#contador-resultados');
  if(!container) return;
  if(!lista || lista.length===0){
    const total=viagensData.filter(isAtiva).length;
    container.innerHTML=`
      <div class="col-span-full py-16 text-center">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-3xl">✈️</div>
        <h3 class="font-display font-semibold text-slate-800 text-lg">Nenhuma oferta no momento</h3>
        <p class="text-slate-500 mt-1 text-sm">${total?`Você buscou algo que não temos. Temos ${total} oferta(s) ativas.`:`Nenhuma oferta ativa. Acesse o <a href='admin.html' class='underline font-semibold'>painel</a> para criar.`}</p>
        <p class="text-xs text-slate-400 mt-2">As promoções encerradas são retiradas automaticamente. Entre no canal para ser avisado.</p>
        <button id="btn-ver-todas" class="mt-4 px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Ver todas ativas (${total})</button>
      </div>`;
    setTimeout(()=>{
      const btn=document.getElementById('btn-ver-todas');
      if(btn) btn.addEventListener('click', ()=>{
        const f=document.getElementById('form-busca'); if(f) f.reset();
        renderViagens(viagensData.filter(isAtiva));
        if(contador) contador.textContent=`${total} ofertas disponíveis`;
      });
    },0);
    if(contador) contador.textContent='Nenhuma oferta encontrada';
    return;
  }
  if(contador && !contador.textContent.includes('encontrada')) contador.textContent=`${lista.length} ofertas disponíveis`;
  container.style.opacity='1';
  container.innerHTML=lista.map(o=>{
    const precoAntigo = o.precoAntigo ? `<span class="text-xs text-slate-400 line-through ml-2">De ${formatPreco(o.precoAntigo)}</span>` : '';
    const milhasTxt = o.milhas ? `${o.milhas.toLocaleString('pt-BR')} milhas + taxas` : '';
    const milhasBadge = o.milhas ? `<span class="px-2 py-1 rounded-full text-[11px] font-bold bg-[#1E3145] text-white border border-white/20 whitespace-nowrap shrink-0 inline-flex items-center">${o.milhas.toLocaleString('pt-BR')} milhas</span>` : '';
    const destaqueBadge = o.destaque ? `<span class="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white whitespace-nowrap shrink-0 inline-flex items-center">🔥 Destaque</span>` : '';
    const escalaTxt = o.escalas === 0 ? 'Direto' : `${o.escalas} escala${o.escalas>1?'s':''}`;
    const parcelaCalc = o.parcelas ? calculaParcela(o, o.parcelas) : null;
    const parcelaInfo = parcelaCalc ? { ...parcelaCalc, texto: `${o.parcelas}x de ${formatPreco(parcelaCalc.valor)}${parcelaCalc.semJuros?' sem juros':` c/ ${o.acrescimoPorParcela}% a.m.`}` } : null;
    const validadeTxt = (() => {
      if(!o.validadeAte) return '';
      const hoje=new Date(); hoje.setHours(0,0,0,0);
      const val=new Date(o.validadeAte); val.setHours(0,0,0,0);
      const diff=Math.ceil((val-hoje)/86400000);
      if(diff<0) return '<span class="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200 whitespace-nowrap shrink-0 inline-flex items-center">⏳ Encerrada</span>';
      if(diff===0) return '<span class="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200 whitespace-nowrap shrink-0 inline-flex items-center">⏳ Encerra hoje</span>';
      if(diff<=2) return `<span class="px-2 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0 inline-flex items-center">⏳ Encerra em ${diff}d</span>`;
      return `<span class="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0 inline-flex items-center">⏳ Até ${formatData(o.validadeAte)}</span>`;
    })();
    return `
    <article class="card-viagem group bg-white rounded-[20px] overflow-hidden border border-slate-200 hover:border-slate-300 flex flex-col">
      <div class="relative h-44 overflow-hidden">
        <img src="${o.imagem}" alt="${o.origem} para ${o.destino}" class="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
        <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-88px)] items-start">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur text-slate-800 whitespace-nowrap shrink-0 inline-flex items-center"><i data-lucide="plane" class="w-3 h-3 inline mr-1"></i>${o.empresa||''} • ${o.tipo||'Econômica'}</span>
          ${destaqueBadge}
          ${milhasBadge}
        </div>
        <div class="absolute top-3 right-3">${validadeTxt}</div>
        <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <div class="flex items-center gap-1.5 text-white">
              <span class="font-display font-bold text-lg leading-none">${o.origem}</span>
              <span class="opacity-80">→</span>
              <span class="font-display font-bold text-lg leading-none">${o.destino}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-white/70 text-[11px] uppercase tracking-widest font-medium">em até</div>
            ${parcelaInfo ? `<div class="text-white font-display font-bold text-base leading-tight">${o.parcelas}x de ${formatPreco(parcelaInfo.valor)}</div><div class="text-white/80 text-xs">${formatPreco(o.preco)} à vista</div>` : `<div class="text-white font-display font-bold text-lg leading-none">${milhasTxt || formatPreco(o.preco)}${!milhasTxt ? precoAntigo : ''}</div>${milhasTxt && o.preco ? `<div class="text-white/80 text-xs">${formatPreco(o.preco)} taxas</div>` : ''}`}
          </div>
        </div>
      </div>
      <div class="p-4 flex-1 flex flex-col">
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200"><i data-lucide="calendar" class="w-3 h-3"></i> ${o.datas}</span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200"><i data-lucide="clock" class="w-3 h-3"></i> ${o.duracao}</span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200"><i data-lucide="route" class="w-3 h-3"></i> ${escalaTxt}</span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200"><i data-lucide="plane" class="w-3 h-3"></i> ${o.empresa}</span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-200"><i data-lucide="baggage-claim" class="w-3 h-3"></i> ${o.bagagem||'10kg'}</span>
          ${o.vagasTexto ? `<span class="font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">${o.vagasTexto}</span>` : ''}
        </div>
        <div class="flex items-center justify-between text-xs mt-2">
          <span class="text-slate-500">${o.empresa} • ${o.tipo}</span>
          <span class="text-slate-400">${o.aeroportoOrigem||''} → ${o.aeroportoDestino||''}</span>
        </div>
        ${o.descricao ? `<p class="text-xs text-slate-500 mt-2 line-clamp-2">${o.descricao}</p>` : ''}
        <button onclick="consultarOferta(${o.id})" class="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-full py-3 text-sm font-bold hover:bg-[#128C7E] transition shadow-[0_4px_12px_rgba(37,211,102,0.25)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19.05 4.94A9.82 9.82 0 0 0 12.04 2a9.82 9.82 0 0 0-8.5 14.82L2 22l5.3-1.39A9.82 9.82 0 0 0 12.04 22a9.82 9.82 0 0 0 9.82-9.82 9.76 9.76 0 0 0-2.81-7.24Zm-7.01 13.7a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.15.83.84-3.07-.2-.32a8.2 8.2 0 0 1-1.26-4.37A8.2 8.2 0 0 1 12.04 3.6a8.2 8.2 0 0 1 8.2 8.2 8.2 8.2 0 0 1-8.2 8.84Zm4.52-6.15c-.25-.12-1.47-.73-1.7-.81s-.39-.12-.56.12-.64.81-.79.97-.29.19-.54.06a6.86 6.86 0 0 1-2-1.24 7.56 7.56 0 0 1-1.4-1.73c-.15-.25 0-.39.11-.51s.25-.29.37-.43a1.66 1.66 0 0 0 .25-.41.46.46 0 0 0 0-.43c0-.12-.56-1.35-.77-1.85s-.41-.43-.56-.44h-.48a.9.9 0 0 0-.66.31 2.77 2.77 0 0 0-.86 2.05 4.8 4.8 0 0 0 1 2.57 11 11 0 0 0 4.2 3.71 14.1 14.1 0 0 0 1.4.52 3.36 3.36 0 0 0 1.53.1 2.5 2.5 0 0 0 1.64-1.15.2.2 0 0 0 0-.2c-.06-.1-.25-.16-.5-.28Z"/></svg>
          Consultar no WhatsApp
        </button>
        <a href="oferta.html?id=${o.id}" class="mt-2 text-center text-xs text-slate-500 hover:text-slate-800 underline">Ver detalhes da oferta</a>
      </div>
    </article>`;
  }).join('');
  if(typeof lucide!=='undefined') try{lucide.createIcons();}catch(_){}
  const cards=container.querySelectorAll('.card-viagem');
  cards.forEach(c=>{c.style.opacity='1'; c.style.transform='none';});
  if(typeof gsap!=='undefined'){
    try{
      gsap.from(cards, { y:12, duration:0.4, stagger:0.05, ease:'power2.out', overwrite:'auto', clearProps:'transform'});
      if(typeof ScrollTrigger!=='undefined') setTimeout(()=> ScrollTrigger.refresh(),100);
    }catch(e){ console.warn('GSAP anim falhou',e); }
  }
  console.log(`[ViajeFacil] renderOfertas OK - ${lista.length} cards`);
}

function consultarOferta(id, parcelasEscolhidasParam){
  const o=viagensData.find(x=>x.id===id);
  if(!o) return toast('Oferta não encontrada','warn');
  const whatsapp=(configData.whatsapp || empresaData.whatsapp || WHATSAPP_FALLBACK).replace(/\D/g,'');
  const milhasTxt = o.milhas ? `${o.milhas.toLocaleString('pt-BR')} milhas + ${formatPreco(o.preco)} taxas` : formatPreco(o.preco);
  // se cliente escolheu parcelas na oferta.html, usa essa escolha
  let parcelasEscolhidas = parcelasEscolhidasParam;
  if(!parcelasEscolhidas){
    const sel=document.getElementById('oferta-parcelas-select');
    if(sel && sel.value) parcelasEscolhidas=parseInt(sel.value);
    else parcelasEscolhidas=o.parcelas;
  }
  const calc = parcelasEscolhidas ? calculaParcela(o, parcelasEscolhidas) : null;
  const parcelaTxt = calc ? `${parcelasEscolhidas}x de ${formatPreco(calc.valor)}${calc.semJuros?' sem juros':` c/ acréscimo` } (Total ${formatPreco(calc.total)})` : (o.parcelas ? `${o.parcelas}x de ${formatPreco(o.preco/o.parcelas)}` : '');
  const escalaTxt = o.escalas===0 ? 'Voo direto' : `${o.escalas} escala${o.escalas>1?'s':''}`;
  const aeroTxt = o.aeroportoOrigem && o.aeroportoDestino ? `${o.aeroportoOrigem}→${o.aeroportoDestino}` : '';
  let msg=`Olá! Vi a oferta no site *${empresaData.nome||configData.nomeEmpresa||'Vou com Milhas'}*%0A%0A`+
    `✈️ *${o.origem} → ${o.destino}* ${aeroTxt?`(${aeroTxt})`:''}%0A`+
    `📅 Datas: ${o.datas} • ${o.duracao} • ${escalaTxt} • Bag: ${o.bagagem||'10kg'}%0A`+
    `💰 ${milhasTxt}${o.precoAntigo?` (de ${formatPreco(o.precoAntigo)})`:''} • ${o.empresa} • ${o.tipo}%0A`+
    `${parcelaTxt?`💳 Parcelado em ${parcelaTxt} • `:''}⏳ Validade: ${o.validadeAte?formatData(o.validadeAte):'enquanto durar'}%0A`+
    `🎫 Oferta #${o.id}%0A%0A`+
    `Pode confirmar disponibilidade?`;
  // lead - local + Blob global
  const leadPayload = { ofertaId:o.id, rota:`${o.origem}→${o.destino}`, datas:o.datas, preco:formatPreco(o.preco), createdAt:new Date().toISOString() };
  try{
    const leads=JSON.parse(localStorage.getItem('vf_leads')||'[]');
    leads.push({ id:Date.now(), ...leadPayload });
    localStorage.setItem('vf_leads', JSON.stringify(leads));
  }catch(_){}
  // envia para Blob (global) - usa sendBeacon/keepalive para não abortar ao abrir WhatsApp no mobile
  try{
    const nomeLead = ($('#lead-nome')?.value||'').trim();
    const telLead = ($('#lead-telefone')?.value||'').trim();
    const payload = JSON.stringify({...leadPayload, nome:nomeLead, telefone:telLead});
    let sent = false;
    if(navigator.sendBeacon){
      try{ sent = navigator.sendBeacon('/api/leads', new Blob([payload], {type:'application/json'})); }catch(_){ sent=false; }
    }
    if(!sent){
      fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: payload, keepalive:true }).catch(()=>{});
    }
  }catch(_){}
  window.open(`https://wa.me/${whatsapp}?text=${msg}`,'_blank');
  toast('Abrindo WhatsApp com a oferta!','success');
}
window.consultarOferta=consultarOferta;

function renderDestaques(){
  const wrapper=document.getElementById('destinos-wrapper');
  if(!wrapper) { bindSwiperFallback(); return; }
  const destaques=viagensData.filter(o=> o.destaque && isAtiva(o)).slice(0,6);
  const section=wrapper.closest('section');
  if(destaques.length===0){
    if(section) section.style.display='none';
    return;
  }
  if(section) section.style.display='';
  wrapper.innerHTML=destaques.map(o=>`
    <div class="swiper-slide">
      <a href="oferta.html?id=${o.id}" class="block rounded-2xl overflow-hidden relative h-[160px] group">
        <img src="${o.imagem}" alt="${o.origem} para ${o.destino}" class="w-full h-full object-cover group-hover:scale-[1.05] transition duration-500">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#F9A521] text-[#1E3145] text-[10px] font-bold">🔥 Destaque</div>
        <div class="absolute bottom-3 left-3 text-white">
          <div class="font-display font-bold">${o.destino}</div>
          <div class="text-xs opacity-90">A partir de ${formatPreco(o.preco)} • ${o.datas}</div>
        </div>
      </a>
    </div>
  `).join('');
  // re-init swiper after injecting
  if(typeof Swiper!=='undefined'){
    const el=document.querySelector('.destinos-swiper');
    if(el && el.swiper) el.swiper.destroy(true, true);
    new Swiper(el, { slidesPerView:1.2, spaceBetween:16, breakpoints:{640:{slidesPerView:2.2},1024:{slidesPerView:3.2}}, freeMode:true, grabCursor:true });
  }
  if(typeof lucide!=='undefined') try{lucide.createIcons();}catch(_){}
  console.log(`[ViajeFacil] destaques renderizados: ${destaques.length}/6`);
}
function bindSwiper(){
  const wrapper=document.getElementById('destinos-wrapper');
  if(wrapper){
    renderDestaques();
    return;
  }
  if(typeof Swiper==='undefined') return;
  const el=document.querySelector('.destinos-swiper');
  if(!el) return;
  new Swiper(el, { slidesPerView:1.2, spaceBetween:16, breakpoints:{640:{slidesPerView:2.2},1024:{slidesPerView:3.2}}, freeMode:true, grabCursor:true });
}
function bindSwiperFallback(){ bindSwiper(); }

// DETALHES/OFERTA PAGE LOGIC - compat com oferta.html e detalhes.html
async function initDetalhes(){
  await loadData();
  const params=new URLSearchParams(window.location.search);
  const id=Number(params.get('id'));
  viagemAtual=viagensData.find(v=>v.id===id);
  if(!viagemAtual){
    const c=$('#detalhes-container')||$('#oferta-container');
    if(c) c.innerHTML=`<div class="py-20 text-center"><h2 class="font-display text-2xl font-bold">Oferta não encontrada ou encerrada</h2><a href="index.html" class="mt-4 inline-block px-6 py-3 rounded-full bg-slate-900 text-white">Voltar às ofertas</a></div>`;
    return;
  }
  // se for oferta nova, render detalhe oferta, senão mapa legado
  if(viagemAtual.datas && !viagemAtual.hora) {
    renderOfertaDetalhe(viagemAtual);
  } else {
    renderDetalhes(viagemAtual);
    renderMapa(viagemAtual);
    bindDetalhesEventos();
  }
}
function renderOfertaDetalhe(o){
  const ativa=isAtiva(o);
  // prioriza oferta-* (visível) e também preenche detalhes-* para compat
  const imgOferta=$('#oferta-imagem');
  const imgDetalhes=$('#detalhes-imagem');
  if(imgOferta) { imgOferta.src=o.imagem; imgOferta.onerror=()=>{ imgOferta.src='https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }; }
  if(imgDetalhes) { imgDetalhes.src=o.imagem; }
  const rotaOferta=$('#oferta-rota');
  const rotaDetalhes=$('#detalhes-rota');
  if(rotaOferta) rotaOferta.textContent=`${o.origem} → ${o.destino}`;
  if(rotaDetalhes) rotaDetalhes.textContent=`${o.origem} → ${o.destino}`;
  const dataOferta=$('#oferta-datas');
  const dataDetalhes=$('#detalhes-data');
  if(dataOferta) dataOferta.textContent=`${o.datas} • ${o.duracao} • ${o.empresa} • ${o.tipo}`;
  if(dataDetalhes) dataDetalhes.textContent=`${o.datas} • ${o.duracao} • ${o.empresa} • ${o.tipo}`;
  const emp=$('#detalhes-empresa');
  if(emp) emp.textContent=`${o.empresa} • ${o.tipo}`;
  // preenche cards empresa/tipo/duracao direto (antes dependia de polling frágil)
  const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val||'—'; };
  set('oferta-empresa', o.empresa);
  set('oferta-tipo', o.tipo);
  set('oferta-duracao', o.duracao);
  const precoOferta=$('#oferta-preco');
  const precoDetalhes=$('#detalhes-preco');
  const precoPrincipal = o.parcelas ? `${o.parcelas}x de ${formatPreco(o.preco/o.parcelas)}${o.parcelasSemJuros?' sem juros':''}` : formatPreco(o.preco);
  if(precoOferta) precoOferta.textContent=precoPrincipal;
  if(precoDetalhes) precoDetalhes.textContent=precoPrincipal;
  const precoAnt=$('#oferta-preco-antigo');
  if(precoAnt) precoAnt.textContent=o.precoAntigo?`De ${formatPreco(o.precoAntigo)}`:'';
  const vagas=$('#detalhes-vagas');
  if(vagas) {
    if(o.vagasTexto){ vagas.textContent=o.vagasTexto; vagas.parentElement.style.display=''; }
    else { vagas.textContent=''; if(vagas.parentElement) vagas.parentElement.style.display='none'; }
  }
  const desc=$('#oferta-descricao');
  if(desc) desc.textContent=o.descricao||'';
  // avião extras - atende oferta.html e detalhes.html
  const milhasEl=$('#oferta-milhas')||$('#detalhes-milhas');
  if(milhasEl){
    if(o.milhas) milhasEl.textContent=`${o.milhas.toLocaleString('pt-BR')} milhas + ${formatPreco(o.preco)} taxas`;
    else if(o.parcelas){
      const calc=calculaParcela(o, o.parcelas);
      milhasEl.textContent=`${o.parcelas}x de ${formatPreco(calc.valor)}${calc.semJuros?' sem juros':` c/ ${o.acrescimoPorParcela}% a.m.`}`;
    }
    else milhasEl.textContent=formatPreco(o.preco);
  }
  // parcelamento seletor
  const parcelasBox=$('#oferta-parcelamento-box');
  const parcelasSelect=$('#oferta-parcelas-select');
  const parcelaValorEl=$('#oferta-parcela-valor');
  const parcelaTotalEl=$('#oferta-parcela-total');
  const parcelaJurosEl=$('#oferta-parcela-juros');
  if(parcelasBox && parcelasSelect){
    if(!o.parcelas){
      parcelasBox.style.display='none';
    } else {
      parcelasBox.style.display='';
      parcelasSelect.innerHTML='';
      for(let i=1;i<=o.parcelas;i++){
        const c=calculaParcela(o,i);
        const opt=document.createElement('option');
        opt.value=i;
        opt.textContent=`${i}x de ${formatPreco(c.valor)}${c.semJuros?' sem juros':` com acréscimo`} (Total ${formatPreco(c.total)})`;
        if(i===o.parcelas) opt.selected=true;
        parcelasSelect.appendChild(opt);
      }
      const updateParcelaDisplay=()=>{
        const escolhido=parseInt(parcelasSelect.value)||o.parcelas;
        const calc=calculaParcela(o, escolhido);
        if(parcelaValorEl) parcelaValorEl.textContent=`${escolhido}x de ${formatPreco(calc.valor)}${calc.semJuros?' sem juros':''}`;
        if(parcelaTotalEl) parcelaTotalEl.textContent=`Total ${formatPreco(calc.total)} ${calc.semJuros? 'à vista' : `c/ ${((calc.total/o.preco-1)*100).toFixed(1)}% acréscimo`}`;
        if(parcelaJurosEl) parcelaJurosEl.textContent=calc.semJuros? 'Sem juros até '+o.parcelasSemJuros+'x' : `Acréscimo de ${o.acrescimoPorParcela}% por parcela extra após ${o.parcelasSemJuros}x`;
        // atualiza preço principal também
        const precoEl=$('#oferta-preco');
        if(precoEl) precoEl.textContent=`${escolhido}x de ${formatPreco(calc.valor)}`;
        const precoAnt=$('#oferta-preco-antigo');
        if(precoAnt) precoAnt.textContent=`${formatPreco(o.preco)} à vista`;
      };
      parcelasSelect.onchange=updateParcelaDisplay;
      updateParcelaDisplay();
    }
  }
  const bagEl=$('#oferta-bagagem')||$('#detalhes-bagagem')||$('#detalhes-bagagem-card');
  if(bagEl) bagEl.textContent=o.bagagem||'10kg';
  const escalaEl=$('#oferta-escalas')||$('#detalhes-escalas')||$('#detalhes-escalas-card');
  if(escalaEl) escalaEl.textContent=o.escalas===0? 'Direto' : `${o.escalas} escala${o.escalas>1?'s':''}`;
  const aeroEl=$('#oferta-aeroportos');
  if(aeroEl) aeroEl.textContent=o.aeroportoOrigem && o.aeroportoDestino ? `${o.aeroportoOrigem} → ${o.aeroportoDestino}` : `${o.origem} → ${o.destino}`;
  const classeEl=$('#detalhes-classe');
  if(classeEl) classeEl.textContent=o.tipo||'Econômica';
  const resumoMilhas=$('#resumo-milhas');
  if(resumoMilhas){
    if(o.milhas) resumoMilhas.textContent=`${o.milhas.toLocaleString('pt-BR')} milhas + taxas`;
    else if(o.parcelas) resumoMilhas.textContent=`${o.parcelas}x de ${formatPreco(o.preco/o.parcelas)}${o.parcelasSemJuros?' sem juros':''}`;
    else resumoMilhas.textContent='Consulte no WhatsApp';
  }
  const resumoPrecoDet=$('#resumo-preco');
  if(resumoPrecoDet){
    if(o.parcelas) resumoPrecoDet.textContent=`${o.parcelas}x ${formatPreco(o.preco/o.parcelas)}`;
    else resumoPrecoDet.textContent=formatPreco(o.preco);
  }
  const resumoTot=$('#resumo-total');
  if(resumoTot){
    if(o.parcelas) resumoTot.textContent=`${o.parcelas}x ${formatPreco(o.preco/o.parcelas)} • ${formatPreco(o.preco)} à vista`;
    else resumoTot.textContent=formatPreco(o.preco);
  }
  const btnWhatsapp=$('#btn-whatsapp');
  const btnConsultar=$('#btn-consultar-oferta');
  [btnWhatsapp, btnConsultar].forEach(btn=>{
    if(!btn) return;
    if(!ativa){
      btn.textContent='⛔ Oferta encerrada';
      btn.disabled=true;
      btn.classList.add('opacity-50','cursor-not-allowed');
      btn.classList.remove('bg-[#25D366]');
      btn.classList.add('bg-slate-400');
      btn.onclick=null;
    } else {
      btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.05 4.94A9.82 9.82 0 0 0 12.04 2a9.82 9.82 0 0 0-8.5 14.82L2 22l5.3-1.39A9.82 9.82 0 0 0 12.04 22a9.82 9.82 0 0 0 9.82-9.82 9.76 9.76 0 0 0-2.81-7.24Zm-7.01 13.7a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.15.83.84-3.07-.2-.32a8.2 8.2 0 0 1-1.26-4.37A8.2 8.2 0 0 1 12.04 3.6a8.2 8.2 0 0 1 8.2 8.2 8.2 8.2 0 0 1-8.2 8.84Zm4.52-6.15c-.25-.12-1.47-.73-1.7-.81s-.39-.12-.56.12-.64.81-.79.97-.29.19-.54.06a6.86 6.86 0 0 1-2-1.24 7.56 7.56 0 0 1-1.4-1.73c-.15-.25 0-.39.11-.51s.25-.29.37-.43a1.66 1.66 0 0 0 .25-.41.46.46 0 0 0 0-.43c0-.12-.56-1.35-.77-1.85s-.41-.43-.56-.44h-.48a.9.9 0 0 0-.66.31 2.77 2.77 0 0 0-.86 2.05 4.8 4.8 0 0 0 1 2.57 11 11 0 0 0 4.2 3.71 14.1 14.1 0 0 0 1.4.52 3.36 3.36 0 0 0 1.53.1 2.5 2.5 0 0 0 1.64-1.15.2.2 0 0 0 0-.2c-.06-.1-.25-.16-.5-.28Z"/></svg> Consultar no WhatsApp';
      btn.onclick=()=> {
        const sel=document.getElementById('oferta-parcelas-select');
        const parcelasEscolhidas = sel && sel.value ? parseInt(sel.value) : null;
        consultarOferta(o.id, parcelasEscolhidas);
      };
      btn.disabled=false;
      btn.classList.remove('opacity-50','cursor-not-allowed','bg-slate-400');
      btn.classList.add('bg-[#25D366]');
    }
  });
  const validade=$('#oferta-validade');
  if(validade){
    if(!ativa) validade.textContent='⛔ Encerrada — entre no canal para a próxima';
    else if(o.validadeAte) validade.textContent=`⏳ Válida até ${formatData(o.validadeAte)}`;
  }
  // banner encerrada no topo
  if(!ativa){
    const cont=$('#oferta-container')||$('#detalhes-container');
    if(cont && !document.getElementById('banner-encerrada')){
      const banner=document.createElement('div');
      banner.id='banner-encerrada';
      banner.className='mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2';
      banner.innerHTML='<span class="font-bold">⛔ Esta oferta já encerrou</span><span class="text-red-600">• Foi retirada do feed e do canal. Veja outras ativas abaixo.</span><a href="index.html#resultados" class="ml-auto px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">Ver ativas</a>';
      cont.prepend(banner);
    }
  }
}
function renderDetalhes(v){
  const vagas=vagasLivres(v);
  const elImg=$('#detalhes-imagem'); if(elImg) elImg.src=v.imagem;
  const elRota=$('#detalhes-rota'); if(elRota) elRota.textContent=`${v.origem} → ${v.destino}`;
  const elData=$('#detalhes-data'); if(elData) elData.textContent=`${formatData(v.data)} • ${v.hora} → ${v.chegada} • ${v.duracao}`;
  const elEmp=$('#detalhes-empresa'); if(elEmp) elEmp.textContent=`${v.empresa} • ${v.tipo}`;
  const elPreco=$('#detalhes-preco'); if(elPreco) elPreco.textContent=formatPreco(v.preco);
  const elVagas=$('#detalhes-vagas'); if(elVagas) elVagas.textContent=`${vagas} vagas de ${v.totalAssentos}`;
  const elBar=$('#detalhes-bar'); if(elBar) elBar.style.width=`${Math.round(vagas/v.totalAssentos*100)}%`;
  const resumo=$('#resumo-preco'); if(resumo) resumo.textContent=formatPreco(v.preco);
}
function renderMapa(v){
  const container=$('#mapa-assentos'); if(!container) return;
  container.innerHTML='';
  assentosSelecionados=[];
  for(let i=1;i<= (v.totalAssentos||46);i++){
    const isOcupado=v.ocupados?.includes(i);
    const div=document.createElement('button');
    div.type='button'; div.dataset.numero=i;
    div.className='assento '+(isOcupado?'ocupado':'livre');
    div.innerHTML=isOcupado?`<span style="position:relative; z-index:1">${i}</span><span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:14px; opacity:0.35">×</span>`:`${i}`;
    div.disabled=isOcupado;
    div.addEventListener('click', ()=> toggleAssento(i,div));
    container.appendChild(div);
  }
  atualizarResumo();
}
function toggleAssento(numero, el){
  const idx=assentosSelecionados.indexOf(numero);
  if(idx>=0){ assentosSelecionados.splice(idx,1); el.classList.remove('selecionado'); el.classList.add('livre'); }
  else{
    if(assentosSelecionados.length>=6) return toast('Máximo 6 passagens','warn');
    assentosSelecionados.push(numero); assentosSelecionados.sort((a,b)=>a-b);
    el.classList.remove('livre'); el.classList.add('selecionado');
    if(typeof gsap!=='undefined') gsap.fromTo(el,{scale:0.9},{scale:1.05,duration:0.2,ease:'back.out(1.7)'});
  }
  atualizarResumo();
}
function atualizarResumo(){
  const qtd=assentosSelecionados.length;
  const precoUnit=viagemAtual?viagemAtual.preco:0;
  const total=qtd*precoUnit;
  const elQtd=$('#resumo-qtd'); if(elQtd) elQtd.textContent=qtd===0?'Nenhum assento selecionado':`${qtd} assento(s): ${assentosSelecionados.join(', ')}`;
  const elTotal=$('#resumo-total'); if(elTotal) elTotal.textContent=formatPreco(total);
  const elNum=$('#resumo-qtd-num'); if(elNum) elNum.textContent=qtd;
  const btn=$('#btn-whatsapp'); if(btn){ btn.disabled=qtd===0; btn.classList.toggle('opacity-40',qtd===0); btn.classList.toggle('cursor-not-allowed',qtd===0); }
  const hint=$('#hint-selecao'); if(hint) hint.textContent=qtd===0?'Toque nos assentos brancos para selecionar.':`Ótimo! ${qtd} selecionado(s).`;
}
function bindDetalhesEventos(){
  const btn=$('#btn-whatsapp'); if(btn) btn.addEventListener('click', comprarViaWhatsapp);
  const limpar=$('#btn-limpar-assentos'); if(limpar) limpar.addEventListener('click', ()=>{ assentosSelecionados=[]; $$('.assento.selecionado').forEach(el=>{el.classList.remove('selecionado'); el.classList.add('livre');}); atualizarResumo(); });
}
function comprarViaWhatsapp(){
  if(assentosSelecionados.length===0) return toast('Selecione pelo menos 1 assento.','warn');
  const v=viagemAtual; const nome=($('#lead-nome')?.value||'').trim(); const telefone=($('#lead-telefone')?.value||'').trim();
  const qtd=assentosSelecionados.length; const total=formatPreco(qtd*v.preco); const assentosStr=assentosSelecionados.join(', ');
  const whatsapp=(configData.whatsapp||empresaData.whatsapp||WHATSAPP_FALLBACK).replace(/\D/g,'');
  let msg=`Olá! Gostaria de comprar passagem via site *${empresaData.nome||configData.nomeEmpresa||'Viaje Fácil'}*%0A%0A`+
    `🚌 *${v.origem} → ${v.destino}*%0A`+
    `📅 Data: ${formatData(v.data)}%0A`+
    `🕐 Horário: ${v.hora} (chegada ${v.chegada})%0A`+
    `🏢 Empresa: ${v.empresa} - ${v.tipo}%0A`+
    `💺 Assentos: ${assentosStr} (${qtd}x)%0A`+
    `💰 Valor: ${formatPreco(v.preco)} cada | *Total: ${total}*%0A`+
    `🎫 Viagem #${v.id}%0A`;
  if(nome) msg+=`%0A👤 Nome: ${encodeURIComponent(nome)}`;
  if(telefone) msg+=`%0A📞 Telefone: ${encodeURIComponent(telefone)}`;
  msg+=`%0A%0APode confirmar disponibilidade?`;
  try{
    const leads=JSON.parse(localStorage.getItem('vf_leads')||'[]');
    leads.push({ id:Date.now(), viagemId:v.id, rota:`${v.origem}→${v.destino}`, data:v.data, hora:v.hora, assentos:assentosStr, qtd, total, nome, telefone, createdAt:new Date().toISOString() });
    localStorage.setItem('vf_leads', JSON.stringify(leads));
  }catch(e){}
  // envia para Blob global - sendBeacon/keepalive para não abortar no mobile
  try{
    const payload2 = JSON.stringify({ ofertaId:v.id, viagemId:v.id, rota:`${v.origem}→${v.destino}`, datas:v.data?`${v.data} ${v.hora||''}`.trim():v.datas||'', preco:total, nome, telefone, assentos:assentosStr, qtd, createdAt:new Date().toISOString() });
    let sent2=false;
    if(navigator.sendBeacon){ try{ sent2=navigator.sendBeacon('/api/leads', new Blob([payload2],{type:'application/json'})); }catch(_){ sent2=false; } }
    if(!sent2){ fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: payload2, keepalive:true }).catch(()=>{}); }
  }catch(_){}
  window.open(`https://wa.me/${whatsapp}?text=${msg}`,'_blank');
  toast('Abrindo WhatsApp!','success');
}

function toast(msg, type='info'){
  let el=$('#toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; el.className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium shadow-xl transition-all'; document.body.appendChild(el); }
  el.textContent=msg;
  el.className=`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium shadow-xl transition-all ${type==='warn'?'bg-amber-500 text-white':type==='success'?'bg-emerald-600 text-white':'bg-slate-900 text-white'}`;
  el.style.opacity='1'; el.style.transform='translate(-50%, 0)';
  clearTimeout(el._t);
  el._t=setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translate(-50%, 10px)'; },3000);
}

// Handler global para QUALQUER clique em wa.me (header, floating, detalhes) - garante lead de qualquer dispositivo
function trackWhatsAppLead(payloadExtra = {}) {
  try {
    const basePayload = {
      rota: payloadExtra.rota || 'WhatsApp Geral',
      datas: payloadExtra.datas || '',
      preco: payloadExtra.preco || '',
      ofertaId: payloadExtra.ofertaId || null,
      origem: payloadExtra.origem || location.pathname + location.search,
      tipo: payloadExtra.tipo || 'whatsapp-geral',
      nome: ($('#lead-nome')?.value || '').trim(),
      telefone: ($('#lead-telefone')?.value || '').trim(),
      createdAt: new Date().toISOString()
    };
    // local fallback
    try {
      const leads = JSON.parse(localStorage.getItem('vf_leads') || '[]');
      leads.push({ id: Date.now(), ...basePayload });
      localStorage.setItem('vf_leads', JSON.stringify(leads));
    } catch {}
    const payload = JSON.stringify(basePayload);
    let sent = false;
    if (navigator.sendBeacon) {
      try { sent = navigator.sendBeacon('/api/leads', new Blob([payload], { type: 'application/json' })); } catch { sent = false; }
    }
    if (!sent) {
      fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {}
}

function bindGlobalWhatsAppTracking() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="wa.me"]');
    if (!a) return;
    // não interfere se for o botão de oferta que já tem consultarOferta (evita duplicar)
    if (a.closest('[onclick*="consultarOferta"]') || a.id === 'btn-consultar-oferta' || a.id === 'btn-whatsapp') return;
    const href = a.getAttribute('href') || '';
    const isFloating = a.classList.contains('fixed');
    const isHeader = !isFloating && a.textContent.includes('WhatsApp');
    trackWhatsAppLead({
      rota: isFloating ? 'WhatsApp Flutuante' : isHeader ? 'WhatsApp Header' : 'WhatsApp Link',
      origem: location.pathname,
      tipo: 'whatsapp-geral'
    });
  }, true);
}

// Auto-init robusto
function safeInit(){
  if(document.body.dataset.page==='index') initIndex();
  if(document.body.dataset.page==='detalhes' || document.body.dataset.page==='oferta') initDetalhes();
  bindGlobalWhatsAppTracking();
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', safeInit); } else { safeInit(); }
// watchdog único já em initIndex (1000ms) — removido duplicata para evitar triple-render e Forced reflow
