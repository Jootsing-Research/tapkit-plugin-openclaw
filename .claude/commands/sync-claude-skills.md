---
description: Sync local openclaw tapkit skills against the upstream Jootsing-Research/tapkit-plugins-claude repo. Compare, classify drift, then copy mirror-safe changes. SKILLS ONLY.
---

This repo (`tapkit-plugins-openclaw`) is the OpenClaw mirror of `Jootsing-Research/tapkit-plugins-claude`. The two are intended to stay in lockstep for **skills** — only the plugin shell differs (`openclaw.plugin.json` at the repo root here vs `.claude-plugin/` upstream). Your job is to surface skill drift between the two and then copy over the changes that are safe to mirror byte-for-byte.

## Scope: SKILLS ONLY

**This command compares and syncs ONLY the contents of `skills/` (local) against `plugins/tapkit/skills/` (upstream). Nothing else.** Do not look at, diff, or report on:

- `.mcp.json` / MCP server config
- `openclaw.plugin.json` (or upstream's `.claude-plugin/`)
- `assets/` (logos, images)
- `README.md`, `TODO.md`, `package.json`, `dist/`, `src/`, `scripts/`, or any other top-level files
- `.claude/`, `.github/`, or any other directories outside `skills/`

Even if you notice drift in those other places while working, **do not mention it**. The user only wants to mirror skills. If they want a broader sync later, they will ask for it explicitly.

Note the path mismatch: skills live at **`skills/<name>/SKILL.md`** locally but at **`plugins/tapkit/skills/<name>/SKILL.md`** upstream. Don't get the two confused when reading vs writing.

## Steps

### Phase 1 — Report

1. **Inventory both sides.**
   - Local skills: every directory under `skills/` (each contains a `SKILL.md`). Use Glob `skills/*/SKILL.md`.
   - Upstream skills:
     ```
     gh api 'repos/Jootsing-Research/tapkit-plugins-claude/contents/plugins/tapkit/skills?ref=main' --jq '.[] | select(.type=="dir") | .name'
     ```

2. **Compare inventories.** Identify:
   - Skills present **upstream but missing locally** → candidates to add here.
   - Skills present **locally but missing upstream** → unexpected drift; flag for review and do **not** delete them.

3. **Diff each shared skill's `SKILL.md`.** For every skill that exists in both, fetch the upstream contents and diff against the local file. Use parallel WebFetch calls for the raw URLs to keep this fast:
   ```
   https://raw.githubusercontent.com/Jootsing-Research/tapkit-plugins-claude/main/plugins/tapkit/skills/<skill>/SKILL.md
   ```
   Then read the local file at `skills/<skill>/SKILL.md` and compare. Each upstream skill is a single `SKILL.md` — no `references/`, `scripts/`, or other subfiles to worry about.

   For each diff, **summarize what changed** — do not dump full file contents. Classify each change as one of:
   - **Mirror** — content change that should be copied over verbatim (new instructions, updated workflow steps, fixed typo, new section, reordered guidance).
   - **Adapt** — Claude-specific reference that needs translation for OpenClaw, OR a place where OpenClaw has intentionally diverged (e.g. tapkit's auto-select-single-phone behavior vs upstream's "every call needs phone_id"). Do not auto-copy these — flag them and let the user decide.
   - **Ignore** — already-correct difference between the two mirrors that should stay diverged.

4. **Report.** Output one summary with these sections:
   - **Missing locally** — skills upstream that should be added here (bullet list).
   - **Extra locally** — skills here that aren't upstream (bullet list, or "none").
   - **In sync** — skills whose `SKILL.md` matches byte-for-byte (just count + names on one line).
   - **Drifted** — per-skill bullets, each with: skill name, 1–3 line summary of what differs, classification (mirror / adapt / ignore), and a one-line recommendation.

### Phase 2 — Copy

After presenting the report, **stop and wait for the user to confirm** before writing anything. When they say go:

5. **Copy mirror-safe changes.** For each skill classified as **Mirror** in the report, fetch the upstream `SKILL.md` again and Write it to `skills/<skill>/SKILL.md`, overwriting the local file. For skills classified entirely as **Mirror** with no Adapt portions, this is a clean overwrite.

6. **Add missing skills.** For each skill listed under "Missing locally", create the directory `skills/<skill>/` and write the upstream `SKILL.md` into it.

7. **Skip Adapt cases.** Do not touch any skill classified as Adapt (or partially Adapt) without explicit per-skill instruction from the user. Mixed-classification skills (some mirror, some adapt content in the same file) cannot be safely overwritten — list them and ask the user how to proceed.

8. **Do not delete Extra-locally skills.** They may be intentional. Just leave them.

9. **Summarize what was written.** After copying, list each file you created or overwrote, one per line, plus any skills you skipped and why. Do not run git commands, do not stage, do not commit — just leave the working tree dirty for the user to inspect.

## Notes

- Upstream lives at `Jootsing-Research/tapkit-plugins-claude` on branch `main`. Always pull from `main` unless the user says otherwise.
- This command only touches files under `skills/`. If you find yourself about to write outside that directory, stop — you've gone off-script.
- The plugin shell file at the repo root is `openclaw.plugin.json`. Never edit it from this command.
