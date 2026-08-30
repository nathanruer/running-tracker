-- Lot 9 — conversations : résumé en colonne, nature des messages, payload fusionné
BEGIN;
DO $$ BEGIN CREATE TYPE message_kind AS ENUM ('text', 'recommendation', 'summary'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_message_count int;
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS kind message_kind,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS input_tokens int,
  ADD COLUMN IF NOT EXISTS output_tokens int;

UPDATE conversation_messages m SET payload = p.payload, kind = 'recommendation'
FROM conversation_message_payloads p WHERE p."messageId" = m.id AND p."payloadType" = 'recommendations';
UPDATE conversation_messages SET kind = 'summary' WHERE role = 'system' AND kind IS NULL;
UPDATE conversation_messages SET kind = 'text' WHERE kind IS NULL;
ALTER TABLE conversation_messages ALTER COLUMN kind SET NOT NULL;

UPDATE conversations c
SET summary = s.content, summary_message_count = (s.meta->>'messageCountAtGeneration')::int
FROM (
  SELECT DISTINCT ON (m."conversationId") m."conversationId", m.content, p.payload AS meta
  FROM conversation_messages m
  LEFT JOIN conversation_message_payloads p ON p."messageId" = m.id AND p."payloadType" = 'summary_meta'
  WHERE m.role = 'system'
  ORDER BY m."conversationId", m."createdAt" DESC
) s WHERE s."conversationId" = c.id;
COMMIT;
