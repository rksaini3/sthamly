import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM field encryption for free-text health notes. Server-only.
function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptField(plain: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptField(data: Buffer): string {
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// Binary files (reports, X-rays). Output: iv (12) + tag (16) + data.
export function encryptBytes(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptBytes(data: Buffer): Buffer {
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// Postgres bytea goes over the API as a hex string with a \x prefix.
export function toPgBytea(data: Buffer): string {
  return "\\x" + data.toString("hex");
}

export function fromPgBytea(value: string): Buffer {
  return Buffer.from(value.replace(/^\\x/, ""), "hex");
}