import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────
// MITRE ATT&CK Framework Mappings
// ──────────────────────────────────────────────────────────────

export interface MitreMapping {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  riskScore: number;
  description: string;
}

export const MITRE_MATRIX: Record<string, MitreMapping> = {
  'T1078': {
    techniqueId: 'T1078',
    techniqueName: 'Valid Accounts',
    tactic: 'Initial Access',
    riskScore: 75,
    description: 'Adversaries may obtain and abuse credentials of existing accounts.',
  },
  'T1098': {
    techniqueId: 'T1098',
    techniqueName: 'Account Manipulation',
    tactic: 'Persistence',
    riskScore: 85,
    description: 'Adversaries may manipulate accounts to maintain access.',
  },
  'T1136': {
    techniqueId: 'T1136',
    techniqueName: 'Create Account',
    tactic: 'Persistence',
    riskScore: 65,
    description: 'Adversaries may create accounts to maintain access.',
  },
  'T1547': {
    techniqueId: 'T1547',
    techniqueName: 'Boot or Logon Initialization Scripts',
    tactic: 'Persistence',
    riskScore: 70,
    description: 'Adversaries abuse initialization scripts for persistence.',
  },
  'T1059': {
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    tactic: 'Execution',
    riskScore: 80,
    description: 'Adversaries may abuse command interpreters for execution.',
  },
  'T1609': {
    techniqueId: 'T1609',
    techniqueName: 'Container Administration Command',
    tactic: 'Execution',
    riskScore: 90,
    description: 'Adversaries may abuse commands in containers for execution.',
  },
  'T1610': {
    techniqueId: 'T1610',
    techniqueName: 'Deploy Container',
    tactic: 'Execution',
    riskScore: 85,
    description: 'Adversaries may deploy containers into clusters.',
  },
  'T1611': {
    techniqueId: 'T1611',
    techniqueName: 'Escape to Host',
    tactic: 'Privilege Escalation',
    riskScore: 90,
    description: 'Adversaries may escape container to gain host access.',
  },
  'T1552': {
    techniqueId: 'T1552',
    techniqueName: 'Unsecured Credentials',
    tactic: 'Credential Access',
    riskScore: 80,
    description: 'Adversaries may search for unsecured credentials.',
  },
  'T1110': {
    techniqueId: 'T1110',
    techniqueName: 'Brute Force',
    tactic: 'Credential Access',
    riskScore: 70,
    description: 'Adversaries may use brute force to gain access.',
  },
  'T1087': {
    techniqueId: 'T1087',
    techniqueName: 'Account Discovery',
    tactic: 'Discovery',
    riskScore: 55,
    description: 'Adversaries may enumerate accounts.',
  },
  'T1526': {
    techniqueId: 'T1526',
    techniqueName: 'Cloud Service Discovery',
    tactic: 'Discovery',
    riskScore: 60,
    description: 'Adversaries may enumerate cloud infrastructure.',
  },
  'T1613': {
    techniqueId: 'T1613',
    techniqueName: 'Container and Resource Discovery',
    tactic: 'Discovery',
    riskScore: 55,
    description: 'Adversaries may discover containers in Kubernetes.',
  },
  'T1562': {
    techniqueId: 'T1562',
    techniqueName: 'Impair Defenses',
    tactic: 'Defense Evasion',
    riskScore: 85,
    description: 'Adversaries may disable security tools.',
  },
  'T1070': {
    techniqueId: 'T1070',
    techniqueName: 'Indicator Removal',
    tactic: 'Defense Evasion',
    riskScore: 70,
    description: 'Adversaries may remove logs to hide activity.',
  },
  'T1484': {
    techniqueId: 'T1484',
    techniqueName: 'Domain Policy Modification',
    tactic: 'Privilege Escalation',
    riskScore: 90,
    description: 'Adversaries may modify policies to escalate privileges.',
  },
  'T1485': {
    techniqueId: 'T1485',
    techniqueName: 'Data Destruction',
    tactic: 'Impact',
    riskScore: 95,
    description: 'Adversaries may destroy data to disrupt operations.',
  },
  'T1486': {
    techniqueId: 'T1486',
    techniqueName: 'Data Encrypted for Impact',
    tactic: 'Impact',
    riskScore: 95,
    description: 'Adversaries may encrypt data for ransom.',
  },
};

