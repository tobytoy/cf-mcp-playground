/**
 * Verify LINE Webhook HMAC-SHA256 signature using Web Crypto API.
 */
export async function verifyLineSignature(
  rawBody: string,
  signature: string | null | undefined,
  channelSecret: string
): Promise<boolean> {
  if (!signature || !channelSecret) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(channelSecret);
    const bodyData = encoder.encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, bodyData);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    return signature === expectedSignature;
  } catch (error) {
    console.error("[Verifier] Error verifying LINE signature:", error);
    return false;
  }
}
