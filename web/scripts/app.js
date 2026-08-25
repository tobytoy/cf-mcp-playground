/**
 * Main PWA Application Logic
 */

import {
  getStoredToken,
  setStoredToken,
  getApiBaseUrl,
  setApiBaseUrl,
  checkAuthStatus,
  fetchTransportContext,
  fetchTransportRoute,
} from "./api.js";
import {
  PRESET_LOCATIONS,
  getCurrentLocation,
  setCurrentLocation,
  requestGpsPosition,
} from "./location.js";
import { initMapModal } from "./map-modal.js";

// App State
let state = {
  identity: "car",
  stateIntent: "cruising",
  location: getCurrentLocation(),
  userRole: "guest",
  cooldownSeconds: 60,
  countdown: 60,
  timerId: null,
  isRefreshing: false,
};

// ── Toast Feedback Helper ──────────────────────────────────────────────────
function showToast(message) {
  let toast = document.getElementById("toast-element");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-element";
    toast.className = "toast-msg";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── URL Token Extraction & Storage ─────────────────────────────────────────
function syncUrlToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get("token");
  if (urlToken) {
    setStoredToken(urlToken);
    showToast(`🔑 已成功載入 Token: ${urlToken}`);
    // Clean URL without reload
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

// ── Role & Auth Badge Management ───────────────────────────────────────────
async function updateAuthBadge() {
  const badgeEl = document.getElementById("role-badge");
  try {
    const auth = await checkAuthStatus();
    state.userRole = auth.role || "guest";
    state.cooldownSeconds = auth.cooldownSeconds !== undefined ? auth.cooldownSeconds : 60;
    
    if (badgeEl) {
      badgeEl.className = `role-badge ${state.userRole}`;
      badgeEl.innerHTML = 
        state.userRole === "dev" ? `⚡ DEV (無限制)`
        : state.userRole === "vip" ? `💎 VIP (15s)`
        : `🟢 Guest (60s)`;
    }
  } catch (err) {
    console.warn("Auth status fetch error:", err);
  }
}

// ── 60s Countdown Timer Engine ─────────────────────────────────────────────
function startTimerLoop() {
  if (state.timerId) clearInterval(state.timerId);
  state.countdown = state.cooldownSeconds > 0 ? state.cooldownSeconds : 30;

  const timerText = document.getElementById("timer-text");

  state.timerId = setInterval(() => {
    if (state.countdown > 0) {
      state.countdown -= 1;
      if (timerText) timerText.textContent = `${state.countdown}s`;
    } else {
      refreshData();
    }
  }, 1000);
}

function resetTimer() {
  state.countdown = state.cooldownSeconds > 0 ? state.cooldownSeconds : 30;
  const timerText = document.getElementById("timer-text");
  if (timerText) timerText.textContent = `${state.countdown}s`;
}

// ── Fetch & Render Live Context ────────────────────────────────────────────
async function refreshData() {
  if (state.isRefreshing) return;
  state.isRefreshing = true;
  resetTimer();

  const refreshBtn = document.getElementById("btn-manual-refresh");
  if (refreshBtn) refreshBtn.style.animation = "spin 1s infinite linear";

  try {
    const data = await fetchTransportContext({
      identity: state.identity,
      state: state.stateIntent,
      latitude: state.location.latitude,
      longitude: state.location.longitude,
      location_name: state.location.name,
    });

    renderContextData(data);
  } catch (err) {
    console.error("Context refresh error:", err);
    if (err.status === 429) {
      showToast(err.message || "請求過於頻繁，請稍候重試。");
    } else {
      showToast(`連線失敗: ${err.message}`);
    }
  } finally {
    state.isRefreshing = false;
    if (refreshBtn) refreshBtn.style.animation = "";
  }
}

// ── DOM Data Rendering ─────────────────────────────────────────────────────
function renderContextData(data) {
  if (!data) return;

  // 1. Situation Banner
  const bannerEl = document.getElementById("situation-banner");
  const headlineEl = document.getElementById("situation-headline");
  const summaryEl = document.getElementById("situation-summary");

  if (bannerEl && headlineEl && summaryEl) {
    const level = data.situation?.level || "normal";
    bannerEl.className = `situation-banner ${level}`;
    const levelIcon = level === "alert" ? "🚨" : level === "warning" ? "⚠️" : "✨";
    headlineEl.innerHTML = `${levelIcon} ${data.situation?.headline || "路況順暢"}`;
    summaryEl.textContent = data.situation?.summary || "周邊無重大交通事件。";
  }

  // 2. Recommendations List
  const recContainer = document.getElementById("recommendations-container");
  if (recContainer) {
    recContainer.innerHTML = "";
    const recs = data.recommendations || [];
    if (recs.length === 0) {
      recContainer.innerHTML = `<div class="card-item"><div class="card-desc">目前狀態無特殊偏離建議，請維持原動線前進。</div></div>`;
    } else {
      recs.forEach((r) => {
        const item = document.createElement("div");
        item.className = "card-item";
        item.innerHTML = `
          <div class="card-title">
            <span>${r.title}</span>
            <span class="badge-priority">P${r.priority}</span>
          </div>
          <div class="card-desc">${r.detail}</div>
        `;
        recContainer.appendChild(item);
      });
    }
  }

  // 3. Risks & Enroute Alerts
  const riskContainer = document.getElementById("risks-container");
  if (riskContainer) {
    riskContainer.innerHTML = "";
    const risks = data.risks || [];
    if (risks.length === 0) {
      riskContainer.innerHTML = `<div class="card-item"><div class="card-desc">✅ 周邊 1km 內無施工、事故或車位枯竭警報。</div></div>`;
    } else {
      risks.forEach((rk) => {
        const item = document.createElement("div");
        item.className = "card-item";
        item.innerHTML = `
          <div class="card-title" style="color: #f87171;">⚠️ ${rk.category.toUpperCase()}</div>
          <div class="card-desc">${rk.description}</div>
        `;
        riskContainer.appendChild(item);
      });
    }
  }

  // 4. Quick Metrics Grid
  const mParking = document.getElementById("metric-parking");
  const mYouBike = document.getElementById("metric-youbike");
  const mEV = document.getElementById("metric-ev");
  const mCongestion = document.getElementById("metric-congestion");

  if (mParking) mParking.textContent = data.quickMetrics?.availableParkingSpots ?? "—";
  if (mYouBike) mYouBike.textContent = data.quickMetrics?.availableYouBikes ?? "—";
  if (mEV) mEV.textContent = data.quickMetrics?.evFastChargersAvailable ?? "—";
  if (mCongestion) {
    const levelMap = { smooth: "順暢", moderate: "車多", heavy: "壅塞", gridlock: "回堵" };
    mCongestion.textContent = levelMap[data.quickMetrics?.trafficCongestionLevel] || "順暢";
  }

  // 5. Assistant Footer Note
  const noteEl = document.getElementById("assistant-note");
  if (noteEl) {
    noteEl.textContent = `💬 AI 交通小秘書：已為您整合 TDX 即時路網，下一次更新於 ${state.cooldownSeconds} 秒後。`;
  }
}

// ── Route Planner Execution ────────────────────────────────────────────────
async function handleRoutePlan() {
  const originName = document.getElementById("route-origin-name")?.value || "我的出發地";
  const destName = document.getElementById("route-dest-name")?.value || "目的地";
  const destPresetIndex = document.getElementById("route-dest-select")?.value;

  let destLoc = {
    name: destName,
    latitude: 25.047761,
    longitude: 121.517049,
  };

  if (destPresetIndex !== "" && PRESET_LOCATIONS[Number(destPresetIndex)]) {
    destLoc = PRESET_LOCATIONS[Number(destPresetIndex)];
  }

  const resultContainer = document.getElementById("route-result-container");
  if (resultContainer) {
    resultContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">🔄 AI 正在為您計算最佳情境導航策略與停車場...</div>`;
  }

  try {
    const route = await fetchTransportRoute({
      origin: {
        name: originName,
        latitude: state.location.latitude,
        longitude: state.location.longitude,
      },
      destination: destLoc,
      identity: state.identity,
      urgency: state.stateIntent === "urgent" ? "high" : "normal",
    });

    if (resultContainer) {
      const destPlan = route.recommendedStrategy?.destinationPlan?.parkingPlan;
      resultContainer.innerHTML = `
        <div class="card-item" style="border-color: var(--accent-blue);">
          <div class="card-title" style="color: #60a5fa; font-size: 15px;">
            🧭 ${route.recommendedStrategy?.title || "推薦路線"}
          </div>
          <div class="card-desc" style="margin-top: 6px; font-size: 14px; color:#f8fafc;">
            ${route.recommendedStrategy?.routeDescription}
          </div>
        </div>

        ${destPlan ? `
        <div class="card-item" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.4);">
          <div class="card-title" style="color: #34d399;">
            🅿️ 目的地停車指引：【${destPlan.ParkingLotName}】
          </div>
          <div class="card-desc">
            目前尚有 <strong>${destPlan.AvailableSpaces}</strong> 格空位（距目的地 ${destPlan.DistanceMeters || 350}m，費率 ${destPlan.HourlyRate || 40}元/時），進場無須排隊。
          </div>
        </div>` : ""}

        ${route.alternativeOptions?.length > 0 ? `
        <div class="card-item">
          <div class="card-title" style="color: #c084fc;">
            ${route.alternativeOptions[0].title}
          </div>
          <div class="card-desc">
            ${route.alternativeOptions[0].steps} — <em>優勢: ${route.alternativeOptions[0].advantage}</em>
          </div>
        </div>` : ""}
      `;
    }
  } catch (err) {
    if (resultContainer) {
      resultContainer.innerHTML = `<div class="card-item" style="color:#f87171;">❌ 路線規劃失敗: ${err.message}</div>`;
    }
  }
}

// ── App Initialization ────────────────────────────────────────────────────
export function initApp() {
  syncUrlToken();
  updateAuthBadge();

  // 1. Setup Presets Dropdown
  const presetSelect = document.getElementById("preset-location-select");
  if (presetSelect) {
    presetSelect.innerHTML = `<option value="">📍 常用熱門商圈快速選取...</option>` +
      PRESET_LOCATIONS.map((loc, idx) => `<option value="${idx}">${loc.name}</option>`).join("");

    presetSelect.addEventListener("change", (e) => {
      const idx = e.target.value;
      if (idx !== "" && PRESET_LOCATIONS[Number(idx)]) {
        const selected = PRESET_LOCATIONS[Number(idx)];
        setCurrentLocation(selected);
        state.location = selected;
        updateLocationDisplay();
        refreshData();
      }
    });
  }

  // 2. Setup Route Destination Presets Dropdown
  const routeDestSelect = document.getElementById("route-dest-select");
  if (routeDestSelect) {
    routeDestSelect.innerHTML = `<option value="">🎯 選擇目的地熱點...</option>` +
      PRESET_LOCATIONS.map((loc, idx) => `<option value="${idx}">${loc.name}</option>`).join("");
  }

  // 3. Setup GPS Button
  const gpsBtn = document.getElementById("btn-gps");
  if (gpsBtn) {
    gpsBtn.addEventListener("click", async () => {
      gpsBtn.textContent = "⏳ 定位中...";
      try {
        const loc = await requestGpsPosition();
        state.location = loc;
        updateLocationDisplay();
        showToast("📍 已成功取得 GPS 定位！");
        refreshData();
      } catch (err) {
        showToast(err.message);
      } finally {
        gpsBtn.textContent = "🎯 我的位置";
      }
    });
  }

  // 4. Setup Map Modal
  const mapModal = initMapModal((selectedLoc) => {
    state.location = selectedLoc;
    setCurrentLocation(selectedLoc);
    updateLocationDisplay();
    showToast(`🗺️ 已選定位置: ${selectedLoc.latitude}, ${selectedLoc.longitude}`);
    refreshData();
  });

  const mapBtn = document.getElementById("btn-open-map");
  if (mapBtn) {
    mapBtn.addEventListener("click", () => {
      mapModal.openMap(state.location.latitude, state.location.longitude);
    });
  }

  // 5. Setup Identity & State Capsule Buttons
  document.querySelectorAll(".capsule-btn[data-identity]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".capsule-btn[data-identity]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.identity = btn.getAttribute("data-identity");
      refreshData();
    });
  });

  document.querySelectorAll(".capsule-btn[data-state]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".capsule-btn[data-state]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.stateIntent = btn.getAttribute("data-state");
      refreshData();
    });
  });

  // 6. Setup Manual Refresh & Timer Click
  document.getElementById("btn-manual-refresh")?.addEventListener("click", refreshData);
  document.getElementById("timer-pill")?.addEventListener("click", refreshData);

  // 7. Setup Tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".view-content").forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // 8. Setup Route Plan Submit Button
  document.getElementById("btn-plan-route")?.addEventListener("click", handleRoutePlan);

  // 9. Setup Settings Modal (Token & Custom Endpoint)
  setupSettingsModal();

  // Initial Location & Data Load
  updateLocationDisplay();
  refreshData();
  startTimerLoop();

  // Register PWA Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.log("SW register error:", err));
  }
}

