ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on migrations table" ON "public"."_prisma_migrations"
  FOR ALL
  USING (true)
  WITH CHECK (true);
