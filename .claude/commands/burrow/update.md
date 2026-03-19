---
name: burrow:update
description: Update burrow to the latest version
argument-hint: ""
allowed-tools:
  - Bash
  - Read
---
Update burrow to the latest version from npm.

Steps:
1. Run: `npx create-burrow --yes`
2. Report the result to the user.

This fetches the latest published version of burrow from npm and runs the installer in non-interactive mode. Your existing cards.json data is always preserved during upgrades.
