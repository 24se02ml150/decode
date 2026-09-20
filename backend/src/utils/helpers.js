import crypto from 'crypto';

export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

export function generateTeamId() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `TEAM${num}`;
}

export function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function paginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
