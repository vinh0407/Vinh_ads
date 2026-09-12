import * as CryptoJS from 'crypto-js';

/**
 * Cryptographic utilities for Vince AI
 * Uses Web Crypto API where available, falls back to CryptoJS
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a key from a password using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generates a random IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypts data using AES-GCM
 */
export async function encrypt(
  data: string | Uint8Array,
  password: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; iv: Uint8Array }> {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);

  const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    iv,
  };
}

/**
 * Decrypts data using AES-GCM
 */
export async function decrypt(
  encrypted: Uint8Array,
  salt: Uint8Array,
  iv: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return new Uint8Array(decrypted);
}

/**
 * Encrypts a string and returns base64 encoded result with salt and IV
 */
export async function encryptString(data: string, password: string): Promise<string> {
  const { encrypted, salt, iv } = await encrypt(data, password);

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(16 + 12 + encrypted.length);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(encrypted, 28);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 encoded string
 */
export async function decryptString(encryptedBase64: string, password: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);

  const decrypted = await decrypt(encrypted, salt, iv, password);
  return new TextDecoder().decode(decrypted);
}

/**
 * Hashes a string using SHA-256
 */
export async function hashString(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a secure random token
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

/**
 * Verifies a password against a hash (using PBKDF2)
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const derivedHash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return derivedHash === hash;
}

/**
 * Creates a password hash using PBKDF2
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt();
  const saltString = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, salt: saltString };
}

/**
 * Fallback encryption using CryptoJS (for environments without Web Crypto API)
 */
export function encryptWithCryptoJS(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

export function decryptWithCryptoJS(encrypted: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Generates a random UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Checks if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

/**
 * Generates a secure random number between min and max (inclusive)
 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range;

  let random: number;
  do {
    const array = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(array);
    random = Array.from(array).reduce((acc, byte, i) => acc + byte * (256 ** i), 0);
  } while (random >= maxValid);

  return min + (random % range);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}