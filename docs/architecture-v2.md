# Running Tracker V2 — Architecture & décisions

> Document de référence de la migration V2. Chaque décision est un ADR compact : contexte → décision → conséquences.
> L'état des lieux complet de la v1 (audit du 29/08/2026, commit `bfeb385`) recense les problèmes que ces décisions adressent.

## Cadre de la migration

- **Migration incrémentale dans ce repo**, sur la branche `v2`. `main` reste l'app v1 fonctionnelle.
- Filet de sécurité : la suite existante (1 941 tests unitaires + 24 e2e Playwright) doit rester verte à chaque étape. Un module réécrit conserve ses tests ou les remplace explicitement dans le même commit.
- Les zones sans couverture (routes sessions CRUD/bulk, chemins d'écriture domaine) reçoivent des tests de caractérisation **avant** refonte.
- **Base de données : aucune modification de schéma sans dossier de migration validé par Nathan** (structure actuelle/cible, stratégie, préservation des données, rollback). Le code s'adapte au schéma existant tant qu'un dossier n'est pas validé.

## ADR-1 — Rendu : Server Components pour les lectures

**Contexte.** v1 est 100 % client-rendered : toutes les données passent par React Query + un cache persisté localStorage (7 j), avec skeletons miroir maintenus à la main et un cache « offline » qui sert surtout à masquer l'absence de SSR.

**Décision.** Les lectures (dashboard, profil, listes, détail) deviennent des Server Components avec streaming/Suspense. React Query reste pour l'interactif (infinite scroll, refetch après mutation), en mémoire uniquement : le persister localStorage est supprimé.

**Conséquences.** Premier rendu avec données réelles, suppression des skeletons dupliqués et du double arbre de providers. Perte de la consultation hors-ligne (assumé : jamais un objectif produit).

## ADR-2 — Mutations : `useMutation` + invalidation, fin de la chirurgie de cache

**Contexte.** v1 n'a aucun `useMutation` : handlers async + réécriture manuelle du cache (upsert trié dans chaque query), ce qui impose un miroir client exact du filtrage/tri serveur (~200 lignes dupliquées, dashboard + chat) — puis invalide quand même.

**Décision.** Toutes les écritures passent par `useMutation` + `invalidateQueries`. Le miroir client filtrage/tri est supprimé. Optimistic update uniquement là où l'UX le justifie (suppression d'une ligne), via le pattern standard rollback-on-error.

**Conséquences.** ~400 lignes supprimées, un seul endroit qui connaît la sémantique des filtres (le serveur). Un refetch par mutation (acceptable, pages de 10-30 éléments).

## ADR-3 — Backend d'écriture : transactions + idempotence, fin de la renumérotation globale

**Contexte.** Créer une séance = jusqu'à 7 writes Prisma séquentiels sans transaction ; chaque write déclenche `recalculateSessionNumbers` (recharge tout l'historique, O(n²), update par ligne). La dédup d'import n'existe que sur le chemin bulk.

**Décision.**
- Toute écriture multi-entités est enveloppée dans `prisma.$transaction`.
- La renumérotation systématique disparaît : `sessionNumber`/`week` deviennent des valeurs dérivées à la lecture (calcul en mémoire sur la page renvoyée) — sans changement de schéma ; les colonnes existantes restent lues comme fallback historique tant que le dossier DB n'est pas tranché.
- La dédup par `externalId` s'applique à tous les chemins d'import (bulk, unitaire, complétion).

**Conséquences.** Plus d'états partiels en base, coût d'écriture constant. Le tri par numéro de séance reste stable car dérivé de la date.

## ADR-4 — Enrichissement asynchrone via `after()` + statut en DB

**Contexte.** v1 enrichit (streams Strava + météo) dans la requête HTTP d'import : réponses de plusieurs minutes, timeout client monté à 10 min, dossier `api/jobs/` vide (tentative abandonnée).

**Décision.** L'import répond immédiatement après les writes. L'enrichissement s'exécute en arrière-plan via `after()` (Next 15+, stable en 16) — pas de queue externe (sur-ingénierie pour une app perso, et `after()` fonctionne en self-host comme sur Vercel). Le statut d'enrichissement est visible côté client (champ `sourceStatus` existant + refetch).

**Conséquences.** Import de 100 activités : réponse en secondes, enrichissement au fil de l'eau. Un crash du process peut laisser un enrichissement non fait → l'action « enrichir » manuelle existante reste le rattrapage.

## ADR-5 — Intégrations : timeouts, budget de rate-limit, `state` OAuth

**Décision.** Tous les appels Strava reçoivent un timeout (10 s) et une gestion 429 (lecture des headers `X-RateLimit-*`, backoff, erreur typée `STRAVA_RATE_LIMITED` enfin atteignable). Le flux OAuth porte un paramètre `state` signé et vérifié. La déconnexion appelle `/oauth/deauthorize`. L'échange de token vit à un seul endroit (`services/strava/client.ts`).

