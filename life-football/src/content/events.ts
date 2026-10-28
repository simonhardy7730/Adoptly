// Catalogue des événements narratifs (français). Chaque choix a des conséquences sur plusieurs systèmes.

import type { GameEvent } from '../game/events';
import { ageAt, isLeagueWeek, isHolidays, isSchoolPeriod } from '../game/calendar';
import { addMoney, applyRep, changeRelation, journal, notify, npcByRole } from '../game/helpers';
import { clubById, createClubOffer, currentClub, inviteTryout, leaveClub, pickScoutingClub, TIER_LABELS } from '../game/career';
import { chance, clamp, nextFloat, uid } from '../game/rng';
import { createCallup } from '../game/national';
import { country } from './countries';
import { activeContracts } from '../game/sponsors';
import { brand } from './brands';
import { npcPortrait, personName } from '../game/world';
import { applyTraining, playerOverall } from '../game/stats';

const friendName = (s: Parameters<GameEvent['text']>[0]) => npcByRole(s, 'friend')?.name.split(' ')[0] ?? 'ton ami';
const coachName = (s: Parameters<GameEvent['text']>[0]) => npcByRole(s, 'coach')?.name ?? 'ton entraîneur';
const inClub = (s: Parameters<GameEvent['text']>[0]) => !!s.membership;

