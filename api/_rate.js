const buckets = globalThis.__rateBuckets || (globalThis.__rateBuckets = new Map());

function hit(key, limit, windowMs) {
  const now = Date.now();
  const arr = buckets.get(key) || [];
  const fresh = arr.filter(t => now - t < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((fresh[0] + windowMs - now)/1000) };
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return { allowed: true, remaining: limit - fresh.length };
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

module.exports = { hit, getIp };
