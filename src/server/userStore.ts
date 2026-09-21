import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  linkedin?: Record<string, unknown>;
};

type Session = { token: string; userId: string; createdAt: string };

const root = path.join(process.cwd(), "data");
const usersFile = path.join(root, "users.json");
const sessionsFile = path.join(root, "sessions.json");
const contactsDir = path.join(root, "contacts");

function ensure() {
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  if (!existsSync(contactsDir)) mkdirSync(contactsDir, { recursive: true });
  if (!existsSync(usersFile)) writeFileSync(usersFile, "[]");
  if (!existsSync(sessionsFile)) writeFileSync(sessionsFile, "[]");
}

function readUsers(): StoredUser[] {
  ensure();
  try {
    return JSON.parse(readFileSync(usersFile, "utf8"));
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  ensure();
  writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function readSessions(): Session[] {
  ensure();
  try {
    return JSON.parse(readFileSync(sessionsFile, "utf8"));
  } catch {
    return [];
  }
}

function writeSessions(sessions: Session[]) {
  ensure();
  writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
}

function hashPassword(password: string, salt?: string) {
  const s = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function createGuest() {
  const email = `guest-${randomBytes(6).toString("hex")}@local.linkedin-boss`;
  const user = registerUser(email, `${randomBytes(12).toString("hex")}Aa1!`);
  const token = createSession(user.id);
  return { user, token };
}

export function registerUser(email: string, password: string): StoredUser {
  const users = readUsers();
  const key = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) throw new Error("Enter a valid email.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (users.some((u) => u.email === key)) throw new Error("That email already has an account.");
  const user: StoredUser = {
    id: createHash("sha256").update(`${key}:${Date.now()}`).digest("hex").slice(0, 16),
    email: key,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export function loginUser(email: string, password: string): StoredUser {
  const users = readUsers();
  const user = users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("Email or password is wrong.");
  return user;
}

export function createSession(userId: string): string {
  const sessions = readSessions().filter((s) => s.userId !== userId);
  const token = randomBytes(24).toString("hex");
  sessions.push({ token, userId, createdAt: new Date().toISOString() });
  writeSessions(sessions);
  return token;
}

export function userFromToken(token: string | undefined): StoredUser | null {
  if (!token) return null;
  const session = readSessions().find((s) => s.token === token);
  if (!session) return null;
  return readUsers().find((u) => u.id === session.userId) || null;
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  writeSessions(readSessions().filter((s) => s.token !== token));
}

export function saveLinkedIn(userId: string, linkedin: Record<string, unknown>) {
  const users = readUsers();
  const i = users.findIndex((u) => u.id === userId);
  if (i < 0) return;
  users[i] = { ...users[i], linkedin };
  writeUsers(users);
}

export function clearLinkedIn(userId: string) {
  const users = readUsers();
  const i = users.findIndex((u) => u.id === userId);
  if (i < 0) return;
  delete users[i].linkedin;
  writeUsers(users);
}

export function contactsPath(userId: string) {
  ensure();
  return path.join(contactsDir, `${userId}.csv`);
}

export function deleteContacts(userId: string) {
  const csv = contactsPath(userId);
  if (existsSync(csv)) unlinkSync(csv);
}

const pairCodes = new Map<string, { userId: string; profileUrl?: string; expires: number }>();

export function issuePairCode(userId: string, profileUrl?: string) {
  const code = randomBytes(3).toString("hex").toUpperCase();
  pairCodes.set(code, { userId, profileUrl, expires: Date.now() + 15 * 60 * 1000 });
  return code;
}

export function consumePairCode(code: string) {
  const key = String(code || "").trim().toUpperCase();
  const row = pairCodes.get(key);
  if (!row || row.expires < Date.now()) return null;
  return row;
}

export function retirePairCode(code: string) {
  pairCodes.delete(String(code || "").trim().toUpperCase());
}

export function userById(id: string) {
  return readUsers().find((u) => u.id === id) || null;
}

export function cookieFromReq(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}
