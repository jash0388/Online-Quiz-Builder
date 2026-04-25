const SUPABASE_URL = "https://cqjjbvccldipkqqtqzqc.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxampidmNjbGRpcGtxcXRxenFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTU5OTcsImV4cCI6MjA4NTk3MTk5N30.VJxcanrSRdEAcnRpCI2zpeWQ7PhvdPiZtRnA5L7RQgc";
const EXAM_ID = "e3a6b226-8075-477c-a226-7b7f06eeaa3a";
const NUM_USERS = 300;

async function runTest() {
  console.log(`Starting load test with ${NUM_USERS} users...`);

  const startTime = Date.now();

  // Phase 1: Fetch Exam & Questions
  console.log("Phase 1: Fetching Exam & Questions...");
  const phase1Promises = Array.from({ length: NUM_USERS }).map(async (_, i) => {
    try {
      // Add random stagger to starting time (0-2s)
      await new Promise(r => setTimeout(r, Math.random() * 2000));
      
      const qStart = Date.now();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/exam_questions?exam_id=eq.${EXAM_ID}&order=sort_order.asc`, {
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Accept-Profile": "public"
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, time: Date.now() - qStart, size: data.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  const phase1Results = await Promise.all(phase1Promises);
  const phase1Successes = phase1Results.filter(r => r.success);
  const phase1Failures = phase1Results.filter(r => !r.success);
  const phase1AvgTime = phase1Successes.reduce((sum, r) => sum + r.time, 0) / phase1Successes.length;

  console.log(`Phase 1 Complete:`);
  console.log(`  Successes: ${phase1Successes.length}`);
  console.log(`  Failures: ${phase1Failures.length}`);
  if (phase1Successes.length > 0) {
    console.log(`  Avg Time: ${phase1AvgTime.toFixed(2)}ms`);
  }

  // Phase 2: Submitting Results
  console.log("\nPhase 2: Submitting Results...");
  const phase2Promises = Array.from({ length: NUM_USERS }).map(async (_, i) => {
    try {
      // Simulate students finishing at different times (0-5s stagger for this test)
      await new Promise(r => setTimeout(r, Math.random() * 5000));

      const sStart = Date.now();
      const payload = {
        user_id: `test-user-${i}-${Date.now()}`,
        exam_id: EXAM_ID,
        score: Math.floor(Math.random() * 160),
        total_marks: 160,
        violations: 0,
        time_used_seconds: Math.floor(Math.random() * 10800),
        status: "completed",
        student_name: `Test Student ${i}`,
        roll_number: `123456789${i}`,
        student_answers: { "q1": "A", "q2": "B" }
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/exam_submissions`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
          "Accept-Profile": "public",
          "Content-Profile": "public"
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return { success: true, time: Date.now() - sStart };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  const phase2Results = await Promise.all(phase2Promises);
  const phase2Successes = phase2Results.filter(r => r.success);
  const phase2Failures = phase2Results.filter(r => !r.success);
  const phase2AvgTime = phase2Successes.reduce((sum, r) => sum + r.time, 0) / phase2Successes.length;

  console.log(`Phase 2 Complete:`);
  console.log(`  Successes: ${phase2Successes.length}`);
  console.log(`  Failures: ${phase2Failures.length}`);
  if (phase2Successes.length > 0) {
    console.log(`  Avg Time: ${phase2AvgTime.toFixed(2)}ms`);
    console.log(`  Max Time: ${Math.max(...phase2Successes.map(r => r.time))}ms`);
  }

  if (phase2Failures.length > 0) {
    console.log("\nSample Failures:");
    phase2Failures.slice(0, 3).forEach(f => console.log(`  - ${f.error}`));
  }

  console.log(`\nTotal Test Duration: ${(Date.now() - startTime) / 1000}s`);
}

runTest();
