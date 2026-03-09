---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/burrow/lib/render.cjs
  - test/render.test.cjs
  - README.md
  - .planning/PROJECT.md
autonomous: true
requirements: [QUICK-7]
must_haves:
  truths:
    - "hasBody indicator displays + instead of ellipsis in card listings"
    - "All tests pass with updated indicator"
    - "README and PROJECT.md examples show + instead of ellipsis for body indicator"
    - "v1.0 git tag points to the commit with this fix"
  artifacts:
    - path: ".claude/burrow/lib/render.cjs"
      provides: "Body indicator rendering"
      contains: "' +'"
    - path: "test/render.test.cjs"
      provides: "Tests for + body indicator"
    - path: "README.md"
      provides: "Updated examples with + indicator"
  key_links:
    - from: ".claude/burrow/lib/render.cjs"
      to: "test/render.test.cjs"
      via: "formatCardLine body marker"
      pattern: "bodyMarker.*\\+"
---

<objective>
Change the hasBody indicator from ellipsis (U+2026) to + symbol across code, tests, and docs. Then update the v1.0 git tag to include this fix.

Purpose: The + symbol is cleaner and more universally readable than the ellipsis for indicating a card has body content.
Output: Updated render code, passing tests, updated docs, and re-tagged v1.0.
</objective>

<context>
@.claude/burrow/lib/render.cjs
@test/render.test.cjs
@README.md
@.planning/PROJECT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update render code and tests</name>
  <files>.claude/burrow/lib/render.cjs, test/render.test.cjs</files>
  <action>
In `.claude/burrow/lib/render.cjs` line 101:
- Change `const bodyMarker = hasBody ? ' \u2026' : '';` to `const bodyMarker = hasBody ? ' +' : '';`
- Do NOT change the truncation ellipsis on line 86 or line 225 -- those are text truncation indicators, not body markers.

In `test/render.test.cjs`, update all body-indicator-related test assertions:
- Line 270 comment: change "ellipsis marker (U+2026)" to "+ body marker"
- Line 274: change `assert.ok(rootCauseLine.includes('\u2026')` to check for `' +'` instead. Update message.
- Line 422 test name: change `'renders count + body: Title (N) \u2026'` to `'renders count + body: Title (N) +'`
- Line 458: change `includes('\u2026')` to `includes(' +')`, update message
- Line 461-462: change `indexOf('\u2026')` to `indexOf(' +')`, update variable name from `ellipsisIdx` to `bodyIdx`, update message
- Line 484-486: change `startsWith(' \u2026')` to `startsWith(' +')`, update message
- Line 489 test name: change `'renders body only: Title \u2026'` to `'renders body only: Title +'`
- Line 503: change `includes('\u2026')` to `includes(' +')`, update message
- Line 526: change `includes('\u2026')` to check for `' +'`, update message
- Line 529 test name: change `'renders all indicators: Title (N) \u2026 [archived]'` to `'renders all indicators: Title (N) + [archived]'`
- Line 548: change `includes('\u2026')` to `includes(' +')`, update message
- Line 552: change `indexOf('\u2026')` to `indexOf(' +')`, rename `ellipsisIdx` to `bodyIdx`
- Line 554-555: update variable references and messages accordingly

Do NOT modify the truncation-related ellipsis test around lines 377-379 -- that tests title truncation, not body markers.
  </action>
  <verify>
    <automated>cd /Users/mrmatos6837/Projects/personal/burrow && node --test test/render.test.cjs</automated>
  </verify>
  <done>Body indicator is + in render output, all render tests pass</done>
</task>

<task type="auto">
  <name>Task 2: Update documentation and re-tag v1.0</name>
  <files>README.md, .planning/PROJECT.md</files>
  <action>
In `README.md`:
- Line 219: change `` `…` — card has a body `` to `` `+` — card has a body ``
- Lines 31, 32, 38, 40, 43: in the example tree output, replace the trailing ` …` (body indicator) with ` +`
- Line 215: same replacement in the flat example

In `.planning/PROJECT.md`:
- Lines 93, 95: replace trailing ` …` with ` +` in example tree output

After all file changes are committed, update the v1.0 tag:
```
git tag -d v1.0
git tag v1.0
```

If the repo has a remote tag, note: `git push origin :refs/tags/v1.0 && git push origin v1.0` (only if user confirms push).
  </action>
  <verify>
    <automated>cd /Users/mrmatos6837/Projects/personal/burrow && grep -c '…' README.md | grep -q '^0$' && echo "No ellipsis body markers remain in README" || echo "FAIL: ellipsis still in README"</automated>
  </verify>
  <done>All docs show + instead of ellipsis for body indicator. v1.0 tag updated to latest commit.</done>
</task>

</tasks>

<verification>
- `node --test test/render.test.cjs` -- all tests pass
- `node --test test/cli.test.cjs` -- CLI tests still pass (no regressions)
- No remaining `…` as body indicator in render.cjs (truncation `…` is fine)
- README.md and PROJECT.md examples use `+` for body indicator
- `git tag -l v1.0` shows the tag exists on the latest commit
</verification>

<success_criteria>
- The + symbol replaces ellipsis as the hasBody indicator in rendered output
- All existing tests updated and passing
- Documentation reflects the new indicator
- v1.0 tag points to the commit containing this change
</success_criteria>

<output>
After completion, create `.planning/quick/7-change-hasbody-indicator-from-ellipsis-t/007-SUMMARY.md`
</output>
