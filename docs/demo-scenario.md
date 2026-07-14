# LOSAF Demo Scenario

**A walkthrough of the full pipeline: Collection → Normalization → MITRE Mapping → Detection → Dashboard**

This document describes exactly what happens when you run LOSAF's pipeline end-to-end, using real output captured from an actual run - not illustrative/hypothetical numbers.

---

## Setup: Start From a Clean State

Before running the demo, clear any previous test data so the numbers below match what you'll actually see:

```bash
node truncate-demo.js
```

This empties `raw_events` only - it does not touch any other tables in the database.

---

## Step 1 -  Collection

Run all three collectors. None require cloud credentials to demonstrate the pipeline -  each attempts a real API call first, then falls back to realistic mock data if credentials or a live cluster context are absent.

```bash
npm run collector:aws
```
```
[AWS] Attempting to collect CloudTrail events...
[AWS] No AWS credentials found. Using mock events for demo.
📨 AWS Event received: { id: 1n, eventType: 'CreateAccessKey', user: 'AIDAI1234567890', ... }
📨 AWS Event received: { id: 2n, eventType: 'ConsoleLogin', user: 'AIDAI9876543210', ... }
✅ AWS collection complete (2 events)
```

```bash
npm run collector:k8s
```
```
[Kubernetes] No active cluster/kubeconfig found -  will use mock data for demo
[Kubernetes] Collected 3 audit events
📨 K8s Event received: { eventType: 'EXEC', user: 'system:serviceaccount:default:attacker' }
📨 K8s Event received: { eventType: 'CREATE', user: 'admin' }
📨 K8s Event received: { eventType: 'CREATE', user: 'system:node:worker-01' }
✅ Kubernetes collection complete (3 events)
```

```bash
npm run collector:azure
```
[Azure] Attempting to collect sign-in events...
[Azure] No AZURE_ACCESS_TOKEN found. Using mock events for demo.
📨 Azure Event received: { id: 6n, eventType: 'LOGIN', user: 'admin@company.onmicrosoft.com', ... }
📨 Azure Event received: { id: 7n, eventType: 'LOGIN', user: 'user@company.onmicrosoft.com', ... }
✅ Azure collection complete (2 events)

**Result:** 7 raw events persisted to `raw_events`, `status: pending`.

*(If real credentials are set in `.env` -  `AWS_ACCESS_KEY_ID`, `AZURE_ACCESS_TOKEN`, or an active `kubeconfig` -  the collectors attempt the corresponding real API call instead, transparently. The mock path exists so the pipeline runs deterministically anywhere, not as the only way to use LOSAF.)*

---

## Step 2 - Normalization

```bash
npm run normalizer
```
[Normalizer] Processing 7 raw events
[Normalizer] Normalized 7 events
[1] aws_cloudtrail → CREDENTIAL_CREATION
Actor: AIDAI1234567890 | Target: AWS | Severity: high
[2] aws_cloudtrail → USER_LOGIN
Actor: AIDAI9876543210 | Target: AWS | Severity: medium
[3] kubernetes_audit → POD_EXECUTION
Actor: system:serviceaccount:default:attacker | Target: KUBERNETES | Severity: critical
[4] kubernetes_audit → OBJECT_CREATION
Actor: admin | Target: KUBERNETES | Severity: medium
[5] kubernetes_audit → OBJECT_CREATION
Actor: system:node:worker-01 | Target: KUBERNETES | Severity: medium
[6] azure_entra → USER_LOGIN
Actor: admin@company.onmicrosoft.com | Target: AZURE | Severity: high
[7] azure_entra → USER_LOGIN
Actor: user@company.onmicrosoft.com | Target: AZURE | Severity: low

Note event `[6]`: the Azure login from `admin@company.onmicrosoft.com` escalates to `high` severity - its mock source IP (`185.220.100.50`) matches a known Tor exit node, and its region is Russia. This is the normalizer's basic threat-signal escalation logic, not just a static severity assignment.

