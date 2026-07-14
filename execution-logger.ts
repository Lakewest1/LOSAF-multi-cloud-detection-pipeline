import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function logExecution(
  executionId: string,
  incidentId: string,
  workflowStep: string,
  status: string
) {

  await prisma.workflow_executions.create({
    data: {
      execution_id: executionId,
      incident_id: incidentId,
      workflow_step: workflowStep,
      status
    }
  })
}