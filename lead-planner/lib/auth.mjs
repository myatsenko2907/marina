// Пароли (scrypt) и сессии (в памяти, cookie httpOnly).
import crypto from "node:crypto";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

const SESSION_TTL = 7 * 24 * 3600 * 1000;
const sessions = new Map();

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expires: Date.now() + SESSION_TTL });
  return token;
}

export function sessionUser(token, users) {
  const s = token && sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return users.find((u) => u.id === s.userId && !u.disabled) || null;
}

export function dropSession(token) {
  sessions.delete(token);
}

export function dropUserSessions(userId) {
  for (const [t, s] of sessions) if (s.userId === userId) sessions.delete(t);
}

export function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Админ видит всё; маркетолог — только свои филиалы. */
export function canSee(user, branchId) {
  return user.role === "admin" || (user.branches || []).includes(branchId);
}

export function randomPassword() {
  return crypto.randomBytes(9).toString("base64url");
}
