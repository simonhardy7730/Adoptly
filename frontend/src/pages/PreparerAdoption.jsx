import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

const guides = [
  {
    icon: '🏠',
    title: 'Préparer sa maison',
    color: 'bg-blue-50 text-blue-700',
    colorBorder: 'border-blue-200',
    intro: "L'arrivée d'un animal se prépare. Voici tout ce qu'il faut prévoir pour que votre nouveau compagnon se sente chez lui dès le premier jour.",
    sections: [
      {
        subtitle: 'Sécuriser les espaces',
        content: "Rangez les câbles électriques, produits ménagers et petits objets que l'animal pourrait avaler. Vérifiez que les fenêtres et balcons sont sécurisés (filets pour les chats). Identifiez les plantes toxiques (lys, philodendron, aloe vera pour les chats ; chocolat et raisins hors de portée pour les chiens).",
      },
      {
        subtitle: 'Le kit de bienvenue',
        content: "Prévoyez avant l'arrivée : gamelles (eau + nourriture), litière ou tapis de propreté, un couchage confortable dans un coin calme, quelques jouets, une laisse/harnais pour les chiens, et de la nourriture adaptée à l'espèce et à l'âge. Budget estimé : 50 à 120 € pour le kit de base.",
      },
      {
        subtitle: 'Créer un espace refuge',
        content: "Chaque animal a besoin d'un endroit calme où se retirer. Installez un panier ou une caisse ouverte dans un coin tranquille, loin du passage. Les chats apprécient un espace en hauteur. Ne forcez jamais l'animal à en sortir — c'est son sanctuaire.",
      },
      {
        subtitle: 'Prévenir les autres habitants',
        content: "Si vous avez des enfants, expliquez-leur les règles : ne pas réveiller l'animal, ne pas le porter sans permission, respecter son espace. Si vous avez d'autres animaux, prévoyez une introduction progressive (pièces séparées au début, échanges d'odeurs via des couvertures).",
      },
    ],
  },
  {
    icon: '📋',
    title: 'Les premières 48 heures',
    color: 'bg-orange-50 text-orange-700',
    colorBorder: 'border-orange-200',
    intro: "Les deux premiers jours sont cruciaux. L'animal découvre un monde entièrement nouveau. Votre rôle : être présent, patient, et prévisible.",
    sections: [
      {
        subtitle: "L'arrivée à la maison",
        content: "Transportez l'animal dans une caisse de transport adaptée. En arrivant, laissez-le explorer une seule pièce d'abord. Parlez-lui doucement. Ne l'inondez pas de caresses — laissez-le venir à vous. Proposez de l'eau fraîche et un peu de nourriture.",
      },
      {
        subtitle: 'La première nuit',
        content: "Il est normal que l'animal pleure, miaule ou soit agité la première nuit. Placez son couchage dans un endroit où il peut vous entendre (mais pas nécessairement dans votre chambre). Un vêtement portant votre odeur près de son panier peut le rassurer. Évitez de céder à chaque plainte — la constance l'aidera à s'adapter.",
      },
      {
        subtitle: 'Les signaux à observer',
        content: "Un animal stressé peut : se cacher, refuser de manger, trembler, haleter excessivement, ou au contraire être hyperactif. C'est normal les premières 48h. Si le refus de manger dépasse 48h (chien) ou 24h (chat), contactez un vétérinaire.",
      },
      {
        subtitle: 'La règle des 3-3-3',
        content: "Les éducateurs canins parlent de la règle des 3-3-3 : 3 jours pour décompresser, 3 semaines pour apprendre la routine, 3 mois pour se sentir vraiment chez soi. Ne jugez pas le comportement définitif d'un animal sur ses premiers jours — il a besoin de temps.",
      },
    ],
  },
  {
    icon: '💊',
    title: 'Budget & vétérinaire',
    color: 'bg-green-50 text-green-700',
    colorBorder: 'border-green-200',
    intro: "Adopter, c'est aussi un engagement financier. Voici les coûts réels pour ne pas avoir de mauvaise surprise.",
    sections: [
      {
        subtitle: 'Les frais d\'adoption',
        content: "Les refuges demandent généralement une participation aux frais (vaccination, stérilisation, puce). Comptez 150 à 300 € pour un chien, 100 à 200 € pour un chat, 30 à 80 € pour un lapin. Ce n'est pas un prix d'achat — c'est une contribution aux soins déjà réalisés.",
      },
      {
        subtitle: 'Budget mensuel réaliste',
        content: "Chien (taille moyenne) : 70-120 €/mois (nourriture 40-60 €, soins/prévention 15-25 €, accessoires/divers 15-35 €). Chat : 40-70 €/mois. Lapin : 30-50 €/mois. Ces montants n'incluent pas les imprévus vétérinaires.",
      },
      {
        subtitle: 'La première visite vétérinaire',
        content: "Prenez rendez-vous dans la semaine suivant l'adoption pour un bilan de santé complet. Le refuge vous remet le carnet de santé et les documents de vaccination. Profitez-en pour discuter de l'alimentation, du vermifuge, et de l'assurance santé animale (à partir de 10 €/mois).",
      },
      {
        subtitle: 'Anticiper les imprévus',
        content: "Une fracture coûte 500 à 2 000 €. Une opération d'urgence peut dépasser 3 000 €. Deux options : l'assurance santé animale (10-40 €/mois selon la couverture) ou constituer une cagnotte d'urgence (idéalement 500 € de côté). Ne pas anticiper les frais vétérinaires est la première cause de retour en refuge.",
      },
    ],
  },
  {
    icon: '🌍',
    title: 'Adopter à l\'étranger',
    color: 'bg-purple-50 text-purple-700',
    colorBorder: 'border-purple-200',
    intro: "Adopter un animal depuis un refuge à l'étranger, c'est possible et ça sauve des vies. Mais les démarches sont spécifiques.",
    sections: [
      {
        subtitle: 'Pourquoi adopter à l\'étranger ?',
        content: "Dans certains pays (Roumanie, Espagne, Grèce, Portugal), les refuges sont saturés et les conditions de vie des animaux errants sont difficiles. Adopter via une association sérieuse, c'est offrir une seconde chance à un animal qui n'en aurait peut-être pas eu autrement.",
      },
      {
        subtitle: 'Les documents obligatoires',
        content: "Pour tout transfert intra-UE : passeport européen pour animaux de compagnie, puce électronique (obligatoire), vaccination antirabique à jour (au moins 21 jours avant le voyage), certificat sanitaire délivré par un vétérinaire agréé dans les 10 jours avant le départ.",
      },
      {
        subtitle: 'Choisir une association fiable',
        content: "Vérifiez que l'association est déclarée (numéro SIRET en France, numéro d'entreprise en Belgique). Demandez des photos et vidéos récentes de l'animal. Méfiez-vous des associations qui ne proposent pas de contrat d'adoption ou qui demandent des paiements uniquement par virement sans reçu.",
      },
      {
        subtitle: 'Le transport et l\'arrivée',
        content: "Le rapatriement se fait généralement par camion climatisé avec des bénévoles (coût inclus dans les frais d'adoption, souvent 250-400 €). Certaines associations organisent des co-voiturages. À l'arrivée, prévoyez une période d'adaptation plus longue : l'animal a voyagé, changé de climat, d'odeurs, de langue. La règle des 3-3-3 s'applique doublement.",
      },
    ],
  },
];

