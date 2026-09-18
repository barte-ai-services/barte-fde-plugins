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
import type { Armazenamento, Fila } from "./portas";

/**
 * AWS — contra o Floci local ou contra a AWS de verdade.
 *
 * A diferença entre as duas é o `endpoint`: com ele, o SDK fala com o emulador;
 * sem ele, resolve o endereço do serviço sozinho. Mesmo código, mesma API.
 */
const config = () => {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  return {
    region: process.env.AWS_REGION ?? "us-east-1",
    // Sem endpoint (AWS de verdade) as credenciais saem da cadeia padrão —
    // perfil, variável de ambiente, role da instância. Forçar `local` aqui
    // quebraria a demo apontada para uma conta real.
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

export class ArmazenamentoAws implements Armazenamento {
  readonly tecnologia = "Amazon S3";
  // `forcePathStyle` porque o endereço virtual-host (`bucket.s3.amazonaws.com`)
  // não resolve contra um emulador em 127.0.0.1.
  private readonly s3 = new S3Client({ ...config(), forcePathStyle: true });

  constructor(private readonly bucket: string) {}

  async garantir(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async gravar(caminho: string, conteudo: Buffer | string, tipo?: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: caminho, Body: conteudo, ContentType: tipo }),
    );
  }

  async listar(prefixo: string): Promise<string[]> {
    const r = await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefixo }));
    return (r.Contents ?? []).map((o) => o.Key!).filter(Boolean);
  }

  async ler(caminho: string): Promise<string> {
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: caminho }));
    return r.Body!.transformToString();
  }

  async saude(): Promise<void> {
    await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

export class FilaAws implements Fila {
  readonly tecnologia = "Amazon SQS";
  private readonly sqs = new SQSClient(config());
  private url: string | null = null;

  constructor(private readonly nome: string) {}

  /** A URL sai de `GetQueueUrl`: montá-la à mão embute o número da conta. */
  private async endereco(): Promise<string> {
    if (!this.url) {
      const r = await this.sqs.send(new GetQueueUrlCommand({ QueueName: this.nome }));
      this.url = r.QueueUrl!;
    }
    return this.url;
  }

  async garantir(): Promise<void> {
    try {
      await this.endereco();
    } catch {
      await this.sqs.send(new CreateQueueCommand({ QueueName: this.nome }));
    }
  }

  async enviar(corpo: string): Promise<void> {
    await this.sqs.send(new SendMessageCommand({ QueueUrl: await this.endereco(), MessageBody: corpo }));
  }

  async receber(segundos: number) {
    const url = await this.endereco();
    const r = await this.sqs.send(
      new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 1, WaitTimeSeconds: segundos }),
    );
    return (r.Messages ?? []).map((m) => ({
      corpo: m.Body!,
      confirmar: async () => {
        await this.sqs.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle! }));
      },
    }));
  }

  async saude(): Promise<void> {
    await this.endereco();
  }
}
