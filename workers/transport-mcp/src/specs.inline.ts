export const INLINE_TRANSPORT_SPECS: Record<string, string> = {
  "get_transport_context.api.md": `# API: get_transport_context
Version: 1.0.0
Stage: prod
> 依使用者身分、狀態與GPS座標，自動評估整體交通情境並產出行動建議與風險警示

## Intent
User wants to get real-time surrounding transport context, parking, weather, road events or YouBike availability based on location and transport identity

## Fields
- identity: enum (使用者交通工具身分)
  - car: 自小客車
  - ev: 電動車
  - scooter: 機車
  - bike: 自行車 / YouBike
  - transit: 大眾運輸
  - pedestrian: 行人
- state: enum (使用者當前狀態與意圖)
  - cruising: 無特定目的地漫遊
  - urgent: 趕時間
  - commute_in: 通勤上班
  - commute_out: 下班返家
  - transit_transfer: 轉乘接駁
  - rain_fallback: 雨天備案
- latitude: number (目前緯度 WGS84)
- longitude: number (目前經度 WGS84)
- location_name: string (地標或行政區名稱，選填)
- radius_meters: number (搜尋半徑公尺數，選填)

## Sample
- Semantic: 我在台北101附近開電動車，現在在趕時間，幫我看一下附近路況、快充站跟停車場
- Payload:
\`\`\`json
{
  "identity": "ev",
  "state": "urgent",
  "latitude": 25.033964,
  "longitude": 121.564468,
  "location_name": "台北101",
  "radius_meters": 1000
}
\`\`\`
`,

  "plan_contextual_route.api.md": `# API: plan_contextual_route
Version: 1.0.0
Stage: prod
> 結合起訖點、身分、沿途施工/事故避讓與終點停車/充電即時預警之情境全旅程路徑規劃

## Intent
User wants to plan a route or journey between origin and destination with traffic-aware alerts, parking, charging or transit alternatives

## Fields
- origin_latitude: number (出發地緯度)
- origin_longitude: number (出發地經度)
- origin_name: string (出發地地標名稱，選填)
- destination_latitude: number (目的地緯度)
- destination_longitude: number (目的地經度)
- destination_name: string (目的地地標名稱，選填)
- identity: enum (交通工具類別)
  - car: 汽車
  - ev: 電動車
  - scooter: 機車
  - bike: 單車
  - transit: 大眾運輸
  - multimodal: 多運具複合
- urgency: enum (急迫度)
  - normal: 一般
  - high: 趕時間
  - relaxed: 輕鬆漫遊

## Sample
- Semantic: 從台北車站開電動車到市政府，趕時間，需要終點有充電位
- Payload:
\`\`\`json
{
  "origin_latitude": 25.047761,
  "origin_longitude": 121.517055,
  "origin_name": "台北車站",
  "destination_latitude": 25.041045,
  "destination_longitude": 121.565261,
  "destination_name": "台北市政府",
  "identity": "ev",
  "urgency": "high"
}
\`\`\`
`,

  "query_station_timetable.api.md": `# API: query_station_timetable
Version: 1.0.0
Stage: prod
> 查詢指定台鐵、高鐵或捷運車站之發車時刻表與列車動態

## Intent
User wants to check train timetable, departures, schedule or arrivals for railway or metro stations

## Fields
- rail_type: enum (軌道運具類型)
  - tra: 台鐵 TRA
  - thsr: 台灣高鐵 THSR
  - metro: 捷運 Metro
- station_name: string (車站名稱，例如 '台北', '南港', '左營')
- destination_name: string (目的地車站名稱，選填)
- top: number (回傳筆數上限，選填)

## Sample
- Semantic: 幫我查一下台鐵台北車站今天往花蓮的發車時刻表
- Payload:
\`\`\`json
{
  "rail_type": "tra",
  "station_name": "台北",
  "destination_name": "花蓮",
  "top": 10
}
\`\`\`
`,
};
