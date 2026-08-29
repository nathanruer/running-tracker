# Dossier de migration DB — propositions V2

> Statut : **en attente de validation**. Aucune de ces migrations ne sera exécutée sans ton accord explicite, proposition par proposition. Toutes les données existantes sont préservées dans chaque scénario. Les propositions sont indépendantes les unes des autres et classées de la moins risquée à la plus risquée.

## Proposition A — Flags matérialisés sur `external_activities` (additive, risque nul)

1. **Problème** : la vue « table » du dashboard charge `external_payloads.payload` (JSON Strava de plusieurs Ko) pour chaque ligne, uniquement pour dériver deux booléens (`hasStravaRoute`, `likelyStreamless`). Chaque page de 10 lignes transporte des dizaines de Ko inutiles depuis Postgres.
2. **Pourquoi migrer** : ces booléens sont connus au moment de l'import et ne changent jamais ; les calculer à chaque lecture est le principal sur-coût de la liste.
3. **Structure actuelle** : `external_activities (id, workoutId, userId, source, externalId, sourceStatus, startedAt, elapsedSeconds, movingSeconds, …)` + `external_payloads.payload Json`.
4. **Structure cible** : ajout de deux colonnes nullable `external_activities.hasRoute Boolean?` et `external_activities.likelyStreamless Boolean?`.
5. **Stratégie** : `prisma migrate dev` (ADD COLUMN nullable, instantané) → script de backfill qui lit chaque payload une fois et remplit les colonnes → le code d'écriture les renseigne à l'import ; la lecture les utilise avec fallback sur le payload si NULL.
6. **Préservation des données** : purement additif, aucune donnée modifiée ni supprimée.
7. **Risques** : divergence flag/payload si un backfill partiel — mitigé par le fallback de lecture.
8. **Rollback** : DROP des deux colonnes, le code de fallback continue de fonctionner.

## Proposition B — Table `race_goals` : objectif de course structuré (additive, risque nul)

1. **Problème** : l'« objectif » est un champ texte libre (`user_profiles.goal`). Le coach IA ne peut ni périodiser (pas de date), ni calibrer les allures (pas de distance/chrono cible), ni suivre plusieurs objectifs.
2. **Pourquoi migrer** : c'est la donnée qui manque le plus au coach V2 (ADR-6) ; sans elle, « préparer mon 10 km du 15 octobre en 42 min » reste hors de portée.
3. **Structure actuelle** : `user_profiles.goal String? @db.Text`.
4. **Structure cible** : nouvelle table `race_goals (id, userId FK cascade, name, raceDate DateTime, distanceKm Float, targetTimeSeconds Int?, priority String? , status String @default("active"), notes String?, createdAt, updatedAt)` + index `[userId, raceDate]`. Le champ `user_profiles.goal` **reste en place** (contexte libre complémentaire).
5. **Stratégie** : CREATE TABLE via migration Prisma ; UI dans Profil · Compte ; le contexte IA lit les deux sources.
6. **Préservation** : rien d'existant n'est touché.
7. **Risques** : aucun côté données.
8. **Rollback** : DROP TABLE.

## Proposition C — Fusion des chunks de streams (transformation, risque faible et mesurable)

1. **Problème** : `workout_streams` + `workout_stream_chunks` implémentent un chunking qui n'a jamais servi : chaque stream a exactement 1 chunk (`chunkIndex: 0`) contenant tout le JSON. Résultat : 2 tables, 2 inserts par type de stream, un delete-recreate non transactionnel à chaque mise à jour, et des lecteurs qui supposent `chunks[0]` partout.
2. **Pourquoi migrer** : simplifier le modèle avant le chantier « modèle de lecture » (phase 3) ; chaque écriture/lecture de streams devient une seule ligne.
3. **Structure actuelle** : `workout_streams (id, workoutId, streamType, resolution, seriesType, originalSize)` → `workout_stream_chunks (id, workoutStreamId, chunkIndex, data Json)`.
4. **Structure cible** : `workout_streams` gagne une colonne `data Json?` ; la table `workout_stream_chunks` disparaît.
5. **Stratégie** : (1) migration additive : ADD COLUMN `data` ; (2) backfill SQL : `UPDATE workout_streams ws SET data = c.data FROM workout_stream_chunks c WHERE c."workoutStreamId" = ws.id AND c."chunkIndex" = 0` ; (3) vérification : `COUNT(*) WHERE data IS NULL` doit être 0 pour les streams ayant un chunk ; (4) bascule du code lecture/écriture sur `data` ; (5) **seulement après validation en usage réel**, migration destructive : DROP TABLE `workout_stream_chunks`.
6. **Préservation** : la copie précède la bascule ; la table source n'est supprimée qu'en étape 5, séparée et différable indéfiniment.
7. **Risques** : un stream à plusieurs chunks qui existerait contre toute attente (le backfill le détecterait : `SELECT workoutStreamId FROM workout_stream_chunks WHERE chunkIndex > 0`) ; taille de ligne accrue sur `workout_streams` (sans conséquence pratique, JSONB était déjà dans chunks).
8. **Rollback** : avant l'étape 5, trivial (le code peut re-basculer sur chunks, données intactes). Après l'étape 5 : restauration depuis la colonne `data` (l'information est identique) — script inverse fourni avant exécution.

## Proposition D — Suppression des colonnes jamais écrites (destructive, portée quasi nulle)

1. **Problème** : `external_accounts.scopes`, `weather_observations.source`, `external_payloads.payloadVersion` ne sont écrites par aucun code (audit vérifié) — elles sont NULL sur toutes les lignes.
2. **Pourquoi** : bruit de schéma ; chaque lecteur du schéma se demande à quoi elles servent.
3. **Structure actuelle / cible** : mêmes tables, sans ces 3 colonnes.
4. **Stratégie** : vérification préalable en base (`SELECT COUNT(*) WHERE col IS NOT NULL` = 0 pour chacune) → DROP COLUMN via migration Prisma.
5. **Préservation** : la vérification garantit qu'on ne supprime que du NULL.
6. **Risques** : aucun si la vérification passe ; si une valeur non-NULL apparaît, la colonne est conservée.
7. **Rollback** : re-ADD COLUMN nullable (les valeurs étaient toutes NULL, rien à restaurer).
8. **Alternative** : ne rien faire (coût de conservation quasi nul) — acceptable si tu préfères zéro migration destructive.

## Non retenu (délibérément) — normalisation des allures/durées en numérique

Les allures (`"MM:SS"`) et durées stockées en chaînes sont un héritage inélégant, mais les convertir en secondes numériques exigerait de réécrire mappers, tri SQL, validation, formulaires et IA d'un coup, avec une migration de données sur les tables les plus grosses — le rapport risque/bénéfice est mauvais tant que le tri fonctionne. La V2 encapsule ces formats derrière les mappers existants ; une normalisation restera possible plus tard, isolée derrière cette frontière.

---

**Pour valider** : réponds par exemple « A+B oui, C oui sans l'étape 5 pour l'instant, D non » — j'exécute exactement ce qui est validé, avec les vérifications listées, et rien d'autre. A et B débloquent respectivement la phase 3 (modèle de lecture) et l'agent IA ; C peut attendre ; D est cosmétique.
