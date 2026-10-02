# Everything on screen exists

A POC is believed when someone clicks the thing that looked decorative and it
opens. This file is the standard for that.

## The test

For every element of the proposed screen, ask: **if the client clicks it, or asks
where it came from, what do I show?**

| On screen | Not acceptable | Required |
|---|---|---|
| an attachment chip | a label | a file in storage that opens in a viewer |
| "read from the document" | values copied from the fixture | values extracted from that file, with the source (XML, or PDF and page) |
| an e-mail that was "found" | a card with text | a raw `.eml` in the inbox, parsed, with its attachments |
| a spreadsheet that "arrived" | a timestamp | an `.xlsx` in the input bucket, downloadable, whose arrival started the process |
| a returned spreadsheet | a toast | an `.xlsx` generated in the source layout, stored, and sent |
| a match percentage | a typed number | a computed one |
| "this happened before" | a text field | a query over earlier decisions |
| an exception | a flag in the data | a consequence of a fact |
| a counter in the menu | a constant | a count |

## Documents

Generate them. A document has the look of its kind and the content of the case.

- **The right kind of file.** An electronic invoice is XML, with its printed form
  as PDF. A service invoice is a PDF in the municipal layout. A bank slip has a
  digitable line. A report is a report.
- **A text layer.** The local reader works on text. Draw the PDF with real text,
  not with an image.
- **Coherent identifiers.** Valid check digits, the issuer's identifier matching
  the registry, dates inside the period, amounts equal to the spreadsheet's.
- **The case in the content.** If the exception is "issued to another company of
  the group", the taker's identifier in the PDF is the other company's.
- **A self-test.** Generate, read back, compare. A document the reader cannot read
  is found here and not in front of the client.

A PDF does not render inside an iframe in every browser pane. Render the page to an
image on the server and show it next to the extracted fields, with links to open
and download the original.

## Exceptions come from facts

The agent does not know which items are exceptions. It finds out.

| The proposal says | The fact to plant |
|---|---|
| document not found | the external system holds only a payment slip; the inbox holds only an order confirmation; or nothing at all |
| wrong classification upstream | a generic category and no cost centre in the external record |
| supplier sent it wrong | the taker read from the document is not the company that paid |
| more than one candidate | two external records with the same amount |
| accepted divergence | a difference the history shows as accepted before |

Each kind proves a capability. Keep at least three kinds, and at least one that is
only detectable by reading a document.

Add **distractors**: e-mails and records that look relevant and are not. A search
that finds the right e-mail among three wrong ones is a search.

## Computed values and the proposal's numbers

A computed similarity or score will not equal the number typed into the proposal.
That is accepted and said in the plan. What must hold is the **side of the line**:
every item the proposal shows as automatic stays automatic, every exception stays
an exception, with the same reason.

Calibrate the formula against the whole set, not one case. A score that saturates
at the top for every item says nothing; spread the weights until the easy cases and
the borderline ones are apart.

## Learning is counted

"Three equal decisions become a rule" is a count over the decisions table, by a
signature of the case. Seed the earlier periods' decisions so the count starts at
two for one planted case: the third confirmation, made live, creates the rule.

## The opening state

The screen never opens empty and never opens mid-process. On start, the input
arrives by itself and the process runs to its resting state. A restart endpoint
returns to that state by terminating the workflows, truncating the domain, clearing
derived files and letting the input arrive again. Sources (the stub's records, the
inbox) are left as they are.

## What stays invented, and is said so

- A premise the proposal states and the POC cannot measure (time saved per month)
  stays a premise, labelled as one.
- The external system is a stub. The screen and the documents say "stub".
- People are fictitious. Companies do not exist. Identifiers are valid in form.
