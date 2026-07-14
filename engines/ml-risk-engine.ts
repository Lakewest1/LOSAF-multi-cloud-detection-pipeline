import { calculateUEBA } from "./ueba-engine";

export async function calculateMLRisk(event: any) {
  // =========================
  // 1. SAFE NORMALIZATION
  // =========================
  const role = String(event.role ?? "").trim().toLowerCase();

  const normalizedEvent = {
    ...event,
    userId: event.userId ?? event.upn ?? null,
    role,

    vtDetections: Number(event.vtDetections ?? 0),
    abuseConfidence: Number(event.abuseConfidence ?? 0),
    failedLogins: Number(event.failedLogins ?? 0),
    riskScore: Number(event.riskScore ?? 0),

    countryChangedWithin1Hour: event.countryChangedWithin1Hour === true,
    suspiciousProcess: event.suspiciousProcess === true,
    mfaUsed: event.mfaUsed === true,

    isAdmin: event.isAdmin === true || event.isNewAdminAction === true,
    persistenceDetected: event.persistenceDetected === true,

    mitreTags: String(event.mitreTags ?? "").toUpperCase(),
  };

  // =========================
  // 2. UEBA (SAFE)
  // =========================
  let ueba;
  try {
    ueba = await calculateUEBA(normalizedEvent);
  } catch (err) {
    console.error("UEBA FAILED → fallback used:", err);

    ueba = {
      uebaScore: 5,
      deviations: {
        rareCountry: false,
        rareDevice: false,
        impossibleTravel: false,
        mfaAnomaly: false,
        firstTimeAdmin: false,
      },
    };
  }

  const uebaScore = Number(ueba.uebaScore ?? 0);

  // =========================
  // 3. ROLE LOGIC
  // =========================
  const privilegedRoles = new Set([
    "application administrator",
    "global administrator",
    "privileged role administrator",
    "user administrator",
    "security administrator",
    "exchange administrator",
    "sharepoint administrator",
    "cloud application administrator",
    "authentication administrator",
    "hybrid identity administrator",
  ]);

  const isPrivilegedRole = privilegedRoles.has(role);
  const isAdmin = Boolean(normalizedEvent.isAdmin || isPrivilegedRole);

  // =========================
  // 4. PERSISTENCE
  // =========================
  const mitre = normalizedEvent.mitreTags;

  const persistenceDetected = Boolean(
    normalizedEvent.persistenceDetected ||
    mitre.includes("T1098") ||
    (mitre.includes("TA0003") && isAdmin)
  );

  // =========================
  // 5. EXTERNAL SIGNALS
  // =========================
  const vtScore = Math.min(normalizedEvent.vtDetections * 4, 20);
  const abuseScore = Math.min(normalizedEvent.abuseConfidence, 30);

  // =========================
  // 6. BEHAVIOR WEIGHTS
  // =========================
  const privilegeWeight = isAdmin ? 20 : 5;
  const persistenceWeight = persistenceDetected ? 15 : 0;
  const geoWeight = normalizedEvent.countryChangedWithin1Hour ? 15 : 0;

  const failedLoginWeight = Math.min(normalizedEvent.failedLogins * 4, 15);
  const suspiciousProcessWeight = normalizedEvent.suspiciousProcess ? 20 : 0;

  // =========================
  // 7. SCORE
  // =========================
  const baseScore =
    uebaScore +
    vtScore +
    abuseScore +
    privilegeWeight +
    persistenceWeight +
    geoWeight +
    failedLoginWeight +
    suspiciousProcessWeight;

  const mlThreatScore = Math.min(
    Math.max(baseScore, normalizedEvent.riskScore),
    100
  );

  // =========================
  // 8. RETURN ONLY (NO SIDE EFFECTS)
  // =========================
  return {
    mlThreatScore,
    uebaScore,

    signals: {
      ueba: ueba.deviations,
      vtScore,
      abuseScore,
      privilegeWeight,
      persistenceWeight,
      geoWeight,
      failedLoginWeight,
      suspiciousProcessWeight,

      detectedRole: normalizedEvent.role,
      isPrivilegedRole,
      isAdmin,
      persistenceDetected,
      incomingRiskScore: normalizedEvent.riskScore,
    },
  };
}