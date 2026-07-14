import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export interface RuleCondition {
  field: string;
  equals?: string;
  match?: string | string[];
  weight: number;
}

export interface DetectionRule {
  name: string;
  id: string;
  description: string;
  source: string;
  normalized_action: string;
  mitre: {
    technique: string;
    technique_name: string;
    tactic: string;
  };
  conditions: RuleCondition[];
  trigger_threshold: number;
  risk_score: number;
  recommended_response: {
    auto_response: boolean;
    action: string;
    approval_required: boolean;
  };
  tags: string[];
}

const KNOWN_TOR_EXIT_NODES = ['185.220.100.50'];
const HIGH_RISK_REGIONS = ['Russia', 'Moscow'];
const STANDARD_SERVICE_ACCOUNTS = ['admin', 'system:node:worker-01'];

export class RuleLoader {
  static loadAll(dir: string): DetectionRule[] {
    const rules: DetectionRule[] = [];
    const subdirs = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of subdirs) {
      if (entry.isDirectory()) {
        const subPath = path.join(dir, entry.name);
        const files = fs.readdirSync(subPath).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(subPath, file), 'utf-8');
          rules.push(yaml.parse(content));
        }
      }
    }

    return rules;
  }
}

export class DetectionEngine {
  private rules: DetectionRule[];

  constructor(rules: DetectionRule[]) {
    this.rules = rules;
  }

  private getFieldValue(event: any, fieldPath: string): any {
    const normalizedData = event.normalizedData || {};

    if (fieldPath in normalizedData) {
      return normalizedData[fieldPath];
    }

    try {
      const raw = typeof event.rawData === 'string' ? JSON.parse(event.rawData) : event.rawData;
      const parts = fieldPath.split('.');
      let value: any = raw;
      for (const part of parts) {
        value = value?.[part];
      }
      return value;
    } catch {
      return undefined;
    }
  }

  private evaluateCondition(event: any, condition: RuleCondition): boolean {
    const value = this.getFieldValue(event, condition.field);

    if (condition.equals !== undefined) {
      return String(value).toUpperCase() === String(condition.equals).toUpperCase();
    }

    if (condition.match === 'known_tor_exit_node') {
      return KNOWN_TOR_EXIT_NODES.includes(value);
    }

    if (condition.match === 'high_risk_geography') {
      return HIGH_RISK_REGIONS.some((r) => String(value || '').includes(r));
    }

    if (condition.match === 'non_standard_service_account') {
      return value !== undefined && !STANDARD_SERVICE_ACCOUNTS.includes(value);
    }

    if (Array.isArray(condition.match)) {
      return condition.match.includes(value);
    }

    return false;
  }

  evaluate(event: any): { rule: DetectionRule; matchedWeight: number; fired: boolean; matchedConditions: string[] }[] {
    const results = [];

    for (const rule of this.rules) {
      const eventSource = event.normalizedData?.source;
      const eventAction = event.normalizedData?.action;

      if (rule.source !== eventSource || rule.normalized_action !== eventAction) {
        continue;
      }

      let matchedWeight = 0;
      const matchedConditions: string[] = [];

      for (const condition of rule.conditions) {
        if (this.evaluateCondition(event, condition)) {
          matchedWeight += condition.weight;
          matchedConditions.push(`${condition.field} (+${condition.weight})`);
        }
      }

      results.push({
        rule,
        matchedWeight,
        fired: matchedWeight >= rule.trigger_threshold,
        matchedConditions,
      });
    }

    return results;
  }
}