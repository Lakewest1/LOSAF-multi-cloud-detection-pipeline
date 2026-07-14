# LOSAF Architecture

## Overview

LOSAF (Lakewe$t Open Security Automation Framework) ingests security telemetry from AWS, Azure, and Kubernetes, normalizes it into a common schema, maps it to the MITRE ATT&CK framework, evaluates it against declarative detection rules, and surfaces the results in a real-time dashboard.

## Data Flow

┌─────────────────────────────────────────────────┐
│              Security Data Sources               │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │   AWS    │  │Kubernetes│  │    Azure     │    │
│  │CloudTrail│  │  Audit   │  │  Entra ID    │    │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
└───────┼─────────────┼───────────────┼────────────┘
│             │               │
└─────────────┴───────────────┘
│
▼
┌──────────────────────────┐
│        Collectors        │
│  (real API attempt →     │
│   graceful mock fallback)│
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│   raw_events (pending)   │
│      PostgreSQL/Supabase │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│   Normalization Engine    │
│  action / actor / target  │
│  / severity               │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│  (status: normalized)     │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│    MITRE ATT&CK Mapper    │
│  technique / tactic /     │
│  risk score               │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│  (status: mitre_mapped)   │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│     Detection Engine      │
│  YAML rules evaluated     │
│  against real event data  │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│       REST API            │
│   GET /api/detections     │
└────────────┬─────────────┘
│
▼
┌──────────────────────────┐
│     React Dashboard       │
│  Live Detection Feed,     │
│  Contained Actors,        │
│  Multi-Cloud KPIs         │
└──────────────────────────┘

## Components

### 1. Collectors (`collectors/`)

Three independent collectors, one per source: AWS CloudTrail, Kubernetes audit logs, Azure Entra ID sign-ins. Each follows the same three-layer safety pattern:

1. **Check for credentials/cluster config.** If absent, skip to mock data.
2. **Attempt a real API call.** AWS attempts `cloudtrail.lookupEvents()`; Kubernetes attempts to load an active `kubeconfig` context; Azure attempts a Microsoft Graph `auditLogs/signIns` call with a bearer token.
3. **Fall back to realistic mock data on failure or absence**, so the pipeline runs deterministically in any environment with zero cloud setup required.

This means the same collector code path exercises real cloud integration when credentials are present, and a fully working demo when they aren't — without any code branching required by the operator.

### 2. Normalization Engine (`normalization/event-normalizer.ts`)

Reads `raw_events` rows with `status: pending`, converts source-specific event shapes (CloudTrail JSON, Kubernetes audit JSON, Graph API JSON) into a common schema:

```json
{
  "action": "CREDENTIAL_CREATION",
  "actor": "AIDAI1234567890",
  "target": "AWS",
  "severity": "high"
}
```

Severity assignment incorporates basic threat signals already present in the raw event (e.g., a known Tor exit-node IP or high-risk geography escalates an otherwise-routine login to `high` severity). Writes the result back into the same `normalizedData` JSON column and advances `status` to `normalized`.

### 3. MITRE ATT&CK Mapper (`mitre/attack-mapper.ts`)

Reads `normalized` events, matches each `action`/`source` pair against an 18-technique MITRE ATT&CK reference table (`MITRE_MATRIX`), and enriches the same `normalizedData` column with `mitreTechnique`, `mitreTactic`, and a risk score. Produces a console threat-intelligence report (severity breakdown, technique/tactic distribution, top threat actors, per-source risk averages) and advances `status` to `mitre_mapped`.

### 4. Detection Engine (`detections/`)

Declarative YAML rules (`detections/aws/`, `detections/kubernetes/`, `detections/identity/`) define condition sets with weighted scoring and a trigger threshold:

```yaml
conditions:
  - field: action
    equals: POD_EXECUTION
    weight: 50
  - field: objectRef.namespace
    match: [production, kube-system]
    weight: 30
trigger_threshold: 50
```

`detections/detectorEngines.ts` loads all rule files at runtime, evaluates `mitre_mapped` events against them (checking both the normalized fields and, for fields not captured there, the original raw event JSON), and reports which rules fired, their matched conditions, and their recommended response (e.g. `TERMINATE_POD`, auto-executed vs. requiring SOC approval).

### 5. API Layer (`api/`)

Express server exposing `GET /api/detections`, which runs the detection engine on demand and returns JSON. Shares the same rule-evaluation logic as the CLI tool (`npm run detector`) via `detections/detectorEngines.ts`, so the dashboard and command line are always consistent.

### 6. Dashboard (`dashboard/`)

React/Vite frontend. Two sections:
- **Multi-Cloud Detection Feed** (primary): live KPIs per source (AWS/Azure/K8s event counts, unique MITRE techniques, rules fired), a priority queue of unactioned critical/high detections, the full detection feed (grid or table view), and a Contained Actors panel showing which identities had automated remediation applied.
- **Legacy: Single-Cloud Azure Sentinel SOAR** (collapsible): the original single-tenant SOAR platform this project evolved from, retained for reference and comparison.

## Status Lifecycle

Every event in `raw_events` progresses through a single linear state machine, queryable at any point:
pending → normalized → mitre_mapped

This makes it possible to inspect exactly where any given event is in the pipeline at any time, and to re-run any individual stage independently (e.g., re-running the detector against already-mapped events without re-collecting or re-normalizing).

## Known Limitations

- Detection rules currently support single-event field matching only; multi-event time-windowed correlation (e.g., "login followed by policy change within 5 minutes") is designed into the rule schema but not yet implemented.
- Kubernetes collector requires a live cluster context to fetch real events; without one, it correctly and transparently falls back to mock data.
- Azure collector's real-data path requires a valid Microsoft Graph bearer token with `AuditLog.Read.All` scope, obtained via a separate OAuth client-credentials flow not included in this repository.