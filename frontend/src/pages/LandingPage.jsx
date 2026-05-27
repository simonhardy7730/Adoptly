import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../lib/api';

// ── Données ──────────────────────────────────────────────────────────────────

const microTestimonials = [
  { stars: 5, text: '"Enfin une adoption qu\'on ne regrette pas."', author: 'Marie L., Bruxelles' },
  { stars: 5, text: '"Léo était exactement comme décrit. Le coup de foudre."', author: 'Thomas B., Liège' },
  { stars: 5, text: '"Le refuge nous a rappelés dans l\'heure."', author: 'Camille R., Namur' },
];

const etapes = [
  {
    emoji: '🧩',
    title: 'Dressez votre portrait',
    desc: 'Logement, rythme de vie, expérience avec les animaux. Quelques questions pensées pour trouver la vraie compatibilité.',
  },
  {
    emoji: '💚',
    title: 'Rencontrez vos compatibilités',
    desc: "On vous présente des animaux sélectionnés pour vous, dans des refuges proches. Pas des centaines — les bons.",
  },
  {
    emoji: '🏡',
    title: 'Écrivez une belle histoire',
    desc: 'Un appel, une visite, une famille. Le refuge vous accompagne à chaque étape.',
  },
];

const avantagsRefuge = [
  { emoji: '⚡', text: 'Inscription et mise en ligne en moins de 10 minutes' },
  { emoji: '🎯', text: 'Recevez uniquement des demandes de familles compatibles' },
  { emoji: '📬', text: 'Notification email à chaque intérêt qualifié' },
  { emoji: '📊', text: 'Tableau de bord pour suivre chaque prise de contact' },
  { emoji: '💚', text: '100 % gratuit pour les associations partenaires' },
];

const stats = [
  { value: '14', label: 'critères analysés', emoji: '🧩' },
  { value: '< 3 min', label: 'pour s\'inscrire', emoji: '⚡' },
  { value: '100 %', label: 'gratuit refuges', emoji: '💚' },
  { value: 'Belgique', label: '& Nord de France', emoji: '📍' },
];

const faqs = [
  {
    q: 'C\'est vraiment gratuit pour les refuges ?',
    a: 'Oui, et ça le restera. Adoptly est gratuit pour tous les refuges et associations partenaires, sans limite d\'animaux, sans abonnement, sans commission sur les adoptions. Notre modèle économique reposera sur des services premium optionnels pour les grands refuges — jamais sur une obligation.',
  },
  {
    q: 'Combien de temps pour mettre en ligne un premier animal ?',
    a: 'Moins de 10 minutes depuis la création du compte jusqu\'à la première fiche publiée. Il vous faut : le nom de l\'animal, son espèce, son caractère, une photo et quelques critères de compatibilité. C\'est tout.',
  },
  {
    q: 'Est-ce que ça remplace notre site internet ou nos réseaux sociaux ?',
    a: 'Non, c\'est complémentaire. Adoptly s\'ajoute à vos canaux existants et vous apporte un flux d\'adoptants pré-qualifiés que vous n\'auriez pas touchés autrement. Vous gardez le contrôle total sur vos adoptions.',
  },
  {
    q: 'Comment fonctionne l\'algorithme de compatibilité ?',
    a: 'Les adoptants répondent à 14 questions sur leur mode de vie (superficie du logement, présence d\'enfants, animaux existants, niveau d\'activité, budget...). L\'algorithme croise ces réponses avec les besoins de chaque animal — distance, compatibilités, caractère — et ne présente l\'animal qu\'aux profils vraiment compatibles.',
  },
  {
    q: 'Quelles informations sont transmises aux adoptants ?',
    a: 'Les adoptants voient la fiche de votre animal (photo, caractère, besoins) et le nom de votre refuge. Vos coordonnées précises (email, téléphone) ne sont partagées qu\'une fois que l\'adoptant a exprimé un intérêt — et vous en êtes notifié immédiatement.',
  },
];

const animaux = ['🐕', '🐈', '🐇', '🐹', '🦜', '🐕‍🦺'];

