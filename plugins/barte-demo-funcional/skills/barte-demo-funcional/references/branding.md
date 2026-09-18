# A marca na tela

A demo usa o **`barte-design-system`** — o pacote de verdade, o mesmo que o
`barte-copilot` consome. Não é uma paleta copiada: é a marca, versionada, e ela
acompanha o que o time de design publica.

## O que o design system dá

| | |
|---|---|
| pacote | `barte-design-system` (npm público, hoje `^0.1.69`) |
| estilos | `@import "barte-design-system/styles"` — traz Inter embutido em `@font-face`, sem baixar nada |
| componentes | 47, entre eles `Logo`, `Sidebar`, `MenuLeaf`, `MenuTitle`, `Breadcrumb`, `Table`, `Drawer`, `Button`, `Pills`, `Modal`, `Select`, `Toast` |
| tokens | variáveis CSS — use-as, nunca hex cravado |

**Rosa da marca: `#df285d`**, e ele chega por token, não por literal:
`--bg-brand`, `--content-brand`, `--stroke-brand`, `--bg-brand-light`.

Outros que aparecem o tempo todo: `--content-primary/secondary/tertiary`,
`--bg-primary/secondary/tertiary`, `--stroke-primary/secondary`,
`--accent-green|red|blue|orange` (com `-light` e `-dark` de cada), `--spacing-*`,
`--sizes-*`. A lista inteira está em
`node_modules/barte-design-system/dist/barte-design-system.css`.

## As cinco armadilhas

Todas já morderam. As cinco estão consertadas no template — este é o registro do
**porquê**, para ninguém desfazer sem saber.

### 1. O logotipo sai preto (ou branco) se você não pedir o rosa

`<Logo type="full" />` usa o variant padrão `inverse`, que é **branco** — para
fundo escuro. `default` é **preto**. O rosa é `brand`:

```tsx
<Logo type="full" variant="brand" />
```

### 2. Tailwind sem Preflight, e um bloco base escrito à mão

O `@import "tailwindcss"` completo traz o Preflight, que atropela o estilo dos
componentes do DS. Entram só o tema e as utilitárias:

```css
@import "barte-design-system/styles";
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

Só que pular o Preflight **não** deixa a página sem base — deixa com a **do
browser**. O DS aplica Inter apenas pelas classes dos componentes dele, então
todo `<h1>`, `<p>` e `<span>` que você escrever sai em Times New Roman, cada
`<button>` em Arial, e os 8px de margem do `body` empurram a tela para fora da
janela. O bloco base do `globals.css` conserta exatamente três coisas — família
(do mesmo token que o DS lê), margem e suavização — e **alargá-lo é como se
atropela o DS**.

Pela mesma razão, `<ul>` e `<ol>` chegam com marcador e 40px de recuo. As listas
de layout levam `list-none pl-0`, e há uma regra em `globals.css` que garante
isso.

### 3. `Badge` não escreve texto — quem escreve é `Pills`

O `Badge` do DS é um **ponto colorido**: ele ignora o conteúdo. Uma coluna de
situação feita com ele sai com bolinhas e nada escrito.

```tsx
<Pills size="sm" variant="light" state="success" label="Pronto para aprovação" />
```

`state`: `accent | success | info | warning | error | alert | default`.

### 4. O `Sidebar` do DS se acha a barra inteira

Ele tem largura fixa e borda direita próprias. Dentro de um contêiner que já tem
borda, ele pinta uma **segunda linha vertical**. O override em `globals.css` é
escopado pela classe `app-shell-nav` e casa pelo **prefixo** da classe do DS (o
sufixo é hash de build). Tirar a classe do JSX faz a linha fantasma voltar.

### 5. A cruz no canto: topbar e barra lateral com a mesma altura

As duas leem `--app-header-height` (que sai de `--sizes-8xl`). Se divergirem, as
bordas inferiores não se encontram e o canto fica torto. Um número só, consumido
pelos dois.

## Fora do design system

O que o DS não cobre — o casco, a esteira, os cartões de indicador — é Tailwind
inline, com token em valor arbitrário:

```tsx
className="border-[var(--stroke-brand)] text-[var(--content-brand)]"
```

Nunca `#df285d` cravado. Quando a marca mudar, o token muda junto; o literal não.

## Onde a cor entra

Cor demais achata tudo. O template usa a marca em cinco lugares, e é o
suficiente: o logotipo, a barra vertical ao lado do título, o cartão do valor
total, os nós acesos da esteira, e a borda esquerda de cada decisão do agente.
Verde e vermelho ficam reservados para **estado** — concluído e exceção —, nunca
para enfeite.

## Antes de mostrar

`make verificar` confere que a folha do DS chegou ao navegador (procura o rosa
da marca dentro do CSS servido) e que a página hidrata. Depois, olhe você mesmo:
uma tela sem CSS passa em todo teste de API.

## Demo de cliente com a marca DELE

Co-branding funciona e os consoles do `fde-demos` fazem isso: o casco continua
Barte e o cliente aparece no bloco do rodapé, no breadcrumb e no `<title>`.
Sistemas de terceiros simulados (SAP, Slack, um ERP) usam a identidade **nativa
deles** — é o que dá realismo.
