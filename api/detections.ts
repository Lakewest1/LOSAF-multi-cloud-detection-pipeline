import express from 'express';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { RuleLoader, DetectionEngine } from '../detections/detectorEngines';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const rulesDir = path.join(__dirname, '..', 'detections');
    const rules = RuleLoader.loadAll(rulesDir);

    const events = await prisma.rawEvent.findMany({
      where: { status: 'mitre_mapped' },
      orderBy: { createdAt: 'desc' },
    });

    const engine = new DetectionEngine(rules);
    const fired: any[] = [];

    for (const event of events) {
      const results = engine.evaluate(event);

      for (const result of results) {
        if (result.fired) {
          fired.push({
            eventId: event.id.toString(), // BigInt → string, res.json() can't serialize BigInt
            ruleId: result.rule.id,
            ruleName: result.rule.name,
            actor: (event.normalizedData as any)?.actor,
            source: (event.normalizedData as any)?.source,
            severity: (event.normalizedData as any)?.severity,
            matchedConditions: result.matchedConditions,
            matchedWeight: result.matchedWeight,
            triggerThreshold: result.rule.trigger_threshold,
            mitreTechnique: result.rule.mitre.technique,
            mitreTechniqueName: result.rule.mitre.technique_name,
            mitreTactic: result.rule.mitre.tactic,
            recommendedAction: result.rule.recommended_response.action,
            autoResponse: result.rule.recommended_response.auto_response,
            timestamp: event.createdAt,
          });
        }
      }
    }

    res.json({
      totalEventsEvaluated: events.length,
      totalRulesFired: fired.length,
      detections: fired,
    });
  } catch (error) {
    console.error('[Detections API] Error:', error);
    res.status(500).json({ error: 'Failed to run detection engine' });
  }
});

export default router;