**Result:** all 7 events move to `status: normalized`, with `action`/`actor`/`target`/`severity` written into `normalizedData`.
```


## Step 3 -  MITRE ATT&CK Mapping


npm run mapper
```
Found 7 normalized events
📊 MITRE ATT&CK THREAT INTELLIGENCE REPORT
📈 OVERALL STATISTICS
Total Events Analyzed:     7
🔴 Critical Events:        1
🟠 High Severity:          2
🟡 Medium Severity:        3
🟢 Low Severity:           1
Average Risk Score:        82/100
🔗 MITRE TECHNIQUES DETECTED

T1078 - Valid Accounts (Initial Access) -  3 events - azure_entra, aws_cloudtrail
T1611 - Escape to Host (Privilege Escalation) - 2 events - kubernetes_audit
T1609 - Container Administration Command (Execution) - 1 event - kubernetes_audit
T1552 - Unsecured Credentials (Credential Access) - 1 event - aws_cloudtrail
```
🛡️  LOSAF Detection Engine
Loaded 3 detection rules:
```
aws-login-001: Suspicious AWS Login from Unusual Location
identity-priv-001: Identity Privilege Escalation
k8s-escape-001: Kubernetes Pod Execution / Container Escape Attempt

Found 7 mitre_mapped events to evaluate
🚨 RULE FIRED: k8s-escape-001 (Kubernetes Pod Execution / Container Escape Attempt)
Event ID:      3
Actor:         system:serviceaccount:default:attacker
Matched:       action (+50), objectRef.namespace (+30), user.username (+20)
Weight:        100/50 threshold
MITRE:         T1609 - Container Administration Command
Response:      TERMINATE_POD (auto: true)
🚨 RULE FIRED: identity-priv-001 (Identity Privilege Escalation)
Event ID:      1
Actor:         AIDAI1234567890
Matched:       action (+40), severity (+30)
Weight:        70/40 threshold
MITRE:         T1552 - Unsecured Credentials
Response:      REVOKE_CREDENTIALS (auto: false)
✅ Detection complete: 2 rule(s) fired across 7 events

Note that `aws-login-001` doesn't fire here - correctly. That rule only evaluates AWS-sourced login events, and the Tor-IP/Russia indicators in this run are on the *Azure* login, not an AWS one. This demonstrates the rule's specificity rather than a bug: each rule only checks the event types it's actually designed for.
```
---

## Step 5 - Dashboard

```bash
npm run dev              # API, terminal 1
cd dashboard && npm run dev   # Dashboard, terminal 2
```

Open `http://localhost:5173`. The **Multi-Cloud Detection Feed** section shows:

- **KPIs:** 2 AWS events, 2 Azure events, 3 Kubernetes events, 4 unique MITRE techniques, 2 rules fired
- **Detection cards:** the same two fired rules from the terminal, now with severity badges, source badges, matched conditions, and weight bars
- **Contained Actors:** `system:serviceaccount:default:attacker`, showing the `TERMINATE_POD` recommendation was flagged as auto-executable

The collapsible **Legacy** section below shows the original single-cloud Azure Sentinel SOAR platform this project evolved from.

---

## What This Demonstrates

- A complete, verifiable data pipeline -  every stage persists real, checkable state in the database (`pending → normalized → mitre_mapped`), not just console output
- Multi-cloud normalization into one consistent schema
- Automatic MITRE ATT&CK classification with basic risk scoring
- Declarative, auditable detection logic (plain YAML, not hidden in code)
- A live dashboard reflecting exactly what the CLI pipeline computed -  same underlying rule-evaluation code (`detections/detectorEngines.ts`) powers both

## What This Does Not Yet Demonstrate

- Actual execution of remediation actions (pod termination, credential revocation) against real cloud APIs - the detection engine recommends these actions and flags auto- vs. approval-required, but does not call AWS IAM, Kubernetes, or Microsoft Graph to execute them
- Multi-event, time-windowed correlation (e.g., linking a login to a subsequent policy change within a window) -  the rule schema is designed to support this, but only single-event field matching is implemented