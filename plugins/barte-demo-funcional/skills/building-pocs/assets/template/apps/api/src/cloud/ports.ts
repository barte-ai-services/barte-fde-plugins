/**
 * The two cloud ports this demo uses, and nothing else.
 *
 * The whole application talks to these two interfaces. Whether S3 or Cloud
 * Storage, SQS or Pub/Sub sits underneath is the adapter's business — switching
 * clouds is one environment variable, not a backend rewrite.
 *
 * Why only two: because that is what the work needs. Keep the document as it
 * arrived, and hand work to whoever processes it. Every cloud has both, and it
 * is precisely because this is the minimum that portability stays cheap — a
 * third port here would multiply the adapters by three and add nothing to the
 * conversation with the client.
 */

export interface Storage {
  /** The underlying technology, for the stack panel. */
  readonly technology: string;
  /** Creates the bucket/container when missing. Idempotent. */
  ensure(): Promise<void>;
  write(path: string, content: Buffer | string, contentType?: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  read(path: string): Promise<string>;
  /** A cheap call that only succeeds if the service is actually up. */
  health(): Promise<void>;
}

export interface Queue {
  readonly technology: string;
  ensure(): Promise<void>;
  send(body: string): Promise<void>;
  /**
   * Waits up to `seconds` for messages. Each one comes back with an `ack()` that
   * removes it — acknowledging is the CALLER's job, after processing, because
   * that is what puts the message back on the queue if the process dies midway.
   */
  receive(seconds: number): Promise<{ body: string; ack: () => Promise<void> }[]>;
  health(): Promise<void>;
}

export type Cloud = "aws" | "gcp" | "azure";

export function currentCloud(): Cloud {
  const v = (process.env.CLOUD ?? "aws").toLowerCase();
  if (v === "gcp" || v === "azure" || v === "aws") return v;
  throw new Error(`invalid CLOUD: ${v} — use aws, gcp or azure`);
}
