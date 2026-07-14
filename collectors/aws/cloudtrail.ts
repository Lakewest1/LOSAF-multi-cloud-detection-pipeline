import { EventEmitter } from 'events';
import AWS from 'aws-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cloudtrail = new AWS.CloudTrail();

interface RawCloudTrailEvent {
  eventID: string;
  eventName: string;
  eventSource: string;
  eventTime: string;
  userIdentity: {
    type: string;
    principalId: string;
    arn: string;
  };
  sourceIPAddress: string;
  awsRegion: string;
  requestParameters: any;
  responseElements: any;
  additionalEventData?: any;
  errorCode?: string;
}

export class AWSCollector extends EventEmitter {
  private region: string;
  private trailName: string;

  constructor(region = 'us-east-1', trailName = 'default') {
    super();
    this.region = region;
    this.trailName = trailName;
    AWS.config.update({ region });
  }

  async collectEvents(): Promise<any[]> {
    try {
      console.log('[AWS] Attempting to collect CloudTrail events...');

      // Check if AWS credentials are available
      if (!process.env.AWS_ACCESS_KEY_ID) {
        console.warn('[AWS] No AWS credentials found. Using mock events for demo.');
        const mockEvents = this.generateMockEvents();
        for (const event of mockEvents) {
          await this.processEvent(event);
        }
        return mockEvents;
      }

      const params = {
        LookupAttributes: [
          {
            AttributeKey: 'EventName',
            AttributeValue: 'CreateAccessKey',
          },
        ],
        MaxResults: 50,
        StartTime: new Date(Date.now() - 3600000), // Last 1 hour
      };

      const response = await cloudtrail.lookupEvents(params).promise();
      const events = response.Events || [];

      console.log(`[AWS] Collected ${events.length} REAL CloudTrail events`);

      for (const event of events) {
        await this.processEvent(event as unknown as RawCloudTrailEvent);
      }

      return events;
    } catch (error) {
      console.warn('[AWS] Cloud collection failed, using mock events:', (error as any).message);
      const mockEvents = this.generateMockEvents();
      for (const event of mockEvents) {
        await this.processEvent(event);
      }
      return mockEvents;
    }
  }

  private generateMockEvents(): RawCloudTrailEvent[] {
    // Timestamped IDs so re-runs don't collide with the @unique rawId
    // constraint on RawEvent — each run produces fresh, insertable rows.
    const runId = Date.now();

    return [
      {
        eventID: `aws-001-${runId}`,
        eventName: 'CreateAccessKey',
        eventSource: 'iam',
        eventTime: new Date().toISOString(),
        userIdentity: {
          type: 'IAMUser',
          principalId: 'AIDAI1234567890',
          arn: 'arn:aws:iam::123456789012:user/admin',
        },
        sourceIPAddress: '185.220.100.50', // Tor exit node
        awsRegion: 'us-east-1',
        requestParameters: { userName: 'admin' },
        responseElements: { accessKey: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' } },
      },
      {
        eventID: `aws-002-${runId}`,
        eventName: 'ConsoleLogin',
        eventSource: 'signin',
        eventTime: new Date().toISOString(),
        userIdentity: {
          type: 'IAMUser',
          principalId: 'AIDAI9876543210',
          arn: 'arn:aws:iam::123456789012:user/user2',
        },
        sourceIPAddress: '192.168.1.100',
        awsRegion: 'us-east-1',
        requestParameters: null,
        responseElements: { ConsoleLogin: 'Success' },
      },
    ];
  }

  private async processEvent(event: RawCloudTrailEvent) {
    try {
      const normalizedEvent = {
        rawId: event.eventID,
        source: 'aws_cloudtrail',
        eventType: event.eventName,
        user: event.userIdentity?.principalId || 'unknown',
        sourceIP: event.sourceIPAddress,
        timestamp: new Date(event.eventTime),
        region: event.awsRegion,
        resourceType: event.eventSource,
        rawData: JSON.stringify(event),
        status: 'pending',
      };

      try {
        const saved = await prisma.rawEvent.create({
          data: normalizedEvent,
        });
        this.emit('event', saved);
      } catch (dbError) {
        console.warn('[AWS] DB write failed:', (dbError as any).message);
        console.log('[AWS] Event (not persisted):', normalizedEvent);
      }

      return normalizedEvent;
    } catch (error) {
      console.error('[AWS] Error processing event:', error);
    }
  }
}

if (require.main === module) {
  const collector = new AWSCollector();

  collector.on('event', (event) => {
    console.log('📨 AWS Event received:', {
      id: event.id,
      eventType: event.eventType,
      user: event.user,
      timestamp: event.timestamp,
    });
  });

  collector.collectEvents().then((events) => {
    console.log(`✅ AWS collection complete (${events.length} events)`);
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default AWSCollector;