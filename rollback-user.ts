import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Client } from "@microsoft/microsoft-graph-client"
import { ClientSecretCredential } from "@azure/identity"

const prisma = new PrismaClient()

const credential = new ClientSecretCredential(
  process.env.GRAPH_TENANT_ID!,
  process.env.GRAPH_CLIENT_ID!,
  process.env.GRAPH_CLIENT_SECRET!
)

const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken(
        "https://graph.microsoft.com/.default"
      )
      return token?.token || ""
    }
  }
})

async function rollbackUser(userId: string) {

  const record = await prisma.rollback_records.findFirst({
    where: {
      user_id: userId,
      rollback_status: "READY"
    }
  })

  if (!record) {
    throw new Error("No rollback record found")
  }

  await client.api(`/users/${userId}`)
    .patch({
      accountEnabled: true
    })

  await prisma.rollback_records.update({
    where: {
      id: record.id
    },
    data: {
      rollback_status: "COMPLETED",
      rolled_back_at: new Date()
    }
  })

  console.log("ROLLBACK SUCCESSFUL")
}

rollbackUser("USER-ID-HERE")