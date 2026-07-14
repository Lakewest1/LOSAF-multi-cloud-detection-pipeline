import { prisma } from "../utils/prisma";

// =========================
// 1. RUNTIME CONSTANTS
// =========================
export const IncidentStates = {
  NEW: "NEW",
  DETECTED: "DETECTED",
  TRIAGED: "TRIAGED",
  CONTAINMENT_PENDING: "CONTAINMENT_PENDING",
  CONTAINED: "CONTAINED",
  APPROVAL_PENDING: "APPROVAL_PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  ANALYST_REVIEW: "ANALYST_REVIEW",
  FAILED: "FAILED",
} as const;

// =========================
// 2. TYPE ONLY
// =========================
export type IncidentState =
  (typeof IncidentStates)[keyof typeof IncidentStates];

// =========================
// 3. VALID TRANSITIONS
// =========================
const validTransitions: Record<IncidentState, IncidentState[]> = {
  NEW: [IncidentStates.DETECTED],
  DETECTED: [IncidentStates.TRIAGED, IncidentStates.CONTAINMENT_PENDING],
  TRIAGED: [IncidentStates.CONTAINMENT_PENDING],
  ANALYST_REVIEW: [IncidentStates.CONTAINMENT_PENDING],
  CONTAINMENT_PENDING: [IncidentStates.CONTAINED],
  CONTAINED: [IncidentStates.APPROVAL_PENDING],
  APPROVAL_PENDING: [IncidentStates.APPROVED, IncidentStates.REJECTED],
  APPROVED: [IncidentStates.RESOLVED],
  REJECTED: [IncidentStates.RESOLVED],
  RESOLVED: [IncidentStates.CLOSED],
  CLOSED: [],
  FAILED: [],
};

// =========================
// 4. FIXED STATE UPDATER (USING incidents TABLE)
// =========================
export async function updateIncidentState(
  incidentId: string,
  newState: IncidentState
) {
  const existing = await prisma.incidents.findUnique({
    where: { incident_id: incidentId },
  });

  const currentState =
    (existing?.status as IncidentState) || IncidentStates.NEW;

  if (
    existing &&
    !validTransitions[currentState].includes(newState)
  ) {
    throw new Error(
      `Invalid transition: ${currentState} → ${newState}`
    );
  }

  return prisma.incidents.update({
    where: { incident_id: incidentId },
    data: {
      status: newState,
    },
  });
}