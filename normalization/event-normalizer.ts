import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NormalizedEvent {
  id?: string;
  source: 'aws_cloudtrail' | 'kubernetes_audit' | 'azure_entra';
  action: string;
  actor: string;
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  region: string;
  rawData: string;
  sourceIP: string;
}

export class EventNormalizer {
  /**
   * Normalize raw events from all collectors into unified schema
   */
  async normalizeRawEvents(): Promise<NormalizedEvent[]> {
    try {
      // Get all pending raw events from database
      const rawEvents = await prisma.rawEvent.findMany({
        where: { status: 'pending' },
        take: 100,
      });

      console.log(`[Normalizer] Processing ${rawEvents.length} raw events`);

      const normalized: NormalizedEvent[] = [];

      for (const event of rawEvents) {
        const normalizedData = this.normalizeEvent(event as any);

        if (normalizedData) {
          normalized.push(normalizedData);

          // Mark as normalized in DB and persist the computed fields
          try {
            await prisma.rawEvent.update({
              where: { id: event.id },
              data: {
                status: 'normalized',
                normalizedData: normalizedData as any,
              },
            });
          } catch (dbError) {
            console.log(`  [Normalizer] DB update skipped for event ${event.id}`);
          }
        }
      }

      console.log(`[Normalizer] Normalized ${normalized.length} events`);
      return normalized;
    } catch (error) {
      console.error('[Normalizer] Error:', error);
      return [];
    }
  }

  /**
   * Convert single raw event to normalized schema
   */
  private normalizeEvent(rawEvent: any): NormalizedEvent | null {
    try {
      const { source, eventType, user, sourceIP, timestamp, region, rawData } = rawEvent;

      let action = '';
      let target = '';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // ──────────────────────────────────────────
      // AWS NORMALIZATION
      // ──────────────────────────────────────────
      if (source === 'aws_cloudtrail') {
        target = 'AWS';

        if (eventType.includes('AccessKey')) {
          action = 'CREDENTIAL_CREATION';
          severity = 'high';
        } else if (eventType.includes('AttachUserPolicy')) {
          action = 'PRIVILEGE_ESCALATION';
          severity = 'critical';
        } else if (eventType.includes('CreateUser')) {
          action = 'USER_CREATION';
          severity = 'high';
        } else if (eventType.includes('ConsoleLogin')) {
          action = 'USER_LOGIN';
          severity = 'medium';
        } else if (eventType.includes('DeleteAccessKey')) {
          action = 'CREDENTIAL_DELETION';
          severity = 'low';
        } else if (eventType.includes('PutUserPolicy')) {
          action = 'POLICY_MODIFICATION';
          severity = 'high';
        } else {
          action = eventType;
          severity = 'medium';
        }
      }

      // ──────────────────────────────────────────
      // KUBERNETES NORMALIZATION
      // ──────────────────────────────────────────
      else if (source === 'kubernetes_audit') {
        target = 'KUBERNETES';

        if (eventType === 'EXEC') {
          action = 'POD_EXECUTION';
          severity = 'critical';
        } else if (eventType === 'CREATE') {
          action = 'OBJECT_CREATION';
          severity = 'medium';
        } else if (eventType === 'DELETE') {
          action = 'OBJECT_DELETION';
          severity = 'medium';
        } else if (eventType === 'PATCH') {
          action = 'OBJECT_MODIFICATION';
          severity = 'medium';
        } else if (eventType === 'GET') {
          action = 'RESOURCE_ACCESS';
          severity = 'low';
        } else if (eventType === 'LIST') {
          action = 'RESOURCE_ENUMERATION';
          severity = 'low';
        } else {
          action = eventType;
          severity = 'medium';
        }
      }

      // ──────────────────────────────────────────
      // AZURE NORMALIZATION
      // ──────────────────────────────────────────
      else if (source === 'azure_entra') {
        target = 'AZURE';

        if (eventType === 'LOGIN') {
          action = 'USER_LOGIN';
          severity = 'low';
        } else if (eventType === 'MFA_CHALLENGE') {
          action = 'MFA_TRIGGERED';
          severity = 'medium';
        } else if (eventType === 'PASSWORD_RESET') {
          action = 'PASSWORD_RESET';
          severity = 'medium';
        } else if (eventType === 'PERMISSION_GRANT') {
          action = 'PERMISSION_GRANTED';
          severity = 'high';
        } else {
          action = eventType;
          severity = 'medium';
        }
      }

      // ──────────────────────────────────────────
      // Detect risk indicators and adjust severity
      // ──────────────────────────────────────────
      const rawDataStr = rawData || '';

      // Check for suspicious indicators
      if (
        rawDataStr.includes('Russia') ||
        rawDataStr.includes('185.220.100') || // Tor IP
        rawDataStr.includes('atRisk') ||
        rawDataStr.includes('impossibleTravel')
      ) {
        if (severity === 'low' || severity === 'medium') {
          severity = 'high';
        }
      }

      // AdminAccess or root operations are critical
      if (
        rawDataStr.includes('AdministratorAccess') ||
        rawDataStr.includes('root') ||
        action.includes('ESCALATION')
      ) {
        severity = 'critical';
      }

      return {
        source: source as any,
        action: action || eventType,
        actor: user || 'unknown',
        target,
        severity,
        timestamp: new Date(timestamp),
        region,
        rawData,
        sourceIP,
      };
    } catch (error) {
      console.error('[Normalizer] Error normalizing event:', error);
      return null;
    }
  }

  /**
   * Get normalized events for detection
   */
  async getNormalizedEvents(): Promise<NormalizedEvent[]> {
    const events = await this.normalizeRawEvents();
    return events;
  }

  /**
   * Print summary of normalized events
   */
  async printSummary(): Promise<void> {
    const events = await this.normalizeRawEvents();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 NORMALIZATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Group by source
    const bySource = events.reduce(
      (acc, event) => {
        if (!acc[event.source]) acc[event.source] = [];
        acc[event.source].push(event);
        return acc;
      },
      {} as Record<string, NormalizedEvent[]>
    );

    for (const [source, sourceEvents] of Object.entries(bySource)) {
      console.log(`📌 ${source.toUpperCase()}`);
      sourceEvents.forEach((event, idx) => {
        console.log(`   [${idx + 1}] ${event.action}`);
        console.log(`       Actor: ${event.actor}`);
        console.log(`       Severity: ${event.severity.toUpperCase()}`);
        console.log(`       Target: ${event.target}\n`);
      });
    }

    // Severity breakdown
    const severityCount = events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('⚠️  SEVERITY BREAKDOWN:');
    console.log(`   🔴 Critical: ${severityCount.critical || 0}`);
    console.log(`   🟠 High: ${severityCount.high || 0}`);
    console.log(`   🟡 Medium: ${severityCount.medium || 0}`);
    console.log(`   🟢 Low: ${severityCount.low || 0}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Standalone execution
if (require.main === module) {
  const normalizer = new EventNormalizer();

  normalizer.normalizeRawEvents().then((events) => {
    console.log(`\n✅ Normalized ${events.length} events\n`);

    // Print each normalized event
    events.forEach((event, idx) => {
      console.log(`[${idx + 1}] ${event.source} → ${event.action}`);
      console.log(`    Actor: ${event.actor} | Target: ${event.target} | Severity: ${event.severity}\n`);
    });

    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default EventNormalizer;