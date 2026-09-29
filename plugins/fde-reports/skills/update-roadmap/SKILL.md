---
name: update-roadmap
description: Refresh the Barte AI Services roadmap from GitHub issues, pull requests and Projects, reconcile delivery evidence, and publish the private tactical and operational views. Use for roadmap updates, meeting preparation, or requested historical backfill.
---

# Update the Barte roadmap

Keep the central roadmap consistent with GitHub and explicit client decisions. Read [the Barte data contract](references/barte-roadmap.md) before changing data; it identifies the canonical repository, fields, portfolio, and existing refresh process. Work in the roadmap repository, not in this plugin's installation directory.

## Scope and freshness

- For a normal update, read GitHub, regenerate the snapshot, reconcile affected editorial views, validate and publish the documentation. A meeting request may limit the review to one client, but the published snapshot must retain the complete portfolio.
- For a preview or audit request, stop at the requested artifact; do not publish implicitly.
- Historical backfill means finding existing issues, PRs, commits and documented acceptance. Search before creating retrospective issues. Change issue states, dates or Project fields only when the user's request includes that reconciliation and evidence supports it; a routine refresh reads these sources without rewriting them.
- This skill runs when invoked. It does not install a background job, hook or schedule. Do not describe the roadmap as live-synchronized unless that mechanism is independently configured and verified.

## Read and reconcile

1. Locate the canonical checkout by its Git remote. Inspect its instructions, working tree, maintenance guide, refresh script and current source files. Use an isolated checkout if unrelated edits would be disturbed.
2. Prefer the GitHub API/CLI. Check repository and Project access before collecting data; existing authorization applies. If an injected token lacks Project access, try an already-authorized stored `gh` credential as described in the reference. Do not print tokens, request organization administration for read-only work, or require browser login to perform API operations. If both authorized credentials fail, report the specific missing access rather than repeatedly launching authorization flows.
3. Collect every page. Compare source item totals and unique issue URLs with the generated snapshot. A failed or truncated read must not overwrite good data or publish a partial portfolio. Keep projects with no known history visible as such.
4. Run the repository's maintained refresh script rather than copying it into the plugin. Before running, check its client mapping against the portfolio and current Project options. Handle unknown clients/fields explicitly; never drop them or assign them to another client silently.
5. Inspect the diff against GitHub evidence. Distinguish planned windows, actual implementation/closure dates, and business acceptance. Conflicting issue/Project states need an explicit finding, not an invented reconciliation. A merged PR or closed technical issue does not prove deployment or client acceptance. A project being active does not put all of its issues in progress.
6. Check whether changed scope or dates also affect editorial milestones and substeps. Preserve the evidence and provenance of each adjustment. Do not shift baseline dates, infer missing years, inherit a parent's completion for unverified substeps, or calculate unsupported progress percentages.

## Validate and publish

- Build the current docs with strict validation. Check local links and the meaningful changes: affected clients, tactical/operational switching, status filters, date labels, undated items, meeting mode and browser errors. Broaden responsive testing only when layout or controls changed.
- Preserve the data contract, Barte branding, stable client identifiers and saved URLs. Meeting mode is a presentation filter, not access control: the browser receives the whole authorized internal dataset.
- Keep the latest retrieval time accurate and visible. If nothing changed beyond freshness, report that plainly; avoid manufacturing activity or unnecessary issues.
- Publish through the repository's normal Git/PR workflow within the user's scope. Respect branch protections and signing configuration. Verify Pages is private before publication, and wait for the actual documentation deployment to succeed. Never make it public to resolve an access failure. No product runtime deployments belong to this workflow.
- Report the updated roadmap link, source freshness, meaningful changes and remaining evidence gaps. Distinguish a local build, a pushed commit, and a successfully deployed site. If publication is blocked, preserve the validated work and name the actual blocker.

## Requested backfill

Use the project's confirmed start as a search boundary, not as every task's start date. Build an evidence table containing the deliverable, canonical issue/PR, actual event date, technical result, acceptance evidence and unresolved gaps. Reuse existing technical records and connect them to client outcomes before creating missing retrospective records. Dates of commit, merge, issue closure and client acceptance describe different events; retain their meaning. Re-run the normal refresh and publication flow after authorized reconciliation.
