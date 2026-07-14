import { prisma } from "../utils/prisma";



export async function getIncidents() {
  return prisma.incidents.findMany({
    orderBy: {
      created_at: "desc"
    }
  });
}