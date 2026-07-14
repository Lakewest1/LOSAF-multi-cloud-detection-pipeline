-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "execution_id" TEXT,
    "incident_id" TEXT,
    "correlation_id" TEXT,
    "action" TEXT,
    "result" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" BIGSERIAL NOT NULL,
    "incident_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "correlation_id" TEXT,
    "severity" TEXT,
    "risk_score" INTEGER,
    "status" TEXT,
    "user_email" TEXT,
    "source_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" BIGSERIAL NOT NULL,
    "execution_id" TEXT NOT NULL,
    "incident_id" TEXT,
    "correlation_id" TEXT,
    "workflow_step" TEXT,
    "status" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyst_decisions" (
    "id" BIGSERIAL NOT NULL,
    "incident_id" TEXT,
    "execution_id" TEXT,
    "correlation_id" TEXT,
    "decision" TEXT,
    "analyst" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyst_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rollback_records" (
    "id" BIGSERIAL NOT NULL,
    "rollback_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "old_account_enabled" BOOLEAN,
    "rollback_status" TEXT,
    "status" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rollback_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incident_id_key" ON "incidents"("incident_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_execution_id_key" ON "workflow_executions"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "rollback_records_rollback_id_key" ON "rollback_records"("rollback_id");
