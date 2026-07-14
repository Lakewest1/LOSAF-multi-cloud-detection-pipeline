-- Reconcile migration history with database state that was
-- modified outside of Prisma Migrate (already exists in production DB)

CREATE TABLE "user_baseline" (
    "id" BIGSERIAL NOT NULL,
    "user_email" TEXT NOT NULL,
    "last_country" TEXT,
    "last_device" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_baseline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_baseline_user_email_key" ON "user_baseline"("user_email");

ALTER TABLE "incidents" ADD COLUMN "analyst_decision" TEXT;
ALTER TABLE "incidents" ADD COLUMN "approval_deadline" TIMESTAMP(3);
ALTER TABLE "incidents" ADD COLUMN "containment_reason" TEXT;
ALTER TABLE "incidents" ADD COLUMN "decision_time" TIMESTAMP(6);
ALTER TABLE "incidents" ADD COLUMN "rollback_id" TEXT;
ALTER TABLE "incidents" ADD COLUMN "servicenow_ticket" TEXT;
ALTER TABLE "incidents" ADD COLUMN "soc_decision" TEXT DEFAULT 'PENDING';
ALTER TABLE "incidents" ADD COLUMN "timeout_deadline" TIMESTAMP(6);