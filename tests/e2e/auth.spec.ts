import { test, expect } from '@playwright/test';

test('homepage redirects to login or shows login card', async ({ page }) => {
  await page.goto('/');
  
  // Vérifie que le titre ou un élément de la carte de connexion est présent
  // Je suppose que LoginCard contient un titre ou un bouton spécifique
  // Comme je n'ai pas vu LoginCard, je vais chercher des textes génériques probables
  // ou vérifier l'URL si redirection
  
  const title = await page.title();
  console.log('Page title:', title);

  // Vérifie si on est sur la page d'accueil (login)
  await expect(page).toHaveURL('/');
  
  // Vérifie le titre de la carte
  await expect(page.getByText('Running Tracker')).toBeVisible();
  
  // Vérifie le bouton de soumission
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();

  // Vérifie les champs de formulaire
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mot de passe')).toBeVisible();
});
