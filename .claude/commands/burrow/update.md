---
name: burrow:update
description: Update burrow to the latest version
argument-hint: ""
allowed-tools:
  - Bash
---
Update burrow to the latest version from npm.

Run: `npx create-burrow --yes`

This fetches the latest published version of burrow from npm and runs the installer in non-interactive mode. Your existing cards.json data is always preserved during upgrades.
