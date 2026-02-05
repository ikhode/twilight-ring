-- Migration: 0010_optimize_foreign_keys.sql
-- Description: Add indexes to Foreign Keys to improve JOIN performance and fix linter warnings.

-- ai_insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_organization_id ON public.ai_insights (organization_id);

-- analytics_metrics
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_organization_id ON public.analytics_metrics (organization_id);

-- analytics_snapshots
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_organization_id ON public.analytics_snapshots (organization_id);

-- bank_accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization_id ON public.bank_accounts (organization_id);

-- bank_reconciliations
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_organization_id ON public.bank_reconciliations (organization_id);

-- budgets
CREATE INDEX IF NOT EXISTS idx_budgets_organization_id ON public.budgets (organization_id);

-- business_documents
CREATE INDEX IF NOT EXISTS idx_business_documents_organization_id ON public.business_documents (organization_id);
CREATE INDEX IF NOT EXISTS idx_business_documents_uploaded_by ON public.business_documents (uploaded_by);

-- cash_registers
CREATE INDEX IF NOT EXISTS idx_cash_registers_organization_id ON public.cash_registers (organization_id);

-- cash_sessions
CREATE INDEX IF NOT EXISTS idx_cash_sessions_closed_by ON public.cash_sessions (closed_by);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_by ON public.cash_sessions (opened_by);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_organization_id ON public.cash_sessions (organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_register_id ON public.cash_sessions (register_id);

-- cash_transactions
CREATE INDEX IF NOT EXISTS idx_cash_transactions_organization_id ON public.cash_transactions (organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_performed_by ON public.cash_transactions (performed_by);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_register_id ON public.cash_transactions (register_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_session_id ON public.cash_transactions (session_id);

-- chat_conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_agent_id ON public.chat_conversations (agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_organization_id ON public.chat_conversations (organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations (user_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages (conversation_id);

-- custom_reports
CREATE INDEX IF NOT EXISTS idx_custom_reports_organization_id ON public.custom_reports (organization_id);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);

-- driver_tokens
CREATE INDEX IF NOT EXISTS idx_driver_tokens_driver_id ON public.driver_tokens (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_tokens_organization_id ON public.driver_tokens (organization_id);
CREATE INDEX IF NOT EXISTS idx_driver_tokens_vehicle_id ON public.driver_tokens (vehicle_id);

-- employee_docs
CREATE INDEX IF NOT EXISTS idx_employee_docs_employee_id ON public.employee_docs (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_docs_organization_id ON public.employee_docs (organization_id);

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON public.employees (organization_id);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses (organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON public.expenses (supplier_id);

-- fuel_logs
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON public.fuel_logs (vehicle_id);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_organization_id ON public.inventory_movements (organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON public.inventory_movements (user_id);

-- maintenance_logs
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_organization_id ON public.maintenance_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_id ON public.maintenance_logs (vehicle_id);

-- metric_models
CREATE INDEX IF NOT EXISTS idx_metric_models_organization_id ON public.metric_models (organization_id);

-- organization_modules
CREATE INDEX IF NOT EXISTS idx_organization_modules_module_id ON public.organization_modules (module_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_organization_id ON public.organization_modules (organization_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments (organization_id);

-- payroll_advances
CREATE INDEX IF NOT EXISTS idx_payroll_advances_employee_id ON public.payroll_advances (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_advances_organization_id ON public.payroll_advances (organization_id);

-- performance_reviews
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON public.performance_reviews (employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_organization_id ON public.performance_reviews (organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON public.performance_reviews (reviewer_id);

-- piecework_tickets
CREATE INDEX IF NOT EXISTS idx_piecework_tickets_approved_by ON public.piecework_tickets (approved_by);
CREATE INDEX IF NOT EXISTS idx_piecework_tickets_creator_id ON public.piecework_tickets (creator_id);
CREATE INDEX IF NOT EXISTS idx_piecework_tickets_employee_id ON public.piecework_tickets (employee_id);
CREATE INDEX IF NOT EXISTS idx_piecework_tickets_organization_id ON public.piecework_tickets (organization_id);

-- process_events
CREATE INDEX IF NOT EXISTS idx_process_events_instance_id ON public.process_events (instance_id);
CREATE INDEX IF NOT EXISTS idx_process_events_step_id ON public.process_events (step_id);
CREATE INDEX IF NOT EXISTS idx_process_events_user_id ON public.process_events (user_id);

-- process_instances
CREATE INDEX IF NOT EXISTS idx_process_instances_organization_id ON public.process_instances (organization_id);
CREATE INDEX IF NOT EXISTS idx_process_instances_process_id ON public.process_instances (process_id);

-- process_steps
CREATE INDEX IF NOT EXISTS idx_process_steps_process_id ON public.process_steps (process_id);

-- processes
CREATE INDEX IF NOT EXISTS idx_processes_organization_id ON public.processes (organization_id);

-- product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON public.product_categories (organization_id);

-- product_groups
CREATE INDEX IF NOT EXISTS idx_product_groups_organization_id ON public.product_groups (organization_id);

-- product_units
CREATE INDEX IF NOT EXISTS idx_product_units_organization_id ON public.product_units (organization_id);

-- production_tasks
CREATE INDEX IF NOT EXISTS idx_production_tasks_organization_id ON public.production_tasks (organization_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_group_id ON public.products (group_id);
CREATE INDEX IF NOT EXISTS idx_products_master_product_id ON public.products (master_product_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products (organization_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON public.products (unit_id);

-- purchases
CREATE INDEX IF NOT EXISTS idx_purchases_approved_by ON public.purchases (approved_by);
CREATE INDEX IF NOT EXISTS idx_purchases_driver_id ON public.purchases (driver_id);
CREATE INDEX IF NOT EXISTS idx_purchases_organization_id ON public.purchases (organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases (product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_vehicle_id ON public.purchases (vehicle_id);

-- rca_reports
CREATE INDEX IF NOT EXISTS idx_rca_reports_instance_id ON public.rca_reports (instance_id);
CREATE INDEX IF NOT EXISTS idx_rca_reports_root_cause_event_id ON public.rca_reports (root_cause_event_id);
CREATE INDEX IF NOT EXISTS idx_rca_reports_target_event_id ON public.rca_reports (target_event_id);

-- route_stops
CREATE INDEX IF NOT EXISTS idx_route_stops_order_id ON public.route_stops (order_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_purchase_id ON public.route_stops (purchase_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON public.route_stops (route_id);

-- routes
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON public.routes (driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_organization_id ON public.routes (organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON public.routes (vehicle_id);

-- sales
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_driver_id ON public.sales (driver_id);
CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON public.sales (organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_vehicle_id ON public.sales (vehicle_id);

-- shared_insights
CREATE INDEX IF NOT EXISTS idx_shared_insights_source_org_id ON public.shared_insights (source_org_id);

-- suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers (organization_id);

-- terminals
CREATE INDEX IF NOT EXISTS idx_terminals_driver_id ON public.terminals (driver_id);
CREATE INDEX IF NOT EXISTS idx_terminals_organization_id ON public.terminals (organization_id);
CREATE INDEX IF NOT EXISTS idx_terminals_vehicle_id ON public.terminals (vehicle_id);

-- trust_events
CREATE INDEX IF NOT EXISTS idx_trust_events_organization_id ON public.trust_events (organization_id);

-- usage_patterns
CREATE INDEX IF NOT EXISTS idx_usage_patterns_module_id ON public.usage_patterns (module_id);
CREATE INDEX IF NOT EXISTS idx_usage_patterns_organization_id ON public.usage_patterns (organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_patterns_user_id ON public.usage_patterns (user_id);

-- user_organizations
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON public.user_organizations (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON public.user_organizations (user_id);

-- vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_organization_id ON public.vehicles (organization_id);

-- whatsapp_conversations
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id ON public.whatsapp_conversations (user_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON public.whatsapp_messages (conversation_id);

-- work_history
CREATE INDEX IF NOT EXISTS idx_work_history_employee_id ON public.work_history (employee_id);
CREATE INDEX IF NOT EXISTS idx_work_history_organization_id ON public.work_history (organization_id);

-- work_sessions
CREATE INDEX IF NOT EXISTS idx_work_sessions_employee_id ON public.work_sessions (employee_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_organization_id ON public.work_sessions (organization_id);
