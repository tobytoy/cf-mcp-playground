export function renderRadarPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-TW" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>台灣雙鐵即時售票狀況雷達 | Taiwan Rail Real-Time Seat Radar</title>
  <meta name="description" content="全方位整合台灣高鐵即時座位存量 (>50 席充足 / <10 席緊張 / 0 席售完) 與台鐵全線時刻表，雙欄對照、即時篩選出發與到站時間，秒級通勤搶票掌握！">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans TC', sans-serif;
    }
    .glass-panel {
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: rgba(30, 41, 59, 0.65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .glow-orange {
      box-shadow: 0 0 25px -5px rgba(249, 115, 22, 0.35);
    }
    .glow-blue {
      box-shadow: 0 0 25px -5px rgba(56, 189, 248, 0.35);
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
    ::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.5); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.8); }
  </style>
</head>
<body class="bg-[#080c15] text-slate-100 min-h-screen selection:bg-orange-500 selection:text-white relative overflow-x-hidden">

  <!-- 背景動態光暈網格 -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div class="absolute -top-40 left-1/4 w-[550px] h-[550px] bg-orange-500/15 rounded-full blur-[140px] animate-pulse"></div>
    <div class="absolute top-1/3 -right-40 w-[650px] h-[650px] bg-sky-600/15 rounded-full blur-[150px]"></div>
    <div class="absolute -bottom-40 left-10 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]"></div>
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
  </div>

  <div class="max-w-7xl mx-auto px-4 py-8 sm:py-12">

    <!-- 頂部標題 Header -->
    <header class="text-center mb-8 sm:mb-10">
      <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-orange-400 mb-4 shadow-inner">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span>雙鐵雙欄獨立對照 • 即時座位剩餘與到發時間篩選雷達</span>
      </div>
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-3">
        <span class="bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400 bg-clip-text text-transparent">
          台灣雙鐵即時售票狀況雷達
        </span>
      </h1>
      <p class="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-normal">
        高鐵一欄、台鐵一欄即時並排對照。直覺數值化餘位（&gt;50 席 / &lt;10 席 / 0 席）與雙向時間篩選！
      </p>
    </header>

    <!-- 快速熱門路線晶片 Quick Chips -->
    <div class="mb-5 flex flex-wrap items-center justify-center gap-2 text-xs">
      <span class="text-slate-400 font-medium mr-1"><i class="fa-solid fa-fire text-orange-400"></i> 熱門區間：</span>
      <button class="quick-chip px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-300 transition" data-origin="台北" data-dest="左營">台北 ➔ 左營</button>
      <button class="quick-chip px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-300 transition" data-origin="台北" data-dest="台中">台北 ➔ 台中</button>
      <button class="quick-chip px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-300 transition" data-origin="台北" data-dest="花蓮">台北 ➔ 花蓮</button>
      <button class="quick-chip px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-300 transition" data-origin="台中" data-dest="台北">台中 ➔ 台北</button>
      <button class="quick-chip px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-300 transition" data-origin="左營" data-dest="台北">左營 ➔ 台北</button>
      <button class="quick-chip px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 border border-slate-700 hover:border-orange-500/50 text-slate-300 hover:text-orange-300 transition" data-origin="台北" data-dest="台東">台北 ➔ 台東</button>
    </div>

    <!-- 核心查詢條件卡片 Control Card -->
    <div class="glass-panel rounded-3xl p-5 sm:p-7 mb-8 shadow-2xl relative overflow-hidden">
      <!-- 上半部：起訖站與日期 -->
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-end mb-4">

        <!-- 出發站 (Origin) -->
        <div class="sm:col-span-3">
          <label class="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-orange-400"></i> 出發站點</span>
            <span class="text-[10px] text-slate-500 font-mono">ORIGIN</span>
          </label>
          <div class="relative">
            <select id="originSelect" class="w-full bg-slate-900/90 border border-slate-700 hover:border-slate-600 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-orange-500 transition appearance-none cursor-pointer shadow-inner">
              <optgroup label="北部地區 (North)">
                <option value="台北" selected>台北 / 臺北</option>
                <option value="南港">南港</option>
                <option value="松山">松山 (台鐵)</option>
                <option value="板橋">板橋</option>
                <option value="桃園">桃園</option>
                <option value="中壢">中壢 (台鐵)</option>
                <option value="基隆">基隆 (台鐵)</option>
                <option value="新竹">新竹</option>
              </optgroup>
              <optgroup label="中部地區 (Central)">
                <option value="苗栗">苗栗</option>
                <option value="台中">台中 / 臺中</option>
                <option value="彰化">彰化</option>
                <option value="員林">員林 (台鐵)</option>
                <option value="雲林">雲林</option>
                <option value="斗六">斗六 (台鐵)</option>
              </optgroup>
              <optgroup label="南部地區 (South)">
                <option value="嘉義">嘉義</option>
                <option value="新營">新營 (台鐵)</option>
                <option value="台南">台南 / 臺南</option>
                <option value="左營">左營 / 高雄 (高鐵)</option>
                <option value="高雄">高雄 (台鐵/高鐵)</option>
                <option value="屏東">屏東 (台鐵)</option>
                <option value="潮州">潮州 (台鐵)</option>
              </optgroup>
              <optgroup label="東部地區 (East)">
                <option value="宜蘭">宜蘭 (台鐵)</option>
                <option value="羅東">羅東 (台鐵)</option>
                <option value="花蓮">花蓮 (台鐵)</option>
                <option value="玉里">玉里 (台鐵)</option>
                <option value="台東">台東 / 臺東 (台鐵)</option>
              </optgroup>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </div>
          </div>
        </div>

        <!-- 交換起訖站按鈕 -->
        <div class="sm:col-span-1 flex justify-center pb-0.5">
          <button id="swapBtn" type="button" title="交換起訖站" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700/80 shadow-md">
            <i class="fa-solid fa-arrow-right-arrow-left text-sm rotate-90 sm:rotate-0 text-orange-400"></i>
          </button>
        </div>

        <!-- 目的地 (Destination) -->
        <div class="sm:col-span-3">
          <label class="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-flag-checkered text-emerald-400"></i> 目的地站點</span>
            <span class="text-[10px] text-slate-500 font-mono">DESTINATION</span>
          </label>
          <div class="relative">
            <select id="destSelect" class="w-full bg-slate-900/90 border border-slate-700 hover:border-slate-600 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-orange-500 transition appearance-none cursor-pointer shadow-inner">
              <optgroup label="北部地區 (North)">
                <option value="台北">台北 / 臺北</option>
                <option value="南港">南港</option>
                <option value="松山">松山 (台鐵)</option>
                <option value="板橋">板橋</option>
                <option value="桃園">桃園</option>
                <option value="中壢">中壢 (台鐵)</option>
                <option value="基隆">基隆 (台鐵)</option>
                <option value="新竹">新竹</option>
              </optgroup>
              <optgroup label="中部地區 (Central)">
                <option value="苗栗">苗栗</option>
                <option value="台中">台中 / 臺中</option>
                <option value="彰化">彰化</option>
                <option value="員林">員林 (台鐵)</option>
                <option value="雲林">雲林</option>
                <option value="斗六">斗六 (台鐵)</option>
              </optgroup>
              <optgroup label="南部地區 (South)">
                <option value="嘉義">嘉義</option>
                <option value="新營">新營 (台鐵)</option>
                <option value="台南">台南 / 臺南</option>
                <option value="左營" selected>左營 / 高雄 (高鐵)</option>
                <option value="高雄">高雄 (台鐵/高鐵)</option>
                <option value="屏東">屏東 (台鐵)</option>
                <option value="潮州">潮州 (台鐵)</option>
              </optgroup>
              <optgroup label="東部地區 (East)">
                <option value="宜蘭">宜蘭 (台鐵)</option>
                <option value="羅東">羅東 (台鐵)</option>
                <option value="花蓮">花蓮 (台鐵)</option>
                <option value="玉里">玉里 (台鐵)</option>
                <option value="台東">台東 / 臺東 (台鐵)</option>
              </optgroup>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <i class="fa-solid fa-chevron-down text-xs"></i>
            </div>
          </div>
        </div>

        <!-- 乘車日期 (Date) -->
        <div class="sm:col-span-3">
          <label class="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar-days text-sky-400"></i> 出發乘車日期</span>
            <span class="text-[10px] text-slate-500 font-mono">DATE</span>
          </label>
          <input type="date" id="dateInput" class="w-full bg-slate-900/90 border border-slate-700 hover:border-slate-600 rounded-2xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-orange-500 transition cursor-pointer shadow-inner">
        </div>

        <!-- 查詢按鈕 -->
        <div class="sm:col-span-2">
          <button id="searchBtn" class="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white font-extrabold py-3 px-4 rounded-2xl shadow-xl shadow-orange-500/25 transition duration-150 flex items-center justify-center gap-2">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>即時雷達</span>
          </button>
        </div>
      </div>

      <!-- 下半部：時段快選與進階時間篩選開關 -->
      <div class="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <!-- 時段快捷按鈕 -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <i class="fa-regular fa-clock text-amber-400"></i> 時段快選：
          </span>
          <button class="time-preset px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold" data-dep-after="" data-dep-before="" data-arr-after="" data-arr-before="">全天</button>
          <button class="time-preset px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-medium" data-preset="now">即刻起</button>
          <button class="time-preset px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-medium" data-dep-after="06:00" data-dep-before="12:00" data-arr-after="" data-arr-before="">上午 (06~12)</button>
          <button class="time-preset px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-medium" data-dep-after="12:00" data-dep-before="18:00" data-arr-after="" data-arr-before="">下午 (12~18)</button>
          <button class="time-preset px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-medium" data-dep-after="18:00" data-dep-before="23:59" data-arr-after="" data-arr-before="">晚間 (18~24)</button>
        </div>

        <!-- 快速功能控制群：僅看有位車次 + 進階時間自訂 -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- 僅看有位車次開關 (預設勾選) -->
          <label class="flex items-center gap-2 cursor-pointer px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 select-none transition shadow-sm group">
            <input type="checkbox" id="onlyAvailableCheck" checked class="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer">
            <span class="flex items-center gap-1.5 group-hover:text-emerald-300 transition">
              <i class="fa-solid fa-chair text-emerald-400"></i>
              <span>僅看有位車次</span>
            </span>
            <span class="text-[10px] text-slate-400 font-normal hidden sm:inline">(濾除客滿與已發車)</span>
          </label>

          <!-- 進階查詢開關按鈕 -->
          <button id="toggleAdvancedBtn" type="button" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-orange-500/50 text-slate-200 hover:text-white transition shadow-sm text-xs font-semibold group cursor-pointer">
            <i class="fa-solid fa-sliders text-orange-400 group-hover:rotate-45 transition-transform duration-200"></i>
            <span>進階時間自訂</span>
            <span id="advancedActiveBadge" class="hidden px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono border border-orange-500/40 font-bold">已啟用</span>
            <i id="advancedChevron" class="fa-solid fa-chevron-down text-xs transition-transform duration-200"></i>
          </button>
        </div>
      </div>

      <!-- 進階查詢面板（可打開 / 關起來） -->
      <div id="advancedPanel" class="hidden mt-4 pt-4 border-t border-slate-800/90">
        <div class="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-700/70 shadow-inner">
          <div class="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-800/90">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-sm">
                <i class="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <span>進階細節時間查詢</span>
                  <span class="text-[10px] text-slate-400 font-normal">（可自由輸入出發與到站的指定時間範圍）</span>
                </h3>
                <p class="text-[11px] text-slate-400">支援精準 24 小時制（HH:MM），出發與抵達時間皆可雙向限定</p>
              </div>
            </div>
            <button id="closeAdvancedBtn" type="button" class="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer">
              <span>收起</span>
              <i class="fa-solid fa-chevron-up text-[10px]"></i>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 出發時間範圍自訂 -->
            <div class="glass-card rounded-xl p-3.5 border border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                  <i class="fa-solid fa-train-subway text-xs"></i> 出發時間範圍 (Departure)
                </label>
                <button type="button" id="clearDepBtn" class="text-[11px] text-slate-400 hover:text-orange-400 transition cursor-pointer">清空出發</button>
              </div>
              <p class="text-[11px] text-slate-400 mb-2.5">限制列車從起點站開出的時間區間：</p>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-orange-500">
                  <span class="text-[10px] text-slate-500 block mb-0.5">最早出發 (從)</span>
                  <input type="time" id="depAfterInput" class="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer">
                </div>
                <span class="text-slate-500 font-bold">~</span>
                <div class="flex-1 bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-orange-500">
                  <span class="text-[10px] text-slate-500 block mb-0.5">最晚出發 (至)</span>
                  <input type="time" id="depBeforeInput" class="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer">
                </div>
              </div>
              <!-- 出發快捷點選 -->
              <div class="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                <span class="text-slate-500 text-[10px]">速選：</span>
                <button type="button" class="dep-quick-btn px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" data-after="07:00" data-before="09:00">早晨 07~09</button>
                <button type="button" class="dep-quick-btn px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" data-after="12:00" data-before="14:00">中午 12~14</button>
                <button type="button" class="dep-quick-btn px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" data-after="17:00" data-before="19:30">傍晚 17~19:30</button>
              </div>
            </div>

            <!-- 到站時間範圍自訂 -->
            <div class="glass-card rounded-xl p-3.5 border border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <i class="fa-solid fa-flag-checkered text-xs"></i> 到站時間範圍 (Arrival)
                </label>
                <button type="button" id="clearArrBtn" class="text-[11px] text-slate-400 hover:text-sky-400 transition cursor-pointer">清空到站</button>
              </div>
              <p class="text-[11px] text-slate-400 mb-2.5">限制列車抵達目的地站的時間區間：</p>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-sky-500">
                  <span class="text-[10px] text-slate-500 block mb-0.5">最早抵達 (從)</span>
                  <input type="time" id="arrAfterInput" class="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer">
                </div>
                <span class="text-slate-500 font-bold">~</span>
                <div class="flex-1 bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-sky-500">
                  <span class="text-[10px] text-slate-500 block mb-0.5">最晚抵達 (至)</span>
                  <input type="time" id="arrBeforeInput" class="w-full bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer">
                </div>
              </div>
              <!-- 到站快捷點選 -->
              <div class="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                <span class="text-slate-500 text-[10px]">速選：</span>
                <button type="button" class="arr-quick-btn px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" data-before="12:00">12:00 前抵達</button>
                <button type="button" class="arr-quick-btn px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" data-before="17:00">17:00 前抵達</button>
                <button type="button" class="arr-quick-btn px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer" data-before="22:00">22:00 前抵達</button>
              </div>
            </div>
          </div>

          <!-- 面板底部操作按鈕 -->
          <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <button type="button" id="resetAllTimeBtn" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-rotate-left"></i>
              <span>重設全部時間條件</span>
            </button>
            <div class="flex items-center gap-2">
              <button type="button" id="applyAdvancedBtn" class="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-check"></i>
                <span>立即套用時間篩選</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 狀態資訊橫條 -->
    <div id="statusBanner" class="mb-5 flex flex-wrap items-center justify-between text-xs text-slate-400 px-1 gap-2">
      <div id="routeSummary" class="font-medium text-slate-300 flex items-center gap-2">
        <span>正在查詢雙鐵即時資料...</span>
      </div>
      <div class="flex items-center gap-4 text-xs font-mono">
        <span id="filterSummary" class="text-slate-400 font-sans"></span>
        <span id="updateTime" class="text-slate-500"></span>
      </div>
    </div>

    <!-- 雙欄版面：左欄高鐵、右欄台鐵 (Two-Column Layout) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      <!-- ════════ 左欄：台灣高鐵 (THSR) ════════ -->
      <section class="space-y-4">
        <!-- 高鐵標頭狀態列 -->
        <div class="glass-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between border-l-4 border-l-orange-500 shadow-lg">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xl glow-orange shrink-0">
              <i class="fa-solid fa-bolt"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base sm:text-lg font-extrabold text-white">台灣高鐵</h2>
                <span id="thsrBadge" class="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40">
                  載入中...
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">即時座位剩餘估計 (充足 >50 席 / 緊張 &lt;10 席 / 售罄 0 席)</p>
            </div>
          </div>
          <!-- 高鐵餘位圖例統計 -->
          <div id="thsrSeatStats" class="text-[11px] hidden sm:flex items-center gap-2 font-semibold">
            <!-- 動態注入數值計數 -->
          </div>
        </div>

        <!-- 高鐵車次列表容器 -->
        <div id="thsrListContainer" class="space-y-3">
          <div class="animate-pulse space-y-3">
            <div class="h-28 bg-slate-800/40 rounded-2xl"></div>
            <div class="h-28 bg-slate-800/40 rounded-2xl"></div>
          </div>
        </div>
      </section>

      <!-- ════════ 右欄：台灣鐵路 (TRA) ════════ -->
      <section class="space-y-4">
        <!-- 台鐵標頭狀態列 -->
        <div class="glass-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between border-l-4 border-l-sky-500 shadow-lg">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xl glow-blue shrink-0">
              <i class="fa-solid fa-train"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base sm:text-lg font-extrabold text-white">台灣鐵路</h2>
                <span id="traBadge" class="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/40">
                  載入中...
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">自強號 / 普悠瑪 / 新自強3000 / 區間快 即時班次</p>
            </div>
          </div>
          <!-- 台鐵直連提示 -->
          <div class="text-[11px] hidden sm:flex items-center gap-1.5 text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-sky-400"></i>
            <span>支援直連官網/App訂票</span>
          </div>
        </div>

        <!-- 台鐵車次列表容器 -->
        <div id="traListContainer" class="space-y-3">
          <div class="animate-pulse space-y-3">
            <div class="h-28 bg-slate-800/40 rounded-2xl"></div>
            <div class="h-28 bg-slate-800/40 rounded-2xl"></div>
          </div>
        </div>
      </section>

    </div>

    <!-- 底部資訊說明 Footer -->
    <footer class="mt-14 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
      <div class="flex items-center justify-center gap-4 text-slate-400 text-xs flex-wrap">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-bolt text-orange-400"></i> 高鐵：即時同步對號座存量 (&gt;50 席充足 / &lt;10 席緊張 / 0 席售罄)</span>
        <span class="text-slate-600">•</span>
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-train text-sky-400"></i> 台鐵：直連官方訂票系統與全日即時時刻表</span>
      </div>
      <p class="text-[11px] text-slate-600">
        資料源：交通部 TDX 運輸資料流通服務 • 運作環境：Cloudflare Workers 邊緣節點
      </p>
    </footer>

  </div>

  <script>
    // 預設今天 (台灣時區)
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(now);
    document.getElementById('dateInput').value = todayStr;

    let currentRadarData = null;

    async function queryRailRadar() {
      const origin = document.getElementById('originSelect').value;
      const destination = document.getElementById('destSelect').value;
      const date = document.getElementById('dateInput').value;

      const depAfter = document.getElementById('depAfterInput').value;
      const depBefore = document.getElementById('depBeforeInput').value;
      const arrAfter = document.getElementById('arrAfterInput').value;
      const arrBefore = document.getElementById('arrBeforeInput').value;

      // 更新進階篩選狀態徽章
      const hasCustom = Boolean(depAfter || depBefore || arrAfter || arrBefore);
      const activeBadge = document.getElementById('advancedActiveBadge');
      if (activeBadge) {
        if (hasCustom) {
          activeBadge.classList.remove('hidden');
        } else {
          activeBadge.classList.add('hidden');
        }
      }

      const searchBtn = document.getElementById('searchBtn');
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 查詢中...';

      // 設置 Skeleton Loading
      document.getElementById('thsrListContainer').innerHTML = \`
        <div class="py-14 text-center text-slate-400 glass-card rounded-2xl">
          <i class="fa-solid fa-bolt fa-bounce text-3xl text-orange-500 mb-3"></i>
          <p class="font-medium text-sm">正在向 TDX 同步高鐵即時座位存量...</p>
        </div>
      \`;
      document.getElementById('traListContainer').innerHTML = \`
        <div class="py-14 text-center text-slate-400 glass-card rounded-2xl">
          <i class="fa-solid fa-train fa-bounce text-3xl text-sky-500 mb-3"></i>
          <p class="font-medium text-sm">正在向 TDX 載入台鐵列車時刻表...</p>
        </div>
      \`;

      try {
        let apiUrl = \`/api/status?origin=\${encodeURIComponent(origin)}&destination=\${encodeURIComponent(destination)}&date=\${encodeURIComponent(date)}\`;
        if (depAfter) apiUrl += \`&depAfter=\${encodeURIComponent(depAfter)}\`;
        if (depBefore) apiUrl += \`&depBefore=\${encodeURIComponent(depBefore)}\`;
        if (arrAfter) apiUrl += \`&arrAfter=\${encodeURIComponent(arrAfter)}\`;
        if (arrBefore) apiUrl += \`&arrBefore=\${encodeURIComponent(arrBefore)}\`;

        const res = await fetch(apiUrl);
        const json = await res.json();
        currentRadarData = json;

        const origDisplay = json.origin?.thsr || json.origin?.tra || json.origin?.query || origin;
        const destDisplay = json.destination?.thsr || json.destination?.tra || json.destination?.query || destination;

        document.getElementById('routeSummary').innerHTML = \`
          <span class="font-black text-white text-base">\${origDisplay} ➔ \${destDisplay}</span>
          <span class="text-slate-400 ml-2">雙鐵共找到 <strong class="text-orange-400 font-mono">\${json.total}</strong> 班車</span>
        \`;

        // 時間篩選提示
        let filterLabels = [];
        if (depAfter && depBefore) filterLabels.push(\`發車: \${depAfter} ~ \${depBefore}\`);
        else if (depAfter) filterLabels.push(\`發車: \${depAfter} 起\`);
        else if (depBefore) filterLabels.push(\`發車: 至 \${depBefore}\`);

        if (arrAfter && arrBefore) filterLabels.push(\`到站: \${arrAfter} ~ \${arrBefore}\`);
        else if (arrAfter) filterLabels.push(\`到站: \${arrAfter} 起\`);
        else if (arrBefore) filterLabels.push(\`最晚到站: \${arrBefore}\`);

        document.getElementById('filterSummary').innerText = filterLabels.length ? \`(\${filterLabels.join('，')})\` : '';

        document.getElementById('updateTime').innerText = \`最後更新: \${new Date(json.updatedAt).toLocaleTimeString('zh-TW')}\`;

        renderColumns(json);
      } catch (err) {
        const errorHtml = \`
          <div class="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-400">
            <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
            <p class="font-bold text-sm">取得資料失敗</p>
            <p class="text-xs text-rose-300 mt-1">\${err.message || '請確認連線後重試'}</p>
          </div>
        \`;
        document.getElementById('thsrListContainer').innerHTML = errorHtml;
        document.getElementById('traListContainer').innerHTML = errorHtml;
      } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> 即時雷達';
      }
    }

    // 餘位直覺數值化徽章 (>50 / <10 / 0 / 已發車)
    function getSeatBadge(code, isDeparted) {
      if (isDeparted) {
        return '<span class="px-2 py-0.5 rounded-md text-[11px] text-slate-500 bg-slate-800/80 border border-slate-700/60 font-medium" title="此班車已過發車時間">已發車</span>';
      }
      if (code === 'O') return '<span class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20" title="官方狀態：充足 (估計剩餘 >50 席)">&gt;50 席</span>';
      if (code === 'L') return '<span class="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/20 animate-pulse" title="官方狀態：緊張 (即將售罄，剩餘 <10 席)">&lt;10 席</span>';
      if (code === 'X') return '<span class="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/20" title="官方狀態：客滿 (對號座已無座位，可搭乘自由座)">0 席</span>';
      return '<span class="px-2 py-0.5 rounded-md text-[11px] text-slate-400 bg-slate-800/80 border border-slate-700/60">- 依官網</span>';
    }

    // 分欄渲染 (支援「僅看有位」與「已發車識別」)
    function renderColumns(data) {
      const rawThsr = data.thsr || [];
      const rawTra = data.tra || [];

      // 取得台灣目前時分
      const now = new Date();
      const currentTaipeiTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
      const selectedDate = document.getElementById('dateInput').value;
      const isToday = (selectedDate === todayStr);

      const onlyAvailable = document.getElementById('onlyAvailableCheck').checked;

      // 判斷班次是否已開出 / 是否有位
      const allThsr = rawThsr.map(t => {
        const isDeparted = isToday && (t.departureTime < currentTaipeiTime);
        const hasSeats = !isDeparted && (t.seats.standard === 'O' || t.seats.standard === 'L' || t.seats.business === 'O' || t.seats.business === 'L');
        return { ...t, isDeparted, hasSeats };
      });

      const allTra = rawTra.map(t => {
        const isDeparted = isToday && (t.departureTime < currentTaipeiTime);
        return { ...t, isDeparted };
      });

      const thsrTrains = onlyAvailable ? allThsr.filter(t => t.hasSeats) : allThsr;
      const traTrains = (onlyAvailable && isToday) ? allTra.filter(t => !t.isDeparted) : allTra;

      // ── 渲染高鐵欄位 ──────────────────────────────────────────
      document.getElementById('thsrBadge').innerText = onlyAvailable
        ? \`\${thsrTrains.length} 班有座 (共 \${allThsr.length} 班)\`
        : \`\${thsrTrains.length} 班次\`;

      // 統計高鐵餘位概況 (直覺數值化)
      let countO = 0, countL = 0, countX = 0, countDeparted = 0;
      allThsr.forEach(t => {
        if (t.isDeparted) countDeparted++;
        else if (t.seats.standard === 'O') countO++;
        else if (t.seats.standard === 'L') countL++;
        else if (t.seats.standard === 'X') countX++;
      });
      document.getElementById('thsrSeatStats').innerHTML = \`
        <span class="text-emerald-400 font-bold"><span class="w-2 h-2 rounded-full inline-block bg-emerald-500 mr-1"></span>\${countO} 充足 (&gt;50)</span>
        <span class="text-amber-400 font-bold ml-1.5"><span class="w-2 h-2 rounded-full inline-block bg-amber-500 mr-1"></span>\${countL} 緊張 (&lt;10)</span>
        <span class="text-rose-400 font-bold ml-1.5"><span class="w-2 h-2 rounded-full inline-block bg-rose-500 mr-1"></span>\${countX} 客滿 (0)</span>
        \${countDeparted > 0 ? \`<span class="text-slate-500 ml-1.5 font-normal">(\${countDeparted} 已開出)</span>\` : ''}
      \`;

      const thsrContainer = document.getElementById('thsrListContainer');
      if (thsrTrains.length === 0) {
        thsrContainer.innerHTML = \`
          <div class="py-14 text-center text-slate-500 glass-card rounded-2xl">
            <i class="fa-solid fa-bolt text-3xl mb-3 opacity-30"></i>
            <p class="font-medium text-sm">此條件下查無符合的高鐵有位班次。</p>
            <p class="text-[11px] text-slate-600 mt-1">可取消勾選「僅看有位車次」查看已客滿或已發車之完整車次（或搭乘自由座）。</p>
          </div>
        \`;
      } else {
        thsrContainer.innerHTML = thsrTrains.map(item => {
          const cardOpacity = item.isDeparted ? 'opacity-60' : '';
          const isStandardSoldOut = (!item.isDeparted && item.seats.standard === 'X');

          return \`
            <div class="glass-card hover:bg-slate-800/80 hover:border-orange-500/40 rounded-2xl p-4 transition-all duration-200 border border-slate-700/60 shadow-md \${cardOpacity}">
              <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <div class="flex items-center gap-2">
                  <span class="font-black text-white text-base font-mono">\${item.trainNo} 次</span>
                  <span class="text-xs px-2.5 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/30 font-bold">台灣高鐵</span>
                  <span class="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <i class="fa-regular fa-clock text-[10px]"></i> \${item.durationMinutes} 分鐘
                  </span>
                </div>
                \${item.isDeparted ? \`
                  <span class="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold">已開出</span>
                \` : \`
                  <a href="\${item.bookingUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition flex items-center gap-1">
                    <span>訂票</span>
                    <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                \`}
              </div>

              <div class="flex items-center justify-between">
                <!-- 時間 -->
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-black text-white text-xl">\${item.departureTime}</span>
                    <span class="text-slate-500 text-xs">➔</span>
                    <span class="font-mono font-black text-slate-200 text-xl">\${item.arrivalTime}</span>
                    <span class="text-[11px] text-slate-400 ml-1">(\${item.originStationName} ➔ \${item.destinationStationName})</span>
                  </div>
                  \${isStandardSoldOut ? \`
                    <div class="mt-1">
                      <span class="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 font-semibold inline-flex items-center gap-1">
                        <i class="fa-solid fa-person-walking text-[10px]"></i> 對號座客滿，可搭自由座 (9~12 車)
                      </span>
                    </div>
                  \` : ''}
                </div>

                <!-- 即時餘位狀態 -->
                <div class="flex items-center gap-3">
                  <div class="text-center">
                    <span class="text-slate-400 block text-[10px] mb-0.5">標準座</span>
                    \${getSeatBadge(item.seats.standard, item.isDeparted)}
                  </div>
                  <div class="text-center">
                    <span class="text-slate-400 block text-[10px] mb-0.5">商務座</span>
                    \${getSeatBadge(item.seats.business, item.isDeparted)}
                  </div>
                </div>
              </div>
            </div>
          \`;
        }).join('');
      }

      // ── 渲染台鐵欄位 ──────────────────────────────────────────
      document.getElementById('traBadge').innerText = \`\${traTrains.length} 班次\`;

      const traContainer = document.getElementById('traListContainer');
      if (traTrains.length === 0) {
        traContainer.innerHTML = \`
          <div class="py-14 text-center text-slate-500 glass-card rounded-2xl">
            <i class="fa-solid fa-train text-3xl mb-3 opacity-30"></i>
            <p class="font-medium text-sm">此時段查無符合的台鐵班次。</p>
            <p class="text-[11px] text-slate-600 mt-1">請嘗試調整出發或到站時間範圍。</p>
          </div>
        \`;
      } else {
        traContainer.innerHTML = traTrains.map(item => {
          // 車種顏色辨識
          let typeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
          if (item.trainTypeName.includes('自強') || item.trainTypeName.includes('普悠瑪') || item.trainTypeName.includes('太魯閣')) {
            typeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
          } else if (item.trainTypeName.includes('莒光')) {
            typeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
          }

          const cardOpacity = item.isDeparted ? 'opacity-60' : '';

          return \`
            <div class="glass-card hover:bg-slate-800/80 hover:border-sky-500/40 rounded-2xl p-4 transition-all duration-200 border border-slate-700/60 shadow-md \${cardOpacity}">
              <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <div class="flex items-center gap-2">
                  <span class="font-black text-white text-base font-mono">\${item.trainNo} 次</span>
                  <span class="text-xs px-2.5 py-0.5 rounded-full border \${typeColor} font-bold">\${item.trainTypeName}</span>
                  <span class="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <i class="fa-regular fa-clock text-[10px]"></i> \${item.durationMinutes} 分鐘
                  </span>
                </div>
                \${item.isDeparted ? \`
                  <span class="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold">已開出</span>
                \` : \`
                  <a href="\${item.bookingUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition flex items-center gap-1">
                    <span>直連訂票</span>
                    <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                \`}
              </div>

              <div class="flex items-center justify-between">
                <!-- 時間 -->
                <div class="flex items-center gap-2">
                  <span class="font-mono font-black text-white text-xl">\${item.departureTime}</span>
                  <span class="text-slate-500 text-xs">➔</span>
                  <span class="font-mono font-black text-slate-200 text-xl">\${item.arrivalTime}</span>
                  <span class="text-[11px] text-slate-400 ml-1">(\${item.originStationName} ➔ \${item.destinationStationName})</span>
                </div>

                <!-- 台鐵狀態提示 -->
                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block mb-0.5">售票狀態</span>
                  \${item.isDeparted ? \`
                    <span class="px-2 py-0.5 rounded-md text-[11px] text-slate-500 bg-slate-800/80 border border-slate-700/60">
                      已發車
                    </span>
                  \` : \`
                    <span class="px-2 py-0.5 rounded-md text-[11px] text-slate-400 bg-slate-900 border border-slate-700/60">
                      依 e 訂通官方
                    </span>
                  \`}
                </div>
              </div>
            </div>
          \`;
        }).join('');
      }
    }

    // 監聽「僅看有位車次」即時開關切換 (零延遲本地即時重新渲染)
    document.getElementById('onlyAvailableCheck').addEventListener('change', () => {
      if (currentRadarData) {
        renderColumns(currentRadarData);
      }
    });

    // 交換起訖站
    document.getElementById('swapBtn').addEventListener('click', () => {
      const o = document.getElementById('originSelect');
      const d = document.getElementById('destSelect');
      const tmp = o.value;
      o.value = d.value;
      d.value = tmp;
      queryRailRadar();
    });

    // 快捷路線晶片按鈕
    document.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('originSelect').value = btn.dataset.origin;
        document.getElementById('destSelect').value = btn.dataset.dest;
        queryRailRadar();
      });
    });

    // ── 進階時間面板收合切換 ──────────────────────────────────────────
    function toggleAdvancedPanel(forceOpen) {
      const panel = document.getElementById('advancedPanel');
      const chevron = document.getElementById('advancedChevron');
      const btn = document.getElementById('toggleAdvancedBtn');
      const isHidden = panel.classList.contains('hidden');
      const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isHidden;

      if (shouldOpen) {
        panel.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (btn) btn.classList.add('border-orange-500/50', 'bg-slate-800');
      } else {
        panel.classList.add('hidden');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        if (btn) btn.classList.remove('border-orange-500/50');
      }
    }

    const toggleAdvBtn = document.getElementById('toggleAdvancedBtn');
    if (toggleAdvBtn) toggleAdvBtn.addEventListener('click', () => toggleAdvancedPanel());
    const closeAdvBtn = document.getElementById('closeAdvancedBtn');
    if (closeAdvBtn) closeAdvBtn.addEventListener('click', () => toggleAdvancedPanel(false));

    // 時段快選膠囊按鈕
    document.querySelectorAll('.time-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-preset').forEach(b => {
          b.className = 'time-preset px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-medium';
        });
        btn.className = 'time-preset px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold';

        if (btn.dataset.preset === 'now') {
          const hh = String(new Date().getHours()).padStart(2, '0');
          const mm = String(new Date().getMinutes()).padStart(2, '0');
          document.getElementById('depAfterInput').value = \`\${hh}:\${mm}\`;
          document.getElementById('depBeforeInput').value = '';
          document.getElementById('arrAfterInput').value = '';
          document.getElementById('arrBeforeInput').value = '';
        } else {
          document.getElementById('depAfterInput').value = btn.dataset.depAfter || '';
          document.getElementById('depBeforeInput').value = btn.dataset.depBefore || '';
          document.getElementById('arrAfterInput').value = btn.dataset.arrAfter || '';
          document.getElementById('arrBeforeInput').value = btn.dataset.arrBefore || '';
        }
        queryRailRadar();
      });
    });

    // 清空出發時間
    const clearDep = document.getElementById('clearDepBtn');
    if (clearDep) {
      clearDep.addEventListener('click', () => {
        document.getElementById('depAfterInput').value = '';
        document.getElementById('depBeforeInput').value = '';
        queryRailRadar();
      });
    }

    // 清空到站時間
    const clearArr = document.getElementById('clearArrBtn');
    if (clearArr) {
      clearArr.addEventListener('click', () => {
        document.getElementById('arrAfterInput').value = '';
        document.getElementById('arrBeforeInput').value = '';
        queryRailRadar();
      });
    }

    // 出發快捷區間速選
    document.querySelectorAll('.dep-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('depAfterInput').value = btn.dataset.after || '';
        document.getElementById('depBeforeInput').value = btn.dataset.before || '';
        queryRailRadar();
      });
    });

    // 到站快捷速選
    document.querySelectorAll('.arr-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('arrBeforeInput').value = btn.dataset.before || '';
        queryRailRadar();
      });
    });

    // 重設全部時間條件
    const resetAllBtn = document.getElementById('resetAllTimeBtn');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        document.getElementById('depAfterInput').value = '';
        document.getElementById('depBeforeInput').value = '';
        document.getElementById('arrAfterInput').value = '';
        document.getElementById('arrBeforeInput').value = '';

        document.querySelectorAll('.time-preset').forEach(b => {
          b.className = 'time-preset px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-medium';
        });
        const allDayBtn = document.querySelector('.time-preset[data-dep-after=""][data-dep-before=""]');
        if (allDayBtn) {
          allDayBtn.className = 'time-preset px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold';
        }
        queryRailRadar();
      });
    }

    // 套用進階時間篩選
    const applyAdvBtn = document.getElementById('applyAdvancedBtn');
    if (applyAdvBtn) {
      applyAdvBtn.addEventListener('click', queryRailRadar);
    }

    // 監聽變更觸發查詢
    document.getElementById('searchBtn').addEventListener('click', queryRailRadar);
    document.getElementById('originSelect').addEventListener('change', queryRailRadar);
    document.getElementById('destSelect').addEventListener('change', queryRailRadar);
    document.getElementById('dateInput').addEventListener('change', queryRailRadar);

    // 時間欄位即時變更與 Enter 送出
    ['depAfterInput', 'depBeforeInput', 'arrAfterInput', 'arrBeforeInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', queryRailRadar);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') queryRailRadar();
        });
      }
    });

    // 初始載入查詢
    queryRailRadar();
  </script>
</body>
</html>`;
}
