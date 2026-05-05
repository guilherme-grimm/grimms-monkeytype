import { normalizeSnippet } from './normalization'
import type { LanguageId, NormalizedSnippet, Snippet } from './types'

const rawSnippets: Record<LanguageId, Array<Snippet>> = {
  javascript: [
    {
      id: 'js-1',
      language: 'javascript',
      source: `function collectActiveUsers(users, cutoff) {
  const activeUsers = []

  for (const user of users) {
    if (!user.isOnline || user.lastSeenAt <= cutoff) {
      continue
    }

    activeUsers.push(user.name)
  }

  return activeUsers
}`,
    },
    {
      id: 'js-2',
      language: 'javascript',
      source: `function groupPostsByTag(posts) {
  const grouped = {}

  for (const post of posts) {
    for (const tag of post.tags) {
      grouped[tag] ??= []
      grouped[tag].push(post.slug)
    }
  }

  return grouped
}`,
    },
    {
      id: 'js-3',
      language: 'javascript',
      source: `async function loadProjectSummary(fetcher, projectId) {
  const response = await fetcher(\`/api/projects/\${projectId}\`)

  if (!response.ok) {
    throw new Error('Failed to load project summary')
  }

  const project = await response.json()
  return \`\${project.name}:\${project.branch}\`.toLowerCase()
}`,
    },
    {
      id: 'js-4',
      language: 'javascript',
      source: `function buildLeaderboard(entries) {
  return entries
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      score: entry.score,
    }))
}`,
    },
    {
      id: 'js-5',
      language: 'javascript',
      source: `function clampScore(score, minimum, maximum) {
  if (score < minimum) {
    return minimum
  }

  if (score > maximum) {
    return maximum
  }

  return score
}`,
    },
  ],
  typescript: [
    {
      id: 'ts-1',
      language: 'typescript',
      source: `type ScoreEntry = {
  name: string
  score: number
  accuracy: number
}

function sortScores(entries: Array<ScoreEntry>) {
  return entries.toSorted((left, right) => right.score - left.score)
}`,
    },
    {
      id: 'ts-2',
      language: 'typescript',
      source: `function pickBest<T extends { score: number }>(items: Array<T>) {
  const sorted = items.toSorted((left, right) => right.score - left.score)

  if (sorted.length === 0) {
    return null
  }

  return sorted[0]
}`,
    },
    {
      id: 'ts-3',
      language: 'typescript',
      source: `interface RouteSearch {
  language?: 'javascript' | 'typescript' | 'python' | 'go'
  sound?: 'on' | 'off'
}

function getRouteLanguage(search: RouteSearch) {
  return search.language ?? 'javascript'
}`,
    },
    {
      id: 'ts-4',
      language: 'typescript',
      source: `export function assertNever(value: never): never {
  throw new Error(\`Unexpected value: \${value}\`)
}

export function formatScore(value: number) {
  return \`\${value.toFixed(0)} cpm\`
}`,
    },
    {
      id: 'ts-5',
      language: 'typescript',
      source: `function normalizeValues(values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

const normalized = normalizeValues([' go ', undefined, ' rust '])`,
    },
  ],
  python: [
    {
      id: 'py-1',
      language: 'python',
      source: `def collect_active_users(users, cutoff):
    active_users = []

    for user in users:
        if not user.is_online or user.last_seen_at <= cutoff:
            continue

        active_users.append(user.name)

    return active_users`,
    },
    {
      id: 'py-2',
      language: 'python',
      source: `def clamp(value, minimum, maximum):
    if value < minimum:
        return minimum

    if value > maximum:
        return maximum

    return value`,
    },
    {
      id: 'py-3',
      language: 'python',
      source: `def build_summary(project):
    summary = f"{project.name}:{project.branch}"
    summary = summary.lower().replace(" ", "-")

    if not summary:
        raise RuntimeError("empty summary")

    return summary`,
    },
    {
      id: 'py-4',
      language: 'python',
      source: `def top_scores(entries):
    ranked = sorted(entries, key=lambda entry: entry["score"], reverse=True)

    return [
        {"rank": index + 1, "name": entry["name"], "score": entry["score"]}
        for index, entry in enumerate(ranked[:5])
    ]`,
    },
    {
      id: 'py-5',
      language: 'python',
      source: `def group_posts_by_tag(posts):
    grouped = {}

    for post in posts:
        for tag in post.tags:
            grouped.setdefault(tag, []).append(post.slug)

    return grouped`,
    },
  ],
  go: [
    {
      id: 'go-1',
      language: 'go',
      source: `func collectActiveUsers(users []User, cutoff time.Time) []string {
\tactiveUsers := make([]string, 0, len(users))

\tfor _, user := range users {
\t\tif !user.IsOnline || !user.LastSeenAt.After(cutoff) {
\t\t\tcontinue
\t\t}

\t\tactiveUsers = append(activeUsers, user.Name)
\t}

\treturn activeUsers
}`,
    },
    {
      id: 'go-2',
      language: 'go',
      source: `func clampScore(score, min, max int) int {
\tif score < min {
\t\treturn min
\t}

\tif score > max {
\t\treturn max
\t}

\treturn score
}`,
    },
    {
      id: 'go-3',
      language: 'go',
      source: `func buildSummary(project Project) (string, error) {
\tif project.Name == "" {
\t\treturn "", fmt.Errorf("missing project name")
\t}

\tsummary := strings.ToLower(project.Name + ":" + project.Branch)
\tsummary = strings.ReplaceAll(summary, " ", "-")

\treturn summary, nil
}`,
    },
    {
      id: 'go-4',
      language: 'go',
      source: `func topScores(entries []Entry) []Entry {
\tranked := slices.Clone(entries)

\tslices.SortFunc(ranked, func(left, right Entry) int {
\t\treturn right.Score - left.Score
\t})

\treturn ranked[:min(5, len(ranked))]
}`,
    },
    {
      id: 'go-5',
      language: 'go',
      source: `func groupPostsByTag(posts []Post) map[string][]string {
\tgrouped := make(map[string][]string)

\tfor _, post := range posts {
\t\tfor _, tag := range post.Tags {
\t\t\tgrouped[tag] = append(grouped[tag], post.Slug)
\t\t}
\t}

\treturn grouped
}`,
    },
  ],
}

const normalizedSnippets: Record<LanguageId, Array<NormalizedSnippet>> = {
  javascript: rawSnippets.javascript.map(normalizeSnippet),
  typescript: rawSnippets.typescript.map(normalizeSnippet),
  python: rawSnippets.python.map(normalizeSnippet),
  go: rawSnippets.go.map(normalizeSnippet),
}

export function getSnippetsForLanguage(language: LanguageId) {
  return normalizedSnippets[language]
}

export function getInitialSnippet(language: LanguageId) {
  return normalizedSnippets[language][0]
}

export function getFollowingSnippet(language: LanguageId, currentSnippetId: string) {
  const snippets = normalizedSnippets[language]
  const currentIndex = snippets.findIndex((snippet) => snippet.id === currentSnippetId)

  if (currentIndex === -1) {
    return snippets[0]
  }

  return snippets[(currentIndex + 1) % snippets.length]
}
