# API: query_station_timetable
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
- destination_name: string (目的地車站名稱)
- top: number (回傳筆數上限)

## Sample
- Semantic: 幫我查一下台鐵台北車站今天往花蓮的發車時刻表
- Payload:
```json
{
  "rail_type": "tra",
  "station_name": "台北",
  "destination_name": "花蓮",
  "top": 10
}
```
