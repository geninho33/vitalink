const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(payload) {
  // RFC 7519: "sub" deve ser string
  const body = {
    ...payload,
    sub: String(payload.sub),
  };
  return jwt.sign(body, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signToken, verifyToken };
