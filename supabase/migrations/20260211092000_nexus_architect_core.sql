-- Create Enums
CREATE TYPE flow_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE flow_node_type AS ENUM ('trigger', 'action', 'condition', 'ai', 'webhook');
CREATE TYPE flow_execution_status AS ENUM ('running', 'completed', 'failed', 'simulated');

-- Create Flow Definitions
CREATE TABLE flow_definitions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status flow_status NOT NULL DEFAULT 'draft',
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Flow Nodes
CREATE TABLE flow_nodes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id VARCHAR NOT NULL REFERENCES flow_definitions(id) ON DELETE CASCADE,
    type flow_node_type NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
    metadata JSONB DEFAULT '{}'
);

-- Create Flow Edges
CREATE TABLE flow_edges (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id VARCHAR NOT NULL REFERENCES flow_definitions(id) ON DELETE CASCADE,
    source_node_id VARCHAR NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
    condition_label TEXT
);

-- Create Flow Executions
CREATE TABLE flow_executions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id VARCHAR NOT NULL REFERENCES flow_definitions(id) ON DELETE CASCADE,
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status flow_execution_status NOT NULL DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    logs JSONB NOT NULL DEFAULT '[]',
    context JSONB NOT NULL DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE flow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their organization's flows" ON flow_definitions
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's flows" ON flow_definitions
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their organization's flow nodes" ON flow_nodes
    FOR SELECT USING (flow_id IN (SELECT id FROM flow_definitions WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)));

CREATE POLICY "Users can manage their organization's flow nodes" ON flow_nodes
    FOR ALL USING (flow_id IN (SELECT id FROM flow_definitions WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)));

CREATE POLICY "Users can view their organization's flow edges" ON flow_edges
    FOR SELECT USING (flow_id IN (SELECT id FROM flow_definitions WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)));

CREATE POLICY "Users can manage their organization's flow edges" ON flow_edges
    FOR ALL USING (flow_id IN (SELECT id FROM flow_definitions WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text)));

CREATE POLICY "Users can view their organization's flow executions" ON flow_executions
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's flow executions" ON flow_executions
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));
