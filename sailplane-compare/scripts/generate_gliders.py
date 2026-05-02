"""
Generate public/data/gliders.json from Sailplane_PolarDB.xlsx.

Run from the sailplane-compare directory:
  python scripts/generate_gliders.py
"""
import sys, json, re, math
import pandas as pd
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

EXCEL = r"C:\Users\Usuario\AppData\Local\Temp\PolarDB_copy.xlsx"
OUT   = r"C:\Users\Usuario\OneDrive\Documentos\PolarSoar\sailplane-compare\public\data\gliders.json"

KNOT_TO_MS = 0.514444
KMH_TO_MS  = 1.0 / 3.6

# Speed column headers in the Excel (km/h)
SPEED_KMH = [0, 20, 40, 50, 60, 65, 70, 75, 80, 85, 90, 95,
             100, 105, 110, 115, 120, 125, 130, 135, 140, 145,
             150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200]

# ── Wing geometry ─────────────────────────────────────────────────────────────
# (wingspan_m, wingArea_m2, hasWinglets)
WING = {
    "ASH 25e":            (25.0,  16.31, False),
    "ASK 23":             (15.0,  12.90, False),
    "Astir CS":           (15.0,  12.40, False),
    "Astir CS G-102":     (15.0,  12.40, False),
    "Astir -Twin":        (16.5,  17.52, False),
    "ASW 15":             (15.0,  12.12, False),
    "ASW 17":             (20.0,  14.84, False),
    "ASW 17 S/21":        (20.94, 15.07, False),
    "ASW 19":             (15.0,  10.50, False),
    "ASW 20":             (15.0,  10.50, False),
    "ASW 20A":            (15.0,  10.50, False),
    "ASW 20C":            (15.0,  10.50, False),
    "ASW 20L":            (15.0,  10.50, False),
    "ASW 22/24":          (24.0,  16.31, False),
    "ASW 22M":            (24.0,  16.31, False),
    "Berfalke lV":        (16.0,  17.80, False),
    "Bergfalke ll":       (16.0,  18.82, False),
    "Blanik L13":         (16.2,  19.15, False),
    "Calif A21S":         (18.5,  14.72, False),
    "Cirrus":             (17.7,  10.98, False),
    "DG 100":             (15.0,  11.22, False),
    "DG 100G":            (15.0,  11.22, True),
    "DG 1000 18m":        (18.0,  12.42, False),
    "DG 1000 20m":        (20.0,  14.04, False),
    "DG 200":             (15.0,  11.22, False),
    "DG 300":             (15.0,  11.22, False),
    "DG 303":             (15.0,  11.39, False),
    "DG 400/17":          (17.0,  13.00, False),
    "Diamant 16.5":       (16.5,  10.75, False),
    "Discus A":           (15.0,  10.58, False),
    "Discus A (H)":       (15.0,  10.58, False),
    "Discus A (L)":       (15.0,  10.58, False),
    "Discus B":           (15.0,  10.58, False),
    "Elfe S-25":          (15.0,  12.00, False),
    "Elfe S4D":           (13.3,  11.40, False),
    "ES 60":              (15.0,  12.00, False),
    "Falcon":             (15.0,  10.00, False),
    "G-102 3B":           (15.0,  12.40, False),
    "H.304/17":           (17.0,  11.50, False),
    "H-304":              (15.0,  10.00, False),
    "Hornet C":           (15.0,  10.00, False),
    "Hornet H-206":       (15.0,  10.00, False),
    "Jantar 2":           (18.0,  13.90, False),
    "Jantar 2B":          (18.0,  13.90, False),
    "Jantar Std":         (15.0,  11.25, False),
    "Jantar SZD.41A":     (15.0,  11.25, False),
    "Janus":              (18.2,  18.20, False),
    "Jeans Astir":        (15.0,  12.40, False),
    "K 21":               (17.95, 17.95, False),
    "K 23":               (15.0,  11.42, False),
    "Ka 10":              (12.6,  10.16, False),
    "Ka 6b R/S":          (14.25, 12.40, False),
    "Ka 6cr":             (14.25, 12.40, False),
    "Ka 7":               (16.0,  17.52, False),
    "Ka 8":               (15.3,  14.15, False),
    "Kestrel H.401":      (17.0,  13.00, False),
    "Kestrel 19 T.59D":   (19.0,  15.11, False),
    "Kestrel 22 H.604":   (22.0,  17.50, False),
    "Kestrel H-604/17":   (17.0,  13.00, False),
    "Kranich lll":        (18.0,  24.00, False),
    "L+A7S 3a":           (15.0,  11.00, False),
    "L-Spatz 55":         (13.0,  10.00, False),
    "Libelle 201":        (15.0,  10.00, False),
    "Libelle H-301B":     (15.0,  10.00, False),
    "LS 1 C":             (15.0,   9.74, False),
    "LS 1 f":             (15.0,   9.74, False),
    "LS 3":               (15.0,  10.50, False),
    "LS3/17":             (17.0,  12.20, False),
    "LS 4":               (15.0,  10.50, False),
    "M-100S":             (12.4,   8.80, False),
    "Mini Nimbus":        (15.0,  10.00, False),
    "Mistrel C":          (15.0,  10.00, False),
    "Mosquito H-303":     (15.0,   9.40, False),
    "Mosquito H-303B":    (15.0,   9.40, False),
    "Nimbus 2":           (20.3,  14.28, False),
    "Nimbus 3":           (22.9,  16.70, False),
    "Nimbus 3/24.5":      (24.5,  17.80, False),
    "Pegase 101A":        (15.0,  11.25, False),
    "Phoebus A":          (17.0,  12.77, False),
    "Phoenix T FS-24":    (16.8,  16.55, False),
    "Pik 20D":            (15.0,  10.02, False),
    "PW5":                (13.44, 10.16, False),
    "Salto 15 H-101":     (15.0,   9.40, False),
    "Salto H-101":        (13.6,   9.17, False),
    "SB-10":              (23.0,  17.00, False),
    "SB-11":              (22.0,  16.00, False),
    "SB-12":              (18.4,  14.00, False),
    "SF 34":              (16.0,  16.00, False),
    "Skylark 3F":         (15.0,  14.17, False),
    "Std Austria SH":     (15.0,  10.00, False),
    "Std Cirrus":         (15.0,  10.04, False),
    "Std Libelle H-201":  (15.0,  10.00, False),
    "SZD51-1 - Junior":   (15.0,  12.22, False),
    "SZD55":              (15.0,  10.16, False),
    "Ventus A":           (15.0,   9.51, False),
    "Ventus A/16.6":      (16.6,  10.50, False),
    "Ventus B":           (15.0,   9.51, False),
    "Zigrogel lV":        (14.5,  14.00, False),
}

