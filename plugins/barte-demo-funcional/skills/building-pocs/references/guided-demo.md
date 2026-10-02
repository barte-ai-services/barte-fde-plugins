# The guided demonstration

A button makes the screen operate itself: a cursor moves, clicks and types through
the story, with a caption saying what is happening. It is what lets a salesperson
present the POC with one click.

It is **not** a recording and **not** a staged path. The cursor clicks the same
controls a person would, with `element.click()`, so the decision resumes the
workflow, the file lands in storage and the e-mail goes out. The script only
chooses where to click and what to say.

A working implementation is in `assets/guided-demo/`: the engine, its styles, and
an example script. Copy it into the web app and replace the script.

## The parts

| Part | What it does |
|---|---|
| a start dialog | says what will happen, that the POC restarts from zero, and how to stop |
| the restart call | returns the POC to its opening state before the first step |
| the cursor | a fixed element moved by a CSS transform, with a click ripple |
| the caption | a title and one or two sentences, next to the cursor |
| the panel | the step name, the progress, pause and stop |
| the script | an ordered list of steps; each step is a function that says, clicks, types and waits |

## The script

The story follows the proposal's own argument. A shape that works, in nine steps
and about two minutes:

1. the input arrives, and the agent works live;
2. one item it closed by itself, and how;
3. the evidence: the e-mail, and the document next to what was read;
4. one item where it stopped, and the fact that stopped it;
5. a decision that becomes a rule;
6. a decision the history already suggested;
7. a complement arrives, and is handled at once;
8. the return: the preview, the approval, the send;
9. under the screen: every component, and the calls.

Captions follow Barte's voice: the number first, one idea per caption, no jargon of
the platform. They are written for the person in the room, not for the builder.

Steps pick their targets from the data, not from fixed identifiers: "the first
reconciled item whose document came by e-mail", "the exception of the kind that
needs a document read". The script then survives a change of data.

## Controls

- **Pause** by the button or by a real click anywhere. While paused the screen is
  the presenter's; continue resumes.
- **Stop** by the button or Escape, captured before the page's own Escape handlers.
- A transparent shield over the page turns a stray real click into a pause instead
  of a broken story.

## What breaks it, and the fix

Each of these happened.

| Symptom | Cause | Fix |
|---|---|---|
| the cursor flies off screen | the target was measured during a smooth scroll or a sliding drawer | wait until the target's rectangle is the same in three consecutive samples before aiming |
| the cursor points at the corner | the framework re-created the element between finding it and reaching it | after moving, check the element is still connected; if not, find it again |
| the click does nothing | the button was still disabled | wait for the control to be enabled before moving to it |
| the whole page shifts | `scrollIntoView` or `focus()` scrolled an outer container | scroll each scrollable ancestor and the window explicitly; focus with `preventScroll` |
| the caption hides the target | a fixed placement | flip the caption left or up near the edges; aim at a label, not at the centre of a large panel |
| the screen shows stale numbers after the restart | refresh responses arrived out of order during a burst of events | number the requests and apply only the latest |
| a step waits forever | the element does not exist at this window width | a pointing gesture gives up after four seconds and the story continues; a click fails with a readable message |

## Verifying it

Run it to the end at two window widths: the one of a projector and a narrow one.
While it runs, sample the cursor's real position every 50 ms and record a violation
when it is outside the window, or when a click lands outside its target. The
reference run had 26 clicks and zero violations over about 3,000 samples.

Then test pause, continue and Escape, and run it twice in a row: the second run
proves the restart.
