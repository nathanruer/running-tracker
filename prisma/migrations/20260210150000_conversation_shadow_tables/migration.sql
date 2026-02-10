-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_message_payloads" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "payloadType" TEXT NOT NULL,
    "payloadVersion" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_message_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "conversations_userId_updatedAt_idx" ON "conversations"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_createdAt_idx" ON "conversation_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_message_payloads_messageId_idx" ON "conversation_message_payloads"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_message_payloads_messageId_payloadType_key" ON "conversation_message_payloads"("messageId", "payloadType");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_message_payloads" ADD CONSTRAINT "conversation_message_payloads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_message_payloads" ENABLE ROW LEVEL SECURITY;

-- Policies: conversations
CREATE POLICY "Users can view own conversations v2" ON "public"."conversations"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own conversations v2" ON "public"."conversations"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own conversations v2" ON "public"."conversations"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own conversations v2" ON "public"."conversations"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

-- Policies: conversation_messages
CREATE POLICY "Users can view own messages v2" ON "public"."conversation_messages"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."conversations"
      WHERE "conversations"."id" = "conversation_messages"."conversationId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own messages v2" ON "public"."conversation_messages"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."conversations"
      WHERE "conversations"."id" = "conversation_messages"."conversationId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own messages v2" ON "public"."conversation_messages"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."conversations"
      WHERE "conversations"."id" = "conversation_messages"."conversationId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own messages v2" ON "public"."conversation_messages"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."conversations"
      WHERE "conversations"."id" = "conversation_messages"."conversationId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

-- Policies: conversation_message_payloads
CREATE POLICY "Users can view own message payloads v2" ON "public"."conversation_message_payloads"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."conversation_messages"
      JOIN "public"."conversations" ON "conversations"."id" = "conversation_messages"."conversationId"
      WHERE "conversation_messages"."id" = "conversation_message_payloads"."messageId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own message payloads v2" ON "public"."conversation_message_payloads"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."conversation_messages"
      JOIN "public"."conversations" ON "conversations"."id" = "conversation_messages"."conversationId"
      WHERE "conversation_messages"."id" = "conversation_message_payloads"."messageId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own message payloads v2" ON "public"."conversation_message_payloads"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."conversation_messages"
      JOIN "public"."conversations" ON "conversations"."id" = "conversation_messages"."conversationId"
      WHERE "conversation_messages"."id" = "conversation_message_payloads"."messageId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own message payloads v2" ON "public"."conversation_message_payloads"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."conversation_messages"
      JOIN "public"."conversations" ON "conversations"."id" = "conversation_messages"."conversationId"
      WHERE "conversation_messages"."id" = "conversation_message_payloads"."messageId"
      AND "conversations"."userId" = (SELECT auth.uid())::text
    )
  );
