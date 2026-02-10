-- Enable Row Level Security on user shadow tables
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."external_accounts" ENABLE ROW LEVEL SECURITY;

-- ============================
-- user_profiles (has userId)
-- ============================
CREATE POLICY "Users can view own user_profiles" ON "public"."user_profiles"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own user_profiles" ON "public"."user_profiles"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own user_profiles" ON "public"."user_profiles"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own user_profiles" ON "public"."user_profiles"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

-- ===============================
-- user_preferences (has userId)
-- ===============================
CREATE POLICY "Users can view own user_preferences" ON "public"."user_preferences"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own user_preferences" ON "public"."user_preferences"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own user_preferences" ON "public"."user_preferences"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own user_preferences" ON "public"."user_preferences"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

-- ================================
-- external_accounts (has userId)
-- ================================
CREATE POLICY "Users can view own external_accounts" ON "public"."external_accounts"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own external_accounts" ON "public"."external_accounts"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own external_accounts" ON "public"."external_accounts"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own external_accounts" ON "public"."external_accounts"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");
