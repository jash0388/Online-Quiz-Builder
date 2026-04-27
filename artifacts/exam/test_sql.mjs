import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cqjjbvccldipkqqtqzqc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxampidmNjbGRpcGtxcXRxenFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM5NTk5NywiZXhwIjoyMDg1OTcxOTk3fQ.X66_viw192Ra2brJpf_XoePPnGvOD5V-A-t5kBQptNg'
);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS question_te TEXT, ADD COLUMN IF NOT EXISTS options_te JSONB;'
  });
  console.log('Result:', data);
  console.log('Error:', error);
}

run();
