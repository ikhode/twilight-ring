-- 1. Enable RLS on all remaining public tables
ALTER TABLE "public"."ai_insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."analytics_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."business_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cash_registers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cash_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."custom_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."employee_docs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."maintenance_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."metric_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payroll_advances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."performance_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."process_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."process_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."processes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."production_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rca_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shared_insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trust_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."usage_patterns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."whatsapp_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."work_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."work_sessions" ENABLE ROW LEVEL SECURITY;

-- 2. Base Policy: User Organizations (Break recursion by using direct user_id check)
DROP POLICY IF EXISTS "Users can view their own memberships" ON "public"."user_organizations";
CREATE POLICY "Users can view their own memberships" ON "public"."user_organizations"
FOR ALL USING (user_id = auth.uid()::text);

-- 3. Standard Organization Isolation
-- For tables with 'organization_id'
do $$
declare
  tbl text;
  tables text[] := array[
    'ai_insights', 'analytics_metrics', 'analytics_snapshots', 'budgets', 'business_documents', 
    'cash_registers', 'cash_sessions', 'chat_conversations', 'custom_reports', 'employee_docs', 
    'employees', 'expenses', 'inventory_movements', 'maintenance_logs', 'metric_models', 
    'organization_modules', 'payments', 'payroll_advances', 'performance_reviews', 'process_instances', 
    'processes', 'production_tasks', 'sales', 'trust_participants', 'usage_patterns', 
    'vehicles', 'work_history', 'work_sessions'
  ];
begin
  foreach tbl in array tables loop
    execute format('DROP POLICY IF EXISTS "Users can view org data" ON "public".%I', tbl);
    execute format('CREATE POLICY "Users can view org data" ON "public".%I FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text))', tbl);
  end loop;
end $$;

-- 4. Shared Insights (source_org_id)
DROP POLICY IF EXISTS "Users can view org shared insights" ON "public"."shared_insights";
CREATE POLICY "Users can view org shared insights" ON "public"."shared_insights"
FOR ALL USING (source_org_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

-- 5. User Specific Tables
-- Users
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."users";
CREATE POLICY "Users can view their own profile" ON "public"."users"
FOR ALL USING (id = auth.uid()::text);

-- Whatsapp Conversations
DROP POLICY IF EXISTS "Users can view their own whatsapp conversations" ON "public"."whatsapp_conversations";
CREATE POLICY "Users can view their own whatsapp conversations" ON "public"."whatsapp_conversations"
FOR ALL USING (user_id = auth.uid()::text);

-- 6. Linked/Child Tables

-- Chat Messages -> Chat Conversations (organization_id)
DROP POLICY IF EXISTS "Users can view org chat messages" ON "public"."chat_messages";
CREATE POLICY "Users can view org chat messages" ON "public"."chat_messages"
FOR ALL USING (
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)
  )
);

-- Process Steps -> Processes (organization_id)
DROP POLICY IF EXISTS "Users can view org process steps" ON "public"."process_steps";
CREATE POLICY "Users can view org process steps" ON "public"."process_steps"
FOR ALL USING (
  process_id IN (
    SELECT id FROM processes 
    WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)
  )
);

-- RCA Reports -> Process Instances (organization_id)
DROP POLICY IF EXISTS "Users can view org rca reports" ON "public"."rca_reports";
CREATE POLICY "Users can view org rca reports" ON "public"."rca_reports"
FOR ALL USING (
  instance_id IN (
    SELECT id FROM process_instances 
    WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)
  )
);

-- 7. System/Internal Tables
-- Embeddings - Internal use mostly, allow authenticated
DROP POLICY IF EXISTS "Authenticated users can access embeddings" ON "public"."embeddings";
CREATE POLICY "Authenticated users can access embeddings" ON "public"."embeddings"
FOR ALL USING (auth.role() = 'authenticated');

-- Knowledge Base - Allow authenticated for now
DROP POLICY IF EXISTS "Authenticated users can access knowledge base" ON "public"."knowledge_base";
CREATE POLICY "Authenticated users can access knowledge base" ON "public"."knowledge_base"
FOR ALL USING (auth.role() = 'authenticated');