# ── Masses (empty_kg, mtow_kg, ballast_kg) ────────────────────────────────────
MASSES = {
    "ASH 25e":          (470, 750, 200),
    "ASK 23":           (310, 450,   0),
    "Astir CS":         (242, 404,   0),
    "Astir CS G-102":   (242, 404,   0),
    "Astir -Twin":      (360, 600,   0),
    "ASW 15":           (243, 420,   0),
    "ASW 17":           (395, 650, 200),
    "ASW 17 S/21":      (395, 650, 200),
    "ASW 19":           (230, 450,  80),
    "ASW 20":           (248, 470, 120),
    "ASW 20A":          (248, 470, 120),
    "ASW 20C":          (248, 470, 120),
    "ASW 20L":          (248, 470, 120),
    "ASW 22/24":        (470, 750, 220),
    "ASW 22M":          (470, 750, 220),
    "Cirrus":           (295, 540,   0),
    "DG 100":           (230, 420,   0),
    "DG 100G":          (230, 420,   0),
    "DG 1000 18m":      (430, 750, 200),
    "DG 1000 20m":      (430, 750, 200),
    "DG 200":           (250, 430,  80),
    "DG 300":           (235, 420,   0),
    "DG 303":           (232, 500, 160),
    "DG 400/17":        (340, 580,   0),
    "Discus A":         (245, 435,  75),
    "Discus A (H)":     (245, 435,  75),
    "Discus A (L)":     (245, 435,  75),
    "Discus B":         (260, 460,  90),
    "Janus":            (385, 620,   0),
    "K 21":             (360, 600,   0),
    "Ka 6cr":           (190, 310,   0),
    "Ka 6b R/S":        (190, 310,   0),
    "Ka 8":             (198, 330,   0),
    "Kestrel H.401":    (308, 540,  91),
    "Kestrel 22 H.604": (360, 620, 110),
    "LS 1 C":           (200, 390,  80),
    "LS 1 f":           (203, 390,  80),
    "LS 3":             (238, 442, 120),
    "LS3/17":           (240, 450, 120),
    "LS 4":             (250, 475, 120),
    "Mini Nimbus":      (230, 430, 120),
    "Nimbus 2":         (380, 625, 160),
    "Nimbus 3":         (498, 820, 200),
    "Nimbus 3/24.5":    (498, 820, 200),
    "Pegase 101A":      (260, 470,  90),
    "Pik 20D":          (220, 440, 100),
    "PW5":              (190, 300,   0),
    "Salto H-101":      (190, 330,   0),
    "Std Cirrus":       (215, 400,  80),
    "Std Libelle H-201":(175, 310,   0),
    "SZD51-1 - Junior": (250, 450,   0),
    "SZD55":            (240, 525, 180),
    "Ventus A":         (230, 450, 100),
    "Ventus A/16.6":    (230, 450, 100),
    "Ventus B":         (230, 450, 100),
}

