#!/usr/bin/env python3
"""
PDF → JSON extractor for TG EAPCET exam papers.
Extracts questions, options, and embedded images (formulas/diagrams).

Usage:
  python3 scripts/extract_pdf.py ~/Downloads/\\"TG Engineering 02nd May 2025 Shift 1.pdf\\"

Output:
  artifacts/exam/src/data/eapcet-2025-shift1.json
"""

import sys
import re
import json
import base64
import io
import os
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Run: pip3 install pdfplumber pillow")
    sys.exit(1)

PDF_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Downloads/TG Engineering 02nd May 2025 Shift 1.pdf"
)

OUTPUT_PATH = Path(__file__).parent.parent / "artifacts/exam/src/data/eapcet-2025-shift1.json"

# ── Subject detection ──────────────────────────────────────────────────────────
SUBJECT_KEYWORDS = {
    "Mathematics": ["mathematics", "math", "maths"],
    "Physics": ["physics"],
    "Chemistry": ["chemistry"],
}

def detect_subject(text: str) -> str | None:
    t = text.lower()
    for subj, kws in SUBJECT_KEYWORDS.items():
        if any(kw in t for kw in kws):
            return subj
    return None

# ── Image → base64 data URL ────────────────────────────────────────────────────
def img_to_dataurl(img) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"

# ── Clean text ─────────────────────────────────────────────────────────────────
def clean(t: str) -> str:
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse multiple blank lines
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

# ── Main extraction ────────────────────────────────────────────────────────────
def extract(pdf_path: str):
    questions = []
    current_subject = None
    q_buffer = []           # lines belonging to current question block
    current_images = []     # images captured for current question
    q_counter = 0

    # Pattern: lines starting with a question number like "1." or "1)"
    Q_START = re.compile(r"^(\d+)[.)]\s+(.+)", re.DOTALL)
    # Pattern: option lines like "A)" or "1)" or "(A)" etc.
    OPT_LINE = re.compile(r"^(?:\(([A-D])\)|([A-D])[.)]\s+)(.+)", re.IGNORECASE)

    def flush_question():
        nonlocal q_buffer, current_images, q_counter
        if not q_buffer:
            return
        text = "\n".join(q_buffer)
        lines = text.strip().splitlines()

        question_lines = []
        options = []
        opt_re = re.compile(r"^(?:\(?([A-D])\)?[\s.):]+)(.+)", re.IGNORECASE)

        in_options = False
        for line in lines:
            m = opt_re.match(line.strip())
            if m:
                in_options = True
                options.append(m.group(2).strip())
            elif not in_options:
                question_lines.append(line.strip())
            else:
                # continuation of last option
                if options:
                    options[-1] += " " + line.strip()

        question_text = " ".join(question_lines).strip()
        if not question_text or len(options) < 2:
            q_buffer = []
            current_images = []
            return

        q_counter += 1
        entry = {
            "id": q_counter,
            "subject": current_subject or "General",
            "question": question_text,
            "options": options[:4],
            "answer": 0,  # Unknown from PDF – set manually
        }
        if current_images:
            entry["question_image"] = current_images[0]
            if len(current_images) > 1:
                entry["option_images"] = current_images[1:]
        questions.append(entry)
        q_buffer = []
        current_images = []

    print(f"Opening: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")

        for page_num, page in enumerate(pdf.pages, 1):
            print(f"  Processing page {page_num}/{total_pages}...", end="\r")

            # ── Extract images from this page ──────────────────────────────
            page_images = []
            try:
                for img_obj in page.images:
                    try:
                        # Crop the region of the image from the page
                        x0 = img_obj["x0"]
                        y0 = img_obj["top"]
                        x1 = img_obj["x1"]
                        y1 = img_obj["bottom"]
                        # Only grab meaningful-sized images (skip tiny icons)
                        if (x1 - x0) > 30 and (y1 - y0) > 20:
                            cropped = page.crop((x0, y0, x1, y1))
                            pil_img = cropped.to_image(resolution=150).original
                            page_images.append(img_to_dataurl(pil_img))
                    except Exception:
                        pass
            except Exception:
                pass

            # ── Extract text ────────────────────────────────────────────────
            text = page.extract_text() or ""
            text = clean(text)

            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue

                # Subject header detection
                subj = detect_subject(line)
                if subj and len(line) < 60:
                    flush_question()
                    current_subject = subj
                    continue

                # Question start detection
                m = Q_START.match(line)
                if m:
                    flush_question()
                    # Add any page-level images to next question
                    current_images = page_images[:]
                    page_images = []
                    q_buffer = [m.group(2).strip()]
                else:
                    # Continuation of current question/option
                    if q_buffer:
                        q_buffer.append(line)
                    # Assign page images to whichever block is active
                    if page_images:
                        current_images.extend(page_images)
                        page_images = []

        # flush last question
        flush_question()

    print(f"\nExtracted {len(questions)} questions.")
    return questions

def main():
    questions = extract(PDF_PATH)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Saved → {OUTPUT_PATH}")
    print("\nNOTE: The 'answer' field is set to 0 for all questions.")
    print("You will need to fill in the correct answers (0-indexed) manually or via AI.")

if __name__ == "__main__":
    main()
