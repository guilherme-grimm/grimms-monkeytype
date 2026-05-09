import { expect, test } from '@playwright/test'

// Golden-path smoke for the wired game loop. Behavioral assertions only —
// no coupling to specific snippet content. The spec reads the active
// snippet's normalized target from a DOM affordance (`data-snippet-target`)
// and types it via real keystrokes, mirroring how a player interacts.
//
// Round duration is 30s in production; we wait it out in real time. Keeping
// the suite tiny so this 30s wait is a one-time cost per E2E run.
test('user can play a round end-to-end', async ({ page }) => {
  // Round duration is 30s; the default Playwright test timeout is also 30s,
  // which leaves zero headroom for navigation + typing. Bumping this one test.
  test.setTimeout(60_000)

  await page.goto('/play?language=javascript')

  const snippet = page.getByTestId('current-snippet')
  const initialTarget = await snippet.getAttribute('data-snippet-target')
  expect(initialTarget, 'snippet target attribute must be present on first paint').toBeTruthy()

  // Focus the (visually-hidden but functional) textarea, then type the
  // snippet character-by-character. The hook starts the round on the first
  // character delivered through onChange.
  await page.getByTestId('typing-input').focus()
  await page.keyboard.type(initialTarget!)

  // Loop progressed: snippet rotated, completion counter advanced, score climbed.
  // We assert "different from initial" rather than "equals X" — randomness is
  // intentional in production.
  await expect(snippet).not.toHaveAttribute('data-snippet-target', initialTarget!)
  await expect(page.getByTestId('snippets-completed')).not.toHaveText(/^snippets 0$/)

  const scoreText = await page.getByTestId('score-readout').innerText()
  const score = Number.parseInt(scoreText.replace(/\D/g, ''), 10)
  expect(
    score,
    `score should be positive after typing one snippet (got "${scoreText}")`,
  ).toBeGreaterThan(0)

  // Round timer is 30s; allow generous headroom for slow CI runners.
  await expect(page.getByTestId('round-finished')).toBeVisible({ timeout: 35_000 })
  await expect(page.getByTestId('share-button')).toBeVisible()
})
