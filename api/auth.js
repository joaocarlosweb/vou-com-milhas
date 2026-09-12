const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = async (req, res) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies['__Host-token'] || cookies.token;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!token || !JWT_SECRET) return res.status(401).json({ ok: false });

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'vou-com-milhas', audience: 'admin' });
    // Compat: tokens antigos sem iss/aud ainda válidos até expirarem
    return res.status(200).json({ ok: true, user: payload.user });
  } catch (e) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return res.status(200).json({ ok: true, user: payload.user });
    } catch {
      return res.status(401).json({ ok: false });
    }
  }
};