# ── Manufacturer lookup ────────────────────────────────────────────────────────
MANUFACTURER_PREFIXES = [
    ("Jeans Astir", "Grob"), ("Astir", "Grob"), ("G-102", "Grob"),
    ("ASH", "Schleicher"), ("ASK", "Schleicher"), ("ASW", "Schleicher"),
    ("K 21", "Schleicher"), ("K 23", "Schleicher"), ("Ka", "Schleicher"),
    ("Berfalke", "Scheibe"), ("Bergfalke", "Scheibe"), ("SF", "Scheibe"), ("L-Spatz", "Scheibe"),
    ("Blanik", "LET"),
    ("Calif", "Caproni Vizzola"),
    ("Std Cirrus", "Schempp-Hirth"), ("Cirrus", "Schempp-Hirth"),
    ("DG", "DG-Flugzeugbau"),
    ("Diamant", "FFW Braunschweig"),
    ("Discus", "Schempp-Hirth"), ("Falcon", "Schempp-Hirth"),
    ("H.304", "Schempp-Hirth"), ("H-304", "Schempp-Hirth"), ("Hornet", "Schempp-Hirth"),
    ("Janus", "Schempp-Hirth"), ("Mini Nimbus", "Schempp-Hirth"),
    ("Mosquito", "Schempp-Hirth"), ("Nimbus", "Schempp-Hirth"),
    ("Ventus", "Schempp-Hirth"),
    ("Std Libelle", "Glasflügel"), ("Libelle", "Glasflügel"),
    ("Elfe", "Neukom"), ("ES 60", "Neukom"),
    ("Jantar", "SZD"), ("SZD", "SZD"), ("PW5", "PZL"),
    ("Kestrel", "Slingsby"),
    ("Kranich", "Akaflieg Darmstadt"),
    ("L+A7S", "Various"),
    ("LS", "Rolladen-Schneider"),
    ("M-100S", "Schleicher"),
    ("Mistrel", "Various"),
    ("Pegase", "Centrair"),
    ("Phoebus", "Bölkow"),
    ("Phoenix", "Akaflieg Braunschweig"),
    ("Pik", "PIK Finland"),
    ("Salto", "Hoffmann"),
    ("SB-", "Akaflieg Braunschweig"),
    ("Skylark", "Slingsby"),
    ("Std Austria", "Sportavia"),
    ("Zigrogel", "Various"),
]

def get_manufacturer(model):
    for prefix, mfr in MANUFACTURER_PREFIXES:
        if model.startswith(prefix):
            return mfr
    return "Unknown"

