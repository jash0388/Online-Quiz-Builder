#!/usr/bin/env python3
"""
TG EAPCET PDF → JSON extractor using Gemini Vision.

This PDF is fully image-based (questions rendered as images).
We render each page, send it to Gemini Flash, and parse structured JSON.

Usage:
  GEMINI_API_KEY=<your_key> python3 scripts/extract_pdf_vision.py \
      ~/Downloads/"TG Engineering 02nd May 2025 Shift 1.pdf" \
      eapcet-2025-shift1

Requirements:
  pip3 install pdf2image pillow google-generativeai
  brew install poppler
"""

import sys, os, re, json, base64, io, time
from pathlib import Path

PDF_PATH   = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Downloads/TG Engineering 02nd May 2025 Shift 1.pdf")
OUT_STEM   = sys.argv[2] if len(sys.argv) > 2 else "eapcet-2025-shift1"
OUT_DIR    = Path(__file__).parent.parent / "artifacts/exam/src/data"
OUT_PATH   = OUT_DIR / f"{OUT_STEM}.json"
API_KEY    = os.environ.get("GEMINI_API_KEY", "")

if not API_KEY:
    print("ERROR: Set GEMINI_API_KEY environment variable first.")
    print("  export GEMINI_API_KEY='your_api_key_here'")
    sys.exit(1)

try:
    from pdf2image import convert_from_path
    import google.generativeai as genai
    from PIL import Image
except ImportError as e:
    print(f"Missing library: {e}")
    print("Run: pip3 install pdf2image pillow google-generativeai && brew install poppler")
    sys.exit(1)

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

# ── helpers ────────────────────────────────────────────────────────────────────
def pil_to_base64(img: Image.Image, fmt="PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode()

def pil_to_dataurl(img: Image.Image) -> str:
    return f"data:image/png;base64,{pil_to_base64(img)}"

PROMPT = """
You are processing a page from a TG EAPCET engineering exam paper (Physics, Chemistry, or Mathematics).
The page contains MCQ questions, each with 4 options. Questions and options may be text, mathematical formulas, or chemical equations rendered as images.

Extract ALL questions visible on this page. Return a JSON array (only the array, no markdown fences) where each element has:
{
  "question_number": <int>,
  "subject": "<Physics|Chemistry|Mathematics>",
  "question": "<full question text, use Unicode math symbols where possible>",
  "has_question_image": <true if question contains a diagram/graph/formula image that cannot be typed>,
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "option_has_image": [<true/false for each option if it contains an image>,  false, false, false],
  "correct_answer_index": <0-3 if answer key is visible (green option), else -1>
}

Rules:
- For mathematical/chemical text that CAN be typed (like "x² + y = 5"), type it using Unicode superscripts/symbols.
- Set has_question_image=true ONLY for actual diagrams, graphs, structural chemistry drawings that cannot be typed.
- Do NOT include the question number in the "question" field text itself.
- If a subject section header is visible (e.g. "MATHEMATICS"), note it for subsequent questions.
- Return ONLY valid JSON array. No markdown, no explanation.
"""

def extract_questions_from_page(page_img: Image.Image, page_num: int) -> list[dict]:
    """Send one page image to Gemini and get structured questions."""
    import time
    from google.api_core import exceptions
    
    # Scale down if too large (Gemini has limits)
    w, h = page_img.size
    if w > 1600:
        scale = 1600 / w
        page_img = page_img.resize((1600, int(h * scale)), Image.LANCZOS)

    # Convert to Gemini-compatible format
    img_data = pil_to_base64(page_img, "JPEG")

    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = model.generate_content([
                {"mime_type": "image/jpeg", "data": img_data},
                PROMPT,
            ])
            raw = response.text.strip()
            # Strip markdown fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            questions = json.loads(raw)
            return questions if isinstance(questions, list) else []
        except json.JSONDecodeError as e:
            print(f"  [page {page_num}] JSON parse error: {e}")
            try:
                print(f"  Raw response snippet: {response.text[:300]}")
            except Exception:
                pass
            return []
        except exceptions.ResourceExhausted as e:
            delay = 60 * (attempt + 1)
            print(f"  [page {page_num}] Quota exceeded (429). Retrying in {delay}s...")
            time.sleep(delay)
        except Exception as e:
            if "429" in str(e):
                delay = 60 * (attempt + 1)
                print(f"  [page {page_num}] Quota exceeded (429). Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"  [page {page_num}] Gemini error: {e}")
                return []
    
    print(f"  [page {page_num}] Failed after {max_retries} retries due to quota.")
    return []

def crop_question_region(page_img: Image.Image, q_index_on_page: int, total_on_page: int) -> Image.Image:
    """Rough crop of the question's region for embedding as image."""
    w, h = page_img.size
    # Simple vertical split based on question position
    strip_h = h // max(total_on_page, 1)
    y0 = q_index_on_page * strip_h
    y1 = min(y0 + strip_h, h)
    return page_img.crop((0, y0, w, y1))

# ── main ───────────────────────────────────────────────────────────────────────
def main():
    print(f"Converting PDF to images: {PDF_PATH}")
    pages = convert_from_path(PDF_PATH, dpi=150, thread_count=4)
    total_pages = len(pages)
    print(f"Total pages: {total_pages}")

    # Skip first page (cover/metadata)
    content_pages = pages[1:]
    all_questions: list[dict] = []
    seen_q_numbers: set[int] = set()

    for page_num, page_img in enumerate(content_pages, start=2):
        print(f"  Processing page {page_num}/{total_pages}...", end=" ", flush=True)

        page_questions = extract_questions_from_page(page_img, page_num)
        new_count = 0

        for qi, q in enumerate(page_questions):
            qnum = q.get("question_number", -1)
            if qnum in seen_q_numbers:
                continue  # already captured from previous page
            seen_q_numbers.add(qnum)

            # Build output entry
            entry = {
                "id": qnum,
                "subject": q.get("subject", "General"),
                "question": q.get("question", "").strip(),
                "options": q.get("options", [])[:4],
                "answer": max(0, q.get("correct_answer_index", 0)),
            }

            # If question has a diagram/graph, crop and embed that region
            if q.get("has_question_image", False):
                region = crop_question_region(page_img, qi, len(page_questions))
                entry["question_image"] = pil_to_dataurl(region)

            # Option images
            opt_has_img = q.get("option_has_image", [False] * 4)
            option_images = {}
            for oi, has_img in enumerate(opt_has_img[:4]):
                if has_img:
                    # For now embed the whole page region; can refine further
                    region = crop_question_region(page_img, qi, len(page_questions))
                    option_images[str(oi)] = pil_to_dataurl(region)
            if option_images:
                entry["option_images"] = option_images

            all_questions.append(entry)
            new_count += 1

        print(f"got {new_count} questions")

        # Rate limit: Gemini Flash allows 15 RPM on free tier
        if page_num % 15 == 0:
            print("  [rate limit pause 5s]")
            time.sleep(5)

    # Sort by question number
    all_questions.sort(key=lambda x: x["id"])
    print(f"\nTotal questions extracted: {len(all_questions)}")

    # Save
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f"Saved → {OUT_PATH}")
    print(f"File size: {OUT_PATH.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    main()
