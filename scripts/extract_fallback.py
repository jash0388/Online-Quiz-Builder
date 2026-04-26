import sys, os, json, base64, io
from pathlib import Path

try:
    from pdf2image import convert_from_path
    from PIL import Image
except ImportError:
    print("Missing libs")
    sys.exit(1)

PDF_PATH = os.path.expanduser("~/Downloads/TG Engineering 02nd May 2025 Shift 1.pdf")
JSON_PATH = "artifacts/exam/src/data/eapcet-shift1.json"

TARGETS = [
    {"id": 105, "page": 48},
    {"id": 119, "page": 54},
    {"id": 137, "page": 63},
    {"id": 138, "page": 63},
    {"id": 139, "page": 64},
    {"id": 144, "page": 66},
    {"id": 155, "page": 71},
    {"id": 158, "page": 72},
    {"id": 159, "page": 73},
]

def pil_to_dataurl(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"

def main():
    print(f"Loading JSON from {JSON_PATH}")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    questions = data.get("questions", [])
    
    print("Converting specific pages from PDF...")
    unique_pages = list(set(t["page"] for t in TARGETS))
    page_images = {}
    for p in unique_pages:
        print(f"Extracting page {p}...")
        imgs = convert_from_path(PDF_PATH, dpi=100, first_page=p, last_page=p)
        if imgs:
            page_images[p] = imgs[0]
            
    for target in TARGETS:
        qid = target["id"]
        p = target["page"]
        img = page_images.get(p)
        if not img:
            continue
            
        print(f"Attaching full page image for Q{qid}...")
        # resize slightly to avoid massive base64
        w, h = img.size
        img_resized = img.resize((w//2, h//2), Image.LANCZOS)
        data_url = pil_to_dataurl(img_resized)
        
        for q in questions:
            if q["id"] == qid:
                q["question_image"] = data_url
                break

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done updating JSON!")

if __name__ == "__main__":
    main()
