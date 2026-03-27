/**
 * Returns the JWT signing key as Uint8Array.
 * NEXTAUTH_SECRET on Vercel is base64-encoded — decode it properly.
 */
export function getJwtSecret(): Uint8Array {
  const raw = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "fallback-dev-secret-32-chars-ok!";
  // If it looks like base64 (contains / or + or ends with =), decode it
  if (/[+/=]/.test(raw) && raw.length % 4 === 0) {
    try {
      return Buffer.from(raw, "base64");
    } catch {
      // fall through to UTF-8
    }
  }
  return new TextEncoder().encode(raw);
}
