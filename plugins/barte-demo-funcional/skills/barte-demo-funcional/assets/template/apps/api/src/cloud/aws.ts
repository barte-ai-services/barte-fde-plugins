import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import type { Queue, Storage } from "./ports";

/**
 * AWS — against the local Floci emulator or against real AWS.
 *
 * The difference between the two is the `endpoint`: with it, the SDK talks to
 * the emulator; without it, it resolves the service address on its own. Same
 * code, same API.
 */
const config = () => {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  return {
    region: process.env.AWS_REGION ?? "us-east-1",
    // With no endpoint (real AWS) credentials come from the default chain —
    // profile, environment, instance role. Forcing `local` here would break a
    // demo pointed at a real account.
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
          },
        }
      : {}),
  };
};

export class AwsStorage implements Storage {
  readonly technology = "Amazon S3";
  // `forcePathStyle` because the virtual-host address
  // (`bucket.s3.amazonaws.com`) cannot resolve against an emulator on 127.0.0.1.
  private readonly s3 = new S3Client({ ...config(), forcePathStyle: true });

  constructor(private readonly bucket: string) {}

  async ensure(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async write(path: string, content: Buffer | string, contentType?: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: path, Body: content, ContentType: contentType }),
    );
  }

  async list(prefix: string): Promise<string[]> {
    const r = await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }));
    return (r.Contents ?? []).map((o) => o.Key!).filter(Boolean);
  }

  async read(path: string): Promise<string> {
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: path }));
    return r.Body!.transformToString();
  }

  async health(): Promise<void> {
    await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

export class AwsQueue implements Queue {
  readonly technology = "Amazon SQS";
  private readonly sqs = new SQSClient(config());
  private url: string | null = null;

  constructor(private readonly name: string) {}

  /** The URL comes from `GetQueueUrl`: building it by hand embeds the account id. */
  private async address(): Promise<string> {
    if (!this.url) {
      const r = await this.sqs.send(new GetQueueUrlCommand({ QueueName: this.name }));
      this.url = r.QueueUrl!;
    }
    return this.url;
  }

  async ensure(): Promise<void> {
    try {
      await this.address();
    } catch {
      await this.sqs.send(new CreateQueueCommand({ QueueName: this.name }));
    }
  }

  async send(body: string): Promise<void> {
    await this.sqs.send(new SendMessageCommand({ QueueUrl: await this.address(), MessageBody: body }));
  }

  async receive(seconds: number) {
    const url = await this.address();
    const r = await this.sqs.send(
      new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 1, WaitTimeSeconds: seconds }),
    );
    return (r.Messages ?? []).map((m) => ({
      body: m.Body!,
      ack: async () => {
        await this.sqs.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle! }));
      },
    }));
  }

  async health(): Promise<void> {
    await this.address();
  }
}
