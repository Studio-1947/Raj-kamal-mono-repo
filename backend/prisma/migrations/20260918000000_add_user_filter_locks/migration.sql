-- CreateTable
CREATE TABLE IF NOT EXISTS "user_filter_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_filter_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_filter_locks_userId_featureKey_key" ON "user_filter_locks"("userId", "featureKey");

-- AddForeignKey
ALTER TABLE "user_filter_locks" DROP CONSTRAINT IF EXISTS "user_filter_locks_userId_fkey";
ALTER TABLE "user_filter_locks" ADD CONSTRAINT "user_filter_locks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
