const cookie = require('cookie');

module.exports = async (req, res) => {
  const opts = { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 };
  res.setHeader('Set-Cookie', [
    cookie.serialize('__Host-token', '', opts),
    cookie.serialize('token', '', opts),
  ]);
  return res.status(200).json({ ok: true });
};