export const EVENTS: GameEvent[] = [
  // ——————————————————————————————————————— Lancement de l'histoire
  {
    id: 'intro_street', title: 'Le défi du city-stade', icon: '🏟️', category: 'enfance', npc: 'friend',
    text: (s) => `Mercredi après-midi. Au city-stade, les grands du quartier refusent de te faire jouer : « T’es trop petit. » ${friendName(s)} te regarde. Un des grands te lance : « Si tu passes Karim, tu joues. »`,
    choices: [
      { id: 'dribble', label: 'Relever le défi et dribbler Karim', hint: 'Audace : dribble et mental', effects: { attrs: { dribbling: 1.2, mental: 0.8 }, morale: 6, rep: { sport: 1 } }, result: 'Petit pont ! Les grands éclatent de rire… et t’intègrent à l’équipe.' },
      { id: 'team', label: 'Proposer de jouer gardien pour commencer', hint: 'Humilité : réflexes, intégration', effects: { attrs: { reflexes: 1.5, tactics: 0.5 }, rel: { friend: 5 } }, result: 'Tu enchaînes les arrêts. On te garde pour la prochaine fois.' },
      { id: 'home', label: 'Rentrer faire tes devoirs', hint: 'Sage : notes, parents', effects: { school: 0.8, rel: { parent2: 4 }, morale: -3 }, result: 'Tes parents sont contents. Le ballon attendra… un peu.' },
    ],
  },
  {
    id: 'first_tryout_spotted', title: 'Quelqu’un t’a remarqué', icon: '👀', category: 'carrière',
    text: (s) => `Un éducateur d’un club du coin t’a vu jouer au quartier. Il parle à ${npcByRole(s, 'parent')?.name.split(' ')[0] ?? 'ton père'} à la sortie de l’école : « Il a quelque chose, ce petit. On organise une journée de détection bientôt. »`,
    when: (s) => !s.membership,
    choices: [
      {
        id: 'yes', label: 'Foncer : « Je veux y aller ! »', hint: 'Une détection sera programmée', result: 'Ton cœur bat à cent à l’heure.',
        run: (s) => {
          const club = pickScoutingClub(s, 2) ?? s.clubs.find((c) => c.tier === 1)!;
          inviteTryout(s, club.id, 2);
          return `Invitation de ${club.name} (${TIER_LABELS[club.tier]}). Réponds-y dans l’onglet Club.`;
        },
      },
      {
        id: 'later', label: 'Attendre d’être plus fort', hint: 'Pas de détection maintenant, motivation en hausse', effects: { attrs: { discipline: 0.6 }, morale: 2, schedule: { eventId: 'first_tryout_spotted', inWeeks: 8 } },
        result: 'Tu préfères t’entraîner encore. L’éducateur reviendra sûrement.',
      },
    ],
  },
  {
    id: 'first_tryout_network', title: 'Le carnet d’adresses de papa', icon: '📞', category: 'famille', npc: 'parent',
    text: () => 'Ton père a gardé contact avec ses anciens coéquipiers. L’un d’eux dirige la formation d’un club réputé de la région. « Je peux l’appeler, si tu veux. Mais là-bas, personne ne te fera de cadeau. »',
    when: (s) => !s.membership,
    choices: [
      {
        id: 'accept', label: 'Accepter son aide', hint: 'Détection dans un club plus ambitieux · pression accrue', effects: { rel: { parent: 5 }, flags: { dadPressure: 1 } }, result: 'Il raccroche, sourire en coin : « C’est fait. »',
        run: (s) => {
          const club = s.clubs.find((c) => c.tier === (ageAt(s) >= 11 ? 3 : 2))!;
          inviteTryout(s, club.id, 2);
          return `Invitation de ${club.name} (${TIER_LABELS[club.tier]}).`;
        },
      },
      { id: 'alone', label: '« Je veux y arriver seul. »', hint: 'Fierté : mental, discipline · détection plus tard', effects: { attrs: { mental: 1, discipline: 0.8 }, rel: { parent: -2 }, schedule: { eventId: 'first_tryout_spotted', inWeeks: 4 } }, result: 'Il est un peu vexé… mais au fond, il est fier.' },
    ],
  },
  {
    id: 'after_rejection', title: 'Le goût de l’échec', icon: '🌧️', category: 'carrière', npc: 'parent2',
    text: (_s, d) => `Le refus de ${d.club} te reste en travers de la gorge. Le soir, tu n’as pas faim. Ta mère s’assoit à côté de toi.`,
    choices: [
      { id: 'work', label: 'Transformer la colère en travail', hint: 'Discipline et mental en hausse', effects: { attrs: { discipline: 1.2, mental: 1.2 }, morale: 4, flags: { motivated: 1 } }, result: 'Tu affiches le mail de refus au-dessus de ton lit. Une promesse.' },
      { id: 'talk', label: 'En parler avec elle', hint: 'Famille et moral', effects: { rel: { parent2: 6 }, morale: 10 }, result: '« Les plus grands ont tous été refusés un jour. » Ça fait du bien.' },
      {
        id: 'local', label: 'Rejoindre un petit club pour jouer', hint: 'Proposition immédiate d’un club local', result: 'Tu veux jouer, tout simplement.',
        unavailable: (s) => (s.membership ? 'Tu as déjà un club' : null),
        run: (s) => {
          const club = s.clubs.find((c) => c.tier === 1)!;
          createClubOffer(s, club, 6);
          return `${club.name} te fait une proposition (onglet Club).`;
        },
      },
    ],
  },

  // ——————————————————————————————————————— École et famille
  {
    id: 'school_test', title: 'Contrôle demain', icon: '📝', category: 'école', random: true, maxAge: 17, cooldown: 10,
    when: (s) => isSchoolPeriod(s.t, s.startYear),
    text: (s) => `Gros contrôle de maths demain. ${friendName(s)} t’envoie un message : « Match au city ce soir, on a besoin de toi ! »`,
    choices: [
      { id: 'study', label: 'Réviser sérieusement', effects: { school: 1.2, morale: -3, rel: { friend: -3, parent2: 2 } }, result: 'Tu connais ton cours par cœur.' },
      { id: 'play', label: 'Aller jouer', effects: { attrs: { dribbling: 0.6, technique: 0.4 }, school: -1.2, morale: 5, rel: { friend: 4 } }, result: 'Doublé au city… mais la copie du lendemain fait peine à voir.' },
      { id: 'both', label: 'Une heure de révision, une heure de foot', effects: { school: 0.5, energy: -10, attrs: { technique: 0.3 } }, result: 'Un compromis épuisant mais efficace.' },
    ],
  },
  {
    id: 'bad_report', title: 'Bulletin catastrophique', icon: '📉', category: 'école', npc: 'parent2', random: true, maxAge: 17, cooldown: 16, weight: 3,
    when: (s) => s.player.school.grade < 9.5 && isSchoolPeriod(s.t, s.startYear),
    text: (s) => `Moyenne : ${s.player.school.grade.toFixed(1)}/20. ${s.identity.background === 'stable_studies' ? 'Chez toi, c’est un drame.' : 'Tes parents sont inquiets.'} « Si ça continue, c’est fini le foot. »`,
    choices: [
      { id: 'promise', label: 'Promettre de remonter la pente', hint: 'Un objectif de notes est fixé', effects: { school: 1, rel: { parent: 2, parent2: 3 }, flags: { gradePromise: 1 } }, result: 'Tu affiches un planning de révisions sur le frigo.' },
      { id: 'argue', label: '« Le foot, c’est mon avenir ! »', effects: { rel: { parent: -6, parent2: -8 }, morale: -4, attrs: { mental: 0.5 } }, result: 'La discussion tourne au clash. Ambiance glaciale à la maison.' },
      { id: 'pause', label: 'Accepter une semaine sans foot', hint: 'Énergie récupérée, notes en hausse, forme en baisse', effects: { school: 1.8, energy: 25, form: -6, rel: { parent2: 6 } }, result: 'Une semaine studieuse. Le ballon te manque terriblement.' },
    ],
  },
  {
    id: 'worn_boots', title: 'Des crampons à bout de souffle', icon: '👟', category: 'enfance', random: true, cooldown: 20,
    when: (s) => s.player.boots.wear > 75 && !s.player.boots.sponsored,
    text: () => 'Tes crampons prennent l’eau et la semelle se décolle. Un joueur adverse ricane : « T’as trouvé ça dans une poubelle ? »',
    choices: [
      { id: 'ignore', label: 'Ignorer et répondre sur le terrain', effects: { attrs: { mental: 0.8 }, morale: -2 }, result: 'Tu marques le but suivant. Il ne rit plus.' },
      {
        id: 'ask', label: 'Demander de nouveaux crampons à tes parents', hint: 'Possible si la relation est bonne',
        unavailable: (s) => ((npcByRole(s, 'parent')?.relation ?? 0) < 55 ? 'Relation trop tendue pour demander' : null),
        result: 'Après une longue discussion…',
        run: (s) => {
          s.player.boots = { name: 'Crampons d’entrée de gamme', brandId: null, quality: 1, wear: 0, sponsored: false };
          changeRelation(s, 'parent', -2);
          return 'Tes parents t’offrent une paire neuve. Tu sais ce que ça leur coûte.';
        },
      },
      { id: 'shop', label: 'Économiser pour en acheter (Magasin)', hint: 'Rendez-vous dans l’onglet Vie quotidienne', effects: { attrs: { discipline: 0.4 } }, result: 'Tu fais tes comptes : chaque euro compte.' },
    ],
  },
  {
    id: 'sibling_sick', title: 'Ta sœur est malade', icon: '🤒', category: 'famille', npc: 'sibling', random: true, cooldown: 14,
    when: (s) => !!npcByRole(s, 'sibling') && (s.identity.background === 'responsibilities' || chance(s, 0.3)),
    weight: (s) => (s.identity.background === 'responsibilities' ? 3 : 1),
    text: () => 'Ta petite sœur a de la fièvre et ta mère finit tard ce soir. Il y a entraînement dans une heure.',
    choices: [
      { id: 'stay', label: 'Rester t’occuper d’elle', effects: { rel: { sibling: 8, parent2: 6, coach: -2 }, attrs: { discipline: 0.5 }, form: -2 }, result: 'Elle s’endort contre toi devant un dessin animé. Tu as bien fait.' },
      { id: 'train', label: 'Aller à l’entraînement', effects: { rel: { parent2: -6, sibling: -4, coach: 2 }, attrs: { technique: 0.5 }, morale: -4 }, result: 'Tu as la tête ailleurs pendant toute la séance.' },
      { id: 'neighbour', label: 'Demander à la voisine de la garder', hint: 'Coûte 10 €', unavailable: (s) => (s.money < 10 ? 'Pas assez d’argent' : null), effects: { money: -10, moneyCat: 'family', moneyLabel: 'Garde de ta sœur', rel: { parent2: 2 } }, result: 'Solution pratique : tu peux t’entraîner l’esprit tranquille.' },
    ],
  },
  {
    id: 'dad_compare', title: '« À ton âge, moi… »', icon: '🗣️', category: 'famille', npc: 'parent', random: true, cooldown: 12,
    when: (s) => s.identity.background === 'ex_pro_parent' || (s.events.flags.dadPressure ?? 0) > 0,
    text: () => 'Après ton match, ton père refait toutes tes actions dans la voiture. « À ton âge, j’aurais mis ce ballon au fond. Tu dois être plus tueur. »',
    choices: [
      { id: 'listen', label: 'Écouter ses conseils', effects: { attrs: { tactics: 0.8 }, morale: -4, rel: { parent: 3 } }, result: 'Il a raison sur certains points. Ça pique quand même.' },
      { id: 'answer', label: '« Je ne suis pas toi. »', effects: { rel: { parent: -6 }, morale: 4, attrs: { mental: 0.8 } }, result: 'Silence jusqu’à la maison. Mais tu t’es affirmé.' },
      { id: 'ask', label: 'Lui demander de t’entraîner le dimanche', effects: { attrs: { shooting: 0.8, tactics: 0.5 }, rel: { parent: 6 }, energy: -8 }, result: 'Le dimanche devient votre rendez-vous. Il redevient ton premier coach.' },
    ],
  },
  {
    id: 'family_money', title: 'Fin de mois difficile', icon: '💸', category: 'famille', npc: 'parent2', random: true, cooldown: 20,
    when: (s) => ['modest_football', 'responsibilities'].includes(s.identity.background) || (s.events.flags.familySupport ?? 0) > 0,
    text: () => 'Tu entends tes parents parler à voix basse dans la cuisine. La facture d’électricité est plus élevée que prévu.',
    choices: [
      { id: 'give', label: 'Donner tes économies (jusqu’à 30 €)', hint: 'Famille +, argent −', unavailable: (s) => (s.money < 5 ? 'Tu n’as presque rien' : null), result: 'Ta mère refuse d’abord, puis te serre fort dans ses bras.', run: (s) => {
        const amount = Math.min(30, Math.floor(s.money));
        addMoney(s, -amount, 'family', 'Aide à la famille');
        changeRelation(s, 'parent', 8);
        changeRelation(s, 'parent2', 10);
        s.player.morale = clamp(s.player.morale + 4);
        return `(−${amount} €)`;
      } },
      { id: 'work', label: 'Proposer d’aider plus à la maison', effects: { rel: { parent2: 5 }, energy: -10, attrs: { discipline: 0.6 } }, result: 'Tu prends en charge les courses et le ménage cette semaine.' },
      { id: 'nothing', label: 'Faire comme si tu n’avais rien entendu', effects: { morale: -3 }, result: 'Tu montes dans ta chambre. Ça te travaille quand même.' },
    ],
  },
  {
    id: 'nomad_move', title: 'On déménage… encore', icon: '📦', category: 'famille', random: true, cooldown: 60, maxAge: 15,
    when: (s) => s.identity.background === 'nomad' && s.t > 20,
    text: (s) => `Ton père a une mutation. Nouvelle ville dans un mois. ${s.membership ? 'Tu devras peut-être quitter ton club.' : 'Encore une fois, il faudra tout recommencer.'}`,
    choices: [
      { id: 'adapt', label: 'Voir le bon côté : un nouveau départ', effects: { attrs: { mental: 1.5 }, morale: -4, rel: { friend: -20 } }, result: 'Tu fais tes cartons. Tu sais faire, maintenant.', run: (s) => {
        const club = currentClub(s);
        if (club && club.tier <= 2) {
          leaveClub(s, 'déménagement familial');
          const next = s.clubs.find((c) => c.tier === club.tier && c.id !== club.id);
          if (next) createClubOffer(s, next, 4);
          return next ? `Le club de ta nouvelle ville, ${next.name}, te propose de signer.` : '';
        }
        return club ? 'Ton centre de formation, lui, ne bouge pas : tu restes à l’internat.' : '';
      } },
      { id: 'protest', label: 'Supplier de rester', effects: { rel: { parent: -8 }, morale: -8 }, result: 'Rien n’y fait. La décision est prise.', run: (s) => {
        changeRelation(s, 'friend', -10);
        const club = currentClub(s);
        if (club && club.tier <= 2) leaveClub(s, 'déménagement familial');
        return '';
      } },
    ],
  },
  {
    id: 'summer_camp', title: 'Stage d’été', icon: '☀️', category: 'enfance', random: true, cooldown: 40, maxAge: 16,
    when: (s) => isHolidays(s.t, s.startYear),
    text: (s) => `Un stage de football d’une semaine est organisé à la montagne. Prix : ${s.identity.background === 'wealthy' ? '220 € (tes parents ont déjà réservé)' : '120 €'}.`,
    choices: (s) => s.identity.background === 'wealthy'
      ? [
          { id: 'go', label: 'Y aller', effects: { energy: -15, morale: 6, rel: { parent: 3 } }, result: 'Une semaine intense avec d’anciens pros.', run: (st) => { applyTraining(st, 'technique', 2); applyTraining(st, 'tactical', 1.5); return 'Tu progresses nettement.'; } },
          { id: 'refuse', label: 'Refuser, tu veux passer l’été avec tes amis', effects: { rel: { parent: -8, parent2: -4, friend: 8 }, morale: 8 }, result: 'Tes parents ont perdu l’acompte. Ils ne sont pas ravis.' },
        ]
      : [
          { id: 'pay', label: 'Payer le stage (120 €)', unavailable: (st) => (st.money < 120 ? 'Pas assez d’argent' : null), effects: { money: -120, moneyCat: 'leisure', moneyLabel: 'Stage d’été', energy: -15, morale: 6 }, result: 'Une semaine de foot du matin au soir !', run: (st) => { applyTraining(st, 'technique', 2); applyTraining(st, 'physical', 1.2); return 'Tu progresses nettement.'; } },
          { id: 'ask', label: 'Demander aux parents', unavailable: (st) => ((npcByRole(st, 'parent')?.relation ?? 0) < 65 ? 'Ils ne peuvent/veulent pas cette fois' : null), effects: { rel: { parent: -3 }, energy: -15 }, result: 'Ils se serrent la ceinture pour toi.', run: (st) => { applyTraining(st, 'technique', 2); return 'Tu leur promets de tout donner.'; } },
          { id: 'no', label: 'Laisser tomber', effects: { morale: -2, energy: 15 }, result: 'Tu te reposes et tu joues au city tout l’été.' },
        ],
  },
  {
    id: 'birthday', title: 'Joyeux anniversaire !', icon: '🎂', category: 'famille',
    text: (s) => `Tu as ${ageAt(s)} ans aujourd’hui. Toute la famille est réunie autour d’un gâteau.`,
    choices: (s) => [
      { id: 'family', label: 'Profiter de la fête en famille', effects: { morale: 10, rel: { parent: 4, parent2: 4, sibling: 4 }, money: s.identity.background === 'wealthy' ? 80 : s.identity.background === 'modest_football' || s.identity.background === 'responsibilities' ? 15 : 35, moneyCat: 'gift', moneyLabel: 'Cadeaux d’anniversaire' }, result: 'Une belle journée. Une année de plus pour réaliser ton rêve.' },
      { id: 'friends', label: 'Inviter tes amis au foot', effects: { morale: 10, rel: { friend: 8, teammate: 4 }, money: 15, moneyCat: 'gift', moneyLabel: 'Cadeaux d’anniversaire' }, result: 'Match d’anniversaire mémorable : tu as évidemment marqué.' },
    ],
  },

  // ——————————————————————————————————————— Club & centre de formation
  {
    id: 'coach_extra', title: 'Rester après l’entraînement ?', icon: '⏱️', category: 'club', npc: 'coach', random: true, cooldown: 10,
    when: (s) => inClub(s) && s.membership!.status !== 'starter',
    weight: 2,
    text: (s) => `Tu es remplaçant depuis plusieurs matchs. Après l’entraînement, ${coachName(s)} te demande de rester pour travailler tes points faibles. ${friendName(s)} et les autres t’attendent pour sortir.`,
    choices: [
      { id: 'stay', label: 'Rester t’entraîner', effects: { rel: { coach: 6, friend: -3 }, energy: -10 }, result: '« C’est comme ça qu’on gagne sa place. » Le coach a apprécié.', run: (s) => { applyTraining(s, s.identity.position === 'GK' ? 'goalkeeping' : 'technique', 1.3); return ''; } },
      { id: 'friends', label: 'Rejoindre tes amis', effects: { morale: 8, rel: { friend: 5, coach: -4 } }, result: 'Bonne soirée. Le coach, lui, a noté ton absence.' },
      { id: 'talk', label: 'Discuter avec l’entraîneur', hint: 'Comprendre ce qu’il attend', effects: { rel: { coach: 4 }, attrs: { tactics: 0.6 } }, result: (s) => `« Travaille ${s.identity.position === 'ATT' ? 'ton jeu sans ballon' : s.identity.position === 'DEF' ? 'ta relance' : s.identity.position === 'GK' ? 'tes sorties' : 'ton volume de jeu'} et ta place viendra. » Le message est clair.` },
      { id: 'rest', label: 'Rentrer te reposer', effects: { energy: 15, rel: { coach: -1 } }, result: 'Tu rentres te coucher tôt.' },
    ],
  },
  {
    id: 'locker_conflict', title: 'Tension dans le vestiaire', icon: '😤', category: 'club', npc: 'rival', random: true, cooldown: 16,
    when: (s) => inClub(s) && !!npcByRole(s, 'rival'),
    text: (s) => `${npcByRole(s, 'rival')?.name.split(' ')[0]}, ton concurrent direct, te bouscule à l’entraînement et lâche devant tout le monde : « Tu prends ma place l’année prochaine ? Même pas en rêve. »`,
    choices: [
      { id: 'fight', label: 'Le repousser violemment', effects: { attrs: { discipline: -1 }, rel: { rival: -10, coach: -8 }, morale: 3, rep: { fanImage: -2 } }, result: 'Bagarre évitée de justesse. Le coach vous sépare et te met à l’écart.' },
      { id: 'ignore', label: 'Ne pas répondre et jouer', effects: { attrs: { mental: 1 }, rel: { coach: 3 } }, result: 'Tu réponds par une séance parfaite. Le coach l’a vu.' },
      { id: 'talk', label: 'Lui parler après la séance', effects: { rel: { rival: 10 }, attrs: { mental: 0.5 } }, result: 'Il avoue avoir peur de perdre sa place. Vous n’êtes pas si différents.' },
    ],
  },
  {
    id: 'homesick', title: 'Le mal du pays', icon: '🌙', category: 'famille', npc: 'parent2',
    when: (s) => !!currentClub(s)?.boarding,
    text: () => 'Première nuit difficile à l’internat. Ta chambre est froide, ta famille est loin et ton téléphone affiche « Maman » en favori.',
    choices: [
      { id: 'call', label: 'Appeler la maison tous les soirs', effects: { rel: { parent2: 6, parent: 4 }, morale: 4, attrs: { discipline: -0.4 } }, result: 'Entendre leur voix t’aide à t’endormir.' },
      { id: 'focus', label: 'Te concentrer sur le foot', effects: { attrs: { mental: 1.2 }, rel: { parent2: -4 }, morale: -4 }, result: 'Tu serres les dents. C’est le prix du rêve.' },
      { id: 'team', label: 'Passer la soirée avec les autres pensionnaires', effects: { rel: { teammate: 8, rival: 3 }, morale: 6 }, result: 'Partie de cartes jusqu’au couvre-feu. Une vraie bande se forme.' },
    ],
  },
  {
    id: 'tournament', title: 'Tournoi international de jeunes', icon: '🏆', category: 'club', random: true, cooldown: 30, minAge: 10, maxAge: 18,
    when: (s) => inClub(s) && s.membership!.status !== 'bench',
    text: (s) => `${currentClub(s)?.name} est invité à un prestigieux tournoi de jeunes. Des recruteurs de toute l’Europe seront dans les tribunes.`,
    choices: [
      { id: 'all', label: 'Tout donner', hint: 'Grosse visibilité, fatigue et risque', result: 'Trois matchs en deux jours.', run: (s) => {
        s.player.energy = clamp(s.player.energy - 22);
        const perf = playerOverall(s) / 60 + s.player.morale / 200 + nextFloat(s) * 0.5;
        if (perf > 1.05) {
          applyRep(s, { sport: 5, popularity: 3, media: 3 });
          journal(s, 'Élu meilleur joueur du tournoi international !', '🏅', true);
          const club = pickScoutingClub(s);
          if (club && chance(s, 0.6)) inviteTryout(s, club.id, 3);
          return 'Tu es élu meilleur joueur du tournoi ! Ton nom circule.';
        }
        applyRep(s, { sport: 2, popularity: 1 });
        return 'Un tournoi correct. Tu as beaucoup appris face à des joueurs étrangers.';
      } },
      { id: 'manage', label: 'Gérer tes efforts', effects: { energy: -10, rep: { sport: 1.5 }, attrs: { tactics: 0.6 } }, result: 'Prestation solide et sans risque.' },
    ],
  },
  {
    id: 'scout_fatigue', title: 'Un recruteur dans les tribunes', icon: '🔭', category: 'carrière', random: true, cooldown: 14, minAge: 11,
    when: (s) => inClub(s) && s.player.energy < 60,
    text: () => 'Un recruteur d’un club supérieur assiste à ton match. Tu réalises une excellente première période, mais tu es fatigué. Le coach te demande comment tu te sens.',
    choices: [
      { id: 'push', label: '« Je reste, je peux tout donner. »', hint: 'Impression forte possible, risque de blessure', result: 'Tu repars pour 45 minutes de souffrance.', run: (s) => {
        s.player.energy = clamp(s.player.energy - 15);
        if (chance(s, 0.55 + s.player.attrs.stamina / 300)) {
          applyRep(s, { sport: 3 });
          const club = pickScoutingClub(s);
          if (club) { inviteTryout(s, club.id, 2); return `Le recruteur de ${club.name} veut te voir en détection !`; }
          return 'Le recruteur a pris des notes. Ton nom est dans son carnet.';
        }
        if (chance(s, 0.25)) {
          s.player.injury = { name: 'Claquage aux ischios', weeksLeft: 3, severity: 2 };
          return 'Ta cuisse lâche à la 70e. Claquage : trois semaines d’arrêt.';
        }
        return 'Seconde période difficile. Le recruteur part à la 60e.';
      } },
      { id: 'honest', label: 'Dire honnêtement que tu es cuit', effects: { rel: { coach: 4 }, attrs: { discipline: 0.6 }, energy: 5 }, result: 'Le coach apprécie ta lucidité. Le recruteur a vu ta première mi-temps.' },
      { id: 'simple', label: 'Rester mais jouer simple', effects: { energy: -8, attrs: { tactics: 0.6 }, rep: { sport: 1 } }, result: 'Pas de prise de risque : une copie propre.' },
    ],
  },
  {
    id: 'injury_rush', title: 'Jouer blessé ?', icon: '💉', category: 'santé', npc: 'coach', random: true, cooldown: 12,
    when: (s) => inClub(s) && !!s.player.injury && s.player.injury.weeksLeft <= 2 && isLeagueWeek(s.t + 1, s.startYear),
    text: (s) => `Il reste un peu de douleur, mais ${coachName(s)} aimerait t’aligner pour le choc de ce week-end.`,
    choices: [
      { id: 'play', label: 'Jouer quand même', hint: 'Risque d’aggraver la blessure', result: 'Tu serres les dents.', run: (s) => {
        changeRelation(s, 'coach', 5);
        if (chance(s, 0.4)) {
          s.player.injury!.weeksLeft += 4;
          s.player.injury!.severity = 2;
          return 'Mauvaise idée : la blessure s’aggrave. Quatre semaines de plus.';
        }
        s.player.injury = null;
        return 'Ça tient ! Tu es apte pour le match.';
      } },
      { id: 'rest', label: 'Refuser et finir ta rééducation', effects: { rel: { coach: -2 }, attrs: { discipline: 0.4 } }, result: 'Le corps d’abord. Le coach comprend… à moitié.' },
    ],
  },
  {
    id: 'director_meeting', title: 'Convoqué par le directeur du centre', icon: '🏢', category: 'club', once: true, random: true, minAge: 15,
    when: (s) => (currentClub(s)?.tier ?? 0) >= 3,
    text: (s) => `Le directeur du centre de ${currentClub(s)?.name} te reçoit dans son bureau. « Parlons de ton avenir. Les contrats aspirants se décident cette saison. »`,
    choices: [
      { id: 'ambitious', label: 'Afficher ton ambition', effects: { rep: { sport: 1 }, attrs: { mental: 0.8 }, flags: { ambitious: 1 } }, result: '« J’aime cette faim. Prouve-le sur le terrain. »' },
      { id: 'humble', label: 'Rester humble et à l’écoute', effects: { rel: { coach: 4 }, attrs: { discipline: 0.8 } }, result: '« Continue comme ça. On a un œil sur toi. »' },
      { id: 'school', label: 'Parler aussi de tes études', effects: { school: 0.8, rel: { parent2: 4 } }, result: '« Un double projet, c’est intelligent. Le centre t’aidera. »' },
    ],
  },
  {
    id: 'season_review', title: 'Bilan de fin de saison', icon: '📋', category: 'club', npc: 'coach',
    text: (s, d) => `${coachName(s)} fait le point : ton équipe termine ${d.pos}e, ta note moyenne est de ${Number(d.avg) ? d.avg : '–'}. « On compte sur toi la saison prochaine. Quel est ton objectif ? »`,
    choices: [
      { id: 'starter', label: 'Devenir titulaire indiscutable', effects: { attrs: { discipline: 0.6 }, rel: { coach: 3 }, morale: 4 }, result: 'Objectif noté. Le travail estival commence maintenant.' },
      { id: 'up', label: 'Être surclassé avec les plus grands', hint: 'Possible si ton niveau le permet', result: 'Le coach réfléchit.', run: (s) => {
        const club = currentClub(s);
        const ok = club && playerOverall(s) > 0 && (s.recentRatings.reduce((a, b) => a + b, 0) / Math.max(1, s.recentRatings.length)) >= 7;
        if (ok) { applyRep(s, { sport: 3 }); s.player.attrs.mental += 0.8; return 'Accordé ! Tu t’entraîneras avec la catégorie supérieure.'; }
        changeRelation(s, 'coach', -2);
        return '« Pas encore. Montre-moi plus de régularité. »';
      } },
      { id: 'leave', label: 'Envisager un autre club', hint: 'Des détections ailleurs, au risque de froisser le club', effects: { rel: { coach: -6 } }, result: 'Tu fais savoir que tu es ouvert à d’autres projets.', run: (s) => {
        const c = pickScoutingClub(s);
        if (c) { inviteTryout(s, c.id, 3); return `${c.name} se montre intéressé.`; }
        return 'Pour l’instant, aucun club plus ambitieux ne s’est manifesté.';
      } },
    ],
  },
  {
    id: 'released', title: 'La lettre que personne ne veut recevoir', icon: '✉️', category: 'carrière', npc: 'coach',
    text: (_s, d) => `${d.club} ne te conserve pas pour la saison prochaine. « Tu n’as pas le niveau attendu à ce stade. Ce n’est pas une fin, mais un détour. »`,
    choices: [
      { id: 'lower', label: 'Rebondir dans un club formateur', result: 'Tu ravales ta fierté.', run: (s) => {
        const club = currentClub(s);
        leaveClub(s, 'non conservé');
        const next = s.clubs.find((c) => c.tier === Math.max(1, (club?.tier ?? 2) - 1));
        if (next) { createClubOffer(s, next, 5); return `${next.name} te propose immédiatement de les rejoindre.`; }
        return '';
      } },
      { id: 'tryouts', label: 'Tenter des détections ailleurs', result: 'Tu prépares ton sac et tes vidéos.', run: (s) => {
        leaveClub(s, 'non conservé');
        s.player.morale = clamp(s.player.morale - 6);
        const c = pickScoutingClub(s, 3);
        if (c) { inviteTryout(s, c.id, 3); return `${c.name} accepte de te voir en détection.`; }
        s.events.scheduled.push({ eventId: 'first_tryout_spotted', at: s.t + 6 });
        return 'Rien pour l’instant. Continue à jouer et à progresser.';
      } },
      { id: 'pause', label: 'Prendre du recul quelques semaines', effects: { morale: 6, energy: 20, school: 1, rel: { parent: 5, parent2: 5 } }, result: 'Tu souffles, entouré des tiens.', run: (s) => { leaveClub(s, 'non conservé'); s.events.scheduled.push({ eventId: 'first_tryout_spotted', at: s.t + 8 }); return ''; } },
    ],
  },
  {
    id: 'friend_jealous', title: '« T’as changé »', icon: '💔', category: 'social', npc: 'friend', random: true, once: true, minAge: 12,
    when: (s) => (currentClub(s)?.tier ?? 0) >= 2 && (npcByRole(s, 'friend')?.relation ?? 0) > 35,
    text: (s) => `${friendName(s)} te reproche de ne plus jamais venir au quartier. « Depuis que t’es au club, t’es plus le même. »`,
    choices: [
      { id: 'time', label: 'Lui consacrer ton prochain week-end', effects: { rel: { friend: 12 }, morale: 4, energy: -5 }, result: 'Comme avant. Il avait juste besoin de savoir que tu tenais à lui.' },
      { id: 'explain', label: 'Lui expliquer tes contraintes', effects: { rel: { friend: 3 }, attrs: { mental: 0.4 } }, result: 'Il comprend… à peu près.' },
      { id: 'drift', label: 'Laisser la distance s’installer', effects: { rel: { friend: -15 }, attrs: { discipline: 0.6 } }, result: 'Chacun sa route. Ça te pèse plus que tu ne l’admets.' },
    ],
  },

  // ——————————————————————————————————————— Amour
  {
    id: 'first_crush', title: 'Quelqu’un te plaît', icon: '💘', category: 'amour', random: true, once: true, minAge: 14,
    when: (s) => !npcByRole(s, 'crush'),
    text: () => 'Depuis quelques semaines, tu croises la même personne à la sortie des cours. Vos regards se croisent un peu trop souvent pour que ce soit un hasard.',
    choices: [
      { id: 'go', label: 'Oser lui parler', hint: 'Réussite selon ton moral et ta confiance', result: 'Tu prends ton courage à deux mains…', run: (s) => {
        if (chance(s, 0.35 + s.player.morale / 200 + s.player.attrs.mental / 300)) {
          s.npcs.push({ id: uid(s, 'npc'), name: personName(s, s.identity.growUpCountry, true), role: 'crush', relation: 60, portrait: npcPortrait(s, 'teen'), met: s.t, note: 'Votre histoire commence.' });
          s.player.morale = clamp(s.player.morale + 12);
          journal(s, 'Début d’une histoire d’amour.', '💞', true);
          return 'Elle sourit. Vous échangez vos numéros !';
        }
        s.player.morale = clamp(s.player.morale - 6);
        return 'Elle est gentille, mais pas intéressée. Ça pique.';
      } },
      { id: 'wait', label: 'Attendre le bon moment', effects: { morale: -1 }, result: 'Le bon moment viendra… peut-être.', run: (s) => { s.events.scheduled.push({ eventId: 'meet_crush', at: s.t + 10 }); } },
      { id: 'focus', label: 'Rester focalisé sur le football', effects: { attrs: { discipline: 0.8 }, morale: -2 }, result: 'Pas le temps pour ça. Pour l’instant.' },
    ],
  },
  {
    id: 'meet_crush', title: 'Une rencontre', icon: '✨', category: 'amour', minAge: 14,
    when: (s) => !npcByRole(s, 'crush'),
    text: () => 'Dans la file du café, une personne engage la conversation à propos de ton maillot. Le courant passe immédiatement.',
    choices: [
      { id: 'date', label: 'Proposer de se revoir', result: '', run: (s) => {
        s.npcs.push({ id: uid(s, 'npc'), name: personName(s, s.identity.growUpCountry, true), role: 'crush', relation: 55, portrait: npcPortrait(s, ageAt(s) >= 18 ? 'adult' : 'teen'), met: s.t, note: 'Rencontre au café.' });
        s.player.morale = clamp(s.player.morale + 10);
        journal(s, 'Nouvelle rencontre amoureuse.', '💞', true);
        return 'Rendez-vous est pris !';
      } },
      { id: 'no', label: 'Rester discret', effects: { morale: 1 }, result: 'Un joli moment, sans suite.' },
    ],
  },
  {
    id: 'date_vs_match', title: 'Rendez-vous la veille du match', icon: '🌹', category: 'amour', npc: 'crush', random: true, cooldown: 12,
    when: (s) => !!npcByRole(s, 'crush') && inClub(s) && isLeagueWeek(s.t + 1, s.startYear),
    text: (s) => `${npcByRole(s, 'crush')?.name.split(' ')[0]} t’invite à un concert samedi soir. Ton match a lieu dimanche à 10 h.`,
    choices: [
      { id: 'go', label: 'Y aller et rentrer tard', effects: { rel: { crush: 10 }, morale: 8, energy: -18 }, result: 'Soirée magique. Le réveil sera difficile.' },
      { id: 'early', label: 'Y aller mais partir tôt', effects: { rel: { crush: 3 }, morale: 4, energy: -6 }, result: 'Un compromis. Elle comprend.' },
      { id: 'decline', label: 'Décliner pour le match', effects: { rel: { crush: -8 }, attrs: { discipline: 0.6 } }, result: '« Encore le foot… » Elle est déçue.' },
    ],
  },

  // ——————————————————————————————————————— Médias, image, social
  {
    id: 'local_press', title: 'Le journal local veut ton portrait', icon: '📰', category: 'média', random: true, cooldown: 24, minAge: 11,
    when: (s) => s.reputation.sport >= 12,
    text: () => 'Un journaliste du quotidien régional souhaite écrire un article sur « le jeune talent du coin ».',
    choices: [
      { id: 'accept', label: 'Accepter l’interview', effects: { rep: { popularity: 4, media: 5 }, energy: -4 }, result: 'Ta photo en page 12 ! Tes grands-parents achètent dix exemplaires.' },
      { id: 'team', label: 'Demander un article sur toute l’équipe', effects: { rep: { popularity: 2, fanImage: 4, media: 2 }, rel: { teammate: 6, coach: 3 } }, result: 'Le vestiaire apprécie ton geste.' },
      { id: 'decline', label: 'Refuser poliment', effects: { attrs: { discipline: 0.3 } }, result: 'Tu préfères rester discret pour l’instant.' },
    ],
  },
  {
    id: 'charity', title: 'Parrainer une association', icon: '🤲', category: 'média', random: true, cooldown: 40, minAge: 12,
    when: (s) => s.reputation.popularity >= 5,
    text: () => 'Une association de ton quartier qui aide les enfants à faire du sport cherche un parrain pour sa journée portes ouvertes.',
    choices: [
      { id: 'yes', label: 'Participer avec plaisir', effects: { rep: { fanImage: 6, popularity: 3, sponsorCred: 3 }, energy: -8, morale: 6, flags: { charity_done: 1 } }, result: 'Des dizaines d’enfants repartent avec ton autographe. Tu peux en parler sur Tribune.' },
      { id: 'donate', label: 'Faire un don (20 €) sans y aller', unavailable: (s) => (s.money < 20 ? 'Pas assez d’argent' : null), effects: { money: -20, moneyCat: 'gift', moneyLabel: 'Don à une association', rep: { fanImage: 2 } }, result: 'Un geste discret, apprécié.' },
      { id: 'no', label: 'Décliner, pas le temps', result: 'L’association comprend.' },
    ],
  },
  {
    id: 'controversy', title: 'Polémique sur Tribune', icon: '🔥', category: 'média',
    text: (_s, d) => `Ta publication « ${d.post} » est reprise et moquée par plusieurs comptes. Les commentaires s’enflamment.`,
    choices: [
      { id: 'apologize', label: 'Présenter des excuses', effects: { rep: { fanImage: 4, sponsorCred: 3, popularity: -1 } }, result: 'Tes excuses sont plutôt bien reçues. L’affaire retombe.' },
      { id: 'assume', label: 'Assumer et répondre', effects: { rep: { popularity: 3, media: 4, fanImage: -4, sponsorCred: -4 } }, result: 'Le buzz enfle. Certains adorent, les marques grincent des dents.' },
      { id: 'silence', label: 'Garder le silence', effects: { rep: { media: -1 }, attrs: { mental: 0.4 } }, result: 'Après quelques jours, tout le monde est passé à autre chose.' },
    ],
  },
  {
    id: 'viral_skill', title: 'Ton geste fait le buzz', icon: '📈', category: 'média', random: true, cooldown: 30, minAge: 13,
    when: (s) => s.social.unlocked && s.recentRatings.some((r) => r >= 8),
    text: () => 'Une vidéo de ton dernier geste technique, filmée par un parent, tourne sur Tribune. Des milliers de vues en une nuit.',
    choices: [
      { id: 'share', label: 'La repartager avec humour', effects: { rep: { followers: 400, popularity: 5, media: 4 } }, result: 'Ton compte s’emballe. Bienvenue aux nouveaux abonnés !' },
      { id: 'credit', label: 'Remercier tes coéquipiers', effects: { rep: { followers: 200, popularity: 3, fanImage: 4 }, rel: { teammate: 5 } }, result: 'Message apprécié : on parle de ton état d’esprit.' },
      { id: 'ignore', label: 'Ne pas réagir', effects: { rep: { followers: 80, popularity: 1 } }, result: 'La vidéo vit sa vie sans toi.' },
    ],
  },

  // ——————————————————————————————————————— Sponsors
  {
    id: 'sponsor_shoot', title: 'Séance photo partenaire', icon: '📸', category: 'sponsor',
    when: (s) => activeContracts(s).length > 0,
    text: (s, d) => {
      const b = d.brand ? brand(String(d.brand)) : brand(activeContracts(s)[0].brandId);
      return `${b.name} t’invite à une séance photo pour sa nouvelle campagne.${isLeagueWeek(s.t + 1, s.startYear) ? ' Problème : elle a lieu la veille d’un match.' : ''}`;
    },
    choices: (s, d) => {
      const c = activeContracts(s).find((x) => x.brandId === d.brand) ?? activeContracts(s)[0];
      const b = brand(c.brandId);
      return [
        { id: 'go', label: 'Accepter', hint: `Prime ${Math.round(c.terms.monthly * 0.5)} € · énergie −12`, effects: { energy: -12, rep: { popularity: 2, media: 3, sponsorCred: 3 } }, result: `Les photos sont superbes. ${b.name} est ravi.`, run: (st) => {
          addMoney(st, Math.round(c.terms.monthly * 0.5), 'sponsor_bonus', `Campagne ${b.name}`);
          c.appearancesThisYear += 1;
          return '';
        } },
        { id: 'decline', label: 'Décliner (préparation du match)', effects: { rep: { sponsorCred: c.appearancesThisYear < c.terms.appearancesPerYear ? -4 : -1 }, attrs: { discipline: 0.4 } }, result: `${b.name} est déçu. ${c.appearancesThisYear < c.terms.appearancesPerYear ? 'Ton contrat prévoit des présences obligatoires.' : ''}` },
        { id: 'move', label: 'Proposer une autre date', effects: { rep: { sponsorCred: 1 } }, result: 'La marque accepte de décaler.', run: (st) => { st.events.scheduled.push({ eventId: 'sponsor_shoot', at: st.t + 2, data: { brand: c.brandId } }); } },
      ];
    },
  },
  {
    id: 'sponsor_values', title: 'Une campagne qui te dérange', icon: '🤔', category: 'sponsor', random: true, cooldown: 30,
    when: (s) => activeContracts(s).some((c) => brand(c.brandId).tier >= 2),
    text: (s) => `${brand(activeContracts(s)[0].brandId).name} prépare une publicité où tu dois te moquer d’un joueur adverse. Ça ne te ressemble pas.`,
    choices: [
      { id: 'refuse', label: 'Refuser, par principe', effects: { rep: { fanImage: 5, sponsorCred: -3 }, attrs: { mental: 0.5 } }, result: 'La marque revoit sa copie. Tes valeurs sont respectées… et remarquées.' },
      { id: 'accept', label: 'Accepter, c’est le contrat', effects: { rep: { popularity: 2, fanImage: -4, sponsorCred: 3 }, money: 40, moneyCat: 'sponsor_bonus', moneyLabel: 'Prime de campagne' }, result: 'La pub fait parler. Pas toujours en bien.' },
      { id: 'negotiate', label: 'Proposer une version bienveillante', effects: { rep: { fanImage: 3, sponsorCred: 1 }, energy: -4 }, result: 'Ton idée est retenue : la pub devient un hommage au fair-play.' },
    ],
  },
  {
    id: 'new_boots_gift', title: 'Colis de ton équipementier', icon: '📦', category: 'sponsor', random: true, cooldown: 24,
    when: (s) => activeContracts(s).some((c) => c.terms.freeBoots) && s.player.boots.wear > 40,
    text: (s) => `Un colis t’attend : la dernière paire de ${brand(activeContracts(s).find((c) => c.terms.freeBoots)!.brandId).name}, floquée à ton numéro.`,
    choices: [
      { id: 'post', label: 'Déballer en vidéo pour Tribune', unavailable: (s) => (s.social.unlocked ? null : 'Pas encore de compte'), effects: { rep: { followers: 60, popularity: 1, sponsorCred: 2 } }, result: 'Ton unboxing plaît.', run: (s) => { s.player.boots.wear = 0; const c = activeContracts(s).find((x) => x.terms.freeBoots); if (c) c.postsThisMonth += 1; } },
      { id: 'quiet', label: 'Les essayer tranquillement', result: 'Comme dans des chaussons.', run: (s) => { s.player.boots.wear = 0; } },
    ],
  },
  {
    id: 'rival_offer', title: 'Un concurrent frappe à la porte', icon: '⚔️', category: 'sponsor', random: true, cooldown: 40, minAge: 15,
    when: (s) => activeContracts(s).some((c) => c.terms.exclusive) && s.reputation.popularity > 25,
    text: (s) => { const c = activeContracts(s).find((x) => x.terms.exclusive)!; return `Un concurrent de ${brand(c.brandId).name} te fait savoir qu’il paierait le double. Mais ton contrat est exclusif (pénalité : ${c.terms.penalty} €).`; },
    choices: [
      { id: 'loyal', label: 'Rester fidèle', effects: { rep: { sponsorCred: 4 } }, result: 'Ta loyauté est remarquée dans le milieu.' },
      { id: 'leverage', label: 'Utiliser l’offre pour renégocier', hint: 'Ton partenaire peut augmenter… ou se vexer', result: 'Tu en parles à ton partenaire.', run: (s) => {
        const c = activeContracts(s).find((x) => x.terms.exclusive)!;
        if (chance(s, 0.55)) { c.terms.monthly = Math.round(c.terms.monthly * 1.2 / 5) * 5; return `${brand(c.brandId).name} revalorise ton contrat à ${c.terms.monthly} €/mois !`; }
        applyRep(s, { sponsorCred: -4 });
        return `${brand(c.brandId).name} n’apprécie pas la manœuvre. La relation se refroidit.`;
      } },
    ],
  },

  // ——————————————————————————————————————— Sélection
  {
    id: 'dual_callup', title: 'Deux pays te veulent', icon: '🌍', category: 'sélection', npc: 'parent',
    text: (_s, d) => `Les sélectionneurs de ${country(String(d.a)).flag} ${country(String(d.a)).name} et de ${country(String(d.b)).flag} ${country(String(d.b)).name} t’ont tous les deux appelé pour la prochaine fenêtre. ${Number(d.senior) ? 'Attention : un match officiel avec l’équipe A rendra ton choix définitif.' : 'Chez les jeunes, ce choix n’est pas encore définitif.'}`,
    choices: (_s, d) => [
      { id: 'a', label: `Répondre à ${country(String(d.a)).name}`, result: 'Ta décision est prise.', run: (s) => { createCallup(s, String(d.a), !!Number(d.senior)); s.national.pendingCallup!.status = 'accepted'; s.national.chosenYouth = String(d.a); changeRelation(s, 'parent', s.identity.nationality === String(d.a) ? 3 : -2); return `Tu rejoindras ${country(String(d.a)).name} la semaine prochaine.`; } },
      { id: 'b', label: `Répondre à ${country(String(d.b)).name}`, result: 'Ta décision est prise.', run: (s) => { createCallup(s, String(d.b), !!Number(d.senior)); s.national.pendingCallup!.status = 'accepted'; s.national.chosenYouth = String(d.b); changeRelation(s, 'parent', s.identity.parentOrigin === String(d.b) ? 6 : -2); return `Tu rejoindras ${country(String(d.b)).name} la semaine prochaine.`; } },
      { id: 'wait', label: 'Ne pas choisir pour l’instant', effects: { rep: { media: 2, fanImage: -1 } }, result: 'Tu déclines les deux convocations pour prendre le temps de réfléchir.' },
    ],
  },
];