const heroPhotos = [
  { src: 'photo-1552053831-71594a27632d', alt: 'Golden Retriever', label: 'Chien' },
  { src: 'photo-1514888286974-6c03e2ca1dba', alt: 'Chat mignon',    label: 'Chat' },
  { src: 'photo-1585110396000-c9ffd4e4b308', alt: 'Lapin nain',     label: 'Lapin' },
  { src: 'photo-1587300003388-59208cc962cb', alt: 'Labrador',        label: 'Chien' },
  { src: 'photo-1543466835-00a7907e9de1',    alt: 'Hamster',         label: 'Hamster' },
  { src: 'photo-1495360010541-f48722b34f7d', alt: 'Chat roux',       label: 'Chat' },
  { src: 'photo-1561037404-61cd46aa615b',    alt: 'Jack Russell',      label: 'Chien' },
  { src: 'photo-1573865526739-10659fec78a5', alt: 'Chaton',          label: 'Chat' },
];

// ── Variants d'animation ──────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

const fadeUpView = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

// ── Composants ────────────────────────────────────────────────────────────────

function PreviewCard() {
  return (
    <motion.div
      className="w-56 bg-white rounded-3xl shadow-2xl overflow-hidden"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
    >
      <div className="h-40 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80"
          alt="Chien adorable"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary text-lg">Luna</span>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Joueur</span>
        </div>
        <p className="text-gray-400 text-xs">Border Collie · 2 ans · 8 km</p>
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg font-medium">✓ Compatible enfants</span>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">✓ Adapté appartement</span>
        </div>
      </div>
      <div className="px-4 pb-4 flex justify-between">
        <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-lg">👋</div>
        <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center text-xl shadow-md">💚</div>
      </div>
    </motion.div>
  );
}

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

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="font-semibold text-gray-800 text-sm md:text-base">{q}</span>
        <span className={`text-secondary flex-shrink-0 text-xl font-light transition-transform ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-gray-500 text-sm leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimalPhotoStrip() {
  return (
    <div className="relative overflow-hidden py-8 bg-white border-b border-gray-100">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-3 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {[...heroPhotos, ...heroPhotos].map((photo, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-36 h-36 rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative group"
          >
            <img
              src={`https://images.unsplash.com/${photo.src}?auto=format&fit=crop&w=160&q=75`}
              alt={photo.alt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [partnerShelters, setPartnerShelters] = useState([]);

  useEffect(() => {
    api.get('/public/shelters')
      .then(({ data }) => setPartnerShelters(data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bg-light overflow-x-hidden">

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <AdoptlyLogo />
          <div className="flex items-center gap-1">
            <Link
              to="/pour-les-refuges"
              className="hidden md:block btn-ghost text-sm py-1.5 px-4 text-gray-500"
            >
              Pour les refuges
            </Link>
            <Link to="/adoptant/login" className="btn-ghost text-sm py-1.5 px-4">
              Connexion
            </Link>
            <Link to="/adoptant/register" className="btn-primary text-sm py-2 px-4">
              Commencer →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-light/20 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-center gap-12">

            <div className="flex-1 text-white text-center md:text-left">
              <div className="flex justify-center md:justify-start gap-3 mb-8">
                {animaux.map((emoji, i) => (
                  <motion.span
                    key={i}
                    className="text-2xl"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.28, ease: 'easeInOut' }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>

              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-5"
                {...fadeUp(0)}
              >
                Votre prochain compagnon
                <br />
                <span className="text-orange-300">vous attend déjà.</span>
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-blue-100 mb-3 leading-relaxed max-w-lg mx-auto md:mx-0"
                {...fadeUp(0.12)}
              >
                Dites-nous qui vous êtes.
                <br className="hidden md:block" />
                On s'occupe du reste.
              </motion.p>

              <motion.p
                className="text-blue-200/80 text-sm mb-8 max-w-md mx-auto md:mx-0 leading-relaxed"
                {...fadeUp(0.22)}
              >
                Découvrez des animaux adaptés à votre mode de vie — sélectionnés par notre
                algorithme de compatibilité, pas au hasard.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-6"
                {...fadeUp(0.32)}
              >
                <Link
                  to="/adoptant/register"
                  className="bg-accent hover:bg-orange-500 text-white font-bold px-7 py-4 rounded-2xl
                             text-base shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                  Trouver mon compagnon idéal
                </Link>
                <Link
                  to="/pour-les-refuges"
                  className="bg-white/10 hover:bg-white/18 text-white font-semibold px-7 py-4 rounded-2xl
                             text-base border border-white/25 backdrop-blur-sm active:scale-95 transition-all"
                >
                  Je représente un refuge
                </Link>
              </motion.div>

              <motion.p
                className="text-blue-200/60 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                🔒 Gratuit · Sans carte bancaire · Belgique & Nord de la France
              </motion.p>
            </div>

            <div className="hidden md:flex flex-shrink-0 justify-center">
              <div className="relative">
                <div className="absolute -inset-6 bg-white/8 rounded-[2.5rem] blur-2xl" />
                <PreviewCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bande photos animaux ──────────────────────────────── */}
      <AnimalPhotoStrip />

      {/* ── Chiffres clés ─────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center space-y-1"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <p className="text-2xl">{s.emoji}</p>
                <p className="text-2xl font-extrabold text-primary">{s.value}</p>
                <p className="text-gray-400 text-xs leading-tight">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Micro-témoignages ─────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {microTestimonials.map((t, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-yellow-400 text-sm mt-0.5 flex-shrink-0">
                  {'★'.repeat(t.stars)}
                </span>
                <div>
                  <p className="text-gray-700 text-sm italic">{t.text}</p>
                  <p className="text-gray-400 text-xs mt-0.5">— {t.author}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problème ──────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <motion.div {...fadeUpView()} className="space-y-6">
          <div className="inline-block bg-accent-light border border-orange-100 text-accent font-bold text-3xl md:text-4xl px-6 py-3 rounded-2xl">
            1 adoption sur 4
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-primary">
            revient au refuge dans les 12 mois.
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto">
            Pas par mauvaise volonté — mais par mauvaise compatibilité.
          </p>
          <p className="text-gray-600 leading-relaxed max-w-xl mx-auto">
            Adoptly part d'une conviction simple : un animal heureux, c'est un animal dans le bon
            foyer. Pas juste le foyer le plus rapide. Nous analysons votre mode de vie pour vous
            présenter les animaux qui vous correspondent réellement — et réduire les adoptions
            ratées.
          </p>
        </motion.div>
      </section>

      {/* ── Comment ça marche ─────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUpView()} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-primary">
              Simple pour vous.
              <span className="text-secondary"> Intelligent en coulisses.</span>
            </h2>
            <p className="text-gray-400 mt-2">Trois étapes. Aucune complexité.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {etapes.map((etape, i) => (
              <motion.div
                key={etape.title}
                className="relative p-6 rounded-3xl border-2 border-gray-100
                           hover:border-secondary/30 hover:shadow-card transition-all group"
                {...fadeUpView(i * 0.15)}
              >
                <div className="w-8 h-8 bg-primary text-white rounded-full text-sm font-bold
                                flex items-center justify-center mb-4">
                  {i + 1}
                </div>
                <div className="text-4xl mb-3">{etape.emoji}</div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{etape.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{etape.desc}</p>
                {i < etapes.length - 1 && (
                  <div className="hidden md:block absolute top-12 -right-3 text-gray-300 text-xl z-10">→</div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/adoptant/register" className="btn-primary inline-block px-8 py-4 text-base">
              Trouver mon compagnon idéal
            </Link>
            <p className="text-gray-400 text-xs mt-3">Gratuit. Sans engagement.</p>
          </div>
        </div>
      </section>

      {/* ── Compatibilité / différenciation ───────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <span className="section-label">Notre approche</span>
            <h2 className="text-3xl font-extrabold text-primary leading-tight">
              Ce n'est pas qu'une question de coup de cœur.
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Notre algorithme de compatibilité prend en compte 14 critères — de la superficie de
              votre logement à votre rapport à l'activité physique, en passant par la présence
              d'enfants ou d'autres animaux.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Le résultat : des présentations qui ont du sens, des adoptions qui tiennent.
            </p>
            <Link
              to="/adoptant/register"
              className="inline-flex items-center gap-2 text-secondary font-semibold hover:gap-3 transition-all"
            >
              Créer mon profil de compatibilité →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div className="card p-5 w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=80&q=80"
                    alt="Chat"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Milo</p>
                  <p className="text-gray-400 text-sm">Européen · 3 ans · 4 km</p>
                </div>
                <span className="ml-auto text-xs bg-primary-light text-secondary px-2.5 py-1 rounded-full font-semibold">
                  Très compatible
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Compatible enfants',   color: 'bg-green-50 text-green-700' },
                  { label: 'Adapté appartement',   color: 'bg-blue-50 text-blue-700'   },
                  { label: 'Calme & indépendant',  color: 'bg-gray-50 text-gray-600'   },
                  { label: 'Aucun besoin spécial', color: 'bg-purple-50 text-purple-700' },
                ].map((b) => (
                  <div key={b.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${b.color}`}>
                    <span>✓</span> {b.label}
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-xs text-center">Refuge Sans Famille · Namur</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Témoignage long ───────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div {...fadeUpView()} className="space-y-5">
            <div className="text-4xl">💬</div>
            <blockquote className="text-xl md:text-2xl font-medium text-gray-700 leading-relaxed">
              "Je cherchais depuis 6 mois sur les sites habituels. Trop d'animaux, aucun filtre
              vraiment utile. Avec Adoptly, on m'a présenté 4 animaux en une soirée. Le deuxième,
              c'était Nino. On ne s'est plus quittés."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center
                              font-bold text-primary">
                S
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800 text-sm">Sophie M.</p>
                <p className="text-gray-400 text-xs">Adoptante à Bruxelles · il y a 3 mois</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Refuges partenaires (social proof) ───────────────── */}
      {partnerShelters.length > 0 && (
        <section className="bg-white border-y border-gray-100 py-10 overflow-hidden">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div
              {...fadeUpView()}
              className="text-center mb-6"
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Ils font déjà confiance à Adoptly
              </p>
              <p className="text-gray-500 text-sm">
                {partnerShelters.length} refuge{partnerShelters.length > 1 ? 's' : ''} partenaire{partnerShelters.length > 1 ? 's' : ''} en Belgique et Nord de la France
              </p>
            </motion.div>

            {/* Défilement infini des noms de refuges */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
              <motion.div
                className="flex gap-3 flex-wrap justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                {partnerShelters.map((shelter, i) => (
                  <motion.span
                    key={shelter.id}
                    className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100
                               text-gray-600 text-sm font-medium px-3 py-1.5 rounded-full
                               hover:bg-primary-light hover:text-primary hover:border-secondary/20
                               transition-colors cursor-default"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <span className="text-xs">🏠</span>
                    {shelter.name}
                    {shelter.city && (
                      <span className="text-gray-400 font-normal">· {shelter.city}</span>
                    )}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section refuges ───────────────────────────────────── */}
      <section className="bg-bg-light py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="card p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <span className="section-label">Pour les refuges & associations</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary leading-tight">
                  Donnez à chaque animal la visibilité qu'il mérite.
                </h2>
                <p className="text-gray-500 leading-relaxed">
                  Adoptly vous offre une vitrine numérique moderne et des outils de suivi —
                  sans frais, sans complexité. Vos animaux, visibles aux bonnes personnes.
                </p>
                <ul className="space-y-3">
                  {avantagsRefuge.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                      <span className="flex-shrink-0 mt-0.5">{item.emoji}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/pour-les-refuges" className="btn-primary text-sm py-3 px-6 text-center">
                    Rejoindre comme refuge partenaire
                  </Link>
                  <Link to="/shelter/login" className="btn-secondary text-sm py-3 px-6 text-center">
                    Se connecter
                  </Link>
                </div>
                <p className="text-gray-400 text-xs">
                  Mise en ligne en moins de 10 minutes. Aucun engagement.
                </p>
              </div>

              {/* Mini dashboard preview */}
              <div className="hidden md:block">
                <div className="bg-bg-light rounded-2xl p-5 space-y-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Votre impact ce mois-ci
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { n: '12', l: 'Animaux listés', e: '🐾' },
                      { n: '47', l: 'Matchs',         e: '💚' },
                      { n: '8',  l: 'Contacts',       e: '📬' },
                    ].map((s) => (
                      <div key={s.l} className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <p className="text-base">{s.e}</p>
                        <p className="font-extrabold text-primary text-lg">{s.n}</p>
                        <p className="text-gray-400 text-xs leading-tight">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Luna', status: 'En recherche de famille',  color: 'bg-green-100 text-green-700'  },
                      { name: 'Milo', status: 'A trouvé sa famille 🎉',   color: 'bg-purple-100 text-purple-700' },
                      { name: 'Rex',  status: 'En recherche de famille',  color: 'bg-green-100 text-green-700'  },
                    ].map((a) => (
                      <div key={a.name} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary-light rounded-lg flex items-center justify-center text-sm">🐾</div>
                          <span className="font-medium text-gray-700 text-sm">{a.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.color}`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <motion.div {...fadeUpView()} className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-primary">Questions fréquentes</h2>
          <p className="text-gray-400 mt-2 text-sm">Tout ce que vous voulez savoir avant de vous lancer.</p>
        </motion.div>
        <motion.div
          className="card p-6 md:p-8 divide-y divide-gray-100"
          {...fadeUpView(0.1)}
        >
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </motion.div>
        <p className="text-center text-gray-400 text-sm mt-6">
          Une autre question ?{' '}
          <a href="mailto:info@adoptly.fr" className="text-secondary hover:underline font-medium">
            Écrivez-nous →
          </a>
        </p>
      </section>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <section className="bg-cta-gradient py-20 text-center text-white">
        <div className="max-w-lg mx-auto px-6 space-y-6">
          <motion.p
            className="text-orange-300 font-semibold text-sm uppercase tracking-widest"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Gratuit · Sans engagement
          </motion.p>
          <motion.h2
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            {...fadeUpView()}
          >
            Votre prochain compagnon vous attend peut-être à 12 km.
          </motion.h2>
          <motion.p
            className="text-blue-100 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Créez votre profil en 3 minutes.
            <br />
            Découvrez vos premières compatibilités aujourd'hui.
          </motion.p>
          <motion.div {...fadeUpView(0.2)} className="space-y-3">
            <Link
              to="/adoptant/register"
              className="inline-block bg-accent hover:bg-orange-500 text-white font-bold
                         px-10 py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl
                         active:scale-95 transition-all"
            >
              Trouver mon compagnon idéal
            </Link>
            <div>
              <Link
                to="/pour-les-refuges"
                className="inline-block text-white/70 hover:text-white text-sm underline underline-offset-2 transition-colors"
              >
                Vous êtes un refuge ? Rejoignez-nous gratuitement →
              </Link>
            </div>
            <p className="text-blue-200/50 text-xs">Pour les adoptions qui durent.</p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-white font-black text-xs select-none">A</span>
                </div>
                <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Pas juste un animal. Le vôtre.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/shelter/login"    className="text-gray-400 hover:text-primary transition-colors">Espace refuge</Link>
              <Link to="/adoptant/login"   className="text-gray-400 hover:text-primary transition-colors">Espace adoptant</Link>
              <Link to="/pour-les-refuges" className="text-gray-400 hover:text-primary transition-colors">Devenir partenaire</Link>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-300 text-xs">
              © {new Date().getFullYear()} Adoptly · Belgique & Nord de la France · 100 % gratuit pour les associations
            </p>
            <div className="flex gap-4 text-xs">
              <Link to="/legal/cgu"     className="text-gray-300 hover:text-gray-500 transition-colors">CGU</Link>
              <Link to="/legal/privacy" className="text-gray-300 hover:text-gray-500 transition-colors">Confidentialité</Link>
              <a href="mailto:info@adoptly.fr" className="text-gray-300 hover:text-gray-500 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