function AdoptlyLogo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
        ${light ? 'bg-white/20 group-hover:bg-white/30' : 'bg-primary group-hover:bg-primary-dark'}`}>
        <span className="text-white font-black text-sm leading-none select-none">A</span>
      </div>
      <span className={`font-black text-lg tracking-tight ${light ? 'text-white' : 'text-primary'}`}>
        Adoptly
      </span>
    </Link>
  );
}

export default function PreparerAdoption() {
  const [openGuide, setOpenGuide] = useState(0);

  useEffect(() => {
    document.title = 'Préparer son adoption | Adoptly';
    window.scrollTo(0, 0);
    return () => { document.title = 'Adoptly - Adopter un animal en refuge'; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <AdoptlyLogo />
          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className="btn-ghost text-sm py-1.5 px-4 text-gray-500">Accueil</Link>
            <Link to="/actualites" className="btn-ghost text-sm py-1.5 px-4 text-gray-500">Nos articles</Link>
            <Link to="/adoptant/register" className="btn-primary text-sm py-2 px-4">Commencer →</Link>
          </div>
          <div className="md:hidden">
            <Link to="/adoptant/register" className="btn-primary text-sm py-2 px-4">Commencer →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="bg-gradient-to-b from-primary to-secondary text-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.p {...fadeUp()} className="text-white/60 text-sm font-semibold tracking-widest uppercase mb-3">
            Guides pratiques
          </motion.p>
          <motion.h1 {...fadeUp(0.1)} className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
            Préparer son adoption
          </motion.h1>
          <motion.p {...fadeUp(0.2)} className="text-white/80 text-lg max-w-2xl mx-auto">
            Tout ce qu'il faut savoir avant, pendant et après l'arrivée de votre compagnon.
            Des conseils concrets, pas du blabla.
          </motion.p>
        </div>
      </header>

      {/* Navigation rapide */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-10">
        <motion.div {...fadeUp(0.3)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {guides.map((guide, i) => (
            <button
              key={guide.title}
              onClick={() => {
                setOpenGuide(i);
                document.getElementById(`guide-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex items-center gap-3 p-4 rounded-2xl bg-white shadow-md border-2 transition-all hover:shadow-lg text-left
                ${openGuide === i ? guide.colorBorder : 'border-transparent'}`}
            >
              <span className="text-2xl">{guide.icon}</span>
              <span className="font-bold text-gray-800 text-sm leading-tight">{guide.title}</span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Guides */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {guides.map((guide, i) => (
          <motion.article
            key={guide.title}
            id={`guide-${i}`}
            className="scroll-mt-24"
            {...fadeUp()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${guide.color}`}>
                {guide.icon}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-primary">{guide.title}</h2>
            </div>

            <p className="text-gray-600 text-lg leading-relaxed mb-8 pl-0 md:pl-[74px]">
              {guide.intro}
            </p>

            <div className="space-y-6 pl-0 md:pl-[74px]">
              {guide.sections.map((section, j) => (
                <div
                  key={section.subtitle}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {j + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg mb-2">{section.subtitle}</h3>
                      <p className="text-gray-600 leading-relaxed">{section.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.article>
        ))}

        {/* CTA */}
        <motion.div {...fadeUp()} className="text-center bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-extrabold text-primary mb-3">Prêt à sauter le pas ?</h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            Créez votre profil en 3 minutes et découvrez les animaux compatibles avec votre mode de vie.
          </p>
          <Link to="/adoptant/register" className="btn-primary inline-block px-8 py-4 text-base">
            Trouver mon compagnon idéal →
          </Link>
          <p className="text-gray-400 text-xs mt-3">100 % gratuit. Sans engagement.</p>
        </motion.div>
      </main>

      {/* Footer simple */}
      <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Adoptly · <Link to="/legal/cgu" className="hover:text-gray-600">CGU</Link> · <Link to="/legal/privacy" className="hover:text-gray-600">Politique de confidentialité</Link></p>
      </footer>
    </div>
  );
}
