from PIL import Image, ImageDraw, ImageFont
import os

def generate_menu():
    width = 2500
    height = 1686
    font_path = "/home/toby/.local/share/fonts/NotoSansTC-Variable.ttf"

    img = Image.new("RGB", (width, height), color="#0F172A")
    draw = ImageDraw.Draw(img)

    col_w = width // 3
    row_h = height // 2
    pad = 28

    cards = [
        {
            "tag": "TODOS / TASKS",
            "title": "生活待辦",
            "sub": "待辦事項 • Sheet 同步",
            "accent": "#4F46E5",
            "bg": "#1E1B4B"
        },
        {
            "tag": "TRANSPORT",
            "title": "找 YouBike",
            "sub": "即時站點 • 車位查詢",
            "accent": "#10B981",
            "bg": "#064E3B"
        },
        {
            "tag": "WEATHER / CWA",
            "title": "即時天氣",
            "sub": "降雨機率 • 穿衣提醒",
            "accent": "#0284C7",
            "bg": "#0C4A6E"
        },
        {
            "tag": "FEATURED APPS",
            "title": "精選專案",
            "sub": "Luna AI • 公告 • 聊天室",
            "accent": "#6366F1",
            "bg": "#1E1B4B"
        },
        {
            "tag": "MINI APP",
            "title": "語音工作室",
            "sub": "說話者辨識 • 逐字稿",
            "accent": "#EC4899",
            "bg": "#500724"
        },
        {
            "tag": "DASHBOARD",
            "title": "功能總覽",
            "sub": "快捷卡片 • 控制台",
            "accent": "#8B5CF6",
            "bg": "#2E1065"
        }
    ]

    try:
        font_title = ImageFont.truetype(font_path, 88)
        font_sub = ImageFont.truetype(font_path, 40)
        font_tag = ImageFont.truetype(font_path, 32)
        font_btn = ImageFont.truetype(font_path, 42)
    except:
        font_title = font_sub = font_tag = font_btn = ImageFont.load_default()

    for idx, c in enumerate(cards):
        c_idx = idx % 3
        r_idx = idx // 3
        x1 = c_idx * col_w + pad
        y1 = r_idx * row_h + pad
        x2 = (c_idx + 1) * col_w - pad
        y2 = (r_idx + 1) * row_h - pad

        # Background rounded box
        draw.rounded_rectangle([x1, y1, x2, y2], radius=40, fill=c["bg"], outline=c["accent"], width=5)

        # Top tag
        draw.text((x1 + 60, y1 + 60), c["tag"], font=font_tag, fill=c["accent"])

        # Main Title
        draw.text((x1 + 60, y1 + 130), c["title"], font=font_title, fill="#FFFFFF")

        # Subtitle
        draw.text((x1 + 60, y1 + 270), c["sub"], font=font_sub, fill="#94A3B8")

        # Bottom Button
        btn_y1 = y2 - 130
        btn_y2 = y2 - 40
        draw.rounded_rectangle([x1 + 50, btn_y1, x2 - 50, btn_y2], radius=24, fill="#0F172A", outline=c["accent"], width=3)
        draw.text((x1 + 220, btn_y1 + 24), "點 擊 啟 動  ➔", font=font_btn, fill=c["accent"])

    out_path = "workers/personal-assistant/src/assets/richmenu.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)
    print(f"Personal assistant rich menu image saved at {out_path}")

if __name__ == "__main__":
    generate_menu()
