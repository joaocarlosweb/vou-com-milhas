const fs = require('fs');
const path = require('path');

// Helper para buscar oferta por id via Blob ou arquivo local
async function getOfertaById(id) {
  const tryFetch = async (url) => {
    try {
      const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      const resp = await fetch(bustUrl);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) return data;
        } catch {}
      }
    } catch {}
    return null;
  };
  // tenta Blob primeiro
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const { list } = require('@vercel/blob');
      const directUrl = 'https://obl32zedqvcafvwk.public.blob.vercel-storage.com/ofertas.json';
      let data = await tryFetch(directUrl);
      if (data) {
        const found = data.find(o => String(o.id) === String(id));
        if (found) return found;
      }
      const blobs = await list({ prefix: 'ofertas.json', token });
      const item = blobs.blobs?.find(b => b.pathname === 'ofertas.json');
      if (item?.url) {
        data = await tryFetch(item.url);
        if (data) {
          const found = data.find(o => String(o.id) === String(id));
          if (found) return found;
        }
      }
    }
  } catch {}
  // fallback arquivo local
  try {
    const filePath = path.join(process.cwd(), 'data', 'ofertas.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const found = data.find(o => String(o.id) === String(id));
      if (found) return found;
    }
  } catch {}
  return null;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host || 'vou-com-milhas.vercel.app'}`);
  const id = url.searchParams.get('id');

  // Se não tem id, serve oferta.html original sem injeção
  if (!id) {
    try {
      const filePath = path.join(process.cwd(), 'oferta.html');
      let html = fs.readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    } catch {
      return res.status(404).send('Not found');
    }
  }

  const oferta = await getOfertaById(id);

  // Monta OG exatamente com o.imagem
  let title, description, image, canonical;
  const baseUrl = `https://${req.headers.host || 'vou-com-milhas.vercel.app'}`;
  canonical = `${baseUrl}/oferta.html?id=${id}`;

  if (oferta) {
    const precoFmt = oferta.preco ? Number(oferta.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    const milhasPart = oferta.milhas ? `${Number(oferta.milhas).toLocaleString('pt-BR')} milhas + ` : '';
    title = `✈️ ${oferta.origem} (${oferta.aeroportoOrigem || ''}) → ${oferta.destino} (${oferta.aeroportoDestino || ''}) a partir de ${precoFmt} — Vou com Milhas`;
    description = `${oferta.descricao || ''} • ${oferta.datas || ''} • ${oferta.duracao || ''} • ${oferta.empresa || ''} • ${milhasPart}${precoFmt} taxas. ${oferta.vagasTexto || ''} Valida até ${oferta.validadeAte || 'enquanto durar'}.`.replace(/\s+/g, ' ').trim();
    image = oferta.imagem; // exatamente o.imagem
    // Se imagem for data: (galeria dispositivo sem upload), converte para Blob https
    if (image && image.startsWith('data:')) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (token) {
          const { put } = require('@vercel/blob');
          const base64 = image.split(',')[1];
          const buffer = Buffer.from(base64, 'base64');
          // detecta contentType simples
          let contentType = 'image/jpeg';
          if (image.startsWith('data:image/png')) contentType = 'image/png';
          else if (image.startsWith('data:image/webp')) contentType = 'image/webp';
          const key = `ofertas/og-${id}.jpg`;
          const up = await put(key, buffer, {
            access: 'public',
            contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
            cacheControlMaxAge: 31536000,
            token
          });
          if (up && up.url) image = up.url;
        }
      } catch (e) {
        console.warn('Falha converter data: para Blob OG', e.message);
        // fallback para logo se não conseguiu converter
        image = `${baseUrl}/assets/img/logo-voucommilhas.jpg`;
      }
    }
  } else {
    title = 'Oferta — Vou com Milhas';
    description = 'Confira esta oferta exclusiva da Vou com Milhas no WhatsApp 84 99987-9071.';
    image = `${baseUrl}/assets/img/logo-voucommilhas.jpg`;
  }

  // Fallback imagem se vazia
  if (!image) image = `${baseUrl}/assets/img/logo-voucommilhas.jpg`;

  // Lê HTML base
  let html;
  try {
    const filePath = path.join(process.cwd(), 'oferta.html');
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return res.status(500).send('Erro ao carregar página');
  }

  // Monta tags OG para injetar no <head>
  const ogTags = `
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:image:alt" content="${esc(oferta ? `Voo ${oferta.origem} → ${oferta.destino}` : 'Vou com Milhas')}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Vou com Milhas" />
  <meta property="og:locale" content="pt_BR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: description,
    image: image,
    brand: { "@type": "Brand", name: "Vou com Milhas" },
    offers: {
      "@type": "Offer",
      price: oferta ? String(oferta.preco || '') : '',
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      priceValidUntil: oferta ? oferta.validadeAte : '',
      url: canonical
    }
  })}</script>
`;

  // Injeta substituindo <title> e adicionando após <meta name="viewport"> + garante base para assets funcionarem via /api/og
  // Remove title antigo se existir e injeta novo bloco
  html = html.replace(/<title>.*?<\/title>/s, ogTags.trim());

  // Garante <base href="/"> para assets relativos funcionarem quando servido via /api/og
  if (!html.includes('<base href=')) {
    html = html.replace('<head>', '<head><base href="/">');
  }

  // Se não tinha title (fallback), injeta após viewport
  if (!html.includes('og:title')) {
    html = html.replace('</head>', ogTags + '\n</head>');
  }

  // Adiciona canonical se não existir (já está no ogTags)
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.setHeader('X-Robots-Tag', 'index, follow');
  return res.status(200).send(html);
};
