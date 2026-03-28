import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.HR_CREDENTIALS_KEY;
  if (!keyHex) {
    throw new Error("HR_CREDENTIALS_KEY environment variable is not set");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("HR_CREDENTIALS_KEY must be 32 bytes (64 hex characters)");
  }
  return key;
}

/**
 * AES-256-GCM で資格情報を暗号化する。
 * 出力フォーマット: [IV (12 bytes)] [Auth Tag (16 bytes)] [Ciphertext]
 */
export function encryptCredentials(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * AES-256-GCM で暗号化された資格情報を復号する。
 */
export function decryptCredentials(encrypted: Buffer): string {
  const key = getEncryptionKey();

  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * UI表示用: 資格情報をマスクして返す。
 * 例: "sk-abc123xyz" → "sk-...xyz"
 */
export function maskCredential(value: string): string {
  if (value.length <= 8) return "••••••••";
  const prefix = value.substring(0, 3);
  const suffix = value.substring(value.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * JSON形式の資格情報を暗号化する。
 */
export function encryptCredentialsJson(
  credentials: Record<string, string>
): Buffer {
  return encryptCredentials(JSON.stringify(credentials));
}

/**
 * 暗号化された資格情報をJSON形式で復号する。
 */
export function decryptCredentialsJson(
  encrypted: Buffer
): Record<string, string> {
  return JSON.parse(decryptCredentials(encrypted));
}
