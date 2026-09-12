const buckets = new Map();

// Hobby: in-memory token bucket por IP (sem KV pago). Suficiente para mitigar brute force / flood.
// Em serverless, Map é por instância (não global), mas já dificulta ataque simples.
function hit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  if (b.count > limit) return false;
  // limpeza periódica
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  }
  return true;
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function rate({ keyPrefix, limit, windowMs, res }) {
  // retorna middleware-like: true se liberado, false se bloqueado (já enviou 429)
  return (req) => {
    const ip = getIp(req);
    const key = `${keyPrefix}:${ip}`;
    if (!hit(key, limit, windowMs)) {
      const b = buckets.get(key);
      const retry = Math.ceil((b.reset - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retry > 0 ? retry : 1));
      res.status(429).json({ error: 'Muitas requisições, tente novamente' });
      return false;
    }
    return true;
  };
}

module.exports = { rate, getIp, hit };