// ──────────────────────────────────────────────────────────────
// Enhanced MITRE Mapper
// ──────────────────────────────────────────────────────────────

export interface EnrichedEvent {
  id: string;
  source: string;
  action: string;
  actor: string;
  severity: string;
  mitreTechnique: string;
  mitreTechniqueName: string;
  mitreTactic: string;
  mitreRiskScore: number;
}

export class MitreMapperEnhanced {
  /**
   * Map all normalized events to MITRE techniques
   */
  async mapAllEvents(): Promise<EnrichedEvent[]> {
    try {
      console.log('\n🎯 MITRE ATT&CK Mapping Engine\n');
      console.log('Fetching normalized events from database...\n');

      // Get all normalized events
      const rows = await prisma.rawEvent.findMany({
        where: { status: 'normalized' },
        orderBy: { timestamp: 'desc' },
      });

      console.log(`Found ${rows.length} normalized events\n`);

      if (rows.length === 0) {
        console.log('⚠️  No normalized events found.');
        console.log('   Please run: npm run normalizer\n');
        return [];
      }

      const enrichedEvents: EnrichedEvent[] = [];

      console.log('Mapping events to MITRE techniques:\n');

      for (const row of rows) {
        try {
          const data = row.normalizedData as any;

          if (!data?.action) {
            continue;
          }

          const mapping = this.detectTechnique(data);

          // FIX: Convert bigint to string using toString()
          const enriched: EnrichedEvent = {
            id: row.id.toString(),
            source: data.source || 'unknown',
            action: data.action || '',
            actor: data.actor || 'unknown',
            severity: data.severity || 'low',
            mitreTechnique: mapping.techniqueId,
            mitreTechniqueName: mapping.techniqueName,
            mitreTactic: mapping.tactic,
            mitreRiskScore: mapping.riskScore,
          };

          enrichedEvents.push(enriched);

          // Update database — persist the MITRE enrichment into
          // normalizedData, not just the status flag, so downstream
          // consumers (dashboard, risk engine) have real data to read.
          try {
            await prisma.rawEvent.update({
              where: { id: row.id },
              data: {
                status: 'mitre_mapped',
                normalizedData: {
                  ...data,
                  mitreTechnique: mapping.techniqueId,
                  mitreTechniqueName: mapping.techniqueName,
                  mitreTactic: mapping.tactic,
                  mitreRiskScore: mapping.riskScore,
                  mitreDescription: mapping.description,
                },
              },
            });
          } catch (dbError) {
            console.warn(`  ⚠ DB update failed for event ${row.id}:`, (dbError as any).message);
          }
        } catch (eventError) {
          console.error(`Error processing event: ${(eventError as any).message}`);
        }
      }

      return enrichedEvents;
    } catch (error) {
      console.error('[MITRE] Error:', error);
      return [];
    }
  }

  /**
   * Detect MITRE technique from event
   */
  private detectTechnique(event: any): MitreMapping {
    const { source, action, severity } = event;

    // AWS CLOUDTRAIL
    if (source === 'aws_cloudtrail') {
      if (action.includes('CREDENTIAL_CREATION')) return MITRE_MATRIX['T1552'];
      if (action.includes('PRIVILEGE_ESCALATION')) return MITRE_MATRIX['T1098'];
      if (action.includes('USER_CREATION')) return MITRE_MATRIX['T1136'];
      if (action.includes('USER_LOGIN')) return MITRE_MATRIX['T1078'];
      if (action.includes('POLICY_MODIFICATION')) return MITRE_MATRIX['T1484'];
    }

    // KUBERNETES
    if (source === 'kubernetes_audit') {
      if (action.includes('POD_EXECUTION')) return MITRE_MATRIX['T1609'];
      if (action.includes('OBJECT_CREATION')) return MITRE_MATRIX['T1611'];
      if (action.includes('RESOURCE_ENUMERATION')) return MITRE_MATRIX['T1613'];
    }

    // AZURE
    if (source === 'azure_entra') {
      if (action.includes('USER_LOGIN')) return MITRE_MATRIX['T1078'];
      if (action.includes('PERMISSION_GRANTED')) return MITRE_MATRIX['T1098'];
    }

    return MITRE_MATRIX['T1078'];
  }

