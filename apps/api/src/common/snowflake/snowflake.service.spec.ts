import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SnowflakeService } from './snowflake.service.js';

const VALID_EPOCH = '1704067200000'; // 2024-01-01T00:00:00.000Z
const VALID_NODE_ID = '1';

function makeService(overrides: Record<string, string> = {}): Promise<SnowflakeService> {
  const config: Record<string, string> = {
    SNOWFLAKE_EPOCH: VALID_EPOCH,
    SNOWFLAKE_NODE_ID: VALID_NODE_ID,
    ...overrides,
  };

  return Test.createTestingModule({
    providers: [
      SnowflakeService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, defaultValue: string) =>
            key in config ? config[key] : defaultValue,
        },
      },
    ],
  })
    .compile()
    .then((m: TestingModule) => m.get<SnowflakeService>(SnowflakeService));
}

describe('SnowflakeService', () => {
  let service: SnowflakeService;

  beforeEach(async () => {
    service = await makeService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // uniqueness & time-sortability
  it('should generate unique IDs sequentially', () => {
    const ids = new Set<string>();
    const count = 10_000;

    for (let i = 0; i < count; i++) {
      const id = service.generateString();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }

    expect(ids.size).toBe(count);
  });

  it('should generate IDs that are time-sortable (100 IDs)', () => {
    const ids: bigint[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(service.generate());
    }
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  // generateString
  it('generateString() should return a numeric string', () => {
    const id = service.generateString();
    expect(typeof id).toBe('string');
    expect(/^\d+$/.test(id)).toBe(true);
  });

  // epoch validation
  it('should throw when SNOWFLAKE_EPOCH is in the future', async () => {
    const futureEpoch = String(Date.now() + 100_000_000);
    await expect(makeService({ SNOWFLAKE_EPOCH: futureEpoch })).rejects.toThrow(
      /in the future/i,
    );
  });

  it('should throw when SNOWFLAKE_EPOCH is not a number', async () => {
    await expect(makeService({ SNOWFLAKE_EPOCH: 'invalid' })).rejects.toThrow(
      /SNOWFLAKE_EPOCH is invalid/i,
    );
  });

  // nodeId validation
  it('should throw when SNOWFLAKE_NODE_ID is not a number', async () => {
    await expect(makeService({ SNOWFLAKE_NODE_ID: 'abc' })).rejects.toThrow(
      /SNOWFLAKE_NODE_ID is invalid/i,
    );
  });

  it('should throw when SNOWFLAKE_NODE_ID exceeds maxNodeId (1023)', async () => {
    await expect(makeService({ SNOWFLAKE_NODE_ID: '1024' })).rejects.toThrow(
      /SNOWFLAKE_NODE_ID must be between/i,
    );
  });

  it('should throw when SNOWFLAKE_NODE_ID is negative', async () => {
    await expect(makeService({ SNOWFLAKE_NODE_ID: '-1' })).rejects.toThrow(
      /SNOWFLAKE_NODE_ID must be between/i,
    );
  });

  it('should accept boundary nodeId values (0 and 1023)', async () => {
    const s0 = await makeService({ SNOWFLAKE_NODE_ID: '0' });
    const s1023 = await makeService({ SNOWFLAKE_NODE_ID: '1023' });
    expect(s0).toBeDefined();
    expect(s1023).toBeDefined();
  });

  // waitUntilNextMillis bounded timeout (sequence wrap-around)
  it('should handle sequence exhaustion by waiting for next millisecond', () => {
    // force lastTimestamp so every call lands in the same ms
    const fixedTime = BigInt(Date.now());
    (service as any).lastTimestamp = fixedTime;
    (service as any).sequence = (service as any).maxSequence; // one step before wrap

    // mock currentTimestamp: first call returns same ms, then advances
    let callCount = 0;
    jest.spyOn(service as any, 'currentTimestamp').mockImplementation(() => {
      callCount++;
      // advance clock after a few tight iterations
      return callCount < 5 ? fixedTime : fixedTime + 1n;
    });

    expect(() => service.generate()).not.toThrow();
  });
});
