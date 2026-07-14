-- CreateTable
CREATE TABLE "raw_events" (
    "id" BIGSERIAL NOT NULL,
    "rawId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "sourceIP" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "region" TEXT,
    "resourceType" TEXT,
    "rawData" TEXT NOT NULL,
    "normalizedData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_events_rawId_key" ON "raw_events"("rawId");
