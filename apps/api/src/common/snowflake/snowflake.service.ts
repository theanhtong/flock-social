import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SnowflakeService implements OnModuleInit {
  private readonly logger = new Logger(SnowflakeService.name);

  private readonly epoch: bigint;
  private readonly nodeId: bigint;

  private readonly nodeIdBits = 10n;
  private readonly sequenceBits = 12n;

  private readonly maxNodeId = (1n << this.nodeIdBits) - 1n;
  private readonly maxSequence = (1n << this.sequenceBits) - 1n;

  private readonly nodeShift = this.sequenceBits;
  private readonly timestampShift = this.sequenceBits + this.nodeIdBits;

  // maximum milliseconds to wait when sequence is exhausted before throwing.
  private readonly maxWaitMs = 5;

  private lastTimestamp = -1n;
  private sequence = 0n;

  constructor(private readonly configService: ConfigService) {

    // get SNOWLAKE_EPOCH and validate if positive number and not in the future
    const epochRaw = this.configService.get<string>('SNOWFLAKE_EPOCH');
    if (!epochRaw) {
      throw new Error(
        'SNOWFLAKE_EPOCH is required.',
      );
    }
    const epochMs = parseInt(epochRaw, 10);
    if (isNaN(epochMs) || epochMs <= 0) {
      throw new Error(
        `SNOWFLAKE_EPOCH is invalid: "${epochRaw}". Must be a positive integer.`,
      );
    }
    if (epochMs > Date.now()) {
      throw new Error(
        `SNOWFLAKE_EPOCH (${epochMs}) is in the future. It must be a past timestamp.`,
      );
    }

    // get SNOWFLAKE_NODE_ID and validate if number between 0 and maxNodeId
    const nodeIdRaw = this.configService.get<string>('SNOWFLAKE_NODE_ID');
    if (!nodeIdRaw) {
      throw new Error(
        'SNOWFLAKE_NODE_ID is required.',
      );
    }
    const nodeIdNum = parseInt(nodeIdRaw, 10);
    if (isNaN(nodeIdNum)) {
      throw new Error(
        `SNOWFLAKE_NODE_ID is invalid: "${nodeIdRaw}". Must be an integer between 0 and ${this.maxNodeId}.`,
      );
    }

    this.epoch = BigInt(epochMs);
    this.nodeId = BigInt(nodeIdNum);

    if (this.nodeId < 0n || this.nodeId > this.maxNodeId) {
      throw new Error(
        `SNOWFLAKE_NODE_ID must be between 0 and ${this.maxNodeId}, got ${this.nodeId}.`,
      );
    }
  }

  onModuleInit() { }

  public generate(): bigint {
    let timestamp = this.currentTimestamp();

    // clock moved backwards
    if (timestamp < this.lastTimestamp) {
      const drift = this.lastTimestamp - timestamp;
      throw new Error(
        `Clock moved backwards by ${drift}ms. Refusing to generate ID to prevent duplicates.`,
      );
    }

    // if timestamp is same as last timestamp, increment sequence
    if (timestamp === this.lastTimestamp) {
      // check sequence is exhausted within the same millisecond - wait for next ms
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      if (this.sequence === 0n) {
        timestamp = this.waitUntilNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - this.epoch) << this.timestampShift) |
      (this.nodeId << this.nodeShift) |
      this.sequence
    );
  }

  public generateString(): string {
    return this.generate().toString();
  }

  private currentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  private waitUntilNextMillis(lastTimestamp: bigint): bigint {
    const deadline = Date.now() + this.maxWaitMs;
    let timestamp = this.currentTimestamp();

    while (timestamp <= lastTimestamp) {
      if (Date.now() > deadline) {
        throw new Error(
          `Sequence exhausted and clock did not advance within ${this.maxWaitMs}ms. ` +
          `This may indicate a system clock issue or extreme ID generation pressure.`,
        );
      }
      timestamp = this.currentTimestamp();
    }

    return timestamp;
  }
}
