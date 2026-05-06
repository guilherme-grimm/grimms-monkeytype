import { DEFAULT_FLAGS, type DifficultyFlags } from './difficulty'
import { languages } from './types'
import type { DisplayToken, LanguageId, NormalizedSnippet, Snippet } from './types'

export function isSupportedLanguage(value: unknown): value is LanguageId {
  return typeof value === 'string' && (languages as readonly string[]).includes(value)
}

// Strip characters from typed input that should never be counted toward scoring.
// - Tab is always visual (the source files use tabs only for rendering).
// - Newlines are stripped only when autoSkipNewlines is true (Easy/Normal).
//   In Hard mode the user must press Enter at line breaks, so we keep them.
export function sanitizeTypedValue(value: string, flags: DifficultyFlags = DEFAULT_FLAGS) {
  if (flags.autoSkipNewlines) {
    return value.replace(/[\r\n\t]/g, '')
  }
  return value.replace(/\t/g, '')
}

export function normalizeSource(source: string, flags: DifficultyFlags = DEFAULT_FLAGS) {
  let result = sanitizeTypedValue(source, flags)

  // Easy mode: strip leading whitespace at the start of each (logical) line so
  // indentation isn't part of what the player must type. With autoSkipNewlines
  // already true in Easy, "logical lines" are detected by walking the original
  // source — we work from `source` directly to know where lines began.
  if (flags.indentMode === 'auto') {
    result = stripLeadingIndentEachLine(source, flags)
  }

  return result
}

function stripLeadingIndentEachLine(source: string, flags: DifficultyFlags) {
  let result = ''
  let atLineStart = true

  for (const char of source) {
    if (char === '\n' || char === '\r') {
      if (!flags.autoSkipNewlines) {
        result += char
      }
      atLineStart = true
      continue
    }

    if (char === '\t') {
      // Tabs are always visual.
      atLineStart = atLineStart // no change
      continue
    }

    if (atLineStart && char === ' ') {
      // Skip leading spaces of this line.
      continue
    }

    atLineStart = false
    result += char
  }

  return result
}

// Build per-character display tokens.
// - Newlines: scoringIndex tracked iff autoSkipNewlines is false (Hard).
// - Tabs: always scoringIndex: null (visual only).
// - In 'auto' indent mode, leading spaces on each line are also scoringIndex: null
//   so the renderer shows them but they don't count toward typed progress.
export function buildDisplayTokens(
  source: string,
  flags: DifficultyFlags = DEFAULT_FLAGS,
): Array<DisplayToken> {
  const displayTokens: Array<DisplayToken> = []
  let scoringIndex = 0
  let atLineStart = true

  for (const char of source) {
    if (char === '\r' || char === '\n') {
      if (flags.autoSkipNewlines) {
        displayTokens.push({ value: char, scoringIndex: null })
      } else {
        displayTokens.push({ value: char, scoringIndex })
        scoringIndex += 1
      }
      atLineStart = true
      continue
    }

    if (char === '\t') {
      displayTokens.push({ value: char, scoringIndex: null })
      // tabs don't end "line start" — leading tabs in indent stay leading
      continue
    }

    if (flags.indentMode === 'auto' && atLineStart && char === ' ') {
      displayTokens.push({ value: char, scoringIndex: null })
      continue
    }

    atLineStart = false
    displayTokens.push({ value: char, scoringIndex })
    scoringIndex += 1
  }

  return displayTokens
}

export function normalizeSnippet(
  snippet: Snippet,
  flags: DifficultyFlags = DEFAULT_FLAGS,
): NormalizedSnippet {
  return {
    ...snippet,
    normalized: normalizeSource(snippet.source, flags),
    displayTokens: buildDisplayTokens(snippet.source, flags),
  }
}
