import { Global, Module } from "@nestjs/common";
import type { Queue, Storage } from "./ports";
import { currentCloud } from "./ports";

/**
 * Picks the cloud adapter from ONE environment variable.
 *
 * The rest of the application injects `STORAGE` and `QUEUE` and never learns
 * which cloud is underneath. That is what lets the same demo run on Floci (AWS),
 * on Google's emulators or on Azurite — and, by swapping the address, against
 * the client's real account.
 *
 * The adapter is `require`d AFTER the choice: only the active cloud's module is
 * loaded, so an AWS demo does not need Google's and Microsoft's packages
 * installed.
 */
export const STORAGE = "STORAGE";
export const QUEUE = "QUEUE";

export const BUCKET = process.env.BUCKET ?? "demo-documents";
/**
 * The queue NAME, not its URL: the URL is built by the emulator and comes from
 * `GetQueueUrl`. Hardcoding `${endpoint}/000000000000/demo-work` works until the
 * day the account number changes, and then fails with a 400 that does not say so.
 */
export const QUEUE_NAME = process.env.QUEUE_NAME ?? "demo-work";

function storage(): Storage {
  switch (currentCloud()) {
    case "gcp":
      return new (require("./gcp").GcpStorage)(BUCKET);
    case "azure":
      return new (require("./azure").AzureStorage)(BUCKET);
    default:
      return new (require("./aws").AwsStorage)(BUCKET);
  }
}

function queue(): Queue {
  switch (currentCloud()) {
    case "gcp":
      return new (require("./gcp").GcpQueue)(QUEUE_NAME);
    case "azure":
      return new (require("./azure").AzureQueue)(QUEUE_NAME);
    default:
      return new (require("./aws").AwsQueue)(QUEUE_NAME);
  }
}

@Global()
@Module({
  providers: [
    { provide: STORAGE, useFactory: storage },
    { provide: QUEUE, useFactory: queue },
  ],
  exports: [STORAGE, QUEUE],
})
export class CloudModule {}
