export function renderParkingDashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-TW" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>全台智慧停車數據戰情室 | Taiwan Parking Analytics Dashboard</title>
  <meta name="description" content="全台各縣市停車場巨量數據即時統計、各車種格位容量、純電專屬與混用充電樁分析、各縣市滿位率排行與費率統計戰情室。">
  
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Chart.js 4.4 -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

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
    
    /* 捲軸自訂 */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(13, 20, 36, 0.5); }
    ::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.5); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.8); }

    /* 表格排序 Hover */
    th.sortable {
      cursor: pointer;
      user-select: none;
    }
    th.sortable:hover {
      color: #38bdf8;
    }
  </style>
</head>
<body class="bg-[#070b14] text-slate-100 min-h-screen selection:bg-sky-500 selection:text-white flex flex-col">

  <!-- 背景氛圍光暈 -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div class="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px]"></div>
    <div class="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-[160px]"></div>
    <div class="absolute -bottom-40 left-1/3 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[150px]"></div>
  </div>

  <!-- 頂部導航列 (Top Navigation) -->
  <header class="glass-panel border-b border-slate-800/80 px-4 py-3 sticky top-0 z-40 shrink-0">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
      
      <!-- 標誌與功能切換分頁 -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <i class="fa-solid fa-chart-pie text-slate-950 text-xl font-black"></i>
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              全台停車數據戰情室
              <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold border border-emerald-500/30">Analytics</span>
            </h1>
            <div class="flex items-center gap-2 mt-0.5">
              <span id="sync-status-badge" class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span id="sync-status-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span id="sync-status-text">TDX 統計數據已完全載入</span>
              </span>
              <span class="text-slate-600">|</span>
              <span id="update-timer-text" class="font-mono text-[11px] text-slate-400">60s 自動更新</span>
            </div>
          </div>
        </div>

        <!-- 視圖切換 Pill Tabs -->
        <div class="hidden md:flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          <a href="/" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-map-location-dot text-sky-400"></i> 即時雷達地圖
          </a>
          <a href="/dashboard" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm flex items-center gap-1.5">
            <i class="fa-solid fa-chart-simple text-emerald-400"></i> 統計戰情室
          </a>
        </div>
      </div>

      <!-- 統計範圍選擇與操作按鈕 -->
      <div class="flex items-center gap-2.5 flex-wrap">
        
        <!-- 統計範圍切換下拉 -->
        <div class="relative">
          <select id="scope-select" class="appearance-none bg-slate-900/90 text-sm font-semibold text-slate-200 border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer shadow-sm">
            <option value="ALL">🌐 全台灣綜合統計</option>
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

        <!-- 手動重新載入 -->
        <button id="btn-refresh" title="重新計算統計" class="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all active:scale-95 shadow-sm">
          <i class="fa-solid fa-arrows-rotate text-sm" id="refresh-icon"></i>
        </button>

        <!-- 切換到地圖雷達 (手機版顯示) -->
        <a href="/" class="md:hidden px-3 py-2 rounded-xl bg-slate-900/90 text-xs font-semibold text-sky-400 border border-slate-700/80 flex items-center gap-1.5">
          <i class="fa-solid fa-map"></i> 地圖雷達
        </a>
      </div>

    </div>
  </header>

  <!-- 主內容區 (Dashboard Container) -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- 載入中骨架畫面 -->
    <div id="loading-state" class="py-24 text-center text-slate-500 flex flex-col items-center gap-3">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-sky-400"></i>
      <p class="text-sm font-medium">正在自交通部 TDX 聚合全台各縣市停車巨量數據與格位分佈...</p>
    </div>

    <!-- 儀表板資料區塊 -->
    <div id="dashboard-content" class="space-y-6 hidden">
      
      <!-- ── ROW 1: 5 大核心指標 KPI 卡片 ──────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        <!-- KPI 1: 總監控場站數 -->
        <div class="glass-card p-4 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span class="font-medium">監控停車場站</span>
            <div class="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
              <i class="fa-solid fa-square-parking text-xs"></i>
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight" id="kpi-total-lots">-</div>
          <div class="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span class="text-emerald-400 font-bold" id="kpi-live-rate">100%</span>
            <span>即時聯網監控中</span>
          </div>
        </div>

        <!-- KPI 2: 全部總車位數 (全部容量：含正在使用 + 剩餘空席) -->
        <div class="glass-card p-4 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span class="font-bold text-slate-200">全部總車位 (全部容量)</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <i class="fa-solid fa-car-side text-xs"></i>
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <div class="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight" id="kpi-total-spaces">-</div>
            <span class="text-xs text-slate-400 font-mono">全部席位</span>
          </div>
          <div class="mt-2 text-[10px] flex items-center gap-2 flex-wrap">
            <span class="text-emerald-300 font-semibold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 空餘: <span id="kpi-avail-spaces" class="font-bold font-mono">-</span>
            </span>
            <span class="text-slate-600">|</span>
            <span class="text-slate-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> 在用: <span id="kpi-occupied-spaces" class="font-bold font-mono">-</span>
            </span>
          </div>
          <!-- 空餘佔比進度條 -->
          <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div id="kpi-avail-bar" class="h-full bg-emerald-400 rounded-full transition-all" style="width: 50%;"></div>
          </div>
        </div>

        <!-- KPI 3: 整體滿位率 -->
        <div class="glass-card p-4 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span class="font-medium">整體滿位負載率</span>
            <div class="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <i class="fa-solid fa-gauge-high text-xs"></i>
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <div class="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight" id="kpi-occupancy-rate">-%</div>
            <span id="kpi-occupancy-badge" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">適中</span>
          </div>
          <p class="mt-2 text-[11px] text-slate-400 truncate" id="kpi-occupancy-desc">即時空席狀態平穩</p>
        </div>

        <!-- KPI 4: ⚡ 全部充電樁總數 (含正在充電使用中 + 空餘充電樁) -->
        <div class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-950/15 relative overflow-hidden group">
          <div class="flex items-center justify-between text-xs text-amber-300 mb-2 font-bold">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-bolt text-amber-400"></i> 全部充電樁總數</span>
            <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono" id="kpi-ev-coverage">覆蓋率 -%</span>
          </div>
          <div class="flex items-baseline gap-2">
            <div class="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight" id="kpi-ev-total">-</div>
            <span class="text-xs text-amber-300/70 font-mono">全部樁位</span>
          </div>
          <div class="mt-2 text-[10px] flex items-center gap-2 flex-wrap">
            <span class="text-emerald-300 font-bold flex items-center gap-1">
              <i class="fa-solid fa-shield-halved text-[9px]"></i> 專屬 <span id="kpi-ev-dedicated">-</span> 格
            </span>
            <span class="text-slate-600">|</span>
            <span class="text-sky-300 font-bold flex items-center gap-1">
              <i class="fa-solid fa-plug text-[9px]"></i> 混用 <span id="kpi-ev-shared">-</span> 格
            </span>
          </div>
        </div>

        <!-- KPI 5: ♿ 身障 / 👶 婦幼特殊專用席 -->
        <div class="glass-card p-4 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span class="font-medium">法定特殊專用格</span>
            <div class="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20">
              <i class="fa-solid fa-heart text-xs"></i>
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black font-mono text-purple-300 tracking-tight" id="kpi-special-total">-</div>
          <div class="mt-2 text-[10px] flex items-center gap-2 flex-wrap">
            <span class="text-blue-300 font-semibold flex items-center gap-1">
              <i class="fa-solid fa-wheelchair text-[9px]"></i> 身障 <span id="kpi-disability-total">-</span> 席
            </span>
            <span class="text-slate-600">|</span>
            <span class="text-pink-300 font-semibold flex items-center gap-1">
              <i class="fa-solid fa-baby text-[9px]"></i> 親子 <span id="kpi-pc-total">-</span> 席
            </span>
          </div>
        </div>

      </div>

      <!-- ── ROW 2: 雙核心互動圖表 (車種佔比 + 縣市容量與空位) ─────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- 圖表 A: 各車種車位分佈甜甜圈圖 (5 cols) -->
        <div class="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-sky-400"></i> 各車種格位分佈比例
              </h3>
              <span class="text-[11px] text-slate-400 font-mono" id="chart-pie-subtitle">席位架構</span>
            </div>
            <p class="text-xs text-slate-400 mb-4 leading-relaxed">包含小型車、機車、純電專屬、混用充電、身障及親子專用車位規模。</p>
          </div>

          <div class="relative h-64 sm:h-72 flex items-center justify-center">
            <canvas id="chart-space-types"></canvas>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span class="text-[10px] text-slate-400 block">🚗 小型車</span>
              <span class="font-mono font-bold text-emerald-400 text-xs" id="pie-stat-car">-</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span class="text-[10px] text-slate-400 block">🛵 機車</span>
              <span class="font-mono font-bold text-sky-400 text-xs" id="pie-stat-moto">-</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900/60 border border-amber-500/30 bg-amber-950/20">
              <span class="text-[10px] text-amber-300 font-bold block">⚡ 純電/混用</span>
              <span class="font-mono font-bold text-amber-400 text-xs" id="pie-stat-ev">-</span>
            </div>
          </div>
        </div>

        <!-- 圖表 B: 各縣市總容量 vs 即時空位堆疊對比圖 (7 cols) -->
        <div class="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-chart-column text-emerald-400"></i> 各縣市車位總容量 vs 即時剩餘空位
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">即時負載</span>
            </div>
            <p class="text-xs text-slate-400 mb-4 leading-relaxed">綠色表示目前尚有空位，深色部分為目前已停車佔用席數。</p>
          </div>

          <div class="relative h-64 sm:h-72">
            <canvas id="chart-city-capacity"></canvas>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-1">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-400 inline-block"></span> 剩餘即時空位</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-slate-700 inline-block"></span> 目前已佔用車位</span>
            <span class="text-[11px] text-slate-500">單位: 席</span>
          </div>
        </div>

      </div>

      <!-- ── ROW 3: 電動車充電深層統計 + 費率/設施分佈 ─────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- 圖表 C: 各縣市電動車位配置比較 (純電專屬 vs 混用充電) (7 cols) -->
        <div class="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-amber-300 flex items-center gap-2">
                <i class="fa-solid fa-charging-station text-amber-400"></i> 各縣市電動車位配置比較（純電專屬 vs 混用充電）
              </h3>
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">停車場法第27-1條</span>
            </div>
            <p class="text-xs text-slate-400 mb-4 leading-relaxed">
              橫向比較各縣市依法專供純電車之「專屬車位」與開放油電車共用之「混用充電樁」席數。
            </p>
          </div>

          <div class="relative h-64 sm:h-72">
            <canvas id="chart-ev-comparison"></canvas>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-1">
            <span class="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> ⚡ 純電專屬車位 (燃油車不可占用)
            </span>
            <span class="flex items-center gap-1.5 text-sky-300 font-semibold">
              <span class="w-3 h-3 rounded bg-sky-400 inline-block"></span> 🔌 混用充電車位 (一般車亦可停)
            </span>
          </div>
        </div>

        <!-- 圖表 D: 場站建築型態與設施分佈 (5 cols) -->
        <div class="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-building-circle-check text-emerald-400"></i> 場站建築型態與智慧聯網設施
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">規格書標準欄位</span>
            </div>
            <p class="text-xs text-slate-400 mb-4 leading-relaxed">依據交通部《停車資料標準v1.1》CarParkType 官方編碼與已連線智慧配備統計。</p>
          </div>

          <div class="relative h-64 sm:h-72">
            <canvas id="chart-rates-facilities"></canvas>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs">
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span class="text-[10px] text-slate-400 block">露天平面型 (CarParkType 1)</span>
              <span class="font-mono font-bold text-emerald-400 text-xs" id="stat-flat-count">- 處場站</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span class="text-[10px] text-slate-400 block">立體建築/地下型 (Type 2/3)</span>
              <span class="font-mono font-bold text-purple-300 text-xs" id="stat-indoor-count">- 處場站</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ── ROW 4: 全台各縣市停車巨量數據排行表 ───────────────────────────── -->
      <div class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div class="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-table-list text-sky-400"></i> 各縣市停車格位與電動車配置數據總覽
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">點擊各欄位表頭可進行即時排序，支援一鍵跳轉至地圖即時雷達。</p>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
              <i class="fa-solid fa-database text-sky-400"></i> <span id="table-total-count">9 個行政區</span>
            </span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-900/90 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-bold">
              <tr>
                <th class="px-4 py-3.5 sortable" onclick="sortTable('name')">縣市行政區 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right" onclick="sortTable('totalLots')">場站數 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-emerald-300 font-bold" onclick="sortTable('totalSpaces')">全部總車位 (全部) <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-slate-400" onclick="sortTable('occupiedSpaces')">使用中位 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-emerald-400 font-bold" onclick="sortTable('availableSpaces')">即時剩餘 (空餘) <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable" onclick="sortTable('occupancyRate')">滿位負載率 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-amber-300 font-bold" onclick="sortTable('evTotal')">⚡ 全部充電樁 (全部) <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-emerald-300" onclick="sortTable('evDedicated')">純電專屬 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-sky-300" onclick="sortTable('evShared')">混用充電 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-blue-300" onclick="sortTable('disability')">♿ 身障席 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 sortable text-right text-pink-300" onclick="sortTable('parentChild')">👶 親子席 <i class="fa-solid fa-sort text-[10px] ml-1"></i></th>
                <th class="px-4 py-3.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody id="city-table-body" class="divide-y divide-slate-800/60 font-medium">
              <!-- 動態渲染各縣市資料列 -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── ROW 5: 精選排行榜 (空位充裕榜 vs 充電最多榜 vs 滿載警示榜) ────────── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <!-- 榜 1: 即時空位最充裕 Top 5 -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-400"></i> 即時空位最充裕場站
              </h4>
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">最好停</span>
            </div>
            <p class="text-xs text-slate-400 mb-3">當前可停車位最多、無需排隊的場站。</p>
          </div>
          <div id="list-top-available" class="space-y-2">
            <!-- 動態插入 -->
          </div>
        </div>

        <!-- 榜 2: 充電設施最多 Top 5 (電車主首選) -->
        <div class="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-bold text-amber-300 flex items-center gap-2">
                <i class="fa-solid fa-charging-station text-amber-400"></i> 充電樁最充足場站
              </h4>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">純電首選</span>
            </div>
            <p class="text-xs text-slate-400 mb-3">設有最多純電專屬與混用充電格位。</p>
          </div>
          <div id="list-top-ev" class="space-y-2">
            <!-- 動態插入 -->
          </div>
        </div>

        <!-- 榜 3: 高負載警戒場站 Top 5 -->
        <div class="glass-panel p-5 rounded-2xl border border-rose-500/20 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-bold text-rose-300 flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation text-rose-400"></i> 高滿載率警示場站
              </h4>
              <span class="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">易客滿</span>
            </div>
            <p class="text-xs text-slate-400 mb-3">目前滿位率超過 85% 之尖峰場站。</p>
          </div>
          <div id="list-top-occupied" class="space-y-2">
            <!-- 動態插入 -->
          </div>
        </div>

      </div>

    </div>

  </main>

  <!-- 頁尾宣告 -->
  <footer class="glass-panel border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 mt-8 shrink-0">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
      <p>台灣停車即時雷達 & 數據戰情室 &copy; 2026. 資料來源：交通部 TDX 運輸資料流通服務平臺。</p>
      <div class="flex items-center gap-4 text-slate-400">
        <a href="/" class="hover:text-sky-400 transition-colors">即時地圖</a>
        <a href="/dashboard" class="hover:text-sky-400 transition-colors">數據戰情</a>
        <a href="/health" target="_blank" class="hover:text-sky-400 transition-colors">API 狀態</a>
      </div>
    </div>
  </footer>

  <!-- 前端 JavaScript 邏輯與圖表控制 -->
  <script>
    // ── 全域狀態 ─────────────────────────────────────────────────────────────
    let nationwideData = null;
    let currentCityData = null;
    let currentScope = 'ALL';
    let sortColumn = 'totalSpaces';
    let sortAsc = false;
    let refreshSecondsLeft = 60;
    let refreshTimer = null;

    // Chart.js 實例引用
    let chartSpaceTypes = null;
    let chartCityCapacity = null;
    let chartEvComparison = null;
    let chartRatesFacilities = null;

    // ── 頁面載入完成初始化 ───────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      initEventListeners();
      loadDashboardData();
    });

    function initEventListeners() {
      // 範圍選單切換
      const scopeSelect = document.getElementById('scope-select');
      if (scopeSelect) {
        scopeSelect.addEventListener('change', (e) => {
          currentScope = e.target.value;
          loadDashboardData();
        });
      }

      // 手動重新整理按鈕
      const btnRefresh = document.getElementById('btn-refresh');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          loadDashboardData();
        });
      }
    }

    // ── 抓取戰情室數據 ───────────────────────────────────────────────────────
    async function loadDashboardData() {
      const loadingEl = document.getElementById('loading-state');
      const contentEl = document.getElementById('dashboard-content');
      const iconEl = document.getElementById('refresh-icon');

      if (iconEl) iconEl.classList.add('fa-spin');
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');

      const syncBadge = document.getElementById('sync-status-badge');
      const syncDot = document.getElementById('sync-status-dot');
      const syncText = document.getElementById('sync-status-text');
      if (syncBadge && syncDot && syncText) {
        syncBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40';
        syncDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
        syncText.innerText = '正在向 TDX 聚合最新統計數據...';
      }

      try {
        if (currentScope === 'ALL') {
          // 抓取全台綜合數據
          const res = await fetch('/api/stats/overview');
          if (!res.ok) throw new Error('Failed to fetch overview stats');
          nationwideData = await res.json();
          renderNationwideDashboard(nationwideData);
        } else {
          // 抓取單一縣市深度數據
          const res = await fetch(\`/api/stats/city/\${currentScope}\`);
          if (!res.ok) throw new Error('Failed to fetch city stats');
          currentCityData = await res.json();
          renderSingleCityDashboard(currentCityData);
        }

        if (syncBadge && syncDot && syncText) {
          syncBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          syncDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
          const lotCount = currentScope === 'ALL' 
            ? (nationwideData?.totalLots ? nationwideData.totalLots.toLocaleString() + ' 處' : '全台')
            : (currentCityData?.totalLots ? currentCityData.totalLots.toLocaleString() + ' 處' : '');
          syncText.innerText = \`統計已完全載入 (共 \${lotCount})\`;
        }

        if (loadingEl) loadingEl.classList.add('hidden');
        if (contentEl) contentEl.classList.remove('hidden');

        resetRefreshTimer();

      } catch (err) {
        console.error('載入戰情室數據失敗:', err);
        if (syncBadge && syncDot && syncText) {
          syncBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40';
          syncDot.className = 'w-2 h-2 rounded-full bg-rose-400';
          syncText.innerText = '載入統計失敗';
        }
        if (loadingEl) {
          loadingEl.innerHTML = \`
            <div class="text-rose-400 flex flex-col items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-3xl"></i>
              <p class="text-sm font-semibold">無法載入統計數據，請確認 TDX 服務狀態或稍後再試。</p>
            </div>
          \`;
        }
      } finally {
        if (iconEl) iconEl.classList.remove('fa-spin');
      }
    }

    // ── 自動更新倒數計時 ─────────────────────────────────────────────────────
    function resetRefreshTimer() {
      clearInterval(refreshTimer);
      refreshSecondsLeft = 60;
      const textEl = document.getElementById('update-timer-text');
      if (textEl) textEl.innerText = \`\${refreshSecondsLeft}s 自動更新\`;

      refreshTimer = setInterval(() => {
        refreshSecondsLeft--;
        if (textEl) textEl.innerText = \`\${refreshSecondsLeft}s 自動更新\`;
        if (refreshSecondsLeft <= 0) {
          clearInterval(refreshTimer);
          loadDashboardData();
        }
      }, 1000);
    }

    // ── 渲染全台灣綜合戰情 ───────────────────────────────────────────────────
    function renderNationwideDashboard(data) {
      const ov = data.overview;
      const cities = data.citySummaries;

      // 1. 更新頂部 KPI
      document.getElementById('kpi-total-lots').innerText = ov.totalLots.toLocaleString();
      document.getElementById('kpi-live-rate').innerText = '100%';

      document.getElementById('kpi-total-spaces').innerText = ov.totalSpaces.toLocaleString();
      document.getElementById('kpi-avail-spaces').innerText = ov.availableSpaces.toLocaleString();
      const occupied = Math.max(0, ov.totalSpaces - ov.availableSpaces);
      const occupiedEl = document.getElementById('kpi-occupied-spaces');
      if (occupiedEl) occupiedEl.innerText = occupied.toLocaleString();
      const availPct = ov.totalSpaces > 0 ? (ov.availableSpaces / ov.totalSpaces) * 100 : 0;
      document.getElementById('kpi-avail-bar').style.width = \`\${Math.max(5, Math.min(100, availPct))}%\`;

      const occRate = ov.overallOccupancyRate;
      const occEl = document.getElementById('kpi-occupancy-rate');
      const badgeEl = document.getElementById('kpi-occupancy-badge');
      const descEl = document.getElementById('kpi-occupancy-desc');
      occEl.innerText = \`\${occRate}%\`;

      if (occRate > 80) {
        occEl.className = 'text-2xl sm:text-3xl font-black font-mono text-rose-400 tracking-tight';
        badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
        badgeEl.innerText = '高度擁擠';
        descEl.innerText = '全台車位需求緊繃';
      } else if (occRate > 60) {
        occEl.className = 'text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight';
        badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
        badgeEl.innerText = '負載適中';
        descEl.innerText = '車流穩定、尚有餘裕';
      } else {
        occEl.className = 'text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight';
        badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        badgeEl.innerText = '車位充裕';
        descEl.innerText = '多數縣市有充裕空位';
      }

      // EV KPI
      document.getElementById('kpi-ev-total').innerText = ov.totalEVSpaces.toLocaleString();
      document.getElementById('kpi-ev-coverage').innerText = \`場站覆蓋率 \${ov.evCoverageRate}%\`;
      document.getElementById('kpi-ev-dedicated').innerText = ov.totalEVDedicated.toLocaleString();
      document.getElementById('kpi-ev-shared').innerText = ov.totalEVShared.toLocaleString();

      // 特殊車位 KPI
      const specialTotal = ov.totalDisabilitySpaces + ov.totalParentChildSpaces;
      document.getElementById('kpi-special-total').innerText = specialTotal.toLocaleString();
      document.getElementById('kpi-disability-total').innerText = ov.totalDisabilitySpaces.toLocaleString();
      document.getElementById('kpi-pc-total').innerText = ov.totalParentChildSpaces.toLocaleString();

      // 2. 渲染各車種比例甜甜圈圖
      renderSpaceTypesChart({
        general: ov.totalSpaces - (ov.totalEVSpaces + ov.totalDisabilitySpaces + ov.totalParentChildSpaces),
        motorcycle: ov.totalMotorcycleSpaces,
        evDedicated: ov.totalEVDedicated,
        evShared: ov.totalEVShared,
        disability: ov.totalDisabilitySpaces,
        parentChild: ov.totalParentChildSpaces,
      });

      // 3. 渲染各縣市容量與即時空位對比圖
      renderCityCapacityChart(cities);

      // 4. 渲染各縣市電動車位 (專屬 vs 混用) 對比圖
      renderEVComparisonChart(cities);

      // 5. 費率結構與設施圖表
      renderRatesFacilitiesChart(cities);

      // 6. 渲染表格
      renderCityTable(cities);

      // 7. 渲染精選排行榜
      renderLeaderboards(cities);
    }

    // ── 渲染單一縣市深度數據 ─────────────────────────────────────────────────
    function renderSingleCityDashboard(cityStats) {
      document.getElementById('kpi-total-lots').innerText = cityStats.totalLots.toLocaleString();
      document.getElementById('kpi-live-rate').innerText = '100%';

      document.getElementById('kpi-total-spaces').innerText = (cityStats.totalSpaces !== null && cityStats.totalSpaces !== undefined) ? cityStats.totalSpaces.toLocaleString() : '-';
      document.getElementById('kpi-avail-spaces').innerText = (cityStats.availableSpaces !== null && cityStats.availableSpaces !== undefined) ? cityStats.availableSpaces.toLocaleString() : '-';
      const occupied = (cityStats.totalSpaces !== null && cityStats.availableSpaces !== null && cityStats.totalSpaces >= cityStats.availableSpaces)
        ? Math.max(0, cityStats.totalSpaces - cityStats.availableSpaces)
        : null;
      const occupiedEl = document.getElementById('kpi-occupied-spaces');
      if (occupiedEl) occupiedEl.innerText = occupied !== null ? occupied.toLocaleString() : '-';
      const availPct = (cityStats.totalSpaces && cityStats.availableSpaces !== null) ? (cityStats.availableSpaces / cityStats.totalSpaces) * 100 : 0;
      document.getElementById('kpi-avail-bar').style.width = \`\${Math.max(0, Math.min(100, availPct))}%\`;

      const occRate = cityStats.occupancyRate;
      const occEl = document.getElementById('kpi-occupancy-rate');
      const badgeEl = document.getElementById('kpi-occupancy-badge');
      const descEl = document.getElementById('kpi-occupancy-desc');

      if (occRate !== null && occRate !== undefined) {
        occEl.innerText = \`\${occRate}%\`;
        if (occRate > 80) {
          occEl.className = 'text-2xl sm:text-3xl font-black font-mono text-rose-400 tracking-tight';
          badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
          badgeEl.innerText = '高度擁擠';
          descEl.innerText = \`\${cityStats.cityNameZh} 車位緊繃\`;
        } else if (occRate > 60) {
          occEl.className = 'text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight';
          badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
          badgeEl.innerText = '負載適中';
          descEl.innerText = \`\${cityStats.cityNameZh} 車流平順\`;
        } else {
          occEl.className = 'text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight';
          badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          badgeEl.innerText = '車位充裕';
          descEl.innerText = \`\${cityStats.cityNameZh} 尚有充足空位\`;
        }
      } else {
        occEl.innerText = '-';
        badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700';
        badgeEl.innerText = '未回傳總格數';
        descEl.innerText = \`\${cityStats.cityNameZh} 官方僅回傳即時空位\`;
      }

      // EV KPI
      const ev = cityStats.spacesByType.ev;
      document.getElementById('kpi-ev-total').innerText = ev.total.toLocaleString();
      document.getElementById('kpi-ev-coverage').innerText = \`場站覆蓋率 \${cityStats.evCoverageRate}%\`;
      document.getElementById('kpi-ev-dedicated').innerText = ev.dedicated.toLocaleString();
      document.getElementById('kpi-ev-shared').innerText = ev.shared.toLocaleString();

      // 特殊車位 KPI
      const dis = cityStats.spacesByType.disability;
      const pc = cityStats.spacesByType.parentChild;
      document.getElementById('kpi-special-total').innerText = (dis.total + pc.total).toLocaleString();
      document.getElementById('kpi-disability-total').innerText = dis.total.toLocaleString();
      document.getElementById('kpi-pc-total').innerText = pc.total.toLocaleString();

      // 2. 渲染各車種分佈甜甜圈圖
      renderSpaceTypesChart({
        general: cityStats.spacesByType.general.total,
        motorcycle: cityStats.spacesByType.motorcycle.total,
        evDedicated: ev.dedicated,
        evShared: ev.shared,
        disability: dis.total,
        parentChild: pc.total,
      });

      // 3. 單一縣市對比圖 (以其所屬對比)
      renderCityCapacityChart([cityStats]);
      renderEVComparisonChart([cityStats]);
      renderRatesFacilitiesChart([cityStats]);

      // 4. 表格只顯示該縣市
      renderCityTable([cityStats]);

      // 5. 排行榜
      renderSingleCityLeaderboard(cityStats);
    }

    // ── 圖表 1: 各車種分佈甜甜圈圖 ───────────────────────────────────────────
    function renderSpaceTypesChart(counts) {
      const ctx = document.getElementById('chart-space-types').getContext('2d');
      if (chartSpaceTypes) chartSpaceTypes.destroy();

      const labels = ['小型車', '機車', '⚡ 純電專屬', '🔌 混用充電', '♿ 身心障礙', '👶 婦幼親子'];
      const dataValues = [
        counts.general || 0,
        counts.motorcycle || 0,
        counts.evDedicated || 0,
        counts.evShared || 0,
        counts.disability || 0,
        counts.parentChild || 0,
      ];

      // 更新副標題摘要
      document.getElementById('pie-stat-car').innerText = (counts.general || 0).toLocaleString();
      document.getElementById('pie-stat-moto').innerText = (counts.motorcycle || 0).toLocaleString();
      document.getElementById('pie-stat-ev').innerText = \`\${(counts.evDedicated||0)} / \${(counts.evShared||0)}\`;

      chartSpaceTypes = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataValues,
            backgroundColor: [
              '#10b981', // 小型車 (Emerald)
              '#38bdf8', // 機車 (Sky)
              '#059669', // 純電專屬 (Dark Emerald)
              '#0284c7', // 混用充電 (Blue)
              '#818cf8', // 身心障礙 (Indigo)
              '#f472b6', // 婦幼親子 (Pink)
            ],
            borderColor: '#0b101d',
            borderWidth: 3,
            hoverOffset: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#cbd5e1',
                font: { family: 'Noto Sans TC', size: 11, weight: '500' },
                boxWidth: 10,
                padding: 12,
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#ffffff',
              bodyColor: '#e2e8f0',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function(context) {
                  const val = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return \` \${context.label}: \${val.toLocaleString()} 席 (\${pct}%)\`;
                }
              }
            }
          }
        }
      });
    }

    // ── 圖表 2: 各縣市容量 vs 空位堆疊圖 ─────────────────────────────────────
    function renderCityCapacityChart(cities) {
      const ctx = document.getElementById('chart-city-capacity').getContext('2d');
      if (chartCityCapacity) chartCityCapacity.destroy();

      const labels = cities.map(c => c.cityNameZh);
      const availableData = cities.map(c => c.availableSpaces || 0);
      const occupiedData = cities.map(c => (c.totalSpaces !== null && c.availableSpaces !== null && c.totalSpaces >= c.availableSpaces) ? (c.totalSpaces - c.availableSpaces) : 0);

      chartCityCapacity = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '剩餘空席',
              data: availableData,
              backgroundColor: '#10b981',
              borderRadius: 4,
            },
            {
              label: '已佔用席數',
              data: occupiedData,
              backgroundColor: '#334155',
              borderRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'Noto Sans TC', size: 11 } }
            },
            y: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              padding: 10,
              callbacks: {
                footer: function(items) {
                  let total = 0;
                  items.forEach(i => total += i.raw);
                  return '總計容量: ' + total.toLocaleString() + ' 席';
                }
              }
            }
          }
        }
      });
    }

    // ── 圖表 3: 各縣市電動車位配置比較 (純電專屬 vs 混用充電) ───────────────
    function renderEVComparisonChart(cities) {
      const ctx = document.getElementById('chart-ev-comparison').getContext('2d');
      if (chartEvComparison) chartEvComparison.destroy();

      const labels = cities.map(c => c.cityNameZh);
      const dedicatedData = cities.map(c => c.spacesByType?.ev?.dedicated || 0);
      const sharedData = cities.map(c => c.spacesByType?.ev?.shared || 0);

      chartEvComparison = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '⚡ 純電專屬格 (只給純電車)',
              data: dedicatedData,
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1,
              borderRadius: 6,
            },
            {
              label: '🔌 混用充電樁 (油電車共用)',
              data: sharedData,
              backgroundColor: '#38bdf8',
              borderColor: '#0284c7',
              borderWidth: 1,
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'Noto Sans TC', size: 11 } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              padding: 10,
            }
          }
        }
      });
    }

    // ── 圖表 4: 場站建築型態與設施分佈 ─────────────────────────────────────
    function renderRatesFacilitiesChart(cities) {
      const ctx = document.getElementById('chart-rates-facilities').getContext('2d');
      if (chartRatesFacilities) chartRatesFacilities.destroy();

      let flat = 0, multi = 0, under = 0, mech = 0;
      let ev = 0, wheelchair = 0, ticketMachine = 0;

      cities.forEach(c => {
        flat += (c.carParkTypeDistribution?.flatCount || 0);
        multi += (c.carParkTypeDistribution?.multiStoreyCount || 0);
        under += (c.carParkTypeDistribution?.undergroundCount || 0);
        mech += (c.carParkTypeDistribution?.mechanicalCount || 0);

        ev += (c.facilitiesDistribution?.evCount || 0);
        wheelchair += (c.facilitiesDistribution?.wheelchairCount || 0);
        ticketMachine += (c.facilitiesDistribution?.ticketMachineCount || 0);
      });

      const flatEl = document.getElementById('stat-flat-count');
      if (flatEl) flatEl.innerText = \`\${flat.toLocaleString()} 處場站\`;
      const indoorEl = document.getElementById('stat-indoor-count');
      if (indoorEl) indoorEl.innerText = \`\${(multi + under).toLocaleString()} 處場站\`;

      chartRatesFacilities = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['露天平面型', '立體建築型', '地下型停車場', '機械塔/複合', '附設充電樁', '無障礙設施', '自動繳費機'],
          datasets: [{
            data: [flat, multi, under, mech, ev, wheelchair, ticketMachine],
            backgroundColor: [
              'rgba(16, 185, 129, 0.75)',
              'rgba(56, 189, 248, 0.75)',
              'rgba(168, 85, 247, 0.75)',
              'rgba(244, 63, 94, 0.75)',
              'rgba(245, 158, 11, 0.75)',
              'rgba(59, 130, 246, 0.75)',
              'rgba(148, 163, 184, 0.75)',
            ],
            borderColor: [
              '#10b981',
              '#38bdf8',
              '#a855f7',
              '#f43f5e',
              '#f59e0b',
              '#3b82f6',
              '#94a3b8',
            ],
            borderWidth: 1,
            borderRadius: 6,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#cbd5e1', font: { family: 'Noto Sans TC', size: 11, weight: '600' } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              padding: 10,
              callbacks: {
                label: function(c) {
                  return '場站數: ' + c.raw.toLocaleString() + ' 處';
                }
              }
            }
          }
        }
      });
    }

    // ── 表格渲染與排序 ───────────────────────────────────────────────────────
    function renderCityTable(cities) {
      const tbody = document.getElementById('city-table-body');
      document.getElementById('table-total-count').innerText = \`\${cities.length} 個行政區\`;

      // 依當前條件排序
      const sorted = [...cities].sort((a, b) => {
        let valA, valB;
        if (sortColumn === 'name') {
          valA = a.cityNameZh; valB = b.cityNameZh;
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortColumn === 'totalLots') {
          valA = a.totalLots || 0; valB = b.totalLots || 0;
        } else if (sortColumn === 'totalSpaces') {
          valA = a.totalSpaces ?? -1; valB = b.totalSpaces ?? -1;
        } else if (sortColumn === 'occupiedSpaces') {
          valA = (a.totalSpaces !== null && a.availableSpaces !== null) ? (a.totalSpaces - a.availableSpaces) : -1;
          valB = (b.totalSpaces !== null && b.availableSpaces !== null) ? (b.totalSpaces - b.availableSpaces) : -1;
        } else if (sortColumn === 'availableSpaces') {
          valA = a.availableSpaces; valB = b.availableSpaces;
        } else if (sortColumn === 'occupancyRate') {
          valA = a.occupancyRate; valB = b.occupancyRate;
        } else if (sortColumn === 'evTotal') {
          valA = a.spacesByType.ev.total; valB = b.spacesByType.ev.total;
        } else if (sortColumn === 'evDedicated') {
          valA = a.spacesByType.ev.dedicated; valB = b.spacesByType.ev.dedicated;
        } else if (sortColumn === 'evShared') {
          valA = a.spacesByType.ev.shared; valB = b.spacesByType.ev.shared;
        } else if (sortColumn === 'disability') {
          valA = a.spacesByType.disability.total; valB = b.spacesByType.disability.total;
        } else if (sortColumn === 'parentChild') {
          valA = a.spacesByType.parentChild.total; valB = b.spacesByType.parentChild.total;
        }
        return sortAsc ? valA - valB : valB - valA;
      });

      tbody.innerHTML = sorted.map((c, idx) => {
        const totalSpStr = (c.totalSpaces !== null && c.totalSpaces > 0) ? c.totalSpaces.toLocaleString() : '-';
        const availSpStr = (c.availableSpaces !== null && c.availableSpaces >= 0) ? c.availableSpaces.toLocaleString() : '-';
        const occupiedSpStr = (c.totalSpaces !== null && c.availableSpaces !== null && c.totalSpaces >= c.availableSpaces)
          ? Math.max(0, c.totalSpaces - c.availableSpaces).toLocaleString()
          : '-';

        const occBar = (c.occupancyRate !== null && c.occupancyRate !== undefined) ? \`
          <div class="flex items-center gap-2">
            <div class="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="h-full \${c.occupancyRate > 80 ? 'bg-rose-500' : c.occupancyRate > 65 ? 'bg-amber-400' : 'bg-emerald-400'}" style="width: \${c.occupancyRate}%;"></div>
            </div>
            <span class="text-[11px] font-mono font-bold \${c.occupancyRate > 80 ? 'text-rose-400' : c.occupancyRate > 65 ? 'text-amber-400' : 'text-emerald-400'}">\${c.occupancyRate}%</span>
          </div>\` : \`<span class="text-slate-500 font-mono text-xs">-</span>\`;

        return \`
          <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3 font-bold text-white flex items-center gap-2">
              <span class="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-mono">\${idx+1}</span>
              <span>\${c.cityNameZh}</span>
            </td>
            <td class="px-4 py-3 text-right font-mono text-slate-300">\${c.totalLots.toLocaleString()}</td>
            <td class="px-4 py-3 text-right font-mono text-emerald-300 font-bold">\${totalSpStr}</td>
            <td class="px-4 py-3 text-right font-mono text-slate-400">\${occupiedSpStr}</td>
            <td class="px-4 py-3 text-right font-mono text-emerald-400 font-bold">\${availSpStr}</td>
            <td class="px-4 py-3">
              \${occBar}
            </td>
            <td class="px-4 py-3 text-right font-mono text-amber-400 font-bold">
              \${c.spacesByType?.ev?.total > 0 ? \`⚡ \${c.spacesByType.ev.total}\` : '-'}
            </td>
            <td class="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
              \${c.spacesByType?.ev?.dedicated > 0 ? c.spacesByType.ev.dedicated : '-'}
            </td>
            <td class="px-4 py-3 text-right font-mono text-sky-400 font-bold">
              \${c.spacesByType?.ev?.shared > 0 ? \`🔌 \${c.spacesByType.ev.shared}\` : '-'}
            </td>
            <td class="px-4 py-3 text-right font-mono text-blue-300">
              \${c.spacesByType?.disability?.total > 0 ? c.spacesByType.disability.total : '-'}
            </td>
            <td class="px-4 py-3 text-right font-mono text-pink-300">
              \${c.spacesByType?.parentChild?.total > 0 ? c.spacesByType.parentChild.total : '-'}
            </td>
            <td class="px-4 py-3 text-center">
              <a href="/?city=\${c.city}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 text-[11px] font-bold transition-all border border-sky-500/30 active:scale-95">
                <i class="fa-solid fa-location-crosshairs text-[10px]"></i> 雷達
              </a>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function sortTable(col) {
      if (sortColumn === col) {
        sortAsc = !sortAsc;
      } else {
        sortColumn = col;
        sortAsc = false;
      }
      if (currentScope === 'ALL' && nationwideData) {
        renderCityTable(nationwideData.citySummaries);
      } else if (currentCityData) {
        renderCityTable([currentCityData]);
      }
    }

    // ── 精選排行榜渲染 ───────────────────────────────────────────────────────
    function renderLeaderboards(cities) {
      // 收集全台所有場站
      let allAvail = [];
      let allEV = [];
      let allOccupied = [];

      cities.forEach(c => {
        if (c.topAvailableLots) allAvail.push(...c.topAvailableLots);
        if (c.topOccupiedLots) allOccupied.push(...c.topOccupiedLots);
      });

      // 排序前 5
      allAvail.sort((a, b) => b.availableSpaces - a.availableSpaces);
      allOccupied.sort((a, b) => b.occupancyRate - a.occupancyRate);

      const top5Avail = allAvail.slice(0, 5);
      const top5Occupied = allOccupied.slice(0, 5);

      // 空位榜
      document.getElementById('list-top-available').innerHTML = top5Avail.map((l, i) => \`
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:border-slate-700 transition-colors">
          <div class="flex items-center gap-2 truncate">
            <span class="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">\${i+1}</span>
            <span class="text-white font-semibold truncate">\${l.name}</span>
          </div>
          <span class="font-mono font-bold text-emerald-400 shrink-0 text-xs">餘 \${l.availableSpaces} 席</span>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500">暫無空位統計</p>';

      // 充電位充足場站 (專屬 + 混用)
      const evLots = allAvail.filter(l => (l.evDedicated + l.evShared) > 0)
        .sort((a, b) => (b.evDedicated + b.evShared) - (a.evDedicated + a.evShared))
        .slice(0, 5);

      document.getElementById('list-top-ev').innerHTML = evLots.map((l, i) => \`
        <div class="flex items-center justify-between p-2 rounded-xl bg-amber-950/25 border border-amber-500/30 text-xs hover:border-amber-500/50 transition-colors">
          <div class="flex items-center gap-2 truncate">
            <span class="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">\${i+1}</span>
            <span class="text-amber-200 font-semibold truncate">\${l.name}</span>
          </div>
          <div class="font-mono font-bold text-amber-400 shrink-0 text-[11px] flex items-center gap-1">
            <span>\${l.evDedicated + l.evShared}格</span>
            <span class="text-[9px] text-emerald-300 font-normal">(專\${l.evDedicated}/混\${l.evShared})</span>
          </div>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500">暫無充電站數據</p>';

      // 滿載警示榜
      document.getElementById('list-top-occupied').innerHTML = top5Occupied.map((l, i) => \`
        <div class="flex items-center justify-between p-2 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs hover:border-rose-500/40 transition-colors">
          <div class="flex items-center gap-2 truncate">
            <span class="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">\${i+1}</span>
            <span class="text-rose-200 font-semibold truncate">\${l.name}</span>
          </div>
          <span class="font-mono font-bold text-rose-400 shrink-0 text-xs">\${l.occupancyRate}% 滿位</span>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500">目前無滿載警戒場站</p>';
    }

    function renderSingleCityLeaderboard(cityStats) {
      const topAvail = cityStats.topAvailableLots || [];
      const topOccupied = cityStats.topOccupiedLots || [];

      document.getElementById('list-top-available').innerHTML = topAvail.map((l, i) => \`
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">\${i+1}</span>
            <span class="text-white font-semibold truncate">\${l.name}</span>
          </div>
          <span class="font-mono font-bold text-emerald-400 shrink-0 text-xs">餘 \${l.availableSpaces} 席</span>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500">暫無資料</p>';

      const evLots = topAvail.filter(l => (l.evDedicated + l.evShared) > 0)
        .sort((a, b) => (b.evDedicated + b.evShared) - (a.evDedicated + a.evShared));

      document.getElementById('list-top-ev').innerHTML = evLots.map((l, i) => \`
        <div class="flex items-center justify-between p-2 rounded-xl bg-amber-950/25 border border-amber-500/30 text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">\${i+1}</span>
            <span class="text-amber-200 font-semibold truncate">\${l.name}</span>
          </div>
          <div class="font-mono font-bold text-amber-400 shrink-0 text-[11px] flex items-center gap-1">
            <span>\${l.evDedicated + l.evShared}格</span>
            <span class="text-[9px] text-emerald-300 font-normal">(專\${l.evDedicated}/混\${l.evShared})</span>
          </div>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500">無充電站數據</p>';

      document.getElementById('list-top-occupied').innerHTML = topOccupied.map((l, i) => \`
        <div class="flex items-center justify-between p-2 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">\${i+1}</span>
            <span class="text-rose-200 font-semibold truncate">\${l.name}</span>
          </div>
          <span class="font-mono font-bold text-rose-400 shrink-0 text-xs">\${l.occupancyRate}% 滿位</span>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500">無滿載場站</p>';
    }
  </script>
</body>
</html>`;
}
