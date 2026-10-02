# Explainer document

The source of the PDF that explains a POC. `references/explainer.md` says what goes
in each section and how to write it.

| File | What it is |
|---|---|
| `template.html` | twelve A4 pages on Barte's brand, with every text to rewrite in brackets |
| `shots.example.json` | the shot list of the reference POC, to rewrite for the new one |

Copy both next to the POC's documentation, then run the three scripts in
`scripts/`: `extract-brand.mjs`, `capture-screens.mjs` and `build-explainer.mjs`.

The template builds as it is, once `brand/` and `fig/` exist, so a layout problem
shows before any text is written.
