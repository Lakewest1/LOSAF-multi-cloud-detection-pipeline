receiver.subscribe({

  processMessage: async (message) => {

    const payload = message.body;

    try {

      const existing =
        await prisma.workflow_executions.findFirst({
          where: {
            execution_id: payload.executionId,
            workflow_step: payload.action,
            status: "SUCCESS"
          }
        });

      if (existing) {
        return;
      }

      if (
        payload.action === "DISABLE_ACCOUNT"
      ) {

        await graphClient
          .api(`/users/${payload.userId}`)
          .update({
            accountEnabled: false
          });
      }

      await prisma.workflow_executions.create({
        data: {
          execution_id: payload.executionId,
          incident_id: payload.incidentId,
          correlation_id: payload.correlationId,
          workflow_step: payload.action,
          status: "SUCCESS",
          retry_count: payload.retryCount
        }
      });

    } catch (error: any) {

      await prisma.workflow_executions.create({
        data: {
          execution_id: payload.executionId,
          incident_id: payload.incidentId,
          correlation_id: payload.correlationId,
          workflow_step: payload.action,
          status: "FAILED",
          retry_count: payload.retryCount,
          error_message: String(error)
        }
      });
    }
  },

  processError: async (args) => {
    console.error(args.error);
  }
});