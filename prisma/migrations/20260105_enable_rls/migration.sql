-- Enable Row Level Security on all tables
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."training_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON "public"."users"
  FOR SELECT
  USING ((SELECT auth.uid())::text = id);

CREATE POLICY "Users can update own data" ON "public"."users"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = id);

CREATE POLICY "Users can insert own data" ON "public"."users"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = id);

CREATE POLICY "Users can view own training sessions" ON "public"."training_sessions"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own training sessions" ON "public"."training_sessions"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own training sessions" ON "public"."training_sessions"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own training sessions" ON "public"."training_sessions"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can view own conversations" ON "public"."chat_conversations"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own conversations" ON "public"."chat_conversations"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own conversations" ON "public"."chat_conversations"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own conversations" ON "public"."chat_conversations"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can view own messages" ON "public"."chat_messages"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."chat_conversations"
      WHERE "chat_conversations"."id" = "chat_messages"."conversationId"
      AND "chat_conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own messages" ON "public"."chat_messages"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."chat_conversations"
      WHERE "chat_conversations"."id" = "chat_messages"."conversationId"
      AND "chat_conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own messages" ON "public"."chat_messages"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."chat_conversations"
      WHERE "chat_conversations"."id" = "chat_messages"."conversationId"
      AND "chat_conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own messages" ON "public"."chat_messages"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."chat_conversations"
      WHERE "chat_conversations"."id" = "chat_messages"."conversationId"
      AND "chat_conversations"."userId" = (SELECT auth.uid())::text
    )
  );

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on migrations table" ON "public"."_prisma_migrations"
  FOR ALL
  USING (true)
  WITH CHECK (true);