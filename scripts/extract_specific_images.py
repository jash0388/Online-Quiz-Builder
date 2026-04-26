import sys, os, json, base64, io, time
from pathlib import Path

try:
    from pdf2image import convert_from_path
    from PIL import Image
    import google.generativeai as genai
except ImportError:
    print("Missing libs")
    sys.exit(1)

API_KEY = "AIzaSyCB0DXu5ppUpW7BYJ0wrbZmYSKLIniAzuo"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

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
    img.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

def main():
    print(f"Loading JSON from {JSON_PATH}")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    questions = data.get("questions", [])
    
    print("Converting specific pages from PDF...")
    # pdf2image first_page is 1-indexed
    # Get the unique pages
    unique_pages = list(set(t["page"] for t in TARGETS))
    page_images = {}
    for p in unique_pages:
        print(f"Extracting page {p}...")
        imgs = convert_from_path(PDF_PATH, dpi=150, first_page=p, last_page=p)
        if imgs:
            page_images[p] = imgs[0]
            
    for target in TARGETS:
        qid = target["id"]
        p = target["page"]
        img = page_images.get(p)
        if not img:
            continue
            
        print(f"Asking Gemini to find bounding box for Q{qid} on page {p}...")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_data = base64.b64encode(buf.getvalue()).decode()
        
        prompt = f"This page has multiple questions. Find Question {qid} and its options. Return ONLY a JSON array of four numbers [ymin, xmin, ymax, xmax] representing the bounding box for the question's diagram/formulas, normalized to 0-1000. If it's the whole question, bounding box for the whole question."
        
        try:
            response = model.generate_content([
                {"mime_type": "image/jpeg", "data": img_data},
                prompt
            ])
            import re
            text = response.text.strip()
            match = re.search(r'\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]', text)
            if match:
                ymin, xmin, ymax, xmax = map(int, match.groups())
                w, h = img.size
                crop_box = (
                    max(0, int(xmin * w / 1000) - 20),
                    max(0, int(ymin * h / 1000) - 20),
                    min(w, int(xmax * w / 1000) + 20),
                    min(h, int(ymax * h / 1000) + 20)
                )
                cropped = img.crop(crop_box)
                data_url = pil_to_dataurl(cropped)
                
                # update json
                for q in questions:
                    if q["id"] == qid:
                        q["question_image"] = data_url
                        print(f"Successfully added image to Q{qid}")
                        break
            else:
                print(f"Could not parse bounding box for Q{qid}: {text}")
        except Exception as e:
            print(f"Error on Q{qid}: {e}")
            
        time.sleep(2) # avoid rate limit

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done updating JSON!")

if __name__ == "__main__":
    main()
