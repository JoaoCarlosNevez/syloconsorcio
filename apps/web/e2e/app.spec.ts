import { expect, test } from '@playwright/test'

test('application loads and renders the main heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'SyloCRM 2.0' })).toBeVisible()
})

test('page has the correct document title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('SyloCRM 2.0')
})
