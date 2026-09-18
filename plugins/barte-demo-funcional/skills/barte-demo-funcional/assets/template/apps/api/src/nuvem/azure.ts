import type { Armazenamento, Fila } from "./portas";

/**
 * Azure — contra o Azurite local ou contra o Azure de verdade.
 *
 * Como no adaptador do GCP, os pacotes entram por `import()` dentro do método:
 * uma demo AWS não tem `@azure/*` instalado.
 *
 * O Azurite é o emulador OFICIAL da Microsoft e aceita a mesma connection
 * string de sempre — a conta de desenvolvimento `devstoreaccount1`, cuja chave é
 * pública e documentada. Apontar para o Azure de verdade é trocar a
 * `AZURE_STORAGE_CONNECTION_STRING`, e nada mais.
 */

/**
 * Carrega o pacote do provedor em tempo de execução.
 *
 * O nome passa por uma VARIÁVEL de propósito: com a string literal, o
 * TypeScript tenta resolver o módulo na compilação e reprova a demo AWS — que
 * não tem (nem deve ter) os pacotes do Google e da Microsoft instalados. Quem
 * os instala é `nova-demo.sh --nuvem gcp|azure`, e só então este arquivo roda.
 */
const carregar = (modulo: string): Promise<any> => import(modulo);

const conexao = () =>
  process.env.AZURE_STORAGE_CONNECTION_STRING ??
  "UseDevelopmentStorage=true";

export class ArmazenamentoAzure implements Armazenamento {
  readonly tecnologia = "Azure Blob Storage";
  private cliente: any = null;

  constructor(private readonly conteiner: string) {}

  private async container() {
    if (!this.cliente) {
      const { BlobServiceClient } = await carregar("@azure/storage-blob");
      this.cliente = BlobServiceClient.fromConnectionString(conexao());
    }
    return this.cliente.getContainerClient(this.conteiner);
  }

  async garantir(): Promise<void> {
    const c = await this.container();
    await c.createIfNotExists();
  }

  async gravar(caminho: string, conteudo: Buffer | string, tipo?: string): Promise<void> {
    const c = await this.container();
    const dados = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo);
    await c.getBlockBlobClient(caminho).upload(dados, dados.length, {
      blobHTTPHeaders: tipo ? { blobContentType: tipo } : undefined,
    });
  }

  async listar(prefixo: string): Promise<string[]> {
    const c = await this.container();
    const nomes: string[] = [];
    for await (const blob of c.listBlobsFlat({ prefix: prefixo })) nomes.push(blob.name);
    return nomes;
  }

  async ler(caminho: string): Promise<string> {
    const c = await this.container();
    const baixado = await c.getBlockBlobClient(caminho).downloadToBuffer();
    return baixado.toString("utf8");
  }

  async saude(): Promise<void> {
    const c = await this.container();
    if (!(await c.exists())) throw new Error(`contêiner ${this.conteiner} não existe`);
  }
}

export class FilaAzure implements Fila {
  readonly tecnologia = "Azure Queue Storage";
  private cliente: any = null;

  constructor(private readonly nome: string) {}

  private async fila() {
    if (!this.cliente) {
      const { QueueServiceClient } = await carregar("@azure/storage-queue");
      this.cliente = QueueServiceClient.fromConnectionString(conexao());
    }
    return this.cliente.getQueueClient(this.nome);
  }

  async garantir(): Promise<void> {
    const f = await this.fila();
    await f.createIfNotExists();
  }

  async enviar(corpo: string): Promise<void> {
    const f = await this.fila();
    // A fila do Azure guarda texto e transporta base64 por padrão nos SDKs
    // antigos; aqui o texto vai e volta como texto, e a codificação é explícita
    // para não depender desse padrão.
    await f.sendMessage(Buffer.from(corpo).toString("base64"));
  }

  /**
   * O Queue Storage NÃO tem long polling: `receiveMessages` responde na hora,
   * vazio se não houver nada. Sem a espera aqui, o laço do worker giraria a
   * milhares de chamadas por minuto contra o Azurite — então a espera é feita
   * por conta, e o `segundos` significa o mesmo que nas outras duas nuvens.
   */
  async receber(segundos: number) {
    const f = await this.fila();
    const limite = Date.now() + segundos * 1000;
    for (;;) {
      const r = await f.receiveMessages({ numberOfMessages: 1, visibilityTimeout: 60 });
      const mensagens = r.receivedMessageItems ?? [];
      if (mensagens.length > 0) {
        return mensagens.map((m: any) => ({
          corpo: Buffer.from(m.messageText, "base64").toString("utf8"),
          confirmar: async () => {
            await f.deleteMessage(m.messageId, m.popReceipt);
          },
        }));
      }
      if (Date.now() >= limite) return [];
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async saude(): Promise<void> {
    const f = await this.fila();
    if (!(await f.exists())) throw new Error(`fila ${this.nome} não existe`);
  }
}
