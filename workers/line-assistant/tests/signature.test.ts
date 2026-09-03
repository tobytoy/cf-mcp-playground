import { verifyLineSignature, generateLineSignature } from "../src/line/verifier";

export async function testSignatureVerification(): Promise<void> {
  console.log("▶ Testing LINE Webhook HMAC-SHA256 Signature Verifier...");

  const secret = "mock_test_secret_for_hmac_sha256_verification_32chars";
  const rawBody = JSON.stringify({
    destination: "U1234567890",
    events: [{ type: "message", message: { type: "text", text: "Hello LINE Bot" } }]
  });

  // 1. Generate valid signature
  const validSignature = await generateLineSignature(rawBody, secret);
  if (!validSignature) {
    throw new Error("Failed to generate signature");
  }

  // 2. Test valid signature
  const isValid = await verifyLineSignature(rawBody, validSignature, secret);
  if (!isValid) {
    throw new Error("Valid signature failed verification!");
  }
  console.log("  ✔ Valid signature correctly verified");

  // 3. Test tampered body
  const tamperedBody = rawBody + " ";
  const isTamperedValid = await verifyLineSignature(tamperedBody, validSignature, secret);
  if (isTamperedValid) {
    throw new Error("Tampered body incorrectly passed verification!");
  }
  console.log("  ✔ Tampered body correctly rejected");

  // 4. Test wrong secret
  const isWrongSecretValid = await verifyLineSignature(rawBody, validSignature, "wrong_secret_12345");
  if (isWrongSecretValid) {
    throw new Error("Wrong secret incorrectly passed verification!");
  }
  console.log("  ✔ Wrong secret correctly rejected");

  // 5. Test missing/empty arguments
  const isNullValid = await verifyLineSignature(rawBody, null, secret);
  if (isNullValid) {
    throw new Error("Null signature incorrectly passed verification!");
  }
  console.log("  ✔ Null signature correctly rejected");

  console.log("✅ Signature Verification tests passed!\n");
}
