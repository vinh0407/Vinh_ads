CREATE TABLE "facebook_oauth_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "state_hash" TEXT NOT NULL,
  "pending_pages_encrypted" TEXT,
  "token_expires_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "facebook_oauth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "facebook_oauth_sessions_state_hash_key" ON "facebook_oauth_sessions"("state_hash");
CREATE INDEX "facebook_oauth_sessions_user_id_expires_at_idx" ON "facebook_oauth_sessions"("user_id", "expires_at");
ALTER TABLE "facebook_oauth_sessions" ADD CONSTRAINT "facebook_oauth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
