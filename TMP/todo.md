第一層：MCP（核心產品）
提供：
Plain Text
1
TDX MCP Server
顯示更多行
例如：
Plain Text
1
get_nearby_parking()
2
 
3
get_nearby_ev_charger()
4
 
5
get_nearby_bus()
6
 
7
get_nearby_youbike()
8
 
9
get_traffic_incident()
10
 
11
recommend_transport()
顯示更多行
任何 AI 都可以接：
ChatGPT
Claude
Copilot Studio
VS Code Agent
Cursor
Open WebUI
AnythingLLM
自建 Agent

這才是長期價值。
因為只要 MCP 存在，
一百個 App 都能長出來。

第二層：Demo App
App不要做太重。
目的不是服務民眾。
而是展示 MCP 能力。
例如：
Plain Text
1
身份
2
↓
3
行人
4
腳踏車
5
機車
6
汽車
顯示更多行
再選：
Plain Text
1
有目的地
2
無目的地
顯示更多行

然後 App 只是把 MCP 回傳結果顯示出來。
例如：
汽車 + 無目的地
AI回傳
Plain Text
1
附近停車場
2
 
3
A停車場
4
剩餘32格
5
 
6
B停車場
7
剩餘3格
8
 
9
充電站
10
距離400公尺
11
空閒4槍
12
 
13
前方1公里事故
14
建議改道
顯示更多行

真正有趣的是 Context Engine
我反而覺得 MCP 不要只包 TDX API。
應該包一個推理層。
例如：
Plain Text
1
身份
2
+
3
目的性
4
+
5
位置
6
+
7
時間
8
+
9
TDX資料
顯示更多行
變成：
Plain Text
1
交通情境(Context)
顯示更多行

例如：
使用者是：
Plain Text
1
汽車
2
無目的地
3
台北101
4
週六晚上7點
顯示更多行
MCP不要回：
JSON
1
{
2
"parking": ...
3
}
顯示更多行
而是回：
JSON
1
{
2
"situation":"商圈停車需求高峰",
3
"recommendation":"建議停信義A場",
4
"risk":"30分鐘後可能滿位"
5
}
顯示更多行

我覺得這會是你的亮點
因為大家都能做：
Plain Text
1
TDX API MCP
顯示更多行
很快就有人做出來。
但你做的是：
Plain Text
1
Transportation Context MCP
顯示更多行
交通情境 MCP

換句話說。
不是：
Plain Text
1
給我附近停車場
顯示更多行
而是：
Plain Text
1
我是汽車族
2
 
3
人在台北101
4
 
5
現在適合知道什麼？



