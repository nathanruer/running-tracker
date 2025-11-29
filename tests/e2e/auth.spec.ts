import { test, expect } from '@playwright/test';

test('homepage redirects to login or shows login card', async ({ page }) => {
  await page.goto('/');
  
  const title = await page.title();
  console.log('Page title:', title);

  await expect(page).toHaveURL('/');
  
  await expect(page.getByText('Running Tracker')).toBeVisible();
  
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();

  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mot de passe')).toBeVisible();
});