function updateLocationDisplay() {
  const locDisplay = document.getElementById("current-location-text");
  if (locDisplay) {
    locDisplay.textContent = `${state.location.name} (${state.location.latitude}, ${state.location.longitude})`;
  }
}

function setupSettingsModal() {
  const settingsModal = document.getElementById("settings-modal");
  const openBtn = document.getElementById("btn-open-settings");
  const closeBtn = document.getElementById("btn-close-settings");
  const saveBtn = document.getElementById("btn-save-settings");
  const tokenInput = document.getElementById("input-token");
  const endpointInput = document.getElementById("input-endpoint");

  openBtn?.addEventListener("click", () => {
    if (tokenInput) tokenInput.value = getStoredToken();
    if (endpointInput) endpointInput.value = getApiBaseUrl();
    settingsModal?.classList.add("show");
  });

  closeBtn?.addEventListener("click", () => settingsModal?.classList.remove("show"));
  settingsModal?.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove("show");
  });

  saveBtn?.addEventListener("click", async () => {
    if (tokenInput) setStoredToken(tokenInput.value);
    if (endpointInput) setApiBaseUrl(endpointInput.value);
    settingsModal?.classList.remove("show");
    showToast("⚙️ 設定已儲存！");
    await updateAuthBadge();
    refreshData();
  });
}

document.addEventListener("DOMContentLoaded", initApp);