# ── Competition class lookup ─────────────────────────────────────────────────
COMP_CLASS = {
    "Ka 6b R/S": "Club", "Ka 6cr": "Club", "Ka 10": "Club", "Ka 8": "Club",
    "Ka 7": "School",
    "K 21": "Two-seat", "K 23": "Club",
    "ASK 23": "Club",
    "Astir CS": "Club", "Astir CS G-102": "Club", "G-102 3B": "Club",
    "Astir -Twin": "Two-seat",
    "Bergfalke ll": "School", "Berfalke lV": "School",
    "Blanik L13": "School",
    "Janus": "Two-seat",
    "ASW 15": "Standard", "ASW 19": "Standard",
    "ASW 20": "15m", "ASW 20A": "15m", "ASW 20C": "15m", "ASW 20L": "15m",
    "ASW 17": "Open", "ASW 17 S/21": "Open",
    "ASW 22/24": "Open", "ASW 22M": "Open",
    "ASH 25e": "Open",
    "Cirrus": "Open",
    "Std Cirrus": "Standard",
    "DG 100": "Club", "DG 100G": "Club",
    "DG 1000 18m": "Two-seat 18m", "DG 1000 20m": "Two-seat 20m",
    "DG 200": "15m", "DG 300": "Club", "DG 303": "15m",
    "DG 400/17": "17m",
    "Diamant 16.5": "Open",
    "Discus A": "Standard", "Discus A (H)": "Standard", "Discus A (L)": "Standard",
    "Discus B": "Standard",
    "Elfe S-25": "Club", "Elfe S4D": "Club", "ES 60": "Club",
    "Falcon": "Club",
    "H.304/17": "17m", "H-304": "15m",
    "Hornet C": "15m", "Hornet H-206": "15m",
    "Jantar 2": "Open", "Jantar 2B": "Open",
    "Jantar Std": "Standard", "Jantar SZD.41A": "Standard",
    "Jeans Astir": "Club",
    "Kranich lll": "Vintage",
    "L+A7S 3a": "Open",
    "L-Spatz 55": "Vintage",
    "Libelle 201": "Club", "Libelle H-301B": "Club", "Std Libelle H-201": "Standard",
    "LS 1 C": "Standard", "LS 1 f": "Standard",
    "LS 3": "15m", "LS3/17": "17m", "LS 4": "Standard",
    "M-100S": "Vintage",
    "Mini Nimbus": "15m",
    "Mistrel C": "Club",
    "Mosquito H-303": "15m", "Mosquito H-303B": "15m",
    "Nimbus 2": "Open", "Nimbus 3": "Open", "Nimbus 3/24.5": "Open",
    "Pegase 101A": "Club",
    "Phoebus A": "Standard",
    "Phoenix T FS-24": "Vintage",
    "Pik 20D": "15m",
    "PW5": "World class",
    "Salto 15 H-101": "Club", "Salto H-101": "Club",
    "SB-10": "Open", "SB-11": "Open", "SB-12": "Open",
    "SF 34": "Vintage",
    "Skylark 3F": "Vintage",
    "Std Austria SH": "Standard",
    "SZD51-1 - Junior": "Club",
    "SZD55": "15m",
    "Ventus A": "15m", "Ventus A/16.6": "15m", "Ventus B": "15m",
    "Zigrogel lV": "Vintage",
    "Calif A21S": "Open",
}

# ── Source mapping ────────────────────────────────────────────────────────────
SOURCE_MAP = {
    "IDA":  ("idaflieg",     "Idaflieg flight-test"),
    "MD":   ("manufacturer", "Manufacturer data"),
    "DJ":   ("flight_test",  "DJ flight-test"),
    "GB":   ("flight_test",  "GB flight-test"),
    "AG":   ("estimated",    "Estimated"),
    "real": ("flight_test",  "Real flight data"),
    "x":    ("unknown",      "Unknown source"),
    "MD+":  ("manufacturer", "Manufacturer data (corrected)"),
    "nan":  ("unknown",      "Unknown source"),
}

def normalize_model(raw):
    """Strip whitespace and normalize to canonical form."""
    s = str(raw).strip()
    # Collapse multiple spaces
    s = re.sub(r"\s+", " ", s)
    return s

def make_id(model, source_id):
    slug = re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-")
    src  = re.sub(r"[^a-z0-9]+", "-", source_id.lower())
    return f"{slug}-{src}"

