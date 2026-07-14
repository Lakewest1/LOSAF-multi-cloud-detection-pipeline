# LOSAF: Linux Open Security Automation Framework

> **Open-source, multi-cloud threat detection pipeline with MITRE ATT&CK mapping and declarative detection rules**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Kubernetes Ready](https://img.shields.io/badge/Kubernetes-Ready-326ce5.svg)](https://kubernetes.io/)

---

## 🎯 Overview

LOSAF ingests security telemetry from AWS, Azure, and Kubernetes, normalizes it into a common schema, maps it to the MITRE ATT&CK framework, evaluates it against declarative YAML detection rules, and surfaces the results in a real-time dashboard.

LOSAF evolved out of an existing single-tenant Azure Sentinel SOAR platform (retained in the dashboard as a "Legacy" section for reference), extended to demonstrate a vendor-agnostic, multi-cloud detection architecture.

---

## ✨ Key Features

### 🌐 Multi-Cloud Collection
- AWS CloudTrail, Azure Entra ID, Kubernetes audit logs
- Each collector attempts a real API call first (using credentials/cluster context if present), and falls back to realistic mock data if absent or unreachable — so the full pipeline runs with zero cloud setup required

### 🔄 Event Normalization
- Unifies three cloud-vendor event formats into a single schema: `action`, `actor`, `target`, `severity`
- Basic threat-signal escalation (e.g. a known Tor exit-node IP or high-risk geography bumps severity)

### 🎯 MITRE ATT&CK Mapping
- Maps normalized events to MITRE ATT&CK techniques and tactics against an 18-technique reference table
- Produces a console threat-intelligence report: severity breakdown, technique/tactic distribution, top threat actors, per-source risk averages

### 🚨 Declarative Detection Engine
- YAML-based rules with weighted conditions and a trigger threshold, evaluated against real pipeline data
- Each fired rule reports its matched conditions, computed weight, and a **recommended** response action

### 📊 Real-Time Dashboard
- Multi-Cloud Detection Feed: live KPIs (events per source, unique techniques, rules fired), a priority queue of unactioned critical/high detections, full detection feed (grid or table view), and a Contained Actors panel
- Collapsible Legacy section showing the original single-cloud SOAR platform

---

## ⚠️ Current Scope — What's Implemented vs. Planned

LOSAF's detection engine **computes and recommends** a response action (e.g. `TERMINATE_POD`, `REVOKE_CREDENTIALS`) and flags whether it's high-confidence enough to be auto-executed vs. requiring SOC approval. **It does not yet call the cloud provider APIs to execute that action.** Wiring the recommendation layer to real AWS IAM / Kubernetes / Microsoft Graph remediation calls is the natural next step and is architected for, but not implemented in this version.

Similarly, detection results are computed live from the database on each request (CLI or API) rather than persisted to a separate historical detections table — there is currently no detection audit log beyond the `raw_events` status trail.

---

## 🚀 Quick Start

### Requirements
- Node.js 18+
- PostgreSQL (Supabase-compatible)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/lakewest1/losaf-platform.git
cd losaf-platform
npm install
cd dashboard && npm install && cd ..
```

### 2. Configure Database

```bash
cp .env.example .env
# Set DATABASE_URL and DIRECT_URL to your PostgreSQL/Supabase instance
npx prisma generate
npx prisma migrate deploy
```

### 3. Run the Complete Pipeline

```bash
npm run collector:aws
npm run collector:k8s
npm run collector:azure
npm run normalizer
npm run mapper
npm run detector
```

### 4. View the Dashboard

**Terminal 1:**
```bash
npm run dev
# API running on http://localhost:3000
```

**Terminal 2:**
```bash
cd dashboard && npm run dev
# Dashboard running on http://localhost:5173
```

Open `http://localhost:5173`. You'll see live AWS/Azure/Kubernetes event counts, fired detections with MITRE context, and any contained actors from auto-executed-recommendation detections.

---

## 📊 Architecture
AWS / Azure / Kubernetes
│
▼
Collectors (real attempt → mock fallback)
│
▼
raw_events (pending)
│
▼
Normalization Engine
│
▼
(status: normalized)
│
▼
MITRE ATT&CK Mapper
│
▼
(status: mitre_mapped)
│
▼
Detection Engine (YAML rules)
│
▼
REST API (GET /api/detections)
│
▼
React Dashboard

See [docs/architecture.md](./docs/architecture.md) for full component detail.

---

## 🛠️ Technology Stack

**Backend:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL (Supabase)
**Frontend:** React, Vite, Recharts
**Cloud SDKs:** AWS SDK v2, Azure Identity, `@kubernetes/client-node`
**Detection:** YAML rule engine, MITRE ATT&CK v13 reference data

---

## 🎯 MITRE ATT&CK Coverage

| Technique | Tactic | Base Risk | Source |
|-----------|--------|-----------|--------|
| T1078 | Initial Access | 75 | AWS, Azure |
| T1552 | Credential Access | 80 | AWS |
| T1098 | Persistence | 85 | AWS, Azure |
| T1609 | Execution | 90 | Kubernetes |
| T1611 | Privilege Escalation | 90 | Kubernetes |

*(Full reference table of 18 techniques in `mitre/detectorEngines.ts` / `mitre/attack-mapper.ts`)*

---

## 📚 Documentation

- [Architecture](./docs/architecture.md) — system design and components
- [Demo Scenario](./docs/demo-scenario.md) — end-to-end walkthrough

---

## 🔧 Available Commands

```bash
npm run collector:aws       # AWS CloudTrail events
npm run collector:k8s       # Kubernetes audit logs
npm run collector:azure     # Azure Entra ID events
npm run normalizer          # Normalize raw events
npm run mapper              # MITRE ATT&CK mapping
npm run detector            # Run detection rules (CLI)
npm run dev                 # Start API server
cd dashboard && npm run dev # Start React dashboard
```

---

## 🔐 Security

- No hardcoded credentials — all configuration via environment variables
- Credentials never required to run the demo pipeline (mock fallback by design)
- Prisma engine configured for `binary` mode to avoid TLS interception issues in restrictive network environments

---

## 📋 Project Status

| Component | Status |
|-----------|--------|
| Collectors (AWS/Azure/K8s) | ✅ Working, verified with real persistence |
| Normalizer | ✅ Working, verified with real persistence |
| MITRE Mapper | ✅ Working, verified with real persistence |
| Detection Engine | ✅ Working, evaluated against real pipeline data |
| Dashboard | ✅ Working, live-wired to detection API |
| Automated remediation execution | 🚧 Recommended in output, not yet wired to cloud APIs |
| Multi-event correlation | 🚧 Rule schema designed for it, not yet implemented |

---

## 🤝 Contributing

Contributions welcome — fork, branch, and submit a pull request with a clear description.

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 👤 Author

**Ola Lekan** (Lakewest Cybersecurity) — Security Engineer & Full-Stack Developer
[GitHub](https://github.com/lakewest1) · [Portfolio](https://lakewest.netlify.app)

---

## 🔗 Resources

- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)

---

**Submitted for the Linux Foundation Member European Forum 2026**