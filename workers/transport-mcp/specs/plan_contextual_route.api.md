# API: plan_contextual_route
Version: 1.0.0
Stage: prod
> 結合起訖點、身分、沿途施工/事故避讓與終點停車/充電即時預警之情境全旅程路徑規劃

## Intent
User wants to plan a route or journey between origin and destination with traffic-aware alerts, parking, charging or transit alternatives

## Fields
- origin_latitude: number (出發地緯度)
- origin_longitude: number (出發地經度)
- origin_name: string (出發地地標名稱)
- destination_latitude: number (目的地緯度)
- destination_longitude: number (目的地經度)
- destination_name: string (目的地地標名稱)
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
```json
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
```
