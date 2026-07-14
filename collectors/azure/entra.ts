import { EventEmitter } from 'events';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AzureSignInEvent {
  id: string;
  createdDateTime: string;
  userPrincipalName: string;
  userId: string;
  ipAddress: string;
  location: {
    city: string;
    state: string;
    countryOrRegion: string;
  };
  riskState: string;
  riskLevel: string;
  riskDetail: string;
  appDisplayName: string;
}

export class AzureCollector extends EventEmitter {
  private accessToken: string;
  private tenantId: string;

  constructor(tenantId = process.env.AZURE_TENANT_ID || '') {
    super();
    this.tenantId = tenantId;
    this.accessToken = process.env.AZURE_ACCESS_TOKEN || '';
  }

  async collectEvents(): Promise<any[]> {
    try {
      console.log('[Azure] Attempting to collect sign-in events...');

      if (!this.accessToken) {
        console.warn('[Azure] No AZURE_ACCESS_TOKEN found. Using mock events for demo.');
        const mockEvents = this.generateMockAzureEvents();
        for (const event of mockEvents) {
          await this.processEvent(event);
        }
        return mockEvents;
      }

      try {
        const response = await axios.get(
          'https://graph.microsoft.com/v1.0/auditLogs/signIns',
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
            params: {
              '$top': 50,
            },
          }
        );

        const realEvents: AzureSignInEvent[] = (response.data.value || []).map((e: any) => ({
          id: e.id,
          createdDateTime: e.createdDateTime,
          userPrincipalName: e.userPrincipalName,
          userId: e.userId,
          ipAddress: e.ipAddress,
          location: {
            city: e.location?.city || 'Unknown',
            state: e.location?.state || 'Unknown',
            countryOrRegion: e.location?.countryOrRegion || 'Unknown',
          },
          riskState: e.riskState || 'none',
          riskLevel: e.riskLevelAggregated || 'low',
          riskDetail: e.riskDetail || 'none',
          appDisplayName: e.appDisplayName || 'Unknown',
        }));

        console.log(`[Azure] Collected ${realEvents.length} REAL sign-in events from Microsoft Graph`);

        for (const event of realEvents) {
          await this.processEvent(event);
        }

        return realEvents;
      } catch (apiError) {
        console.warn('[Azure] Microsoft Graph call failed, using mock events for demo');
        const mockEvents = this.generateMockAzureEvents();
        for (const event of mockEvents) {
          await this.processEvent(event);
        }
        return mockEvents;
      }
    } catch (error) {
      console.error('[Azure] Error collecting events:', error);
      const mockEvents = this.generateMockAzureEvents();
      for (const event of mockEvents) {
        await this.processEvent(event);
      }
      return mockEvents;
    }
  }

  private generateMockAzureEvents(): AzureSignInEvent[] {
    // Timestamped IDs so re-runs don't collide with the @unique rawId
    // constraint on RawEvent — each run produces fresh, insertable rows.
    const runId = Date.now();

    return [
      {
        id: `azure-event-1-${runId}`,
        createdDateTime: new Date().toISOString(),
        userPrincipalName: 'admin@company.onmicrosoft.com',
        userId: 'user-123',
        ipAddress: '185.220.100.50', // Tor exit node
        location: {
          city: 'Moscow',
          state: 'Moscow',
          countryOrRegion: 'Russia',
        },
        riskState: 'atRisk',
        riskLevel: 'high',
        riskDetail: 'impossibleTravel',
        appDisplayName: 'Azure Portal',
      },
      {
        id: `azure-event-2-${runId}`,
        createdDateTime: new Date().toISOString(),
        userPrincipalName: 'user@company.onmicrosoft.com',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        location: {
          city: 'London',
          state: 'England',
          countryOrRegion: 'United Kingdom',
        },
        riskState: 'dismissed',
        riskLevel: 'low',
        riskDetail: 'none',
        appDisplayName: 'Microsoft Teams',
      },
    ];
  }

  private async processEvent(event: AzureSignInEvent) {
    try {
      const normalizedEvent = {
        rawId: event.id,
        source: 'azure_entra',
        eventType: 'LOGIN',
        user: event.userPrincipalName,
        sourceIP: event.ipAddress,
        timestamp: new Date(event.createdDateTime),
        region: event.location?.countryOrRegion || 'Unknown',
        resourceType: event.appDisplayName,
        rawData: JSON.stringify(event),
        status: 'pending',
      };

      try {
        const saved = await prisma.rawEvent.create({
          data: normalizedEvent,
        });
        this.emit('event', saved);
      } catch (dbError) {
        console.warn('[Azure] DB write failed:', (dbError as any).message);
        console.log('[Azure] Event (not persisted):', normalizedEvent);
      }

      return normalizedEvent;
    } catch (error) {
      console.error('[Azure] Error processing event:', error);
    }
  }
}

if (require.main === module) {
  const collector = new AzureCollector();

  collector.on('event', (event) => {
    console.log('📨 Azure Event received:', {
      id: event.id,
      eventType: event.eventType,
      user: event.user,
      timestamp: event.timestamp,
    });
  });

  collector.collectEvents().then((events) => {
    console.log(`✅ Azure collection complete (${events.length} events)`);
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default AzureCollector;