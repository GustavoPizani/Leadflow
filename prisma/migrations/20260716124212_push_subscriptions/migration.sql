-- CreateTable
CREATE TABLE "leadflow_push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leadflow_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leadflow_push_subscriptions_endpoint_key" ON "leadflow_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "leadflow_push_subscriptions_userId_idx" ON "leadflow_push_subscriptions"("userId");

