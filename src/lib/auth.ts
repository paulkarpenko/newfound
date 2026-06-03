/**
 * Client-side accounts + JWT.
 *
 * ⚠️  Newfound has no backend. Accounts live in localStorage and tokens are
 * HMAC-signed in the browser with a static secret embedded in the bundle.
 * This is NOT real security — anyone with devtools can mint a token. It
 * exists to give the demo durable per-person profiles and a "stay logged
 * in" experience, in the same throwaway spirit as the direct-from-browser
 * Claude key. Do not store anything sensitive behind it.
 */

export type AvatarChoice = `preset:${string}` | 'initials';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar: AvatarChoice;
}

interface AccountRecord extends UserProfile {
  saltHex: string;
  pwHashHex: string;
  createdAt: number;
}

interface TokenPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

const ACCOUNTS_KEY = 'newfound.auth.accounts';
const TOKEN_KEY = 'newfound.auth.token';

// Static, bundle-embedded secret. See the security note above.
const JWT_SECRET = 'newfound-lenient-demo-secret-v1';
// Lenient lifetime — 60 days, so readers rarely re-authenticate.
const TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60;

const enc = new TextEncoder();

// ---- base64url ----------------------------------------------------------

function base64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlFromString(s: string): string {
  return base64urlFromBytes(enc.encode(s));
}

function stringFromBase64url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return decodeURIComponent(
    Array.from(bin, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- crypto primitives --------------------------------------------------

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(data: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return base64urlFromBytes(new Uint8Array(sig));
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${saltHex}:${password}`));
  return bytesToHex(new Uint8Array(buf));
}

function randomSaltHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `u-${bytesToHex(bytes)}`;
}

// ---- JWT ----------------------------------------------------------------

export async function createToken(profile: UserProfile): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: profile.id,
    username: profile.username,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const head = base64urlFromString(JSON.stringify(header));
  const body = base64urlFromString(JSON.stringify(payload));
  const sig = await sign(`${head}.${body}`);
  return `${head}.${body}.${sig}`;
}

/** Verify signature + expiry. Returns the payload, or null if invalid/expired. */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = await sign(`${head}.${body}`);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(stringFromBase64url(body)) as TokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- account storage ----------------------------------------------------

function loadAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AccountRecord[]) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: AccountRecord[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function toProfile(a: AccountRecord): UserProfile {
  return { id: a.id, username: a.username, email: a.email, name: a.name, avatar: a.avatar };
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getProfileById(id: string): UserProfile | null {
  const acc = loadAccounts().find((a) => a.id === id);
  return acc ? toProfile(acc) : null;
}

// ---- public API ---------------------------------------------------------

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  name?: string;
  avatar: AvatarChoice;
}

export class AuthError extends Error {}

export async function signup(input: SignupInput): Promise<{ token: string; profile: UserProfile }> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  if (username.length < 2) throw new AuthError('Username must be at least 2 characters.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AuthError('Enter a valid email address.');
  if (input.password.length < 6) throw new AuthError('Password must be at least 6 characters.');

  const accounts = loadAccounts();
  if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
    throw new AuthError('That username is already taken.');
  }
  if (accounts.some((a) => a.email === email)) {
    throw new AuthError('An account with that email already exists.');
  }

  const saltHex = randomSaltHex();
  const pwHashHex = await hashPassword(input.password, saltHex);
  const record: AccountRecord = {
    id: randomId(),
    username,
    email,
    name: input.name?.trim() || undefined,
    avatar: input.avatar,
    saltHex,
    pwHashHex,
    createdAt: Date.now(),
  };
  accounts.push(record);
  saveAccounts(accounts);

  const profile = toProfile(record);
  const token = await createToken(profile);
  return { token, profile };
}

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<{ token: string; profile: UserProfile }> {
  const key = usernameOrEmail.trim().toLowerCase();
  const accounts = loadAccounts();
  const acc = accounts.find(
    (a) => a.username.toLowerCase() === key || a.email.toLowerCase() === key,
  );
  if (!acc) throw new AuthError('No account found with that username or email.');
  const pwHashHex = await hashPassword(password, acc.saltHex);
  if (pwHashHex !== acc.pwHashHex) throw new AuthError('Incorrect password.');

  const profile = toProfile(acc);
  const token = await createToken(profile);
  return { token, profile };
}

/**
 * Change an account's password. Verifies the current password, then re-hashes
 * the new one under a fresh salt. Existing tokens stay valid (the password
 * hash isn't part of the token), matching the lenient demo posture.
 */
export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 6) throw new AuthError('Password must be at least 6 characters.');
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx < 0) throw new AuthError('Account not found.');
  const acc = accounts[idx];
  const currentHash = await hashPassword(currentPassword, acc.saltHex);
  if (currentHash !== acc.pwHashHex) throw new AuthError('Current password is incorrect.');
  const saltHex = randomSaltHex();
  const pwHashHex = await hashPassword(newPassword, saltHex);
  accounts[idx] = { ...acc, saltHex, pwHashHex };
  saveAccounts(accounts);
}

/** Update mutable profile fields (name, avatar). Returns the new profile. */
export function updateProfile(
  id: string,
  patch: { name?: string; avatar?: AvatarChoice },
): UserProfile {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx < 0) throw new AuthError('Account not found.');
  const next: AccountRecord = {
    ...accounts[idx],
    name: patch.name !== undefined ? patch.name.trim() || undefined : accounts[idx].name,
    avatar: patch.avatar ?? accounts[idx].avatar,
  };
  accounts[idx] = next;
  saveAccounts(accounts);
  return toProfile(next);
}
