/**
 * Web Crypto HMAC-SHA256 signature verifier for LINE Messaging API Webhooks.
 * Validates 'x-line-signature' header against channel secret in constant time.
 */

export async function generateLineSignature(rawBody: string, channelSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const signatureBytes = new Uint8Array(signatureBuffer);

  // Convert binary to Base64
  let binary = "";
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  return btoa(binary);
}

export async function verifyLineSignature(
  rawBody: string,
  signature: string | null | undefined,
  channelSecret: string | null | undefined
): Promise<boolean> {
  if (!signature || !channelSecret || !rawBody) {
    return false;
  }

  try {
    const computedSignature = await generateLineSignature(rawBody, channelSecret);

    const encoder = new TextEncoder();
    const a = encoder.encode(computedSignature);
    const b = encoder.encode(signature);

    if (a.byteLength !== b.byteLength) {
      return false;
    }

    // Prefer native constant-time comparison when available (Cloudflare Workers)
    if (typeof crypto.subtle.timingSafeEqual === "function") {
      return crypto.subtle.timingSafeEqual(a, b);
    }

    // Fallback constant-time XOR comparison
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a[i] ^ b[i];
    }
    return mismatch === 0;
  } catch (error) {
    console.error("[LINE Verifier] Error verifying signature:", error);
    return false;
  }
}
