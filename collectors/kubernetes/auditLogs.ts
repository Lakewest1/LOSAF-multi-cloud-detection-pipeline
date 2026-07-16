import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import * as k8s from '@kubernetes/client-node';

const prisma = new PrismaClient();

interface K8sAuditEvent {
  level: string;
  timestamp: string;
  user?: {
    username: string;
    uid?: string;
  };
  verb: string;
  objectRef?: {
    apiVersion?: string;
    kind?: string;
    namespace?: string;
    name?: string;
  };
  sourceIPAddress: string;
  userAgent?: string;
  requestObject?: any;
}

export class KubernetesCollector extends EventEmitter {
  private auditLogPath: string;
  private coreApi: k8s.CoreV1Api | null = null;
  private clusterAvailable: boolean = false;

  constructor(auditLogPath = '/var/log/kubernetes/audit.log') {
    super();
    this.auditLogPath = auditLogPath;

    // Try to load a real cluster config. This entire block is safe —
    // any failure here just leaves clusterAvailable = false, it never throws.
    try {
      const kubeConfig = new k8s.KubeConfig();
      kubeConfig.loadFromDefault();
      this.coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
      this.clusterAvailable = true;
      console.log('[Kubernetes] Active cluster context found');
    } catch (error) {
      console.warn('[Kubernetes] No active cluster/kubeconfig found — will use mock data for demo');
      this.clusterAvailable = false;
    }
  }

  async collectEvents(): Promise<any[]> {
    try {
      console.log('[Kubernetes] Collecting audit events...');

      let suspiciousEvents: K8sAuditEvent[] = [];

      if (this.clusterAvailable && this.coreApi) {
        try {
          const events = await this.coreApi.listNamespacedEvent({ namespace: 'default' });
          suspiciousEvents = this.parseK8sEvents(events);

          if (suspiciousEvents.length === 0) {
            console.warn('[Kubernetes] Cluster reachable but no events found, using mock events');
            suspiciousEvents = this.generateMockAuditEvents();
          } else {
            console.log(`[Kubernetes] Collected ${suspiciousEvents.length} REAL events from active cluster`);
          }
        } catch (error) {
          console.warn('[Kubernetes] Cluster call failed, using mock audit events');
          suspiciousEvents = this.generateMockAuditEvents();
        }
      } else {
        console.warn('[Kubernetes] No cluster available. Using mock events for demo.');
        suspiciousEvents = this.generateMockAuditEvents();
      }

      console.log(`[Kubernetes] Collected ${suspiciousEvents.length} audit events`);

      for (const event of suspiciousEvents) {
        await this.processEvent(event);
      }

      return suspiciousEvents;
    } catch (error) {
      console.error('[Kubernetes] Error collecting events:', error);
      return this.generateMockAuditEvents();
    }
  }

  private parseK8sEvents(k8sEvents: any): K8sAuditEvent[] {
    const events: K8sAuditEvent[] = [];

    if (k8sEvents.items && Array.isArray(k8sEvents.items)) {
      for (const item of k8sEvents.items) {
        events.push({
          level: 'RequestResponse',
          timestamp: item.metadata?.creationTimestamp || new Date().toISOString(),
          user: {
            username: item.involvedObject?.name || 'unknown',
            uid: item.metadata?.uid || '',
          },
          verb: item.reason?.toLowerCase() || 'event',
          objectRef: {
            apiVersion: item.involvedObject?.apiVersion || 'v1',
            kind: item.involvedObject?.kind || 'Pod',
            namespace: item.involvedObject?.namespace || 'default',
            name: item.involvedObject?.name || 'unknown',
          },
          sourceIPAddress: item.source?.component || 'unknown',
          userAgent: 'kubernetes-client',
          requestObject: item.message,
        });
      }
    }

    return events;
  }

  private generateMockAuditEvents(): K8sAuditEvent[] {
    // Timestamped IDs generated at processEvent() time via rawId below —
    // K8s already builds rawId dynamically (`k8s-${Date.now()}-${Math.random()}`),
    // so no change needed here; kept for reference/clarity.
    return [
      {
        level: 'RequestResponse',
        timestamp: new Date().toISOString(),
        user: { username: 'system:serviceaccount:default:attacker', uid: 'abc123' },
        verb: 'exec',
        objectRef: {
          apiVersion: 'v1',
          kind: 'Pod',
          namespace: 'production',
          name: 'payment-service-xyz',
        },
        sourceIPAddress: '192.168.1.100',
        userAgent: 'kubectl/1.28.0',
        requestObject: { command: '/bin/bash' },
      },
      {
        level: 'RequestResponse',
        timestamp: new Date().toISOString(),
        user: { username: 'admin', uid: 'def456' },
        verb: 'create',
        objectRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          namespace: 'kube-system',
          name: 'backdoor-secret',
        },
        sourceIPAddress: '10.0.0.50',
        userAgent: 'kubectl/1.28.0',
      },
      {
        level: 'RequestResponse',
        timestamp: new Date().toISOString(),
        user: { username: 'system:node:worker-01', uid: 'ghi789' },
        verb: 'create',
        objectRef: {
          apiVersion: 'v1',
          kind: 'Pod',
          namespace: 'kube-system',
          name: 'suspicious-pod',
        },
        sourceIPAddress: '10.1.1.50',
        userAgent: 'kubelet',
      },
    ];
  }

  private async processEvent(event: K8sAuditEvent) {
    try {
      const normalizedEvent = {
        rawId: `k8s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        source: 'kubernetes_audit',
        eventType: event.verb.toUpperCase(),
        user: event.user?.username || 'unknown',
        sourceIP: event.sourceIPAddress,
        timestamp: new Date(event.timestamp),
        region: 'kubernetes',
        resourceType: event.objectRef?.kind || 'Unknown',
        rawData: JSON.stringify(event),
        status: 'pending',
      };

      try {
        const saved = await prisma.rawEvent.create({
          data: normalizedEvent,
        });
        this.emit('event', saved);
      } catch (dbError) {
        console.warn('[Kubernetes] DB write failed:', (dbError as any).message);
        console.log('[Kubernetes] Event (not persisted):', normalizedEvent);
      }

      return normalizedEvent;
    } catch (error) {
      console.error('[Kubernetes] Error processing event:', error);
    }
  }
}

if (require.main === module) {
  const collector = new KubernetesCollector();

  collector.on('event', (event) => {
    console.log('📨 K8s Event received:', {
      eventType: event.eventType,
      user: event.user,
    });
  });

  collector.collectEvents().then((events) => {
    console.log(`\n✅ Kubernetes collection complete (${events.length} events)\n`);
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default KubernetesCollector;