## ADR-6 — Coach IA : agent à outils sur Vercel AI SDK, Groq par défaut

**Contexte.** v1 : pipeline figé — classification d'intention par un LLM séparé (modèle décommissionné → chat mort), contexte pré-assemblé selon l'intention, JSON non streamé pour les recommandations, « résumé » d'historique par troncature à 100 caractères, protocole SSE maison qui perd des événements, modèles hard-codés mono-provider.

**Décision.**
- Couche LLM : **Vercel AI SDK** (`ai` + `@ai-sdk/groq`) — streaming robuste, tool-calling typé (zod), provider interchangeable par config. Groq reste le provider par défaut (`openai/gpt-oss-120b`), le modèle vient de l'env.
- Architecture : **un agent unique avec outils** (`get_sessions`, `get_plan`, `get_profile`, `get_stats`, `propose_sessions`) remplace classification + fetch conditionnel + embranchement JSON/texte. Les recommandations sont émises par tool-call `propose_sessions` (validé zod, réparé par le validateur v1 conservé) → tout est streamé, cartes comprises.
- Le prompt métier v1 (règle 80/20, progression, séquencement, distribution qualité) est conservé et transposé en instructions système.
- Mémoire : résumé de conversation généré par LLM et persisté (`conversation_message_payloads`, `payloadType: 'summary'`) + N derniers messages — remplace la troncature.
- Le payload `recommendations` v1 reste le format de persistance des cartes (compatibilité de l'historique).

**Conséquences.** Suppression d'un aller-retour LLM par message, plus de parsing JSON fragile, feedback streamé pour la réponse la plus longue, panne d'un modèle = changement de config et non de code.

## ADR-7 — API : conventions unifiées

**Décision.** Toutes les routes : enveloppe `{ data }` / `{ error: { code, message } }`, statuts cohérents (201 création, 400 validation, 409 conflit), zod sur chaque body/query, messages utilisateur en français + détail technique uniquement en log (pino), caps sur les tableaux bulk (100), `runtime = 'nodejs'` explicite. Les erreurs internes ne traversent plus (`handleApiError` ne renvoie plus `error.message` brut).

## ADR-8 — Auth : durcie mais mono-utilisateur

**Contexte produit.** L'app reste personnelle. Pas de vérification email ni reset de mot de passe (aucun provider email ; non-objectif tant que l'app n'est pas ouverte).

**Décision.** JWT conservé (simplicité), durci : algorithme épinglé (`HS256`) à la vérification, secret validé au boot (`server/infrastructure/env.ts` enfin branché), expiration 7 j conservée, code `AUTH_SESSION_EXPIRED` réellement émis (le flux de reconnexion v1 devient atteignable), rate-limit en mémoire sur login/register, min mot de passe unifié à 8.

## ADR-9 — UI : design system consolidé, pas de re-plateforme

**Décision.** Tailwind 3 + shadcn/Radix conservés. Consolidation plutôt que remplacement : tokens (couleurs sémantiques, espacements) dans `globals.css`/config, un seul système de toasts (shadcn ; Sonner retiré), composants data-table partagés (header/toolbar/rows génériques au lieu des paires dashboard/import parallèles), états d'erreur systématiques (liste, chat, analytics), dark par défaut conservé. Les god components sont décomposés au fil des écrans touchés — pas de big-bang UI.

## ADR-10 — Qualité : CI en place, pre-push léger

**Décision.** GitHub Actions : typecheck + lint + tests unitaires sur push ; e2e sur PR vers main. Pre-push husky réduit à typecheck + lint (les 3 navigateurs e2e + build sortent du chemin local). `.env.example` versionné. Dépendances mortes purgées (20 packages + 2 overrides périmés).

## Séquencement des chantiers

| Phase | Contenu | Dépend de |
|---|---|---|
| **0 — Assainissement** | Chat réparé, `state` OAuth, parser SSE bufferisé, purge deps/code mort, dynamic imports, états d'erreur, CI, env branché | — |
| **1 — Backend écriture** | Transactions, dédup unifiée, fin renumérotation, zod partout, conventions API | 0 |
| **2 — Enrichissement async** | `after()` + statut, timeouts/429 Strava | 1 |
| **3 — Modèle de lecture** | Vues allégées (fin du payload dans la vue table), pagination indexable, agrégats analytics serveur | 1 |
| **4 — Frontend data layer** | RSC lectures, `useMutation`, URL router, suppression du miroir filtre/tri et du persister | 3 |
| **5 — Agent IA** | AI SDK, outils, mémoire, streaming universel | 3 |
| **6 — UI/UX** | Décomposition god components, design tokens, data-table générique, vue « plan de la semaine » | 4 |

Les évolutions nécessitant la DB (objectif de course structuré, flags matérialisés, colonnes mortes, fusion des chunks streams) sont regroupées dans un dossier de migration séparé, présenté avant toute exécution.
