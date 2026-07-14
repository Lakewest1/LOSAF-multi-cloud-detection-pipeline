import "isomorphic-fetch";
import "dotenv/config";

import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.GRAPH_TENANT_ID!,
  process.env.GRAPH_CLIENT_ID!,
  process.env.GRAPH_CLIENT_SECRET!
);

export const graphClient =
  Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {

        const token =
          await credential.getToken(
            "https://graph.microsoft.com/.default"
          );

        return token?.token || "";
      }
    }
  });