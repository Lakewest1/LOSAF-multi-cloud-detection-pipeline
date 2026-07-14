import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function calculateUEBA(event: any) {

  const userId = event.userId;

  const country = event.country || "";
  const device = event.device || "";

  const baseline = await prisma.user_baseline.findFirst({
    where: {
      user_email: userId
    }
  });

  let score = 0;

  // =========================
  // NEW USER HANDLING
  // =========================
  if (!baseline) {

    await prisma.user_baseline.create({
      data: {
        user_email: userId,
        last_country: country,
        last_device: device
      }
    });

    return {
      uebaScore: 20,
      deviations: {
        newUser: true
      }
    };
  }

  // =========================
  // SCORING
  // =========================
  const rareCountry = country !== baseline.last_country;
  const rareDevice = device !== baseline.last_device;

  if (rareCountry) score += 30;
  if (rareDevice) score += 20;
  if (event.countryChangedWithin1Hour) score += 30;
  if (!event.mfaUsed) score += 15;
  if (event.isNewAdminAction) score += 25;

  // =========================
  // UPDATE BASELINE SAFELY
  // =========================
  await prisma.user_baseline.updateMany({
    where: {
      user_email: userId
    },
    data: {
      last_country: country,
      last_device: device
    }
  });

  return {
    uebaScore: score,
    deviations: {
      rareCountry,
      rareDevice,
      impossibleTravel: !!event.countryChangedWithin1Hour,
      mfaAnomaly: !event.mfaUsed,
      firstTimeAdmin: !!event.isNewAdminAction
    }
  };
}