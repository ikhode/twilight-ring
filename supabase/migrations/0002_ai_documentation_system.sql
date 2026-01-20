-- AI Documentation System Migration
-- Adds tables for knowledge base, chat agents, conversations, and messages

-- Knowledge Base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  access_roles JSONB DEFAULT '["admin", "manager", "user", "viewer"]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Chat Agents table
CREATE TABLE IF NOT EXISTS ai_chat_agents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  role role NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  knowledge_scope JSONB DEFAULT '[]'::jsonb,
  capabilities JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id VARCHAR NOT NULL REFERENCES ai_chat_agents(id),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org ON chat_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

-- Note: Embeddings table requires pgvector extension
-- Uncomment below if you have pgvector enabled in your Supabase instance
-- 
-- CREATE TABLE IF NOT EXISTS "embeddings" (
-- 	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
-- 	"entity_type" text NOT NULL,
-- 	"entity_id" varchar NOT NULL,
-- 	"content" text NOT NULL,
-- 	"embedding" vector(1536),
-- 	"created_at" timestamp DEFAULT now() NOT NULL
-- );
-- 
-- CREATE INDEX IF NOT EXISTS idx_embeddings_entity_kb ON embeddings(entity_type, entity_id) 
--   WHERE entity_type = 'knowledge_base';
