# Life Football — simulateur de vie et de carrière d'un footballeur

Application web jouable (React + TypeScript + Vite + Zustand), 100 % locale, sans backend.
Tout est fictif : clubs, marques, personnages, compétitions.

## Lancer le jeu

```bash
cd life-football
npm install
npm run dev        # http://localhost:5173
npm test           # 28 tests (règles de jeu + parcours complets simulés)
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
    social.ts      Réseau social fictif « Tribune »
    save.ts        Sauvegarde localStorage versionnée + migrations
  content/       Données éditables (pays, profils, marques, aliments, événements, noms)
  minigames/     4 mini-jeux (logique pure dans logic.ts + composants)
  screens/       Écrans ; ui/ composants partagés ; store/ état Zustand
```

Langue : textes en français. Les données de contenu sont isolées dans `content/` pour
pouvoir être dupliquées par langue.

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

## Pas encore développé

Carrière professionnelle (contrats pro, agents, transferts, salaires), vie adulte (logement,
couple, enfants), retraite et carrière d'entraîneur. Le jeu continue après 18 ans mais
sans ces systèmes.
