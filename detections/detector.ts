import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { RuleLoader, DetectionEngine } from './detectorEngines';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🛡️  LOSAF Detection Engine\n');

  const rulesDir = path.join(__dirname);
  const rules = RuleLoader.loadAll(rulesDir);
  console.log(`Loaded ${rules.length} detection rules:`);
  rules.forEach((r) => console.log(`  - ${r.id}: ${r.name}`));

  console.log('\nFetching MITRE-mapped events from database...\n');

  const events = await prisma.rawEvent.findMany({
    where: { status: 'mitre_mapped' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${events.length} mitre_mapped events to evaluate\n`);

  if (events.length === 0) {
    console.log('⚠️  No mitre_mapped events found. Run collectors → normalizer → mapper first.\n');
    await prisma.$disconnect();
    return;
  }

  const engine = new DetectionEngine(rules);
  let firedCount = 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const event of events) {
    const results = engine.evaluate(event);

    for (const result of results) {
      if (result.fired) {
        firedCount++;
        console.log(`🚨 RULE FIRED: ${result.rule.id} (${result.rule.name})`);
        console.log(`   Event ID:      ${event.id}`);
        console.log(`   Actor:         ${(event.normalizedData as any)?.actor}`);
        console.log(`   Matched:       ${result.matchedConditions.join(', ') || 'none'}`);
        console.log(`   Weight:        ${result.matchedWeight}/${result.rule.trigger_threshold} threshold`);
        console.log(`   MITRE:         ${result.rule.mitre.technique} - ${result.rule.mitre.technique_name}`);
        console.log(`   Response:      ${result.rule.recommended_response.action} (auto: ${result.rule.recommended_response.auto_response})`);
        console.log('');
      }
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Detection complete: ${firedCount} rule(s) fired across ${events.length} events\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});