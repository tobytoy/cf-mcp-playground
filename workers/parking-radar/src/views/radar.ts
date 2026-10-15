export function renderParkingRadarPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-TW" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>台灣智慧停車即時雷達 | Taiwan Real-Time Parking Radar</title>
  <meta name="description" content="全台各縣市路外停車場即時剩餘車位動態、充電樁、身障與婦幼專用位、費率試算與一鍵導航邊緣運算雷達。">
  
  <script>
    const _origWarn = console.warn;
    console.warn = function(...args) {
      if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
      _origWarn.apply(console, args);
    };
  </script>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- FontAwesome Icons & Google Fonts -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Leaflet CSS & JS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

  <style>
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans TC', sans-serif;
    }
    code, pre, .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .glass-panel {
      background: rgba(13, 20, 36, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: rgba(23, 33, 56, 0.65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .glass-card:hover {
      background: rgba(30, 43, 72, 0.85);
      border-color: rgba(56, 189, 248, 0.3);
      box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.5), 0 0 16px -2px rgba(56, 189, 248, 0.15);
    }
    .glass-card.active-card {
      background: rgba(30, 58, 100, 0.9);
      border-color: #38bdf8;
      box-shadow: 0 0 20px -3px rgba(56, 189, 248, 0.4);
    }
    
    /* 捲軸自訂 */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(13, 20, 36, 0.5); }
    ::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.5); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.8); }

    /* Leaflet 地圖樣式客製化 */
    .leaflet-container {
      background: #080c16 !important;
      font-family: inherit;
    }
    /* 台灣通用電子地圖 - 夜間暗色模式濾鏡 */
    .map-dark-tiles .leaflet-tile {
      filter: brightness(0.68) invert(1) contrast(2.3) hue-rotate(200deg) saturate(0.35);
    }
    .leaflet-popup-content-wrapper {
      background: rgba(15, 23, 42, 0.95) !important;
      color: #f1f5f9 !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
      backdrop-filter: blur(12px);
    }
    .leaflet-popup-tip {
      background: rgba(15, 23, 42, 0.95) !important;
    }
    
    /* 自訂車位 Marker 徽章 */
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4), 0 0 10px rgba(255,255,255,0.2);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }
    .custom-marker:hover {
      transform: scale(1.15) translateY(-2px);
      z-index: 1000 !important;
    }
    .marker-available {
      background: linear-gradient(135deg, #10b981, #059669);
      border: 2px solid #a7f3d0;
    }
    .marker-tight {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: 2px solid #fde68a;
    }
    .marker-full {
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      border: 2px solid #fecaca;
    }
    .marker-unknown {
      background: linear-gradient(135deg, #64748b, #475569);
      border: 2px solid #cbd5e1;
    }
    .marker-ev {
      background: linear-gradient(135deg, #f59e0b, #059669);
      border: 2px solid #fef08a;
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.6);
      font-weight: 800;
    }
    
    /* 使用者 GPS 雷達波紋 */
    .user-ripple {
      width: 22px;
      height: 22px;
      background: #38bdf8;
      border: 3px solid #ffffff;
      border-radius: 50%;
      position: relative;
      box-shadow: 0 0 15px #38bdf8;
    }
    .user-ripple::after {
      content: '';
      position: absolute;
      top: -12px;
      left: -12px;
      right: -12px;
      bottom: -12px;
      border-radius: 50%;
      border: 2px solid #38bdf8;
      animation: ripple 2s infinite ease-out;
    }
    @keyframes ripple {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  </style>
</head>
<body class="bg-[#070b14] text-slate-100 min-h-screen selection:bg-sky-500 selection:text-white flex flex-col h-screen overflow-hidden">

  <!-- 背景氛圍光暈 -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div class="absolute -top-40 -left-40 w-[450px] h-[450px] bg-emerald-600/10 rounded-full blur-[140px]"></div>
    <div class="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-sky-600/10 rounded-full blur-[150px]"></div>
    <div class="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]"></div>
  </div>

  <!-- 頂部導航列 (Top Navigation) -->
  <header class="glass-panel border-b border-slate-800/80 px-4 py-3 z-30 shrink-0">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
      
      <!-- 標誌、狀態徽章與視圖切換 -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <i class="fa-solid fa-square-parking text-slate-950 text-xl font-black"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
              台灣停車即時雷達
              <span class="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono font-semibold border border-sky-500/30">v1.0 Edge</span>
            </h1>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span id="sync-status-badge" class="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span id="sync-status-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span id="sync-status-text">TDX 即時對接</span>
            </span>
            <span class="text-slate-600">|</span>
            <span id="update-timer-text" class="font-mono text-[11px] text-slate-400">60s 更新</span>
          </div>
        </div>

        <!-- 視圖切換 Pill Tabs -->
        <div class="hidden sm:flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 ml-2">
          <a href="/" class="px-3 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm flex items-center gap-1.5">
            <i class="fa-solid fa-map-location-dot text-sky-400"></i> 即時雷達
          </a>
          <a href="/dashboard" class="px-3 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-chart-simple text-emerald-400"></i> 統計戰情室
          </a>
        </div>
      </div>

      <!-- 縣市切換與 GPS 周邊搜尋 -->
      <div class="flex items-center gap-2 flex-wrap">
        
        <!-- 手機版戰情室按鈕 -->
        <a href="/dashboard" class="sm:hidden px-2.5 py-2 rounded-xl bg-slate-900/90 text-xs font-semibold text-emerald-400 border border-slate-700/80 flex items-center gap-1">
          <i class="fa-solid fa-chart-pie"></i> 戰情
        </a>
        
        <!-- 縣市選擇下拉 -->
        <div class="relative">
          <select id="city-select" class="appearance-none bg-slate-900/90 text-sm font-medium text-slate-200 border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer shadow-sm">
            <option value="Taipei">📍 臺北市</option>
            <option value="NewTaipei">📍 新北市</option>
            <option value="Taichung">📍 臺中市</option>
            <option value="Kaohsiung">📍 高雄市</option>
            <option value="Tainan">📍 臺南市</option>
            <option value="Taoyuan">📍 桃園市</option>
            <option value="Hsinchu">📍 新竹市</option>
            <option value="Keelung">📍 基隆市</option>
            <option value="YilanCounty">📍 宜蘭縣</option>
          </select>
          <i class="fa-solid fa-chevron-down absolute right-3 top-3 text-xs text-slate-400 pointer-events-none"></i>
        </div>

        <!-- GPS 我的位置 -->
        <button id="btn-gps" class="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sm font-semibold text-sky-400 border border-slate-700/80 hover:border-sky-500 transition-all flex items-center gap-2 active:scale-95 shadow-sm">
          <i class="fa-solid fa-location-crosshairs text-sky-400"></i>
          <span class="hidden sm:inline">GPS 周邊</span>
        </button>

        <!-- 重新整理按鈕 -->
        <button id="btn-refresh" title="手動重新載入最新車位" class="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all active:scale-95">
          <i class="fa-solid fa-arrows-rotate text-sm" id="refresh-icon"></i>
        </button>
      </div>

    </div>

    <!-- 快速搜尋與過濾條件列 (Filter Bar) -->
    <div class="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
      
      <!-- 關鍵字搜尋框 -->
      <div class="relative shrink-0 w-44 sm:w-56">
        <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"></i>
        <input type="text" id="search-input" placeholder="搜尋名稱或路段..." class="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500">
      </div>

      <div class="h-4 w-[1px] bg-slate-800 shrink-0"></div>

      <!-- 快速篩選按鈕 (Filter Chips) -->
      <button data-filter="availableOnly" class="filter-chip shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 font-medium transition-colors flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span> 僅看有空位
      </button>

      <button data-filter="evOnly" class="filter-chip shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 font-medium transition-colors flex items-center gap-1.5">
        <i class="fa-solid fa-bolt text-amber-400"></i> 電動車充電
      </button>

      <button data-filter="evDedicatedOnly" class="filter-chip shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 font-medium transition-colors flex items-center gap-1.5">
        <i class="fa-solid fa-shield-halved text-emerald-400"></i> 純電專屬格
      </button>

      <button data-filter="disabilityOnly" class="filter-chip shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 font-medium transition-colors flex items-center gap-1.5">
        <i class="fa-solid fa-wheelchair text-blue-400"></i> 身心障礙
      </button>

      <button data-filter="parentChildOnly" class="filter-chip shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 font-medium transition-colors flex items-center gap-1.5">
        <i class="fa-solid fa-baby text-pink-400"></i> 孕婦親子
      </button>

      <button data-filter="indoorOnly" class="filter-chip shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 font-medium transition-colors flex items-center gap-1.5">
        <i class="fa-solid fa-warehouse text-purple-400"></i> 室內地下
      </button>

    </div>
  </header>

  <!-- 主內容區 (左右分割：左側列表 + 右側地圖) -->
  <main class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
    
    <!-- 左側停車場列表抽屜 (側邊欄) -->
    <aside id="sidebar" class="w-full md:w-[420px] lg:w-[460px] h-1/2 md:h-full border-r border-slate-800/80 flex flex-col bg-[#0b101d] shrink-0 z-20">
      
      <!-- 統計摘要列 -->
      <div class="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div>
          找到 <span id="count-total" class="font-bold text-sky-400 font-mono">0</span> 處停車場
          (<span id="count-available" class="text-emerald-400 font-mono font-bold">0</span> 處有空位)
        </div>
        <div class="flex items-center gap-2 text-[11px]">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>充裕</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span>緊張</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span>客滿</span>
        </div>
      </div>

      <!-- 卡片捲動列表 -->
      <div id="lot-list" class="flex-1 overflow-y-auto p-3 space-y-2.5">
        <!-- 載入中骨架畫面 -->
        <div class="text-center py-16 text-slate-500 flex flex-col items-center gap-3">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-sky-400"></i>
          <p class="text-xs">連線 TDX 獲取最新停車資訊中...</p>
        </div>
      </div>

    </aside>

    <!-- 右側互動式地圖 -->
    <section class="flex-1 h-1/2 md:h-full relative z-10">
      <div id="map" class="w-full h-full"></div>

      <!-- 地圖浮動控制按鈕 -->
      <div class="absolute top-4 right-4 z-[500] flex flex-col items-end gap-2">
        <!-- 台灣圖資切換器 (國土測繪中心 NLSC 官方圖資，免 API Key) -->
        <div class="glass-panel p-1 rounded-xl flex items-center gap-1 shadow-2xl border border-slate-700/80 text-xs">
          <button id="layer-btn-emap" class="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 transition-all flex items-center gap-1 shadow-sm">
            <i class="fa-solid fa-map text-[11px]"></i> 臺灣地圖
          </button>
          <button id="layer-btn-dark" class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1">
            <i class="fa-solid fa-moon text-[11px]"></i> 夜間深色
          </button>
          <button id="layer-btn-photo" class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1">
            <i class="fa-solid fa-satellite text-[11px]"></i> 衛星空拍
          </button>
        </div>

        <button id="btn-recenter" title="重設視角" class="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center justify-center shadow-lg transition-transform active:scale-95">
          <i class="fa-solid fa-crosshairs text-sm text-sky-400"></i>
        </button>
      </div>
    </section>

  </main>

  <!-- 停車場詳細資訊抽屜 (Detail Modal / Drawer) -->
  <div id="detail-modal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 hidden flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity">
    <div class="glass-panel w-full sm:max-w-xl max-h-[85vh] sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom duration-200">
      
      <!-- Modal Header -->
      <div class="p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/80">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span id="modal-city" class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[11px] font-bold">臺北市</span>
            <span id="modal-status-badge" class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">車位充足</span>
            <span id="modal-indoor-badge" class="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300">室內地下</span>
          </div>
          <h2 id="modal-title" class="text-lg sm:text-xl font-black text-white">府前廣場地下停車場</h2>
          <p id="modal-address" class="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <i class="fa-solid fa-location-dot text-slate-500 text-[10px]"></i>
            <span id="modal-address-text">臺北市信義區市府路1號地下</span>
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button id="btn-modal-refresh-lot" title="向 TDX 即時重新抓取此場站最新資料" class="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer">
            <i class="fa-solid fa-arrows-rotate text-sky-400" id="modal-refresh-lot-icon"></i>
            <span class="hidden sm:inline">即時重新抓取</span>
          </button>
          <button id="modal-close" class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- 即時抓取回饋狀態條 -->
      <div id="modal-refresh-notice" class="hidden px-5 py-2.5 text-xs border-b border-slate-800 flex items-center justify-between transition-all">
        <span id="modal-refresh-notice-text" class="flex items-center gap-2"></span>
        <button id="modal-refresh-notice-close" class="text-slate-400 hover:text-white text-xs ml-2"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- Modal Body (可滾動內容) -->
      <div class="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
        
        <!-- 各車種即時剩餘位儀表板 -->
        <!-- 各車種即時剩餘位儀表板 (6欄響應式網格) -->
        <div>
          <h3 class="text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
            <span class="flex items-center gap-1.5 uppercase tracking-wider">
              <i class="fa-solid fa-gauge-high text-sky-400"></i> 各車種即時格位分佈
            </span>
            <span class="text-[11px] text-slate-400 font-normal">依車種與專用規範細分</span>
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <!-- 小型車 -->
            <div class="glass-card p-2.5 rounded-xl border border-slate-700/60 text-center">
              <span class="text-[11px] text-slate-400 block mb-0.5">🚗 小型車</span>
              <div class="text-base sm:text-lg font-black font-mono text-emerald-400" id="modal-space-car">422</div>
              <span class="text-[10px] text-slate-500 block truncate" id="modal-space-car-total">總計 1998 席</span>
            </div>
            <!-- 機車 -->
            <div class="glass-card p-2.5 rounded-xl border border-slate-700/60 text-center">
              <span class="text-[11px] text-slate-400 block mb-0.5">🛵 機車</span>
              <div class="text-base sm:text-lg font-black font-mono text-sky-400" id="modal-space-moto">182</div>
              <span class="text-[10px] text-slate-500 block truncate" id="modal-space-moto-total">總計 1405 席</span>
            </div>
            <!-- ⚡ 純電專屬車位 (只給電動車停) -->
            <div class="glass-card p-2.5 rounded-xl border border-emerald-500/40 text-center bg-emerald-950/25">
              <span class="text-[11px] text-emerald-300 font-bold block mb-0.5"><i class="fa-solid fa-bolt text-emerald-400 text-[10px]"></i> 純電專屬</span>
              <div class="text-base sm:text-lg font-black font-mono text-emerald-400" id="modal-space-ev-dedicated">0</div>
              <span class="text-[10px] text-emerald-300/80 block truncate">只給電動車停</span>
            </div>
            <!-- 🔌 混用充電車位 (一般車亦可停) -->
            <div class="glass-card p-2.5 rounded-xl border border-sky-500/40 text-center bg-sky-950/25">
              <span class="text-[11px] text-sky-300 font-bold block mb-0.5"><i class="fa-solid fa-plug text-sky-400 text-[10px]"></i> 混用充電</span>
              <div class="text-base sm:text-lg font-black font-mono text-sky-400" id="modal-space-ev-shared">0</div>
              <span class="text-[10px] text-sky-300/80 block truncate">一般車亦可停</span>
            </div>
            <!-- 身心障礙 -->
            <div class="glass-card p-2.5 rounded-xl border border-slate-700/60 text-center">
              <span class="text-[11px] text-slate-400 block mb-0.5">♿ 身心障礙</span>
              <div class="text-base sm:text-lg font-black font-mono text-blue-400" id="modal-space-dis">6</div>
              <span class="text-[10px] text-slate-500 block truncate" id="modal-space-dis-total">總計 40 席</span>
            </div>
            <!-- 婦幼親子 -->
            <div class="glass-card p-2.5 rounded-xl border border-slate-700/60 text-center">
              <span class="text-[11px] text-slate-400 block mb-0.5">👶 婦幼親子</span>
              <div class="text-base sm:text-lg font-black font-mono text-pink-400" id="modal-space-pc">8</div>
              <span class="text-[10px] text-slate-500 block truncate" id="modal-space-pc-total">總計 45 席</span>
            </div>
          </div>
        </div>

        <!-- 電動車專屬 vs 混用車位詳細規範卡片 -->
        <div id="modal-ev-details" class="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-sky-950/30 border border-slate-700/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-solid fa-charging-station text-amber-400"></i> 電動車充電車位規範與說明
            </h4>
            <span id="modal-ev-total-badge" class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/40">充電樁共 0 格</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
              <div class="flex items-center justify-between text-emerald-400 font-bold mb-1">
                <span class="flex items-center gap-1"><i class="fa-solid fa-lock text-[10px]"></i> 專屬車位（純電車專用）</span>
                <span id="modal-ev-dedicated-count" class="font-mono text-sm bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">0 格</span>
              </div>
              <p class="text-[10px] text-emerald-200/80 leading-relaxed">
                <strong>只給電動車停放充電。</strong>依《停車場法》第27條之1規定，燃油車不可占用（違規罰 $600~$1,200 並拖吊）。
              </p>
            </div>

            <div class="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30">
              <div class="flex items-center justify-between text-blue-400 font-bold mb-1">
                <span class="flex items-center gap-1"><i class="fa-solid fa-car-side text-[10px]"></i> 混用 / 優先車位（油電共用）</span>
                <span id="modal-ev-shared-count" class="font-mono text-sm bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">0 格</span>
              </div>
              <p class="text-[10px] text-blue-200/80 leading-relaxed">
                <strong>一般車也可以用。</strong>設有充電設備但非專用格位，燃油車停放不開罰，建議純電車主抵達前確認空位。
              </p>
            </div>
          </div>
        </div>

        <!-- 官方收費標準與說明 (嚴格遵照交通部 TDX 官方公告，不作臆測以保證資料正確性) -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <i class="fa-solid fa-file-invoice-dollar text-emerald-400"></i> 收費標準與公告說明
            </h3>
            <span class="text-[10px] text-sky-400 font-mono font-medium">交通部 TDX 公告</span>
          </div>
          <div class="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <p id="modal-fare-desc" class="text-xs text-slate-200 leading-relaxed font-sans"></p>
          </div>
          <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-info text-sky-400 text-[10px]"></i>
            依主管機關與現場收費標準為準，系統不作臆測性費率換算以確保數據真確性。
          </p>
        </div>

        <!-- 場內設施清單 -->
        <div>
          <h3 class="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <i class="fa-solid fa-toolbox text-purple-400"></i> 場內設施與配備
          </h3>
          <div id="modal-facilities" class="flex flex-wrap gap-1.5">
            <span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">電梯</span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">電動車充電站</span>
          </div>
        </div>

      </div>

      <!-- Modal Footer (一鍵導航按鈕) -->
      <div class="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <a id="btn-nav-google" href="#" target="_blank" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-center text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 active:scale-98">
          <i class="fa-brands fa-google"></i> Google Maps 導航
        </a>
        <a id="btn-nav-apple" href="#" target="_blank" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-center text-xs transition-all flex items-center justify-center gap-2 active:scale-98">
          <i class="fa-brands fa-apple"></i> Apple 地圖
        </a>
      </div>

    </div>
  </div>

  <!-- 前端核心 JavaScript 邏輯 -->
  <script>
    // ── 全域狀態 ─────────────────────────────────────────────────────────────
    let map = null;
    let markersLayer = null;
    let emapLayer = null;
    let photoLayer = null;
    let currentLots = [];
    let currentModalLot = null;
    let activeLotId = null;
    let userLocation = null;
    let activeFilters = {
      availableOnly: false,
      evOnly: false,
      evDedicatedOnly: false,
      disabilityOnly: false,
      parentChildOnly: false,
      indoorOnly: false,
      searchQuery: ''
    };
    let refreshSecondsLeft = 60;
    let refreshTimer = null;

    // ── 初始化地圖 (內政部國土測繪中心 NLSC 臺灣通用電子地圖，免 API Key) ──
    function initMap() {
      // 預設台北信義區視角
      map = L.map('map', {
        center: [25.0375, 121.5637],
        zoom: 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 1. 臺灣通用版電子地圖 (EMAP - 內政部國土測繪中心)
      emapLayer = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">內政部國土測繪中心 NLSC</a> &copy; TDX',
        maxZoom: 19,
        minZoom: 7
      });

      // 2. 臺灣正射影像 (PHOTO_MIX 衛星空拍)
      photoLayer = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank">內政部國土測繪中心 NLSC</a> &copy; TDX',
        maxZoom: 19,
        minZoom: 7
      });

      // 預設載入臺灣通用電子地圖
      emapLayer.addTo(map);
      markersLayer = L.layerGroup().addTo(map);
    }

    // ── 切換地圖底圖 ──────────────────────────────────────────────────────────
    function switchMapLayer(type) {
      const mapContainer = document.getElementById('map');
      const btnEmap = document.getElementById('layer-btn-emap');
      const btnDark = document.getElementById('layer-btn-dark');
      const btnPhoto = document.getElementById('layer-btn-photo');

      const defaultClass = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1';
      const activeClass = 'px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 transition-all flex items-center gap-1 shadow-sm';

      [btnEmap, btnDark, btnPhoto].forEach(btn => {
        if (btn) btn.className = defaultClass;
      });

      if (type === 'emap') {
        map.removeLayer(photoLayer);
        emapLayer.addTo(map);
        mapContainer.classList.remove('map-dark-tiles');
        if (btnEmap) btnEmap.className = activeClass;
      } else if (type === 'dark') {
        map.removeLayer(photoLayer);
        emapLayer.addTo(map);
        mapContainer.classList.add('map-dark-tiles');
        if (btnDark) btnDark.className = activeClass;
      } else if (type === 'photo') {
        map.removeLayer(emapLayer);
        photoLayer.addTo(map);
        mapContainer.classList.remove('map-dark-tiles');
        if (btnPhoto) btnPhoto.className = activeClass;
      }
    }

    // ── 抓取停車場資料 ───────────────────────────────────────────────────────
    async function loadParkingLots() {
      const city = document.getElementById('city-select').value;
      const listEl = document.getElementById('lot-list');
      const iconEl = document.getElementById('refresh-icon');
      
      iconEl.classList.add('fa-spin');

      const syncBadge = document.getElementById('sync-status-badge');
      const syncDot = document.getElementById('sync-status-dot');
      const syncText = document.getElementById('sync-status-text');
      if (syncBadge && syncDot && syncText) {
        syncBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40';
        syncDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
        syncText.innerText = '讀取 TDX 資料中...';
      }

      listEl.innerHTML = \`
        <div class="text-center py-16 text-slate-500 flex flex-col items-center gap-3">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-sky-400"></i>
          <p class="text-xs">連線 TDX 獲取最新車位資料中...</p>
        </div>
      \`;

      try {
        let url = \`/api/parking/city/\${city}\`;
        if (userLocation) {
          url += \`?lat=\${userLocation.lat}&lon=\${userLocation.lon}\`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('API request failed');
        currentLots = await res.json();
        
        if (syncBadge && syncDot && syncText) {
          syncBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          syncDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
          syncText.innerText = \`已完全載入 (\${currentLots.length} 處)\`;
        }

        applyFiltersAndRender();
        
        // 重設自動更新計時器
        resetRefreshTimer();

      } catch (err) {
        console.error('載入停車資料失敗:', err);
        if (syncBadge && syncDot && syncText) {
          syncBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40';
          syncDot.className = 'w-2 h-2 rounded-full bg-rose-400';
          syncText.innerText = '載入失敗';
        }
        listEl.innerHTML = \`
          <div class="text-center py-12 text-rose-400">
            <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
            <p class="text-xs">載入停車資料時發生錯誤，請稍後重試。</p>
          </div>
        \`;
      } finally {
        iconEl.classList.remove('fa-spin');
      }
    }

    // ── 篩選與渲染卡片 + 地圖標記 ─────────────────────────────────────────────
    function applyFiltersAndRender() {
      const filtered = currentLots.filter(lot => {
        if (activeFilters.availableOnly && (lot.availableSpaces === null || lot.availableSpaces <= 0)) return false;
        if (activeFilters.evOnly && !lot.hasEVCharging) return false;
        if (activeFilters.evDedicatedOnly && (lot.evSpaces?.dedicated === null || (lot.evSpaces?.dedicated ?? 0) <= 0)) return false;
        if (activeFilters.disabilityOnly && !lot.hasDisabilitySpace) return false;
        if (activeFilters.parentChildOnly && !lot.hasParentChildSpace) return false;
        if (activeFilters.indoorOnly && !lot.isIndoor) return false;
        if (activeFilters.searchQuery) {
          const q = activeFilters.searchQuery.toLowerCase();
          const match =
            lot.name.toLowerCase().includes(q) ||
            lot.address.toLowerCase().includes(q) ||
            (lot.fareDescription && lot.fareDescription.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });

      renderSidebarList(filtered);
      renderMapMarkers(filtered);
    }

    // ── 渲染左側卡片列表 ─────────────────────────────────────────────────────
    function renderSidebarList(lots) {
      const listEl = document.getElementById('lot-list');
      const countTotal = document.getElementById('count-total');
      const countAvail = document.getElementById('count-available');

      countTotal.innerText = lots.length;
      countAvail.innerText = lots.filter(l => l.availableSpaces !== null && l.availableSpaces > 0).length;

      if (lots.length === 0) {
        listEl.innerHTML = \`
          <div class="text-center py-16 text-slate-500">
            <i class="fa-solid fa-filter-circle-xmark text-3xl mb-2 text-slate-600"></i>
            <p class="text-xs">沒有符合目前篩選條件的停車場</p>
          </div>
        \`;
        return;
      }

      listEl.innerHTML = lots.map(lot => {
        const isSelected = lot.id === activeLotId;
        
        let statusBadge = '';
        if (lot.availableSpaces === null || lot.status === 'unknown') {
          statusBadge = \`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/60 text-slate-300">未連線剩餘位</span>\`;
        } else if (lot.status === 'available') {
          statusBadge = \`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">剩 \${lot.availableSpaces} 席</span>\`;
        } else if (lot.status === 'tight') {
          statusBadge = \`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">剩 \${lot.availableSpaces} 席</span>\`;
        } else if (lot.status === 'full') {
          statusBadge = \`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">已客滿</span>\`;
        } else {
          statusBadge = \`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/60 text-slate-300">依現場</span>\`;
        }

        const distanceBadge = lot.distanceMeters !== undefined 
          ? \`<span class="text-[11px] font-mono text-sky-400 font-bold"><i class="fa-solid fa-location-arrow text-[10px]"></i> \${lot.distanceMeters > 1000 ? (lot.distanceMeters/1000).toFixed(1) + 'km' : lot.distanceMeters + 'm'}</span>\` 
          : '';

        const typeBadge = \`<span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">\${lot.carParkTypeName || (lot.isIndoor ? '室內型' : '平面型')}</span>\`;

        const occPct = lot.occupancyRate !== null ? Math.min(100, Math.max(5, 100 - lot.occupancyRate)) : 50;

        return \`
          <div class="glass-card rounded-xl p-3.5 cursor-pointer transition-all duration-200 \${isSelected ? 'active-card' : ''}" onclick="selectLot('\${lot.id}')">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h4 class="font-bold text-sm text-white line-clamp-1 leading-snug">\${lot.name}</h4>
              <div class="shrink-0 flex items-center gap-1.5">
                \${statusBadge}
              </div>
            </div>
            
            <p class="text-[11px] text-slate-400 line-clamp-1 mb-2">\${lot.address || '無詳細地址'}</p>

            <!-- 車位進度條 -->
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-2.5">
              <div class="h-full rounded-full transition-all \${lot.status === 'available' ? 'bg-emerald-400' : lot.status === 'tight' ? 'bg-amber-400' : 'bg-rose-500'}" style="width: \${occPct}%;"></div>
            </div>

            <div class="flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-1.5 flex-wrap">
                \${lot.hasEVCharging ? \`
                  \${lot.evSpaces?.dedicated !== null && lot.evSpaces.dedicated > 0 ? \`
                    <span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                      <i class="fa-solid fa-bolt text-emerald-400 text-[9px]"></i>
                      <span>純電專屬 \${lot.evSpaces.dedicated}格</span>
                    </span>
                  \` : ''}
                  \${lot.evSpaces?.shared !== null && lot.evSpaces.shared > 0 ? \`
                    <span class="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/40 flex items-center gap-1 shadow-sm">
                      <i class="fa-solid fa-plug text-sky-400 text-[9px]"></i>
                      <span>混用充電 \${lot.evSpaces.shared}格</span>
                    </span>
                  \` : ''}
                  \${(lot.evSpaces?.dedicated === null && lot.evSpaces?.shared === null) ? \`
                    <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1 shadow-sm">
                      <i class="fa-solid fa-charging-station text-amber-400 text-[9px]"></i>
                      <span>附設充電樁</span>
                    </span>
                  \` : ''}
                \` : ''}
                \${lot.hasDisabilitySpace ? \`<span class="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-semibold">身障\${lot.spacesByType?.disability?.total ? ' ' + lot.spacesByType.disability.total + '格' : ''}</span>\` : ''}
                \${lot.hasParentChildSpace ? \`<span class="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-300 text-[10px] font-semibold">婦幼\${lot.spacesByType?.parentChild?.total ? ' ' + lot.spacesByType.parentChild.total + '格' : ''}</span>\` : ''}
                \${lot.isIndoor ? '<span class="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-semibold">室內</span>' : ''}
              </div>
              <div class="flex items-center gap-2">
                \${typeBadge}
                \${distanceBadge}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // ── 渲染地圖標記 ─────────────────────────────────────────────────────────
    function renderMapMarkers(lots) {
      if (!markersLayer) return;
      markersLayer.clearLayers();

      lots.forEach(lot => {
        let markerClass = 'marker-available';
        let badgeText = lot.availableSpaces > 999 ? '999+' : String(lot.availableSpaces);

        // 若啟用電動車篩選或該場站為專屬充電站
        if ((activeFilters.evOnly || activeFilters.evDedicatedOnly) && lot.hasEVCharging) {
          markerClass = 'marker-ev';
          const evCnt = lot.evSpaces?.total || 0;
          badgeText = evCnt > 0 ? \`⚡\${evCnt}\` : '⚡';
        } else if (lot.status === 'tight') {
          markerClass = 'marker-tight';
        } else if (lot.status === 'full') {
          markerClass = 'marker-full';
          badgeText = '滿';
        } else if (lot.status === 'unknown') {
          markerClass = 'marker-unknown';
          badgeText = lot.totalSpaces > 0 ? String(lot.totalSpaces) : 'P';
        }

        const evBadgeHtml = lot.hasEVCharging
          ? \`<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-slate-900 shadow-md">⚡</span>\`
          : '';

        const iconHtml = \`
          <div class="custom-marker \${markerClass} w-8 h-8 text-xs relative">
            \${badgeText}
            \${evBadgeHtml}
          </div>
        \`;

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18]
        });

        const marker = L.marker([lot.lat, lot.lon], { icon }).addTo(markersLayer);

        marker.on('click', () => {
          selectLot(lot.id);
        });
      });
    }

    // ── 選中停車場 ───────────────────────────────────────────────────────────
    function selectLot(lotId) {
      activeLotId = lotId;
      const lot = currentLots.find(l => l.id === lotId);
      if (!lot) return;

      // 飛到地圖該點
      if (map) {
        map.flyTo([lot.lat, lot.lon], 16, { duration: 0.8 });
      }

      // 更新列表 Active 樣式
      document.querySelectorAll('#lot-list .glass-card').forEach(el => {
        el.classList.remove('active-card');
      });

      // 打開詳細資訊 Modal
      openDetailModal(lot);
    }

    // ── 開啟詳細抽屜 ─────────────────────────────────────────────────────────
    function openDetailModal(lot) {
      currentModalLot = lot;

      // 重設即時抓取通知條
      const noticeBox = document.getElementById('modal-refresh-notice');
      if (noticeBox) noticeBox.classList.add('hidden');

      document.getElementById('modal-title').innerText = lot.name;
      document.getElementById('modal-city').innerText = lot.cityNameZh || lot.city;
      document.getElementById('modal-address-text').innerText = lot.address || '無詳細地址';

      // 狀態 Badge
      const statusBadge = document.getElementById('modal-status-badge');
      if (lot.status === 'available') {
        statusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        statusBadge.innerText = \`充足 (剩餘 \${lot.availableSpaces} 席)\`;
      } else if (lot.status === 'tight') {
        statusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
        statusBadge.innerText = \`緊張 (剩餘 \${lot.availableSpaces} 席)\`;
      } else if (lot.status === 'full') {
        statusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
        statusBadge.innerText = '已客滿';
      } else {
        statusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700/60 text-slate-300';
        statusBadge.innerText = '未提供即時車位';
      }

      document.getElementById('modal-indoor-badge').style.display = lot.isIndoor ? 'inline-block' : 'none';

      // 各車種車位 (遵照規格書，未知時如實呈現 '-')
      const sp = lot.spacesByType || {};
      const carTot = sp.general?.total ?? lot.totalSpaces;
      const carAvail = sp.general?.available ?? lot.availableSpaces;
      
      if (carAvail !== null && carAvail !== undefined) {
        document.getElementById('modal-space-car').innerText = carAvail;
      } else {
        document.getElementById('modal-space-car').innerText = '-';
      }

      if (carTot !== null && carTot !== undefined) {
        const carOcc = carAvail !== null ? Math.max(0, carTot - carAvail) : null;
        document.getElementById('modal-space-car-total').innerText = carOcc !== null 
          ? \`全部容量 \${carTot} 席 (在用 \${carOcc} 席)\` 
          : \`全部容量 \${carTot} 席\`;
      } else {
        document.getElementById('modal-space-car-total').innerText = '總容量未提供';
      }
      
      const motoAvail = sp.motorcycle?.available;
      const motoTot = sp.motorcycle?.total;
      document.getElementById('modal-space-moto').innerText = (motoAvail !== null && motoAvail !== undefined) ? motoAvail : '-';
      document.getElementById('modal-space-moto-total').innerText = (motoTot !== null && motoTot !== undefined) 
        ? \`全部容量 \${motoTot} 席\` 
        : (lot.isMotorcycleAvailable ? '設機車位 (格數未連線)' : '-');

      // ⚡ 電動車專屬格 (只給純電車停) 與 混用格 (一般車亦可停)
      const ev = lot.evSpaces || { total: null, dedicated: null, shared: null };
      const evDedEl = document.getElementById('modal-space-ev-dedicated');
      const evSharedEl = document.getElementById('modal-space-ev-shared');
      const evDetailSection = document.getElementById('modal-ev-details');

      if (evDedEl) {
        evDedEl.innerText = (ev.dedicated !== null && ev.dedicated !== undefined) ? \`\${ev.dedicated} 席\` : (lot.hasEVCharging ? '設有 (格數未連線)' : '-');
      }
      if (evSharedEl) {
        evSharedEl.innerText = (ev.shared !== null && ev.shared !== undefined) ? \`\${ev.shared} 席\` : (lot.hasEVCharging ? '設有 (格數未連線)' : '-');
      }

      if (evDetailSection) {
        if (lot.hasEVCharging || (ev.total !== null && ev.total > 0)) {
          evDetailSection.style.display = 'block';
          const totalText = (ev.total !== null && ev.total > 0) 
            ? \`⚡ 全部充電樁共 \${ev.total} 樁 (含在用+空餘)\` 
            : '⚡ 設有電動車充電設施 (格數未連線)';
          document.getElementById('modal-ev-total-badge').innerText = totalText;
          document.getElementById('modal-ev-dedicated-count').innerText = ev.dedicated !== null 
            ? \`\${ev.dedicated} 格 (純電專屬，違規可檢舉開罰)\` 
            : '- (未提供連線格數)';
          document.getElementById('modal-ev-shared-count').innerText = ev.shared !== null 
            ? \`\${ev.shared} 格 (油電共用充電格)\` 
            : '- (未提供連線格數)';
        } else {
          evDetailSection.style.display = 'none';
        }
      }

      // 身心障礙 (未明示格數則顯示 '-')
      const disTotal = sp.disability?.total;
      const disAvail = sp.disability?.available;
      document.getElementById('modal-space-dis').innerText = (disAvail !== null && disAvail !== undefined) ? disAvail : ((disTotal !== null && disTotal !== undefined) ? disTotal : '-');
      document.getElementById('modal-space-dis-total').innerText = (disTotal !== null && disTotal !== undefined) 
        ? \`總計 \${disTotal} 席\` 
        : (lot.hasDisabilitySpace ? '設身心障礙格 (格數未連線)' : '-');

      // 婦幼親子 (未明示格數則顯示 '-')
      const pcTotal = sp.parentChild?.total;
      const pcAvail = sp.parentChild?.available;
      document.getElementById('modal-space-pc').innerText = (pcAvail !== null && pcAvail !== undefined) ? pcAvail : ((pcTotal !== null && pcTotal !== undefined) ? pcTotal : '-');
      document.getElementById('modal-space-pc-total').innerText = (pcTotal !== null && pcTotal !== undefined) 
        ? \`總計 \${pcTotal} 席\` 
        : (lot.hasParentChildSpace ? '設孕婦親子格 (格數未連線)' : '-');

      // 官方公告費率文字原汁原味呈現
      document.getElementById('modal-fare-desc').innerText = lot.fareDescription || '依現場公告收費';

      // 場內設施標籤
      const facEl = document.getElementById('modal-facilities');
      if (lot.facilities && lot.facilities.length > 0) {
        facEl.innerHTML = lot.facilities.map(f => \`
          <span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60 flex items-center gap-1.5">
            <i class="fa-solid fa-check text-emerald-400 text-[10px]"></i> \${f}
          </span>
        \`).join('');
      } else {
        facEl.innerHTML = '<span class="text-slate-500 text-[11px]">未註記特殊設施</span>';
      }

      // 導航連結
      const googleNav = \`https://www.google.com/maps/dir/?api=1&destination=\${lot.lat},\${lot.lon}\`;
      const appleNav = \`https://maps.apple.com/?daddr=\${lot.lat},\${lot.lon}&dirflg=d\`;
      document.getElementById('btn-nav-google').href = googleNav;
      document.getElementById('btn-nav-apple').href = appleNav;

      document.getElementById('detail-modal').classList.remove('hidden');
    }

    // ── 自動更新定時器 ───────────────────────────────────────────────────────
    function resetRefreshTimer() {
      clearInterval(refreshTimer);
      refreshSecondsLeft = 60;
      updateTimerDisplay();

      refreshTimer = setInterval(() => {
        refreshSecondsLeft--;
        updateTimerDisplay();
        if (refreshSecondsLeft <= 0) {
          loadParkingLots();
        }
      }, 1000);
    }

    function updateTimerDisplay() {
      const el = document.getElementById('update-timer-text');
      if (el) el.innerText = \`\${refreshSecondsLeft}s 更新\`;
    }

    // ── 事件綁定 ─────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      initMap();
      loadParkingLots();

      // 縣市切換
      document.getElementById('city-select').addEventListener('change', () => {
        userLocation = null;
        loadParkingLots();
        
        // 切換視角至該縣市中心
        const cityMeta = {
          Taipei: [25.0375, 121.5637, 14],
          NewTaipei: [25.0124, 121.4657, 13],
          Taichung: [24.1477, 120.6736, 13],
          Kaohsiung: [22.6273, 120.3014, 13],
          Tainan: [22.9997, 120.2270, 14],
          Taoyuan: [24.9936, 121.3010, 13],
          Hsinchu: [24.8039, 120.9647, 14],
          Keelung: [25.1276, 121.7392, 14],
          YilanCounty: [24.7570, 121.7533, 13],
        }[document.getElementById('city-select').value];

        if (cityMeta && map) {
          map.setView([cityMeta[0], cityMeta[1]], cityMeta[2]);
        }
      });

      // GPS 周邊定位
      document.getElementById('btn-gps').addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('您的瀏覽器不支援地理定位');
          return;
        }

        const btn = document.getElementById('btn-gps');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sky-400"></i> 定位中...';

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            btn.innerHTML = '<i class="fa-solid fa-location-crosshairs text-sky-400"></i> <span class="hidden sm:inline">GPS 周邊</span>';
            userLocation = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            };

            // 在地圖上加上使用者雷達圖示
            const userIcon = L.divIcon({
              html: '<div class="user-ripple"></div>',
              className: '',
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            L.marker([userLocation.lat, userLocation.lon], { icon: userIcon }).addTo(map);
            map.flyTo([userLocation.lat, userLocation.lon], 15);

            loadParkingLots();
          },
          (err) => {
            btn.innerHTML = '<i class="fa-solid fa-location-crosshairs text-sky-400"></i> <span class="hidden sm:inline">GPS 周邊</span>';
            alert('無法取得您的位置：' + err.message);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      // 手動重新整理
      document.getElementById('btn-refresh').addEventListener('click', () => {
        loadParkingLots();
      });

      // 重設視角按鈕
      document.getElementById('btn-recenter').addEventListener('click', () => {
        if (userLocation && map) {
          map.flyTo([userLocation.lat, userLocation.lon], 15);
        } else if (currentLots.length > 0 && map) {
          map.flyTo([currentLots[0].lat, currentLots[0].lon], 14);
        }
      });

      // 搜尋關鍵字輸入
      let searchTimeout = null;
      document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          activeFilters.searchQuery = e.target.value.trim();
          applyFiltersAndRender();
        }, 300);
      });

      // 篩選標籤點擊
      document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const filterKey = btn.dataset.filter;
          activeFilters[filterKey] = !activeFilters[filterKey];

          if (activeFilters[filterKey]) {
            btn.classList.add('bg-sky-500/20', 'border-sky-500', 'text-sky-300');
            btn.classList.remove('bg-slate-900/90', 'border-slate-700/80', 'text-slate-300');
          } else {
            btn.classList.remove('bg-sky-500/20', 'border-sky-500', 'text-sky-300');
            btn.classList.add('bg-slate-900/90', 'border-slate-700/80', 'text-slate-300');
          }

          applyFiltersAndRender();
        });
      });

      // 底圖切換事件
      document.getElementById('layer-btn-emap')?.addEventListener('click', () => switchMapLayer('emap'));
      document.getElementById('layer-btn-dark')?.addEventListener('click', () => switchMapLayer('dark'));
      document.getElementById('layer-btn-photo')?.addEventListener('click', () => switchMapLayer('photo'));

      // Modal 關閉
      document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.add('hidden');
      });
      document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target.id === 'detail-modal') {
          document.getElementById('detail-modal').classList.add('hidden');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.getElementById('detail-modal').classList.add('hidden');
        }
      });

      // 停車場卡片即時單場向 TDX 重新抓取按鈕
      const refreshLotBtn = document.getElementById('btn-modal-refresh-lot');
      const refreshIcon = document.getElementById('modal-refresh-lot-icon');
      const noticeBox = document.getElementById('modal-refresh-notice');
      const noticeText = document.getElementById('modal-refresh-notice-text');

      document.getElementById('modal-refresh-notice-close')?.addEventListener('click', () => {
        noticeBox.classList.add('hidden');
      });

      refreshLotBtn?.addEventListener('click', async () => {
        if (!currentModalLot || !currentModalLot.id) return;

        // 載入旋轉動畫
        refreshIcon.classList.add('fa-spin');
        refreshLotBtn.disabled = true;
        refreshLotBtn.classList.add('opacity-70', 'cursor-not-allowed');

        noticeBox.className = 'px-5 py-2.5 text-xs border-b border-sky-500/30 bg-sky-950/60 text-sky-200 flex items-center justify-between animate-in fade-in duration-150';
        noticeText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sky-400"></i> 正在向 TDX 交通部直接單獨查詢此場站最新在席與資料...';
        noticeBox.classList.remove('hidden');

        try {
          const res = await fetch(\`/api/parking/city/\${encodeURIComponent(currentModalLot.city)}/lot/\${encodeURIComponent(currentModalLot.id)}\`);
          if (!res.ok) {
            throw new Error(\`TDX API 回應錯誤 (\${res.status})\`);
          }
          const freshLot = await res.json();
          if (freshLot.error) {
            throw new Error(freshLot.error);
          }

          // 更新記憶體中 currentLots 資料
          const idx = currentLots.findIndex(l => l.id === freshLot.id);
          if (idx !== -1) {
            currentLots[idx] = freshLot;
          }
          currentModalLot = freshLot;

          // 重新整理卡片顯示
          openDetailModal(freshLot);

          // 提示 TDX 官方查詢結果
          if (freshLot.availableSpaces !== null && freshLot.availableSpaces !== undefined) {
            const timeStr = freshLot.updateTime ? new Date(freshLot.updateTime).toLocaleTimeString('zh-TW', { hour12: false }) : '剛剛';
            noticeBox.className = 'px-5 py-2.5 text-xs border-b border-emerald-500/30 bg-emerald-950/60 text-emerald-200 flex items-center justify-between animate-in fade-in duration-150';
            noticeText.innerHTML = \`<i class="fa-solid fa-circle-check text-emerald-400"></i> <span><b>TDX 連線抓取成功！</b> 最新剩餘車位：<span class="font-bold text-white text-sm font-mono">\${freshLot.availableSpaces}</span> 席 (更新於 \${timeStr})</span>\`;
          } else {
            noticeBox.className = 'px-5 py-2.5 text-xs border-b border-amber-500/30 bg-amber-950/60 text-amber-200 flex items-center justify-between animate-in fade-in duration-150';
            noticeText.innerHTML = \`<i class="fa-solid fa-circle-info text-amber-400"></i> <span><b>TDX 官方已連線回傳！</b> 該場站未提報即時在席感應數據（狀態：未提供即時車位，多為月租/季租型場站）</span>\`;
          }
          noticeBox.classList.remove('hidden');
        } catch (err) {
          noticeBox.className = 'px-5 py-2.5 text-xs border-b border-rose-500/30 bg-rose-950/60 text-rose-200 flex items-center justify-between animate-in fade-in duration-150';
          noticeText.innerHTML = \`<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> <span><b>TDX 抓取失敗：</b> \${err.message}</span>\`;
          noticeBox.classList.remove('hidden');
        } finally {
          refreshIcon.classList.remove('fa-spin');
          refreshLotBtn.disabled = false;
          refreshLotBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      });
    });
  </script>
</body>
</html>`;
}
