# The brand on screen

The demo uses **`barte-design-system`** — the real package, the same one
`barte-copilot` consumes. It is not a copied palette: it is the brand, versioned,
and it tracks whatever the design team publishes.

## What the design system gives you

| | |
|---|---|
| package | `barte-design-system` (public npm, currently `^0.1.69`) |
| styles | `@import "barte-design-system/styles"` — ships Inter embedded in `@font-face`, downloads nothing |
| components | 47, among them `Logo`, `Sidebar`, `MenuLeaf`, `MenuTitle`, `Breadcrumb`, `Table`, `Drawer`, `Button`, `Pills`, `Modal`, `Select`, `Toast` |
| tokens | CSS variables — use them, never a hardcoded hex |

**Brand pink: `#df285d`**, and it arrives through a token, not a literal:
`--bg-brand`, `--content-brand`, `--stroke-brand`, `--bg-brand-light`.

Others that come up constantly: `--content-primary/secondary/tertiary`,
`--bg-primary/secondary/tertiary`, `--stroke-primary/secondary`,
`--accent-green|red|blue|orange` (each with `-light` and `-dark`), `--spacing-*`,
`--sizes-*`. The full list is in
`node_modules/barte-design-system/dist/barte-design-system.css`.

## The five traps

All five have bitten. All five are fixed in the template — this is the record of
**why**, so nobody undoes them without knowing.

### 1. The logo comes out black (or white) unless you ask for pink

`<Logo type="full" />` uses the default variant `inverse`, which is **white** —
for dark backgrounds. `default` is **black**. Pink is `brand`:

```tsx
<Logo type="full" variant="brand" />
```

### 2. Tailwind without Preflight, plus a hand-written base block

The all-in-one `@import "tailwindcss"` pulls in Preflight, which clobbers the DS
components' styling. Only the theme and the utilities go in:

```css
@import "barte-design-system/styles";
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

Except that skipping Preflight does **not** leave the page without base rules; it
leaves it with the **browser's**. The DS applies Inter only through its own
component classes, so every `<h1>`, `<p>` and `<span>` you write comes out in
Times New Roman, every `<button>` in Arial, and the browser's 8px `body` margin
pushes the shell past the window. The base block in `globals.css` fixes exactly
three things — family (from the **same token** the DS components read), margin and
smoothing — and **widening it is how you clobber the DS**.

For the same reason, `<ul>` and `<ol>` arrive with markers and 40px of indent.
Layout lists carry `list-none pl-0`, and a rule in `globals.css` enforces it.

### 3. `Badge` does not render text — `Pills` does

The DS `Badge` is a **coloured dot**: it ignores its children. A status column
built with it comes out as dots and nothing written.

```tsx
<Pills size="sm" variant="light" state="success" label="Pronto para aprovação" />
```

`state`: `accent | success | info | warning | error | alert | default`.

### 4. The DS `Sidebar` thinks it is the whole sidebar

It carries its own fixed width and right border. Inside a container that already
has a border, it paints a **second vertical line**. The override in `globals.css`
is scoped by the `app-shell-nav` class and matches the DS class by **prefix** (the
suffix is a build hash). Remove the class from the JSX and the ghost line returns.

### 5. The corner cross: topbar and sidebar share one height

Both read `--app-header-height` (derived from `--sizes-8xl`). If they diverge, the
bottom borders never meet and the corner looks crooked. One number, consumed by
both.

## Outside the design system

What the DS does not cover — the shell, the pipeline, the stat cards — is inline
Tailwind with tokens in arbitrary values:

```tsx
className="border-[var(--stroke-brand)] text-[var(--content-brand)]"
```

Never a hardcoded `#df285d`. When the brand changes, the token changes with it;
the literal does not.

## Where the colour goes

Too much colour flattens everything. The template uses the brand in five places,
and that is enough: the logo, the vertical bar next to the title, the total-amount
card, the lit pipeline nodes, and the left border of each agent decision. Green
and red are reserved for **state** — done and exception — never for decoration.

## Before you show it

`make check` verifies the DS stylesheet reached the browser (it looks for the
brand pink inside the served CSS) and that the page hydrates. Then look for
yourself: a screen with no CSS passes every API test.

## A client demo carrying THEIR brand

Co-branding works, and the `fde-demos` consoles do it: the shell stays Barte and
the client appears in the sidebar block, the breadcrumb and the tab title — all of
which come from the demo's vocabulary, so it is configuration, not code.
Simulated third-party systems (SAP, Slack, an ERP) use **their own native**
identity — that is what sells the realism.