def extract_polar(row, units):
    pts = []
    for spd_kmh in SPEED_KMH:
        col = str(spd_kmh) if spd_kmh != 0 else "0"
        val = row.get(col, float("nan"))
        try:
            v = float(val)
        except (ValueError, TypeError):
            continue
        if math.isnan(v) or v <= 0:
            continue
        v_ms = spd_kmh * KMH_TO_MS
        w_ms = v * KNOT_TO_MS if str(units).strip().lower() == "knots" else v
        pts.append({"v": round(v_ms, 4), "w": round(w_ms, 4)})
    return pts

# ── Load Excel ────────────────────────────────────────────────────────────────
df = pd.read_excel(EXCEL, sheet_name="Feuil1")
df.columns = [str(c) for c in df.columns]

# Convert speed columns to string keys expected by extract_polar
rows = df.to_dict(orient="records")

# ── Deduplicate: group by (clean model, source_id) ────────────────────────────
# Keep entry with most polar points; on tie keep lower W/S.
groups = {}  # (model, source_id) -> best entry info

for row in rows:
    raw_model  = normalize_model(row.get("Model", ""))
    raw_source = str(row.get("Source", "nan")).strip()
    units      = str(row.get("units", "mps")).strip()
    ws         = float(row.get("W/S", 35.0)) if not pd.isna(row.get("W/S", float("nan"))) else 35.0
    rego       = str(row.get("Rego", "")).strip()
    if rego in ("nan", "None", ""):
        rego = None

    pts = extract_polar(row, units)
    if len(pts) < 3:
        continue

    key = (raw_model, raw_source)
    existing = groups.get(key)
    if existing is None or len(pts) > len(existing["pts"]) or \
       (len(pts) == len(existing["pts"]) and ws < existing["ws"]):
        groups[key] = {"model": raw_model, "source_id": raw_source,
                       "ws": ws, "rego": rego, "pts": pts}

# ── Build glider objects ───────────────────────────────────────────────────────
gliders = []
seen_ids = {}

for (model, source_id), g in sorted(groups.items(), key=lambda x: (x[0][0], x[0][1])):
    wing = WING.get(model)
    if wing:
        wingspan, wing_area, has_winglets = wing
    else:
        # Nominal: assume 15m span, aspect ratio ~22 → wing_area ~10.2
        wingspan  = 15.0
        wing_area = round(wingspan**2 / 22.0, 2)
        has_winglets = False

    ws         = g["ws"]
    ref_mass   = round(ws * wing_area, 1)

    mass_data  = MASSES.get(model)
    if mass_data:
        empty, mtow, ballast = mass_data
    else:
        empty   = round(ref_mass * 0.80)
        mtow    = round(ref_mass * 1.28)
        ballast = 0

    src_type, src_label = SOURCE_MAP.get(source_id, ("unknown", source_id))

    # Include rego in label when available and source is IDA (multiple measurements)
    display_label = src_label
    if g["rego"]:
        display_label = f"{src_label} ({g['rego']})"

    gid = make_id(model, source_id)
    # Avoid duplicate IDs
    if gid in seen_ids:
        seen_ids[gid] += 1
        gid = f"{gid}-{seen_ids[gid]}"
    else:
        seen_ids[gid] = 1

    entry = {
        "id":               gid,
        "model":            model,
        "manufacturer":     get_manufacturer(model),
        "competitionClass": COMP_CLASS.get(model, "Unknown"),
        "wingspan":         wingspan,
        "wingArea":         wing_area,
        "hasWinglets":      has_winglets,
        "emptyMass":        empty,
        "mtow":             mtow,
        "maxWaterBallast":  ballast,
        "referenceMass":    ref_mass,
        "source":           src_type,
        "sourceId":         source_id,
        "sourceLabel":      display_label,
        "polarPoints":      g["pts"],
    }
    gliders.append(entry)

# ── Write output ───────────────────────────────────────────────────────────────
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(gliders, f, indent=2, ensure_ascii=False)

# Summary
from collections import Counter
model_counts = Counter(g["model"] for g in gliders)
multi = {m: c for m, c in model_counts.items() if c > 1}
print(f"Total glider entries: {len(gliders)}")
print(f"Unique models: {len(model_counts)}")
print(f"Models with multiple sources ({len(multi)}):")
for m, c in sorted(multi.items()):
    variants = [g for g in gliders if g["model"] == m]
    labels = [v["sourceLabel"] for v in variants]
    print(f"  {m}: {labels}")
print(f"\nOutput written to: {OUT}")
