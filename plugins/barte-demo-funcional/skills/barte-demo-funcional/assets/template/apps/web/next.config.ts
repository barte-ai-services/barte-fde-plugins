import type { NextConfig } from "next";

const config: NextConfig = {
  /**
   * Sem isto a demo abre cinza e NÃO hidrata.
   *
   * O Next 16 serve os recursos de desenvolvimento só para a origem que ele
   * considera sua (`localhost`), e recusa as outras — inclusive `127.0.0.1`,
   * que é o endereço que o roteiro publica e que o navegador abre. O bloqueio
   * derruba o HMR e os chunks que hidratam a página: a tela RENDERIZA (o HTML
   * vem do servidor) e depois fica inerte, sem chamar a API e sem responder a
   * clique. Nenhum erro aparece no console do navegador — a mensagem sai no log
   * do `next dev`, que é o último lugar onde se procura quando a tela apareceu.
   *
   * Vale só em desenvolvimento; `next build` ignora este campo.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  /**
   * O selo do Next no canto inferior esquerdo fica exatamente por cima do bloco
   * do cliente na barra lateral — e numa demo de proposta é a marca do
   * framework tapando a do cliente. Some daqui; o `next dev` continua igual.
   */
  devIndicators: false,
};

export default config;
