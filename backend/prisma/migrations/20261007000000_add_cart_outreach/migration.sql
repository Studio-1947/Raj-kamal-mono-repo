-- CreateTable
CREATE TABLE IF NOT EXISTS "cart_outreach" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONTACTED',
    "channel" TEXT,
    "note" TEXT,
    "contactedById" TEXT,
    "contactedByName" TEXT,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_outreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cart_outreach_cartId_key" ON "cart_outreach"("cartId");
CREATE INDEX IF NOT EXISTS "cart_outreach_status_idx" ON "cart_outreach"("status");
