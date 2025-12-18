import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Tableau de bord - Parcours Complexes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('Création, expansion et finalisation d\'un fractionné complexe', async ({ page }) => {
    await page.getByRole('button', { name: /Ajouter une séance/i }).click();
    
    await page.getByLabel(/Type de séance/i).selectOption('Fractionné');
    
    await page.getByText(/Mode détaillé/i).click();

    await page.fill('[name="steps.0.duration"]', '10:00');
    await page.fill('[name="steps.0.pace"]', '06:00');
    
    const fractionneRow = page.locator('tr').filter({ hasText: 'Fractionné' }).first();
    await fractionneRow.click();
    
    await expect(page.locator('text=Détail des intervalles')).toBeVisible();
    await expect(page.locator('text=Moy. Prévue')).toBeVisible();

    await page.getByRole('tab', { name: 'Effort' }).click();
  });

  test('Import de fichiers et gestion des erreurs', async ({ page }) => {
    await page.getByRole('button', { name: /Ajouter une séance/i }).click();

    const corruptedCsvPath = path.join(__dirname, 'corrupted.csv');
    fs.writeFileSync(corruptedCsvPath, 'invalid,data\ncorrupted,row');
    
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText(/Fichier CSV\/JSON/i).click(),
    ]);
    await fileChooser.setFiles(corruptedCsvPath);

    await expect(page.locator('text=Erreur')).toBeVisible();
    
    fs.unlinkSync(corruptedCsvPath);
  });

  test('Calendrier - Vue élargie et détails', async ({ page }) => {
    await page.goto('/profile'); // Ou là où se trouve le calendrier
    
    const calendarSession = page.locator('.bg-violet-500\\/15').first();
    await calendarSession.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toHaveClass(/max-w-5xl/);
    
    await expect(page.locator('text=Détail des intervalles')).toBeVisible();
  });
});
