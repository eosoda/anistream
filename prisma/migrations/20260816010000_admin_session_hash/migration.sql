-- New sessions store only a SHA-256 digest of the browser token.
ALTER TABLE "AdminSession" ALTER COLUMN "token" DROP NOT NULL;
ALTER TABLE "AdminSession" ADD COLUMN "tokenHash" TEXT;
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
