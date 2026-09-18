import type { Armazenamento, Fila } from "./portas";

/**
 * Google Cloud — contra os emuladores locais ou contra o GCP de verdade.
 *
 * Os pacotes entram por `import()` DENTRO do método, e não no topo do arquivo:
 * uma demo AWS não tem `@google-cloud/*` instalado, e um import estático aqui
 * derrubaria o processo dela na carga do módulo. `nova-demo.sh --nuvem gcp`
 * instala o que falta.
 *
 * Os emuladores: `fsouza/fake-gcs-server` para o Cloud Storage e o emulador
 * oficial de Pub/Sub. Os dois são acionados pelas variáveis que as próprias
 * bibliotecas do Google leem — `STORAGE_EMULATOR_HOST` e `PUBSUB_EMULATOR_HOST`
 * —, então o código é o mesmo apontado para o emulador e para a nuvem.
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

const projeto = () => process.env.GCP_PROJETO ?? "demo-local";

export class ArmazenamentoGcp implements Armazenamento {
  readonly tecnologia = "Google Cloud Storage";
  private cliente: any = null;

  constructor(private readonly bucket: string) {}

  private async balde() {
    if (!this.cliente) {
      const { Storage } = await carregar("@google-cloud/storage");
      const emulador = process.env.STORAGE_EMULATOR_HOST;
      // A variável é APAGADA do ambiente antes de construir o cliente, e isso
      // não é asseio: com ela presente, a biblioteca entra num caminho legado em
      // que a `baseUrl` perde o `/storage/v1`, e toda ESCRITA passa a responder
      // "Not Found" — enquanto `exists()`, que é leitura, continua funcionando.
      // O sintoma é a demo subir, listar zero documento e morrer na primeira
      // gravação apontando para o lugar errado. O endereço continua chegando ao
      // cliente, por `apiEndpoint`, logo abaixo.
      delete process.env.STORAGE_EMULATOR_HOST;
      this.cliente = new Storage({
        projectId: projeto(),
        ...(emulador
          ? {
              apiEndpoint: emulador,
              // Contra o emulador, as duas linhas abaixo são OBRIGATÓRIAS e não
              // são óbvias: sem elas a biblioteca tenta carregar as credenciais
              // padrão do Google antes de cada escrita e falha com um
              // "Could not load the default credentials" — ou, pior, com um
              // "Not Found" seco na criação do bucket, que manda procurar o erro
              // no lugar errado. `exists()` passa porque é leitura; a primeira
              // ESCRITA é que quebra.
              credentials: { client_email: "demo@local", private_key: "" },
              useAuthWithCustomEndpoint: false,
            }
          : {}),
      });
    }
    return this.cliente.bucket(this.bucket);
  }

  async garantir(): Promise<void> {
    const balde = await this.balde();
    const [existe] = await balde.exists();
    if (!existe) await balde.create();
  }

  async gravar(caminho: string, conteudo: Buffer | string, tipo?: string): Promise<void> {
    const balde = await this.balde();
    // `resumable: false` porque o upload retomável do Cloud Storage abre uma
    // sessão que o emulador não implementa igual — e num documento de alguns KB
    // ele não serve para nada de qualquer forma.
    await balde.file(caminho).save(conteudo, { contentType: tipo, resumable: false });
  }

  async listar(prefixo: string): Promise<string[]> {
    const balde = await this.balde();
    const [arquivos] = await balde.getFiles({ prefix: prefixo });
    return arquivos.map((a: { name: string }) => a.name);
  }

  async ler(caminho: string): Promise<string> {
    const balde = await this.balde();
    const [conteudo] = await balde.file(caminho).download();
    return conteudo.toString("utf8");
  }

  async saude(): Promise<void> {
    const balde = await this.balde();
    const [existe] = await balde.exists();
    if (!existe) throw new Error(`bucket ${this.bucket} não existe`);
  }
}

export class FilaGcp implements Fila {
  readonly tecnologia = "Google Cloud Pub/Sub";
  private cliente: any = null;
  private ouvindo = false;
  /** O que o listener já entregou e o worker ainda não pediu. */
  private recebidas: { corpo: string; confirmar: () => Promise<void> }[] = [];

  constructor(private readonly nome: string) {}

  private async pubsub() {
    if (!this.cliente) {
      const { PubSub } = await carregar("@google-cloud/pubsub");
      this.cliente = new PubSub({ projectId: projeto() });
    }
    return this.cliente;
  }

  /** Um tópico e uma assinatura: no Pub/Sub quem recebe é a assinatura. */
  private get assinatura(): string {
    return `${this.nome}-sub`;
  }

  async garantir(): Promise<void> {
    const ps = await this.pubsub();
    const topico = ps.topic(this.nome);
    const [temTopico] = await topico.exists();
    if (!temTopico) await topico.create();
    const assinatura = topico.subscription(this.assinatura);
    const [temAssinatura] = await assinatura.exists();
    if (!temAssinatura) await topico.createSubscription(this.assinatura);
  }

  async enviar(corpo: string): Promise<void> {
    const ps = await this.pubsub();
    await ps.topic(this.nome).publishMessage({ data: Buffer.from(corpo) });
  }

  /**
   * O Pub/Sub entrega por STREAMING, num callback — a única forma que o cliente
   * de alto nível oferece, e a única que enxerga o emulador.
   *
   * Construir o `v1.SubscriberClient` à mão para chamar `pull` parece mais
   * direto e não funciona localmente: ele não lê `PUBSUB_EMULATOR_HOST` e vai
   * procurar credencial do Google, derrubando a subida com
   * "Could not load the default credentials" — um erro que não menciona nem
   * Pub/Sub nem emulador.
   *
   * Então o listener empurra para um buffer e `receber()` tira dele. É o que faz
   * o laço do worker ser o MESMO nas três nuvens: pede trabalho, faz, confirma.
   */
  private async ouvir(): Promise<void> {
    if (this.ouvindo) return;
    const ps = await this.pubsub();
    const assinatura = ps.subscription(this.assinatura);
    assinatura.on("message", (mensagem: any) => {
      this.recebidas.push({
        corpo: mensagem.data.toString("utf8"),
        // `ack()` só depois de processar: se o processo morrer no meio, o
        // Pub/Sub reentrega em vez de sumir com o trabalho.
        confirmar: async () => mensagem.ack(),
      });
    });
    // Um erro aqui não pode derrubar o processo: o listener reconecta sozinho, e
    // o worker continua pedindo. Sem este handler, um soluço do emulador vira
    // exceção não tratada e mata a API no meio da reunião.
    assinatura.on("error", () => undefined);
    this.ouvindo = true;
  }

  async receber(segundos: number) {
    await this.ouvir();
    const limite = Date.now() + segundos * 1000;
    for (;;) {
      const proxima = this.recebidas.shift();
      if (proxima) return [proxima];
      if (Date.now() >= limite) return [];
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async saude(): Promise<void> {
    const ps = await this.pubsub();
    const [existe] = await ps.topic(this.nome).exists();
    if (!existe) throw new Error(`tópico ${this.nome} não existe`);
  }
}
