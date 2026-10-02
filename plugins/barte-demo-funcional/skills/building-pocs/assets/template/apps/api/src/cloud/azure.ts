import type { Queue, Storage } from "./ports";

/**
 * Azure — against the local Azurite emulator or against real Azure.
 *
 * As in the GCP adapter, the packages load through `import()` inside the method:
 * an AWS demo has no `@azure/*` installed.
 *
 * Azurite is Microsoft's OFFICIAL emulator and takes the usual connection
 * string — the `devstoreaccount1` development account, whose key is public and
 * documented. Pointing at real Azure is swapping
 * `AZURE_STORAGE_CONNECTION_STRING`, and nothing else.
 */
const load = (moduleName: string): Promise<any> => import(moduleName);

const connection = () =>
  process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";

export class AzureStorage implements Storage {
  readonly technology = "Azure Blob Storage";
  private client: any = null;

  constructor(private readonly containerName: string) {}

  private async container() {
    if (!this.client) {
      const { BlobServiceClient } = await load("@azure/storage-blob");
      this.client = BlobServiceClient.fromConnectionString(connection());
    }
    return this.client.getContainerClient(this.containerName);
  }

  async ensure(): Promise<void> {
    const c = await this.container();
    await c.createIfNotExists();
  }

  async write(path: string, content: Buffer | string, contentType?: string): Promise<void> {
    const c = await this.container();
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    await c.getBlockBlobClient(path).upload(data, data.length, {
      blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    });
  }

  async list(prefix: string): Promise<string[]> {
    const c = await this.container();
    const names: string[] = [];
    for await (const blob of c.listBlobsFlat({ prefix })) names.push(blob.name);
    return names;
  }

  async read(path: string): Promise<string> {
    const c = await this.container();
    const downloaded = await c.getBlockBlobClient(path).downloadToBuffer();
    return downloaded.toString("utf8");
  }

  async health(): Promise<void> {
    const c = await this.container();
    if (!(await c.exists())) throw new Error(`container ${this.containerName} does not exist`);
  }
}

export class AzureQueue implements Queue {
  readonly technology = "Azure Queue Storage";
  private client: any = null;

  constructor(private readonly name: string) {}

  private async queue() {
    if (!this.client) {
      const { QueueServiceClient } = await load("@azure/storage-queue");
      this.client = QueueServiceClient.fromConnectionString(connection());
    }
    return this.client.getQueueClient(this.name);
  }

  async ensure(): Promise<void> {
    const q = await this.queue();
    await q.createIfNotExists();
  }

  async send(body: string): Promise<void> {
    const q = await this.queue();
    // Queue Storage holds text and older SDKs transported base64 by default;
    // here text goes in and comes out as text, with the encoding spelled out so
    // nothing depends on that default.
    await q.sendMessage(Buffer.from(body).toString("base64"));
  }

  /**
   * Queue Storage has NO long polling: `receiveMessages` answers immediately,
   * empty when there is nothing. Without the wait below the worker loop would
   * spin thousands of calls a minute against Azurite — so the wait is done here,
   * and `seconds` means the same thing it means in the other two clouds.
   */
  async receive(seconds: number) {
    const q = await this.queue();
    const deadline = Date.now() + seconds * 1000;
    for (;;) {
      const r = await q.receiveMessages({ numberOfMessages: 1, visibilityTimeout: 60 });
      const messages = r.receivedMessageItems ?? [];
      if (messages.length > 0) {
        return messages.map((m: any) => ({
          body: Buffer.from(m.messageText, "base64").toString("utf8"),
          ack: async () => {
            await q.deleteMessage(m.messageId, m.popReceipt);
          },
        }));
      }
      if (Date.now() >= deadline) return [];
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async health(): Promise<void> {
    const q = await this.queue();
    if (!(await q.exists())) throw new Error(`queue ${this.name} does not exist`);
  }
}
