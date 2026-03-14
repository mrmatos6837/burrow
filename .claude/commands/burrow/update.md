---
name: burrow:update
description: Update burrow to the latest version
argument-hint: ""
allowed-tools:
  - Bash
  - Read
---
Update burrow to the latest version by running the installer in upgrade mode.

Steps:
1. Read `.claude/burrow/.source-dir` to find the burrow source repository path.
2. If the file does not exist, ask the user: "Where is your burrow repo cloned? Please provide the full path to the burrow source directory."
3. Run: `node <sourceDir>/install.cjs --yes`
4. Report the result to the user.

Example (if .source-dir contains `/home/user/burrow`):
```
node /home/user/burrow/install.cjs --yes
```

Note: `.claude/burrow/.source-dir` is written automatically by the installer after a fresh install or upgrade. If it is missing, the user needs to provide the path to the directory where they originally cloned the burrow repository.
