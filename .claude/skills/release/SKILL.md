---
name: release
description: Walk through the process of releasing a new version of tapkit-openclaw to npm via GitHub Actions
argument-hint: "<version>"
---

Release a new version of the `tapkit-openclaw` npm package.

## How it works

Publishing is triggered by pushing a git tag matching `v*` to the `origin` remote. GitHub Actions runs `.github/workflows/publish.yml`, which builds the project, publishes to npm, then publishes to ClawHub.

## Steps

1. **Bump the version** in `package.json` to the target version (the argument passed to this skill, e.g. `0.2.0`). If no version was specified, ask the user what version to release.

2. **Commit the version bump**:
   ```bash
   git add package.json
   git commit -m "Bump version to <version>"
   ```

3. **Create and push the tag**:
   ```bash
   git tag v<version>
   git push origin master
   git push origin v<version>
   ```

4. **Verify** — provide the user with the GitHub Actions URL to monitor:
   `https://github.com/Jootsing-Research/tapkit-plugin-openclaw/actions`

## Prerequisites

- The `NPM_TOKEN` secret must be configured in the GitHub repo settings under **Settings > Secrets and variables > Actions**.
- The `CLAWHUB_TOKEN` secret must be configured for ClawHub publishing.
- The version in `package.json` must not already exist on npm.

## Version guidance

- Patch (`0.1.1`): bug fixes, docs
- Minor (`0.2.0`): new features, backwards-compatible
- Major (`1.0.0`): breaking changes