// Conséquences différées des choix du prologue.
EVENTS.push(
  {
    id: 'neighborhood_cup', title: 'Le tournoi du quartier', icon: '🏆', category: 'enfance', npc: 'friend',
    when: (s) => (s.events.flags.leader ?? 0) > 0,
    text: (s) => `Depuis que tu organises les matchs, tout le quartier parle d’un vrai tournoi. ${npcByRole(s, 'friend')?.name.split(' ')[0] ?? 'Ton ami'} te tend une liste : « Huit équipes ! C’est toi le capitaine. »`,
    choices: [
      { id: 'captain', label: 'Mener ton équipe jusqu’au bout', hint: 'Réputation locale, fatigue ; un éducateur sera peut-être là', result: 'Trois matchs dans l’après-midi.', run: (s) => {
        s.player.energy = clamp(s.player.energy - 18);
        const won = nextFloat(s) < 0.35 + playerOverall(s) / 120;
        applyRep(s, { sport: won ? 3 : 1.5, popularity: won ? 2 : 1 });
        changeRelation(s, 'friend', 6);
        if (won && !s.membership) {
          const club = pickScoutingClub(s, 2);
          if (club) { inviteTryout(s, club.id, 2); return `Victoire ! Un éducateur de ${club.name} t’invite à une détection.`; }
        }
        return won ? 'Victoire au bout du suspense ! Le quartier s’en souviendra.' : 'Défaite en finale, mais tout le monde a vu ton leadership.';
      } },
      { id: 'organizer', label: 'Rester organisateur et arbitre', effects: { attrs: { tactics: 0.8, discipline: 0.6 }, rel: { friend: 4 }, rep: { fanImage: 3 } }, result: 'Le tournoi est un succès. Les parents te félicitent.' },
    ],
  },
  {
    id: 'idol_signing', title: 'Ton idole en dédicace', icon: '✍️', category: 'enfance',
    when: (s) => (s.events.flags.idol ?? 0) > 0,
    text: () => 'Ton idole, celle de la finale à la télé, signe des autographes dans un magasin de sport à une heure de chez toi. Samedi, de 14 h à 16 h.',
    choices: [
      { id: 'go', label: 'Y aller, quitte à attendre des heures', hint: 'Transport 8 €, gros boost de motivation', unavailable: (s) => (s.money < 8 ? 'Pas assez d’argent pour le trajet (8 €)' : null), effects: { money: -8, moneyCat: 'transport', moneyLabel: 'Trajet séance de dédicace', morale: 12, attrs: { mental: 1 }, energy: -8 }, result: '« Continue à travailler, petit. » Tu ne t’en remettras jamais vraiment.' },
      { id: 'train', label: 'Rester t’entraîner : un jour, c’est toi qu’on viendra voir', effects: { attrs: { discipline: 1, technique: 0.6 }, morale: -2 }, result: 'Tu enchaînes les frappes jusqu’à la nuit.' },
    ],
  },
  {
    id: 'sibling_promise', title: 'La promesse', icon: '🤙', category: 'famille', npc: 'sibling',
    when: (s) => (s.events.flags.promiseSibling ?? 0) > 0 && !!npcByRole(s, 'sibling'),
    text: (s) => `${npcByRole(s, 'sibling')?.name.split(' ')[0]} a dessiné un maillot avec ton nom et l’a scotché sur ta porte. « Tu te souviens de ta promesse ? » ${s.membership ? 'Elle veut venir voir ton prochain match.' : 'Elle te demande quand tu entres enfin dans un club.'}`,
    choices: [
      { id: 'invite', label: 'L’emmener à ton prochain entraînement', effects: { rel: { sibling: 8, parent2: 3 }, morale: 8, energy: -5 }, result: 'Elle a crié ton nom à chaque contrôle réussi.' },
      { id: 'renew', label: 'Renouveler la promesse, plus sérieusement', effects: { attrs: { mental: 1, discipline: 0.8 }, rel: { sibling: 4 } }, result: 'Petit doigt levé, encore une fois. Cette fois, tu le penses deux fois plus.' },
    ],
  },
);

export const BIRTHDAY_EVENT = 'birthday';

export function notifyEventResult(s: Parameters<GameEvent['text']>[0], title: string, msg: string) {
  notify(s, 'event', title, msg);
}

export function clubName(s: Parameters<GameEvent['text']>[0], id: string) {
  return clubById(s, id)?.name ?? '';
}
