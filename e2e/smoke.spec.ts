import { test, expect } from '@playwright/test';

test('shop home loads catalog shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /aura fresh/i })).toBeVisible();
  await expect(page.getByText(/grocery|catalog|shop/i).first()).toBeVisible();
});

test('cart drawer opens from navbar', async ({ page }) => {
  await page.goto('/');
  const cartButton = page.getByRole('button', { name: /cart|bag/i }).first();
  await cartButton.click();
  await expect(page.getByText(/your grocery bag|secured checkout/i)).toBeVisible();
});
