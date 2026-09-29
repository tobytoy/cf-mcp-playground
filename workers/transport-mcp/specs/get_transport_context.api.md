# API: get_transport_context
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
```json
{
  "identity": "ev",
  "state": "urgent",
  "latitude": 25.033964,
  "longitude": 121.564468,
  "location_name": "台北101",
  "radius_meters": 1000
}
```
