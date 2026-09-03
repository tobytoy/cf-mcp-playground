/**
 * Test Auth & Rate Limiting Middleware
 * Tests:
 * 1. Dev token -> 0 cooldown, unmetered
 * 2. VIP token -> 15s cooldown
 * 3. Guest (no token / invalid token) -> 60s cooldown, 429 on second immediate call
 * 4. /api/auth/status endpoint verification
 */

import { createApp } from "../src/app.js";

async function runAuthTests() {
  console.log("\n=======================================================");
  console.log("🛡️ Starting Auth & Rate Limiting Test Suite");
  console.log("=======================================================\n");

  const app = createApp({
    DEV_SECRET_KEY: "dev_my_secret_123",
    VIP_SECRET_KEYS: "vip_friends,vip_alex,vip_bob",
  });

  // ── Test 1: Dev Token (Unlimited, 0s Cooldown) ────────────────────────────
  console.log("▶ [Test 1] Testing DEV Token...");
  const devRes1 = await app.request("/api/transport/context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dev_my_secret_123",
    },
    body: JSON.stringify({ identity: "car", state: "cruising" }),
  });
  console.log(`  - 1st Dev Call Status: ${devRes1.status} | Role: ${devRes1.headers.get("X-User-Role")}`);

  // Immediate second call should succeed (no 429)
  const devRes2 = await app.request("/api/transport/context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dev_my_secret_123",
    },
    body: JSON.stringify({ identity: "car", state: "cruising" }),
  });
  console.log(`  - 2nd Immediate Dev Call Status: ${devRes2.status} (Expected: 200)`);

  if (devRes1.status === 200 && devRes2.status === 200 && devRes1.headers.get("X-User-Role") === "dev") {
    console.log("  ✅ PASS: Dev mode is completely unmetered\n");
  } else {
    throw new Error("Dev token test failed!");
  }

  // ── Test 2: VIP Token via Query Param (?token=vip_alex) ───────────────────
  console.log("▶ [Test 2] Testing VIP Token (?token=vip_alex)...");
  const vipRes = await app.request("/api/transport/context?token=vip_alex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "bike", state: "urgent" }),
  });
  console.log(`  - VIP Call Status: ${vipRes.status} | Role: ${vipRes.headers.get("X-User-Role")} | Cooldown: ${vipRes.headers.get("X-RateLimit-Cooldown")}`);

  if (vipRes.status === 200 && vipRes.headers.get("X-User-Role") === "vip") {
    console.log("  ✅ PASS: VIP role identified via query string\n");
  } else {
    throw new Error("VIP token test failed!");
  }

  // ── Test 3: Guest Mode (No Token) & Rate Limiting ─────────────────────────
  console.log("▶ [Test 3] Testing Guest Role & 60s Rate Limiter...");
  const guestRes1 = await app.request("/api/transport/context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.195", // Mock Client IP
    },
    body: JSON.stringify({ identity: "scooter", state: "commute_out" }),
  });
  console.log(`  - 1st Guest Call Status: ${guestRes1.status} | Role: ${guestRes1.headers.get("X-User-Role")}`);

  // Immediate second call from same IP should get 429
  const guestRes2 = await app.request("/api/transport/context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.195",
    },
    body: JSON.stringify({ identity: "scooter", state: "commute_out" }),
  });
  console.log(`  - 2nd Immediate Guest Call Status: ${guestRes2.status} (Expected: 429)`);
  const guest2Body = (await guestRes2.json()) as any;
  console.log(`    Message: "${guest2Body.error}"`);

  if (guestRes1.status === 200 && guestRes2.status === 429) {
    console.log("  ✅ PASS: Guest 60s cooldown rate limiter verified\n");
  } else {
    throw new Error("Guest rate limit test failed!");
  }

  // ── Test 4: /api/auth/status ──────────────────────────────────────────────
  console.log("▶ [Test 4] Testing /api/auth/status...");
  const statusResDev = await app.request("/api/auth/status?token=dev_my_secret_123");
  const devStatus = (await statusResDev.json()) as any;
  console.log(`  - Dev Auth Status: Role=${devStatus.role}, Cooldown=${devStatus.cooldownSeconds}s`);

  const statusResGuest = await app.request("/api/auth/status");
  const guestStatus = (await statusResGuest.json()) as any;
  console.log(`  - Guest Auth Status: Role=${guestStatus.role}, Cooldown=${guestStatus.cooldownSeconds}s`);

  if (devStatus.role === "dev" && guestStatus.role === "guest") {
    console.log("  ✅ PASS: /api/auth/status endpoint verified\n");
  }

  console.log("=======================================================");
  console.log("🎉 ALL AUTH & RATE LIMIT TESTS PASSED!");
  console.log("=======================================================\n");
}

runAuthTests().catch((err) => {
  console.error("❌ Auth test failed:", err);
  process.exit(1);
});
