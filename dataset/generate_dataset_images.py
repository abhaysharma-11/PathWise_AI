"""
Generates realistic demonstration street imagery for the Jaipur Ram Niwas Garden precinct
with embedded EXIF GPS tags conforming to real ground coordinates.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import piexif

OUTPUT_DIR = Path(__file__).resolve().parent / "images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def create_gps_exif(lat: float, lon: float) -> bytes:
    """Encodes decimal latitude and longitude into standard EXIF GPS tags."""
    def dec_to_dms(deg: float):
        d = int(abs(deg))
        m = int((abs(deg) - d) * 60)
        s = int(round(((abs(deg) - d) * 60 - m) * 60 * 100))
        return ((d, 1), (m, 1), (s, 100))

    lat_ref = "N" if lat >= 0 else "S"
    lon_ref = "E" if lon >= 0 else "W"

    gps_ifd = {
        piexif.GPSIFD.GPSVersionID: (2, 0, 0, 0),
        piexif.GPSIFD.GPSLatitudeRef: lat_ref,
        piexif.GPSIFD.GPSLatitude: dec_to_dms(lat),
        piexif.GPSIFD.GPSLongitudeRef: lon_ref,
        piexif.GPSIFD.GPSLongitude: dec_to_dms(lon),
    }

    exif_dict = {"0th": {}, "Exif": {}, "GPS": gps_ifd, "1st": {}, "thumbnail": None}
    return piexif.dump(exif_dict)


def generate_stairs_image():
    w, h = 1280, 720
    im = Image.new("RGB", (w, h), color="#1e2433")
    draw = ImageDraw.Draw(im)

    # Sky gradient background
    for y in range(260):
        c = (28 + int(y * 0.15), 36 + int(y * 0.12), 58 + int(y * 0.1))
        draw.line([(0, y), (w, y)], fill=c)

    # Albert Hall Museum facade silhouette (Indo-Saracenic arches & chhatris)
    draw.rectangle([180, 140, 1100, 260], fill="#8b4a3e")
    # Domes & Chhatris
    draw.ellipse([580, 70, 700, 160], fill="#b35f4f")
    draw.polygon([(640, 40), (620, 80), (660, 80)], fill="#d97764")
    for cx in [240, 420, 860, 1040]:
        draw.ellipse([cx - 30, 110, cx + 30, 150], fill="#a05244")
        draw.rectangle([cx - 20, 130, cx + 20, 180], fill="#8b4a3e")

    # Upper terrace promenade
    draw.rectangle([0, 260, w, 310], fill="#c29b7f")

    # Monumental 18 Steps
    step_y = 310
    total_steps = 18
    step_height = (620 - 310) / total_steps
    for i in range(total_steps):
        top_y = int(310 + i * step_height)
        bot_y = int(top_y + step_height)
        tread_color = "#b08569" if i % 2 == 0 else "#9e7256"
        riser_color = "#7a543e"
        # Tread
        draw.polygon([(160 - i * 8, top_y), (1120 + i * 8, top_y), (1120 + i * 8, top_y + 8), (160 - i * 8, top_y + 8)], fill=tread_color)
        # Riser
        draw.polygon([(160 - i * 8, top_y + 8), (1120 + i * 8, top_y + 8), (1120 + i * 8, bot_y), (160 - i * 8, bot_y)], fill=riser_color)

    # Lower courtyard forecourt
    draw.rectangle([0, 620, w, h], fill="#3d3733")

    # Stone banister railings on sides (no ramp visible)
    draw.polygon([(120, 260), (160, 260), (40, 620), (0, 620)], fill="#8c624a")
    draw.polygon([(1120, 260), (1160, 260), (1280, 620), (1240, 620)], fill="#8c624a")

    # Overlay banner label for survey reference
    draw.rectangle([40, 40, 620, 100], fill=(15, 23, 42, 220))
    draw.text((60, 50), "SURVEY: ALBERT HALL NORTH ENTRANCE", fill="#38bdf8")
    draw.text((60, 72), "18 Monumental Sandstone Steps (16.5% incline, no ramp)", fill="#f87171")

    filename = OUTPUT_DIR / "jaipur_albert_hall_stairs.jpg"
    try:
        exif_bytes = create_gps_exif(26.9130, 75.8189)
        im.save(filename, "JPEG", quality=90, exif=exif_bytes)
    except Exception:
        im.save(filename, "JPEG", quality=90)
    print(f"Generated {filename}")


def generate_scooter_image():
    w, h = 1280, 720
    im = Image.new("RGB", (w, h), color="#1e2433")
    draw = ImageDraw.Draw(im)

    # Garden background trees
    draw.rectangle([0, 0, w, 320], fill="#142c1d")
    for cx in range(80, w, 140):
        draw.ellipse([cx - 80, 40, cx + 80, 260], fill="#1e462c")

    # North Gate Central Allée Walkway (perspective)
    # Left lawn, walkway in center, right lawn
    draw.polygon([(0, 300), (w, 300), (w, h), (0, h)], fill="#23452b")  # grass base
    draw.polygon([(460, 300), (820, 300), (1100, h), (180, h)], fill="#7a8288")  # concrete walkway

    # Tactile paving strip (yellow tiles on side)
    draw.polygon([(470, 300), (510, 300), (280, h), (210, h)], fill="#eab308")

    # Scooter / Two-Wheeler parked perpendicularly across the walkway!
    # Wheels
    draw.ellipse([420, 480, 520, 580], fill="#1e293b", outline="#0f172a", width=6)
    draw.ellipse([780, 480, 880, 580], fill="#1e293b", outline="#0f172a", width=6)
    # Wheel rims
    draw.ellipse([445, 505, 495, 555], fill="#94a3b8")
    draw.ellipse([805, 505, 855, 555], fill="#94a3b8")
    # Scooter chassis / body
    draw.polygon([(460, 440), (840, 430), (860, 510), (440, 520)], fill="#dc2626")  # red body
    draw.rectangle([540, 390, 740, 440], fill="#0f172a")  # black seat
    # Front shield & handlebar
    draw.polygon([(420, 340), (470, 340), (500, 450), (440, 450)], fill="#dc2626")
    draw.line([(390, 340), (500, 340)], fill="#334155", width=8)  # handlebar
    draw.ellipse([430, 325, 460, 355], fill="#fef08a")  # headlight
    # Center kickstand resting on sidewalk
    draw.line([(640, 490), (630, 570)], fill="#475569", width=6)

    # Remaining clear width indicator (showing only 40cm clear gap)
    draw.line([(890, 520), (1060, 520)], fill="#ef4444", width=3)
    draw.rectangle([40, 40, 640, 100], fill=(15, 23, 42, 220))
    draw.text((60, 50), "SURVEY: NORTH GATE CENTRAL ALLÉE", fill="#38bdf8")
    draw.text((60, 72), "Two-Wheeler Parked Across Footpath (Usable width < 45cm)", fill="#f87171")

    filename = OUTPUT_DIR / "jaipur_ram_niwas_parked_scooter.jpg"
    try:
        exif_bytes = create_gps_exif(26.9150, 75.8185)
        im.save(filename, "JPEG", quality=90, exif=exif_bytes)
    except Exception:
        im.save(filename, "JPEG", quality=90)
    print(f"Generated {filename}")


def generate_uneven_stone_image():
    w, h = 1280, 720
    im = Image.new("RGB", (w, h), color="#1e2433")
    draw = ImageDraw.Draw(im)

    # Historic boundary wall
    draw.rectangle([0, 0, w, 280], fill="#8c5847")
    for y in range(0, 280, 40):
        draw.line([(0, y), (w, y)], fill="#6c3f30", width=2)
    for x in range(0, w, 90):
        draw.line([(x, 0), (x, 280)], fill="#6c3f30", width=2)

    # Uneven stone cobblestone surface in perspective
    draw.polygon([(0, 280), (w, 280), (w, h), (0, h)], fill="#57534e")
    import random
    random.seed(42)
    for row in range(14):
        y1 = int(280 + (row / 14.0) ** 1.3 * 440)
        y2 = int(280 + ((row + 1) / 14.0) ** 1.3 * 440)
        num_stones = int(8 + row * 1.5)
        step_x = w / num_stones
        for col in range(num_stones):
            x1 = int(col * step_x + random.randint(-8, 8))
            x2 = int((col + 1) * step_x + random.randint(-8, 8))
            shade = random.randint(70, 120)
            color = (shade + 20, shade + 15, shade)
            draw.rectangle([x1, y1, x2, y2], fill=color, outline="#292524", width=random.randint(2, 5))

    draw.rectangle([40, 40, 680, 100], fill=(15, 23, 42, 220))
    draw.text((60, 50), "SURVEY: WEST CULTURAL ALLÉE (RAVINDRA MANCH)", fill="#38bdf8")
    draw.text((60, 72), "Uneven Heritage Stone Pavement (High Rolling Resistance & Tripping Hazard)", fill="#fbbf24")

    filename = OUTPUT_DIR / "jaipur_west_heritage_uneven_stone.jpg"
    try:
        exif_bytes = create_gps_exif(26.9138, 75.8163)
        im.save(filename, "JPEG", quality=90, exif=exif_bytes)
    except Exception:
        im.save(filename, "JPEG", quality=90)
    print(f"Generated {filename}")


def generate_accessible_ramp_image():
    w, h = 1280, 720
    im = Image.new("RGB", (w, h), color="#1e2433")
    draw = ImageDraw.Draw(im)

    # Rose garden greenery and flower beds
    draw.rectangle([0, 0, w, 340], fill="#1e3a24")
    for cx in range(50, w, 70):
        draw.ellipse([cx - 20, 290, cx + 20, 330], fill="#e11d48")

    # Gentle concrete ramp promenade (1:16 continuous slope)
    draw.polygon([(360, 320), (920, 320), (1180, h), (100, h)], fill="#94a3b8")

    # Yellow tactile guidance blisters in center
    draw.polygon([(600, 320), (680, 320), (700, h), (580, h)], fill="#facc15")

    # Stainless steel dual handrails on both sides
    # Left rail
    draw.polygon([(340, 260), (350, 260), (80, 580), (70, 580)], fill="#cbd5e1")
    draw.polygon([(340, 280), (350, 280), (80, 610), (70, 610)], fill="#94a3b8")
    for rx, ry in [(345, 320), (260, 410), (170, 510), (80, 620)]:
        draw.line([(rx, ry), (rx, ry - 60)], fill="#64748b", width=5)

    # Right rail
    draw.polygon([(930, 260), (940, 260), (1200, 580), (1190, 580)], fill="#cbd5e1")
    draw.polygon([(930, 280), (940, 280), (1200, 610), (1190, 610)], fill="#94a3b8")
    for rx, ry in [(935, 320), (1020, 410), (1100, 510), (1190, 620)]:
        draw.line([(rx, ry), (rx, ry - 60)], fill="#64748b", width=5)

    draw.rectangle([40, 40, 660, 100], fill=(15, 23, 42, 220))
    draw.text((60, 50), "SURVEY: EAST ROSE GARDEN PROMENADE", fill="#38bdf8")
    draw.text((60, 72), "Certified Step-Free Ramped Walkway (Tactile paved, 1.8% max slope)", fill="#34d399")

    filename = OUTPUT_DIR / "jaipur_rose_garden_accessible_ramp.jpg"
    try:
        exif_bytes = create_gps_exif(26.9136, 75.8208)
        im.save(filename, "JPEG", quality=90, exif=exif_bytes)
    except Exception:
        im.save(filename, "JPEG", quality=90)
    print(f"Generated {filename}")


if __name__ == "__main__":
    generate_stairs_image()
    generate_scooter_image()
    generate_uneven_stone_image()
    generate_accessible_ramp_image()
    print("All demonstration images generated successfully.")
