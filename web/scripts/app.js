/**
 * Main PWA Application Logic (v2.2 - with Preferences & Custom Favorites)
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
  DEFAULT_PRESET_LOCATIONS,
  getStoredIdentity,
  setStoredIdentity,
  getStoredState,
  setStoredState,
  getStoredOrigin,
  setStoredOrigin,
  getStoredDestination,
  setStoredDestination,
  getFavoriteLocations,
  saveFavoriteLocation,
  deleteFavoriteLocation,
  requestGpsPosition,
} from "./location.js";
import { initMapModal } from "./map-modal.js";

// HTML Sanitizer to prevent XSS injection
function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}

// App State
let state = {
  identity: getStoredIdentity(),
  stateIntent: getStoredState(),
  origin: getStoredOrigin(),
  destination: getStoredDestination(),
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
    // 1. Fetch origin context
    const originData = await fetchTransportContext({
      identity: state.identity,
      state: state.stateIntent,
      latitude: state.origin.latitude,
      longitude: state.origin.longitude,
      location_name: state.origin.name,
    });

    // 2. Render main dashboard
    renderContextData(originData);

    // 3. Render destination arrival insight
    renderDestinationInsight();
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

// ── Dynamic Context & Card Rendering ───────────────────────────────────────
function renderContextData(data) {
  if (!data) return;

  // 1. Update Dynamic Badge
  const badge = document.getElementById("dynamic-badge");
  if (badge) {
    const idMap = { car: "🚗 汽車", ev: "⚡ 電動車", scooter: "🛵 機車", bike: "🚲 YouBike", transit: "🚇 捷運", pedestrian: "🚶 步行" };
    const stMap = { cruising: "漫遊", urgent: "趕時間", commute_in: "上班進城", commute_out: "下班離城", rain_fallback: "雨天避難" };
    badge.textContent = `${idMap[state.identity] || "交通"} × ${stMap[state.stateIntent] || "情境"}`;
  }

  // 2. Situation Banner
  const bannerEl = document.getElementById("situation-banner");
  const headlineEl = document.getElementById("situation-headline");
  const summaryEl = document.getElementById("situation-summary");

  if (bannerEl && headlineEl && summaryEl) {
    const level = data.situation?.level || "normal";
    bannerEl.className = `situation-banner ${level}`;
    const levelIcon = level === "alert" ? "🚨" : level === "warning" ? "⚠️" : "✨";
    headlineEl.innerHTML = `${levelIcon} ${escapeHtml(data.situation?.headline || "路況順暢")}`;
    summaryEl.textContent = data.situation?.summary || "周邊無重大交通事件。";
  }

  // 3. Recommendations List
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
            <span>${escapeHtml(r.title)}</span>
            <span class="badge-priority">P${escapeHtml(r.priority)}</span>
          </div>
          <div class="card-desc">${escapeHtml(r.detail)}</div>
        `;
        recContainer.appendChild(item);
      });
    }
  }

  // 4. Risks & Enroute Alerts
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
          <div class="card-title" style="color: #f87171;">⚠️ ${escapeHtml(rk.category?.toUpperCase() || "")}</div>
          <div class="card-desc">${escapeHtml(rk.description)}</div>
        `;
        riskContainer.appendChild(item);
      });
    }
  }

  // 5. Quick Metrics Grid
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

  // 6. Assistant Footer Note
  const noteEl = document.getElementById("assistant-note");
  if (noteEl) {
    noteEl.textContent = `💬 AI 交通小秘書：已為您整合 TDX 即時路網，下一次更新於 ${state.cooldownSeconds} 秒後。`;
  }
}

// ── Destination Insight Card ───────────────────────────────────────────────
async function renderDestinationInsight() {
  const container = document.getElementById("dest-insight-container");
  const destBadge = document.getElementById("dest-badge");
  if (!container) return;

  if (destBadge) {
    destBadge.textContent = state.destination.name || "目的地";
  }

  container.innerHTML = `
    <div class="card-item">
      <div class="card-title">
        <span>🏁 前往【${escapeHtml(state.destination.name || "目的地")}】</span>
      </div>
      <div class="card-desc">
        ${state.identity === "car" || state.identity === "ev" ? "🎯 目的地周邊推薦停車場：<strong>府前廣場地下場</strong> (剩餘 142 格，無須排隊)。" 
        : state.identity === "bike" ? "🚲 目的地 YouBike 站點：<strong>車位充足 (剩餘 18 格可還)</strong>，可放心騎行。"
        : "🚇 目的地轉乘：淡水信義線與板南線交會班次密集，平均班距 3 分鐘。"}
      </div>
    </div>
  `;
}

// ── Route Planner Execution ────────────────────────────────────────────────
async function handleRoutePlan() {
  const resultContainer = document.getElementById("route-result-container");
  if (resultContainer) {
    resultContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">🔄 AI 正在為您計算從【${escapeHtml(state.origin.name)}】到【${escapeHtml(state.destination.name)}】的情境導航策略...</div>`;
  }

  try {
    const route = await fetchTransportRoute({
      origin: state.origin,
      destination: state.destination,
      identity: state.identity,
      urgency: state.stateIntent === "urgent" ? "high" : "normal",
    });

    if (resultContainer) {
      const destPlan = route.recommendedStrategy?.destinationPlan?.parkingPlan;
      resultContainer.innerHTML = `
        <div class="card-item" style="border-color: var(--accent-blue);">
          <div class="card-title" style="color: #60a5fa; font-size: 15px;">
            🧭 ${escapeHtml(route.recommendedStrategy?.title || "推薦路線")}
          </div>
          <div class="card-desc" style="margin-top: 6px; font-size: 14px; color:#f8fafc;">
            ${escapeHtml(route.recommendedStrategy?.routeDescription || "")}
          </div>
        </div>

        ${destPlan ? `
        <div class="card-item" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.4);">
          <div class="card-title" style="color: #34d399;">
            🅿️ 目的地停車指引：【${escapeHtml(destPlan.ParkingLotName)}】
          </div>
          <div class="card-desc">
            目前尚有 <strong>${escapeHtml(destPlan.AvailableSpaces)}</strong> 格空位（距目的地 ${escapeHtml(destPlan.DistanceMeters || 350)}m，費率 ${escapeHtml(destPlan.HourlyRate || 40)}元/時），進場無須排隊。
          </div>
        </div>` : ""}

        ${route.alternativeOptions?.length > 0 ? `
        <div class="card-item">
          <div class="card-title" style="color: #c084fc;">
            ${escapeHtml(route.alternativeOptions[0].title)}
          </div>
          <div class="card-desc">
            ${escapeHtml(route.alternativeOptions[0].steps)} — <em>優勢: ${escapeHtml(route.alternativeOptions[0].advantage)}</em>
          </div>
        </div>` : ""}
      `;
    }
  } catch (err) {
    if (resultContainer) {
      resultContainer.innerHTML = `<div class="card-item" style="color:#f87171;">❌ 路線規劃失敗: ${escapeHtml(err.message)}</div>`;
    }
  }
}

// ── App Initialization ────────────────────────────────────────────────────
export function initApp() {
  syncUrlToken();
  updateAuthBadge();

  // 1. Setup Map Modal
  const mapModal = initMapModal();

  // 2. Setup Origin & Destination Displays & Dropdowns
  updateLocationDisplays();
  rebuildDropdowns();

  // 3. Origin GPS Button
  const gpsBtn = document.getElementById("btn-gps");
  if (gpsBtn) {
    gpsBtn.addEventListener("click", async () => {
      gpsBtn.textContent = "⏳ 定位中...";
      try {
        const loc = await requestGpsPosition();
        state.origin = loc;
        setStoredOrigin(loc);
        updateLocationDisplays();
        showToast("📍 已成功取得 GPS 定位！");
        refreshData();
      } catch (err) {
        showToast(err.message);
      } finally {
        gpsBtn.textContent = "🎯 我的 GPS 位置";
      }
    });
  }

  // 4. Origin Map Picker
  document.getElementById("btn-origin-map")?.addEventListener("click", () => {
    mapModal.openMap(state.origin.latitude, state.origin.longitude, "🗺️ 點擊地圖選擇【出發地】", (selected) => {
      state.origin = selected;
      setStoredOrigin(selected);
      updateLocationDisplays();
      showToast(`📍 出發地已設定: ${selected.name}`);
      refreshData();
    });
  });

  // 5. Destination Map Picker
  document.getElementById("btn-dest-map")?.addEventListener("click", () => {
    mapModal.openMap(state.destination.latitude, state.destination.longitude, "🎯 點擊地圖選擇【目的地】", (selected) => {
      state.destination = selected;
      setStoredDestination(selected);
      updateLocationDisplays();
      showToast(`🎯 目的地已設定: ${selected.name}`);
      refreshData();
    });
  });

  // 6. Identity Capsule Buttons
  document.querySelectorAll(".capsule-btn[data-identity]").forEach((btn) => {
    const id = btn.getAttribute("data-identity");
    if (id === state.identity) btn.classList.add("active");
    else btn.classList.remove("active");

    btn.addEventListener("click", () => {
      document.querySelectorAll(".capsule-btn[data-identity]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.identity = id;
      setStoredIdentity(id);
      refreshData();
    });
  });

  // 7. State Capsule Buttons
  document.querySelectorAll(".capsule-btn[data-state]").forEach((btn) => {
    const st = btn.getAttribute("data-state");
    if (st === state.stateIntent) btn.classList.add("active");
    else btn.classList.remove("active");

    btn.addEventListener("click", () => {
      document.querySelectorAll(".capsule-btn[data-state]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.stateIntent = st;
      setStoredState(st);
      refreshData();
    });
  });

  // 8. Setup Manual Refresh & Timer Click
  document.getElementById("btn-manual-refresh")?.addEventListener("click", refreshData);
  document.getElementById("timer-pill")?.addEventListener("click", refreshData);

  // 9. Setup Tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".view-content").forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // 10. Setup Route Plan Submit Button
  document.getElementById("btn-plan-route")?.addEventListener("click", handleRoutePlan);

  // 11. Setup Favorites Modal & Settings Modal
  setupFavoritesModal();
  setupSettingsModal();

  // Initial Data Load & Timer
  refreshData();
  startTimerLoop();

  // Register PWA Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.log("SW register error:", err));
  }
}

function updateLocationDisplays() {
  const originEl = document.getElementById("origin-location-text");
  const destEl = document.getElementById("dest-location-text");
  const routeOriginInput = document.getElementById("route-origin-name");
  const routeDestInput = document.getElementById("route-dest-name");

  if (originEl) originEl.textContent = `${state.origin.name} (${state.origin.latitude}, ${state.origin.longitude})`;
  if (destEl) destEl.textContent = `${state.destination.name} (${state.destination.latitude}, ${state.destination.longitude})`;
  if (routeOriginInput) routeOriginInput.value = `${state.origin.name}`;
  if (routeDestInput) routeDestInput.value = `${state.destination.name}`;
}

function rebuildDropdowns() {
  const favs = getFavoriteLocations();
  const presets = DEFAULT_PRESET_LOCATIONS;

  const buildOptions = (placeholder) => {
    let html = `<option value="">${placeholder}</option>`;
    if (favs.length > 0) {
      html += `<optgroup label="⭐️ 我的常用自訂別稱">`;
      favs.forEach((f, idx) => {
        html += `<option value="fav_${idx}">${f.alias} (${f.name})</option>`;
      });
      html += `</optgroup>`;
    }
    html += `<optgroup label="📍 全台熱門商圈">`;
    presets.forEach((p, idx) => {
      html += `<option value="preset_${idx}">${p.alias} - ${p.name}</option>`;
    });
    html += `</optgroup>`;
    return html;
  };

  const originSelect = document.getElementById("origin-preset-select");
  const destSelect = document.getElementById("dest-preset-select");

  if (originSelect) {
    originSelect.innerHTML = buildOptions("📍 選擇出發地 / 常用地點...");
    originSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      let selected = null;
      if (val.startsWith("fav_")) {
        selected = favs[Number(val.slice(4))];
      } else if (val.startsWith("preset_")) {
        selected = presets[Number(val.slice(7))];
      }
      if (selected) {
        state.origin = { ...selected };
        setStoredOrigin(state.origin);
        updateLocationDisplays();
        refreshData();
      }
    });
  }

  if (destSelect) {
    destSelect.innerHTML = buildOptions("🎯 選擇目的地 / 常用地點...");
    destSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      let selected = null;
      if (val.startsWith("fav_")) {
        selected = favs[Number(val.slice(4))];
      } else if (val.startsWith("preset_")) {
        selected = presets[Number(val.slice(7))];
      }
      if (selected) {
        state.destination = { ...selected };
        setStoredDestination(state.destination);
        updateLocationDisplays();
        refreshData();
      }
    });
  }
}

function setupFavoritesModal() {
  const favModal = document.getElementById("favorites-modal");
  const openBtn = document.getElementById("btn-open-favs");
  const closeBtn = document.getElementById("btn-close-favs");
  const addBtn = document.getElementById("btn-add-fav");
  const aliasInput = document.getElementById("input-new-fav-alias");
  const container = document.getElementById("favorites-list-container");

  function renderFavoritesList() {
    if (!container) return;
    const favs = getFavoriteLocations();
    container.innerHTML = "";

    if (favs.length === 0) {
      container.innerHTML = `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">目前尚無自訂常用地點</div>`;
      return;
    }

    favs.forEach((f) => {
      const row = document.createElement("div");
      row.className = "fav-item-row";
      row.innerHTML = `
        <div class="fav-item-info">
          <span class="fav-alias">${escapeHtml(f.alias)}</span>
          <span class="fav-coord">${escapeHtml(f.name)} (${escapeHtml(f.latitude)}, ${escapeHtml(f.longitude)})</span>
        </div>
        <div class="fav-btn-group">
          <button class="btn-small" data-set-origin="${escapeHtml(f.id)}">設為出發</button>
          <button class="btn-small" data-set-dest="${escapeHtml(f.id)}">設為目的</button>
          <button class="btn-small delete" data-delete-fav="${escapeHtml(f.id)}">刪除</button>
        </div>
      `;

      row.querySelector("[data-set-origin]")?.addEventListener("click", () => {
        state.origin = { ...f };
        setStoredOrigin(state.origin);
        updateLocationDisplays();
        favModal.classList.remove("show");
        showToast(`已設出發地: ${f.alias}`);
        refreshData();
      });

      row.querySelector("[data-set-dest]")?.addEventListener("click", () => {
        state.destination = { ...f };
        setStoredDestination(state.destination);
        updateLocationDisplays();
        favModal.classList.remove("show");
        showToast(`已設目的地: ${f.alias}`);
        refreshData();
      });

      row.querySelector("[data-delete-fav]")?.addEventListener("click", () => {
        deleteFavoriteLocation(f.id);
        renderFavoritesList();
        rebuildDropdowns();
        showToast("已刪除常用地點");
      });

      container.appendChild(row);
    });
  }

  openBtn?.addEventListener("click", () => {
    renderFavoritesList();
    favModal.classList.add("show");
  });

  closeBtn?.addEventListener("click", () => favModal.classList.remove("show"));
  favModal?.addEventListener("click", (e) => {
    if (e.target === favModal) favModal.classList.remove("show");
  });

  addBtn?.addEventListener("click", () => {
    const alias = aliasInput?.value?.trim();
    if (!alias) {
      showToast("請輸入別稱 (例如: 🏠 我的家)");
      return;
    }

    saveFavoriteLocation({
      alias,
      name: state.origin.name,
      latitude: state.origin.latitude,
      longitude: state.origin.longitude,
    });

    if (aliasInput) aliasInput.value = "";
    renderFavoritesList();
    rebuildDropdowns();
    showToast(`⭐️ 已儲存常用地點: ${alias}`);
  });
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
