-- Create ShieldLine Lines Table
CREATE TABLE shieldline_lines (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL UNIQUE,
    did_provider TEXT DEFAULT 'shieldline_core',
    status TEXT DEFAULT 'active',
    type TEXT DEFAULT 'mexico_did',
    ivr_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create ShieldLine Extensions Table
CREATE TABLE shieldline_extensions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    line_id VARCHAR REFERENCES shieldline_lines(id) ON DELETE SET NULL,
    extension_number TEXT NOT NULL,
    display_name TEXT NOT NULL,
    user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    device_type TEXT DEFAULT 'webrtc',
    status TEXT DEFAULT 'offline',
    settings JSONB DEFAULT '{"recordCalls": false, "doNotDisturb": false, "forwardTo": null}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create ShieldLine Firewall Rules Table
CREATE TABLE shieldline_firewall_rules (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'whitelist', 'blacklist', 'spam_filter'
    pattern TEXT NOT NULL,
    action TEXT DEFAULT 'block', -- 'allow', 'block', 'ivr_challenge'
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create ShieldLine Calls Table (Execution Logs)
CREATE TABLE shieldline_calls (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    line_id VARCHAR NOT NULL REFERENCES shieldline_lines(id) ON DELETE CASCADE,
    extension_id VARCHAR REFERENCES shieldline_extensions(id) ON DELETE SET NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'inbound', 'outbound', 'internal'
    status TEXT NOT NULL, -- 'completed', 'missed', 'blocked', 'busy'
    duration INTEGER DEFAULT 0,
    recording_url TEXT,
    firewall_match_id VARCHAR REFERENCES shieldline_firewall_rules(id) ON DELETE SET NULL,
    cost INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE shieldline_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE shieldline_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shieldline_firewall_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shieldline_calls ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "ShieldLine lines are viewable by organization members" ON shieldline_lines
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "ShieldLine extensions are viewable by organization members" ON shieldline_extensions
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "ShieldLine firewall rules are manageable by organization members" ON shieldline_firewall_rules
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "ShieldLine calls are viewable by organization members" ON shieldline_calls
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));
