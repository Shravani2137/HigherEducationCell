const crypto = require("crypto");

const TOKEN_TTL_HOURS = 48;

function createCorrectionToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

function hashCorrectionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

module.exports = {
  TOKEN_TTL_HOURS,
  createCorrectionToken,
  hashCorrectionToken,
  isExpired,
};
