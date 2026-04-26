import json
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from deep_translator import GoogleTranslator

INPUT_FILE = "artifacts/exam/src/data/raw-eapcet-shift1.json"
OUTPUT_FILE = "artifacts/exam/src/data/eapcet-shift1.json"

def translate_text(text):
    if not text or len(text.strip()) == 0:
        return text
    try:
        # Keep math formulas mostly intact by relying on Google Translate's handling of $...$ 
        # But for robustness, we just translate the whole thing. Google often leaves $...$ alone.
        return GoogleTranslator(source='en', target='te').translate(text)
    except Exception as e:
        print(f"Translation failed for: {text[:30]}... Error: {e}")
        return text

def process_question(q):
    print(f"Processing Q{q['id']}...")
    # Translate question
    question_te = translate_text(q['question_text'])
    
    # Translate options
    options = []
    for opt in q['options']:
        text_te = translate_text(opt['text'])
        options.append({
            "key": opt['key'],
            "text": opt['text'],
            "text_te": text_te
        })
    
    return {
        "id": q['id'],
        "subject": q['subject'],
        "question": q['question_text'],
        "question_te": question_te,
        "question_image": None,
        "options": options,
        "option_images": None,
        "answer": q['correct']
    }

def main():
    print(f"Loading {INPUT_FILE}...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    questions = data.get("questions", [])
    print(f"Found {len(questions)} questions. Starting translation...")
    
    results = [None] * len(questions)
    
    # We use a ThreadPool to speed it up but keep workers low to avoid rate limit
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_idx = {executor.submit(process_question, q): i for i, q in enumerate(questions)}
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                res = future.result()
                results[idx] = res
            except Exception as exc:
                print(f"Question generated an exception: {exc}")
    
    out_data = {
        "exam": data["exam"],
        "questions": results
    }
    
    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out_data, f, ensure_ascii=False, indent=2)
    print("Done!")

if __name__ == "__main__":
    main()
