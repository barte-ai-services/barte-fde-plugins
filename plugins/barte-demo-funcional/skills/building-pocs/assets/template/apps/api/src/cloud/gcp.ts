import type { Queue, Storage } from "./ports";

/**
 * Google Cloud — against the local emulators or against real GCP.
 *
 * The packages are loaded with `import()` INSIDE the method, not at the top of
 * the file: an AWS demo has no `@google-cloud/*` installed, and a static import
 * here would break it at module load. `new-demo.sh --cloud gcp` installs them.
 *
 * The emulators: `fsouza/fake-gcs-server` for Cloud Storage and the official
 * Pub/Sub emulator.
 */

/**
 * Loads the provider package at runtime.
 *
 * The name goes through a VARIABLE on purpose: with a string literal TypeScript
 * tries to resolve the module at compile time and fails the AWS demo — which
 * does not (and should not) have Google's and Microsoft's packages installed.
 */
const load = (moduleName: string): Promise<any> => import(moduleName);

const project = () => process.env.GCP_PROJECT ?? "demo-local";

export class GcpStorage implements Storage {
  readonly technology = "Google Cloud Storage";
  private client: any = null;

  constructor(private readonly bucketName: string) {}

  private async bucket() {
    if (!this.client) {
      const { Storage: GoogleStorage } = await load("@google-cloud/storage");
      const emulator = process.env.STORAGE_EMULATOR_HOST;
      // The variable is DELETED from the environment before the client is built,
      // and that is not housekeeping: with it set, the library takes a legacy
      // path where `baseUrl` loses the `/storage/v1`, and every WRITE starts
      // answering "Not Found" while `exists()` — a read — keeps working. The
      // symptom is a demo that comes up, lists zero documents and dies on the
      // first upload, pointing at the wrong place. The address still reaches the
      // client through `apiEndpoint` below.
      delete process.env.STORAGE_EMULATOR_HOST;
      this.client = new GoogleStorage({
        projectId: project(),
        ...(emulator
          ? {
              apiEndpoint: emulator,
              // Against the emulator both lines are REQUIRED and far from
              // obvious: without them the library tries to load Google's default
              // credentials before every write and fails.
              credentials: { client_email: "demo@local", private_key: "" },
              useAuthWithCustomEndpoint: false,
            }
          : {}),
      });
    }
    return this.client.bucket(this.bucketName);
  }

  async ensure(): Promise<void> {
    const bucket = await this.bucket();
    const [exists] = await bucket.exists();
    if (!exists) await bucket.create();
  }

  async write(path: string, content: Buffer | string, contentType?: string): Promise<void> {
    const bucket = await this.bucket();
    // `resumable: false` because the resumable upload opens a session the
    // emulator implements differently — and for a few-KB document it buys
    // nothing anyway.
    await bucket.file(path).save(content, { contentType, resumable: false });
  }

  async list(prefix: string): Promise<string[]> {
    const bucket = await this.bucket();
    const [files] = await bucket.getFiles({ prefix });
    return files.map((f: { name: string }) => f.name);
  }

  async read(path: string): Promise<string> {
    const bucket = await this.bucket();
    const [content] = await bucket.file(path).download();
    return content.toString("utf8");
  }

  async health(): Promise<void> {
    const bucket = await this.bucket();
    const [exists] = await bucket.exists();
    if (!exists) throw new Error(`bucket ${this.bucketName} does not exist`);
  }
}

export class GcpQueue implements Queue {
  readonly technology = "Google Cloud Pub/Sub";
  private client: any = null;
  private listening = false;
  /** What the listener has delivered and the worker has not asked for yet. */
  private received: { body: string; ack: () => Promise<void> }[] = [];

  constructor(private readonly name: string) {}

  private async pubsub() {
    if (!this.client) {
      const { PubSub } = await load("@google-cloud/pubsub");
      this.client = new PubSub({ projectId: project() });
    }
    return this.client;
  }

  /** One topic and one subscription: in Pub/Sub the subscription is the receiver. */
  private get subscription(): string {
    return `${this.name}-sub`;
  }

  async ensure(): Promise<void> {
    const ps = await this.pubsub();
    const topic = ps.topic(this.name);
    const [hasTopic] = await topic.exists();
    if (!hasTopic) await topic.create();
    const subscription = topic.subscription(this.subscription);
    const [hasSubscription] = await subscription.exists();
    if (!hasSubscription) await topic.createSubscription(this.subscription);
  }

  async send(body: string): Promise<void> {
    const ps = await this.pubsub();
    await ps.topic(this.name).publishMessage({ data: Buffer.from(body) });
  }

  /**
   * Pub/Sub delivers by STREAMING, through a callback — the only shape the
   * high-level client offers, and the only one that sees the emulator.
   *
   * Building a `v1.SubscriberClient` by hand to call `pull` looks more direct and
   * does not work locally: it does not read `PUBSUB_EMULATOR_HOST` and goes
   * looking for Google credentials, taking the whole startup down with
   * "Could not load the default credentials" — an error that mentions neither
   * Pub/Sub nor the emulator.
   *
   * So the listener pushes into a buffer and `receive()` pulls from it. That is
   * what keeps the worker loop the SAME across all three clouds: ask for work,
   * do it, acknowledge.
   */
  private async listen(): Promise<void> {
    if (this.listening) return;
    const ps = await this.pubsub();
    const subscription = ps.subscription(this.subscription);
    subscription.on("message", (message: any) => {
      this.received.push({
        body: message.data.toString("utf8"),
        // `ack()` only after processing: if the process dies midway, Pub/Sub
        // redelivers instead of losing the work.
        ack: async () => message.ack(),
      });
    });
    // An error here must not take the process down: the listener reconnects on
    // its own and the worker keeps asking. Without this handler, a hiccup from
    // the emulator becomes an unhandled exception and kills the API mid-meeting.
    subscription.on("error", () => undefined);
    this.listening = true;
  }

  async receive(seconds: number) {
    await this.listen();
    const deadline = Date.now() + seconds * 1000;
    for (;;) {
      const next = this.received.shift();
      if (next) return [next];
      if (Date.now() >= deadline) return [];
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async health(): Promise<void> {
    const ps = await this.pubsub();
    const [exists] = await ps.topic(this.name).exists();
    if (!exists) throw new Error(`topic ${this.name} does not exist`);
  }
}
