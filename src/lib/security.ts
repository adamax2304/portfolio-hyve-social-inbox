import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type EncryptedSecretPayload = {
  iv: string;
  tag: string;
  ciphertext: string;
};

function getEncryptionKey() {
  const source =
    process.env.APP_ENCRYPTION_KEY ?? "social-inbox-dev-only-change-me";

  return createHash("sha256").update(source).digest();
}

export function encryptSecret(rawValue: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(rawValue, "utf8"),
    cipher.final(),
  ]);
  const payload: EncryptedSecretPayload = {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  return JSON.stringify(payload);
}

export function decryptSecret(payloadRaw: string) {
  const payload = JSON.parse(payloadRaw) as EncryptedSecretPayload;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function maskSecret(rawValue: string) {
  if (rawValue.length <= 6) {
    return `${rawValue.slice(0, 1)}***${rawValue.slice(-1)}`;
  }

  return `${rawValue.slice(0, 3)}***${rawValue.slice(-3)}`;
}
