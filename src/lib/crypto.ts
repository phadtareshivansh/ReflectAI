/**
 * Client-Side AES-GCM (256-bit) Encryption Utility for ReflectAI Insight Vault
 * Built using W3C Web Cryptography API (SubtleCrypto).
 * 
 * Cryptographic Specifications:
 * - Algorithm: AES-GCM with 256-bit key length
 * - Nonce/IV: Cryptographically secure 96-bit (12 bytes) initialization vector per encryption
 * - Auth Tag: 128-bit integrity authentication tag (standard in AES-GCM)
 * - Key Escrow: Separated in /users/{userId}/keys/vault, never in the interaction document
 */

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded ciphertext + auth tag
  iv: string;         // Base64 encoded 96-bit initialization vector
}

/**
 * Converts ArrayBuffer / Uint8Array to standard Base64 string safely.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks to prevent stack overflow
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string back to Uint8Array safely.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a fresh, cryptographically strong AES-GCM 256-bit key.
 */
export async function generateVaultKey(): Promise<CryptoKey> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  return await cryptoObj.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable so user can escrow to their private /users/uid/keys path
    ["encrypt", "decrypt"]
  );
}

/**
 * Exports a CryptoKey to a JSON Web Key (JWK) serialized string.
 */
export async function exportKeyToJwk(key: CryptoKey): Promise<string> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  const jwk = await cryptoObj.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

/**
 * Imports a CryptoKey from a JSON Web Key (JWK) serialized string.
 */
export async function importKeyFromJwk(jwkString: string): Promise<CryptoKey> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  const jwk = JSON.parse(jwkString);
  return await cryptoObj.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-GCM 256-bit with a fresh random 96-bit IV.
 * Returns Base64 encoded ciphertext (including 128-bit auth tag) and IV.
 */
export async function encryptText(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  const iv = cryptoObj.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoded
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts an AES-GCM ciphertext string with the given IV and CryptoKey.
 * Verifies the 128-bit authentication tag automatically; throws on tampering.
 */
export async function decryptText(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  if (!ciphertextBase64 || !ivBase64) return "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Helper to encrypt arbitrary JSON-serializable objects.
 */
export async function encryptObject<T>(obj: T, key: CryptoKey): Promise<EncryptedPayload> {
  const jsonStr = JSON.stringify(obj);
  return await encryptText(jsonStr, key);
}

/**
 * Helper to decrypt and parse arbitrary JSON-serializable objects.
 */
export async function decryptObject<T>(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<T> {
  const jsonStr = await decryptText(ciphertextBase64, ivBase64, key);
  return JSON.parse(jsonStr) as T;
}
