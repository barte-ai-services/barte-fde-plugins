# guided-demo

The guided demonstration of the reference POC, ready to copy into a Next.js app.

| File | What it is |
|---|---|
| `Piloto.tsx` | the engine (cursor, caption, panel, pause and stop) and one example script |
| `piloto.css` | its styles, on the host app's variables |

To use it:

1. Copy `Piloto.tsx` into the app's components and append `piloto.css` to the
   global stylesheet.
2. Render it once in the shell, with four props: whether it is open, a function
   that closes it, a function the app runs after a restart to forget what it had
   open, and the app's toast function.
3. Add a button that opens it.
4. Give the back-end one call that restarts the POC to its opening state.
5. Replace `roteiro()` with the story of the new POC, and add `data-tour`
   attributes to the controls it clicks.

`references/guided-demo.md` explains the script, the controls and every failure
that was fixed in this engine.
