## Summary

<!-- One or two sentences: what does this change and why? -->

## Linked issue

<!-- Closes #123 / Refs #123. Skip if there's no issue. -->

## Screenshots / recording (UI changes)

<!-- Before/after screenshots or a short clip for any visible change. -->

## Manual test notes

<!-- What did you exercise in the browser? Golden path + any edge cases. -->

## Checklist

- [ ] `make verify` passes (lint + format + typecheck + test + build)
- [ ] `make e2e` passes if you touched the play loop, snippet display, or auth surface
- [ ] Tested manually in a browser (for UI changes)
- [ ] README / CONTRIBUTING / docs updated if behavior changed
- [ ] PR is focused on one logical change

> Both `verify` and `e2e` jobs gate merge in CI. Run them locally first — the GH runner takes longer.
