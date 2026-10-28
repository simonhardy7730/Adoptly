# Life Football — simulateur de vie et de carrière d'un footballeur

Application web jouable (React + TypeScript + Vite + Zustand), 100 % locale, sans backend.
Tout est fictif : clubs, marques, personnages, compétitions.

## Lancer le jeu

```bash
cd life-football
npm install
npm run dev        # http://localhost:5173
npm test           # 39 tests (règles de jeu + parcours complets simulés)
npm run build      # build de production dans dist/
```

## Architecture

```
src/
  game/          Systèmes de jeu purs (aucune dépendance à React), testables
    types.ts       Modèle de données sérialisable (GameState)
    rng.ts         Aléatoire déterministe (graine stockée dans la sauvegarde)
    calendar.ts    Semaines / mois / saisons, catégories d'âge
    stats.ts       Note globale par poste, progression, plafonds de potentiel
    create.ts      Création de partie à partir du créateur de joueur
    actions.ts     Actions hebdomadaires (temps libre, énergie, conditions)
    week.ts        Fin de semaine : club, alimentation, sommeil, école, argent…
    career.ts      Détections, offres, championnat, statut, fin de saison
    match.ts       Moteur de match (simulation + moments clés)
    events.ts      Moteur d'événements narratifs réutilisable
    sponsors.ts    Offres, négociation, exclusivité, obligations, paiements
    national.ts    Convocations, matchs internationaux, verrouillage
    eligibility.ts Règles d'éligibilité configurables
    creation.ts    Validation du créateur par étape, cohérence poste / profil
    prologue.ts    Moteur du prologue narratif (scènes dans content/prologue.ts)
    social.ts      Réseau social fictif « Tribune »
    save.ts        Sauvegarde localStorage versionnée + migrations
  content/       Données éditables (pays, profils, marques, aliments, événements, noms)
  minigames/     4 mini-jeux (logique pure dans logic.ts + composants)
  screens/       Écrans ; ui/ composants partagés ; store/ état Zustand
```

Langue : textes en français. Les données de contenu sont isolées dans `content/` pour
pouvoir être dupliquées par langue.

## Créateur et début d'histoire

- 5 étapes (Identité, Apparence, Profil sportif, Origines, Récapitulatif) validées par
  `game/creation.ts` : messages par champ, onglets verrouillés tant qu'une étape précédente
  est incomplète, bouton Suivant qui refuse d'avancer.
- Aperçu en direct : silhouette complète (taille, corpulence, maillot, motif, crampons,
  accessoire) ou portrait, et caractéristiques **identiques** à celles du joueur créé
  (graine partagée, variation aléatoire à somme nulle, bouton « Relancer »).
- Caractéristiques initiales = âge + poste + pied fort + profil + 3 qualités + origines +
  morphologie (détail affiché dans « D'où viennent ces valeurs ? »).
- Prologue en 4 chapitres (famille, quartier, premier souvenir, rêve) : chaque choix modifie
  caractéristiques, relations, argent ou drapeaux, et certains programment des événements
  plus tard (tournoi du quartier, idole en dédicace, promesse à la sœur).
- Guide « Tes premiers pas » : entraînement, match de quartier, visite du club local
  (licence), première détection.
- Sauvegarde v2 : identité, apparence, trace de création (qualités, graine, valeurs
  initiales) et choix du prologue. Les sauvegardes v1 sont migrées automatiquement.

## Ce qui est jouable

- Créateur complet : identité, nationalité choisie explicitement, seconde nationalité
  justifiée (naissance, parent, pays de résidence), apparence (avatar 2D évolutif), poste,
  pied, profil sportif, 3 qualités, 6 milieux familiaux et 3 environnements, récapitulatif.
- Semaines avec créneaux de temps libre ; actions (entraînements, repos, études, amis,
  famille, petits boulots, kiné, cuisine…), routine de sommeil, démarches administratives.
- Courses : magasin, garde-manger, nutrition qui influence récupération et guérison ; crampons.
- Détections : déplacement, préparation, mini-jeux, évaluation (offre / seconde chance / refus).
- 4 mini-jeux : passe, conduite de balle, décision, réflexes de gardien (aussi en entraînement).
- Clubs à 4 niveaux, championnat de 10 équipes, statut titulaire/remplaçant, fin de saison,
  libération possible ; matchs de quartier et de championnat avec moments clés.
- ~40 événements narratifs à conditions (âge, club, famille, image, sponsors…).
- Réputation : sportive, popularité, image supporters, crédibilité marques, médias, abonnés.
- Sponsors : 18 marques fictives, offres, comparateur, négociation, exclusivité et pénalités,
  obligations de publication/présence, primes, renouvellements, revenus commerciaux.
- Sélections jeunes (U15→U21) et A, double nationalité, verrouillage après match officiel A.
- Finances avec historique et comparaison revenus sportifs / commerciaux, impôts simplifiés.
- 3 emplacements de sauvegarde, sauvegarde auto et manuelle.

## Points d'extension pour les prochains systèmes

Aucun de ces systèmes n'a d'écran factice ; chacun a un point d'ancrage dans l'état existant.

| Système | Où le brancher |
| --- | --- |
| Clubs et centres de formation | `game/career.ts` (`Club`, `ClubMembership`, championnat) ; nouveaux niveaux dans `world.ts` |
| Détections et mini-jeux | `minigames/logic.ts` (logique pure) + composant ; épreuves choisies dans `store` (`advance`) |
| Agents et contrats | nouveau `game/agents.ts` ; contrats pros à côté de `ClubOffer` ; revenus via `addMoney(…, 'salary')` |
| Sponsors et équipementiers | `game/sponsors.ts`, marques dans `content/brands.ts` |
| Sélections nationales | `game/national.ts`, règles dans `game/eligibility.ts` |
| Vie sociale et famille | PNJ (`Npc`) dans `world.ts`, actions dans `actions.ts`, événements dans `content/events.ts` |
| Carrière pro et transferts | prolongement de `career.ts` (offres, statut) et `week.ts` (salaires mensuels) |
| Retraite et entraîneur | nouvelle phase dans `GameState` + écran dédié ; le moteur `match.ts` sert de base |

Toute nouvelle donnée persistée = champ dans `types.ts` + migration dans `save.ts`
(incrémenter `SAVE_VERSION`) + test de migration.

## Pas encore développé

Carrière professionnelle (contrats pro, agents, transferts, salaires), vie adulte (logement,
couple, enfants), retraite et carrière d'entraîneur. Le jeu continue après 18 ans mais
sans ces systèmes.
