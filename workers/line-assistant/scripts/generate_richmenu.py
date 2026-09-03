from PIL import Image, ImageDraw, ImageFont
import os

def generate_menu():
    width = 2500
    height = 1686
    font_path = "/home/toby/.local/share/fonts/NotoSansTC-Variable.ttf"

    img = Image.new("RGB", (width, height), color="#0B132B")
    draw = ImageDraw.Draw(img)

    col_w = width // 3
    row_h = height // 2
    pad = 28

    cards = [
        {
            "id": "todo",
            "tag": "TODO LIST",
            "title": "待辦事項",
            "sub": "Google 試算表雙向同步",
            "accent": "#10B981",
            "bg": "#132337",
            "border": "#1E3A5F"
        },
        {
            "id": "weather",
            "tag": "CWA WEATHER",
            "title": "天母天氣",
            "sub": "氣象署 36h 降雨與體感",
            "accent": "#0284C7",
            "bg": "#132337",
            "border": "#1E3A5F"
        },
        {
            "id": "exam",
            "tag": "MOCK EXAM",
            "title": "國考刷題",
            "sub": "資訊處理 101~114 題庫",
            "accent": "#6366F1",
            "bg": "#132337",
            "border": "#1E3A5F"
        },
        {
            "id": "search",
            "tag": "AI SEARCH",
            "title": "即時搜尋",
            "sub": "Gemma 整理 ➔ Gemini 決策",
            "accent": "#F59E0B",
            "bg": "#132337",
            "border": "#1E3A5F"
        },
        {
            "id": "transit",
            "tag": "LOCAL TRANSIT",
            "title": "周邊交通",
            "sub": "YouBike 2.0 與即時車位",
            "accent": "#06B6D4",
            "bg": "#132337",
            "border": "#1E3A5F"
        },
        {
            "id": "stats",
            "tag": "DIAGNOSTICS",
            "title": "歷史用量",
            "sub": "模型調用統計與系統日誌",
            "accent": "#A855F7",
            "bg": "#132337",
            "border": "#1E3A5F"
        }
    ]

    font_title = ImageFont.truetype(font_path, 92)
    font_sub = ImageFont.truetype(font_path, 42)
    font_tag = ImageFont.truetype(font_path, 32)
    font_btn = ImageFont.truetype(font_path, 44)

    def draw_icon(draw, icon_id, cx, cy, color):
        if icon_id == "todo":
            draw.rounded_rectangle([cx - 45, cy - 55, cx + 45, cy + 55], radius=14, outline=color, width=7)
            draw.rectangle([cx - 22, cy - 65, cx + 22, cy - 45], fill=color)
            draw.line([cx - 28, cy - 15, cx + 28, cy - 15], fill=color, width=6)
            draw.line([cx - 28, cy + 10, cx + 28, cy + 10], fill=color, width=6)
            draw.line([cx - 28, cy + 32, cx + 15, cy + 32], fill=color, width=6)
        elif icon_id == "weather":
            draw.ellipse([cx - 10, cy - 50, cx + 45, cy + 5], outline="#F59E0B", width=6)
            draw.ellipse([cx - 50, cy - 10, cx + 5, cy + 45], fill=color)
            draw.ellipse([cx - 25, cy - 35, cx + 35, cy + 25], fill=color)
            draw.ellipse([cx + 5, cy - 10, cx + 50, cy + 45], fill=color)
            draw.rectangle([cx - 40, cy + 10, cx + 40, cy + 45], fill=color)
        elif icon_id == "exam":
            draw.ellipse([cx - 52, cy - 52, cx + 52, cy + 52], outline=color, width=6)
            draw.ellipse([cx - 32, cy - 32, cx + 32, cy + 32], outline=color, width=5)
            draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=color)
        elif icon_id == "search":
            draw.ellipse([cx - 46, cy - 50, cx + 18, cy + 14], outline=color, width=8)
            draw.line([cx + 12, cy + 8, cx + 50, cy + 46], fill=color, width=12)
        elif icon_id == "transit":
            draw.ellipse([cx - 38, cy - 54, cx + 38, cy + 22], outline=color, width=8)
            draw.ellipse([cx - 15, cy - 31, cx + 15, cy - 1], fill=color)
            draw.polygon([(cx - 22, cy + 10), (cx + 22, cy + 10), (cx, cy + 56)], fill=color)
        elif icon_id == "stats":
            draw.rectangle([cx - 48, cy + 8, cx - 22, cy + 48], fill=color)
            draw.rectangle([cx - 13, cy - 16, cx + 13, cy + 48], fill=color)
            draw.rectangle([cx + 22, cy - 42, cx + 48, cy + 48], fill=color)
            draw.line([cx - 55, cy + 48, cx + 55, cy + 48], fill=color, width=5)

    for idx, c_info in enumerate(cards):
        r = idx // 3
        c = idx % 3
        
        x1 = c * col_w + pad
        y1 = r * row_h + pad
        x2 = (c + 1) * col_w - pad
        y2 = (r + 1) * row_h - pad
        
        draw.rounded_rectangle([x1, y1, x2, y2], radius=48, fill=c_info["bg"], outline=c_info["border"], width=4)
        draw.rounded_rectangle([x1 + 38, y1 + 38, x1 + 220, y1 + 90], radius=18, fill="#0F172A", outline=c_info["accent"], width=2)
        draw.text((x1 + 55, y1 + 46), c_info["tag"], font=font_tag, fill=c_info["accent"])
        
        icon_box_x = x1 + 130
        icon_box_y = y1 + 270
        draw.ellipse([icon_box_x - 90, icon_box_y - 90, icon_box_x + 90, icon_box_y + 90], fill="#0F172A", outline=c_info["accent"], width=4)
        draw_icon(draw, c_info["id"], icon_box_x, icon_box_y, c_info["accent"])
        
        draw.text((x1 + 260, y1 + 220), c_info["title"], font=font_title, fill="#FFFFFF")
        draw.text((x1 + 65, y1 + 430), c_info["sub"], font=font_sub, fill="#94A3B8")
        
        btn_y1 = y2 - 170
        btn_y2 = y2 - 60
        draw.rounded_rectangle([x1 + 55, btn_y1, x2 - 55, btn_y2], radius=28, fill="#0F172A", outline=c_info["accent"], width=3)
        draw.text((x1 + 240, btn_y1 + 28), "點 擊 啟 動 ➔", font=font_btn, fill=c_info["accent"])

    out_path = "workers/line-assistant/src/assets/richmenu.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)
    print(f"Rich menu saved at {out_path}")

if __name__ == "__main__":
    generate_menu()