  /**
   * Print comprehensive threat report
   */
  printThreatReport(events: EnrichedEvent[]): void {
    if (events.length === 0) {
      console.log('No events to report.\n');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 MITRE ATT&CK THREAT INTELLIGENCE REPORT\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ──────────────────────────────────────────
    // SECTION 1: Overall Statistics
    // ──────────────────────────────────────────
    console.log('📈 OVERALL STATISTICS\n');
    console.log(`  Total Events Analyzed:     ${events.length}`);

    const criticalCount = events.filter((e) => e.severity === 'critical').length;
    const highCount = events.filter((e) => e.severity === 'high').length;
    const mediumCount = events.filter((e) => e.severity === 'medium').length;
    const lowCount = events.filter((e) => e.severity === 'low').length;

    console.log(`  🔴 Critical Events:        ${criticalCount}`);
    console.log(`  🟠 High Severity:          ${highCount}`);
    console.log(`  🟡 Medium Severity:        ${mediumCount}`);
    console.log(`  🟢 Low Severity:           ${lowCount}\n`);

    // Average risk
    const avgRisk = Math.round(
      events.reduce((sum, e) => sum + e.mitreRiskScore, 0) / events.length
    );
    console.log(`  Average Risk Score:        ${avgRisk}/100\n`);

    // ──────────────────────────────────────────
    // SECTION 2: Group by Technique
    // ──────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔗 MITRE TECHNIQUES DETECTED\n');

    const byTechnique = events.reduce(
      (acc, event) => {
        if (!acc[event.mitreTechnique]) {
          acc[event.mitreTechnique] = [];
        }
        acc[event.mitreTechnique].push(event);
        return acc;
      },
      {} as Record<string, EnrichedEvent[]>
    );

    // Sort by count (descending)
    const sortedTechniques = Object.entries(byTechnique).sort(
      (a, b) => b[1].length - a[1].length
    );

    sortedTechniques.forEach(([technique, techniqueEvents], index) => {
      const mapping = MITRE_MATRIX[technique];
      const riskColor =
        mapping.riskScore >= 90 ? '🔴' : mapping.riskScore >= 75 ? '🟠' : '🟡';

      console.log(`${index + 1}. ${technique} - ${mapping.techniqueName}`);
      console.log(`   Tactic:        ${mapping.tactic}`);
      console.log(`   Risk Score:    ${riskColor} ${mapping.riskScore}/100`);
      console.log(`   Occurrences:   ${techniqueEvents.length} events`);
      console.log(`   Reference:     https://attack.mitre.org/techniques/${technique.replace('.', '/')}/`);

      // Show sources for this technique
      const sources = [...new Set(techniqueEvents.map((e) => e.source))];
      console.log(`   Sources:       ${sources.join(', ')}\n`);
    });

    // ──────────────────────────────────────────
    // SECTION 3: Group by Tactic
    // ──────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 TACTICS DISTRIBUTION\n');

    const byTactic = events.reduce(
      (acc, event) => {
        if (!acc[event.mitreTactic]) {
          acc[event.mitreTactic] = [];
        }
        acc[event.mitreTactic].push(event);
        return acc;
      },
      {} as Record<string, EnrichedEvent[]>
    );

    const sortedTactics = Object.entries(byTactic).sort((a, b) => b[1].length - a[1].length);

    sortedTactics.forEach(([tactic, tacticEvents]) => {
      const tacticRisk = Math.round(
        tacticEvents.reduce((sum, e) => sum + e.mitreRiskScore, 0) / tacticEvents.length
      );
      const riskColor = tacticRisk >= 80 ? '🔴' : tacticRisk >= 60 ? '🟠' : '🟡';

      console.log(`${riskColor} ${tactic.toUpperCase()}`);
      console.log(`   Events:        ${tacticEvents.length}`);
      console.log(`   Avg Risk:      ${tacticRisk}/100`);

      // Show techniques for this tactic
      const techniques = [...new Set(tacticEvents.map((e) => e.mitreTechnique))];
      console.log(`   Techniques:    ${techniques.join(', ')}\n`);
    });

    // ──────────────────────────────────────────
    // SECTION 4: Top Threat Actors/Sources
    // ──────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('👤 TOP THREAT ACTORS\n');

    const byActor = events.reduce(
      (acc, event) => {
        if (!acc[event.actor]) {
          acc[event.actor] = [];
        }
        acc[event.actor].push(event);
        return acc;
      },
      {} as Record<string, EnrichedEvent[]>
    );

    const sortedActors = Object.entries(byActor)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    sortedActors.forEach(([actor, actorEvents], index) => {
      const actorRisk = Math.round(
        actorEvents.reduce((sum, e) => sum + e.mitreRiskScore, 0) / actorEvents.length
      );
      const riskColor = actorRisk >= 80 ? '🔴' : actorRisk >= 60 ? '🟠' : '🟡';

      console.log(`${index + 1}. ${actor}`);
      console.log(`   Activity:      ${actorEvents.length} events`);
      console.log(`   Avg Risk:      ${riskColor} ${actorRisk}/100`);
      console.log(`   Techniques:    ${[...new Set(actorEvents.map((e) => e.mitreTechnique))].join(', ')}\n`);
    });

    // ──────────────────────────────────────────
    // SECTION 5: Data Sources
    // ──────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📡 DATA SOURCES\n');

    const bySource = events.reduce(
      (acc, event) => {
        if (!acc[event.source]) {
          acc[event.source] = [];
        }
        acc[event.source].push(event);
        return acc;
      },
      {} as Record<string, EnrichedEvent[]>
    );

    Object.entries(bySource).forEach(([source, sourceEvents]) => {
      const sourceRisk = Math.round(
        sourceEvents.reduce((sum, e) => sum + e.mitreRiskScore, 0) / sourceEvents.length
      );

      console.log(`  ${source.toUpperCase()}`);
      console.log(`    Events:      ${sourceEvents.length}`);
      console.log(`    Avg Risk:    ${sourceRisk}/100\n`);
    });

    // ──────────────────────────────────────────
    // SECTION 6: Detailed Event Listing
    // ──────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 DETAILED EVENT LISTING\n');

    events.forEach((event, index) => {
      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      }[event.severity] || '⚪';

      console.log(`[${index + 1}] ${severityEmoji} ${event.mitreTechnique} - ${event.mitreTechniqueName}`);
      console.log(`     Source:     ${event.source}`);
      console.log(`     Action:     ${event.action}`);
      console.log(`     Actor:      ${event.actor}`);
      console.log(`     Severity:   ${event.severity}`);
      console.log(`     Tactic:     ${event.mitreTactic}`);
      console.log(`     Risk Score: ${event.mitreRiskScore}/100\n`);
    });

    // ──────────────────────────────────────────
    // FINAL SUMMARY
    // ──────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ REPORT COMPLETE\n');
    console.log(`   Total Events:          ${events.length}`);
    console.log(`   Unique Techniques:     ${Object.keys(byTechnique).length}`);
    console.log(`   Unique Tactics:        ${Object.keys(byTactic).length}`);
    console.log(`   Unique Actors:         ${Object.keys(byActor).length}`);
    console.log(`   Average Risk Score:    ${avgRisk}/100`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// ──────────────────────────────────────────────────────────────
// Standalone Execution
// ──────────────────────────────────────────────────────────────

if (require.main === module) {
  const mapper = new MitreMapperEnhanced();

  mapper
    .mapAllEvents()
    .then((enrichedEvents) => {
      mapper.printThreatReport(enrichedEvents);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default MitreMapperEnhanced;