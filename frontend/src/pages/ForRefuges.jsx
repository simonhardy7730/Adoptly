import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const etapes = [
  {
    emoji: '📝',
    title: 'Inscrivez votre refuge',
    desc: "Créez votre compte en 5 minutes : nom du refuge, adresse, coordonnées. Aucune compétence technique requise.",
    detail: '5 min top chrono',
  },
  {
    emoji: '🐾',
    title: 'Mettez vos animaux en ligne',
    desc: "Ajoutez une photo, quelques mots sur le caractère de l'animal et ses critères de compatibilité. C'est tout.",
    detail: '2 min par animal',
  },
  {
    emoji: '💚',
    title: 'Recevez des familles compatibles',
    desc: "Notre algorithme présente vos animaux uniquement aux adoptants vraiment compatibles. Vous êtes notifié à chaque intérêt.",
    detail: 'Notifications en temps réel',
  },
];

const avantages = [
  { emoji: '💚', title: '100 % gratuit', desc: "Sans abonnement, sans commission, sans limite d'animaux. Pour toujours." },
  { emoji: '🎯', title: 'Adoptants pré-qualifiés', desc: "Notre algorithme filtre. Vous ne recevez que des demandes de familles réellement compatibles avec vos animaux." },
  { emoji: '📬', title: 'Notifications immédiates', desc: "Un email à chaque fois qu'un adoptant exprime un intérêt pour un de vos animaux." },
  { emoji: '📊', title: 'Tableau de bord clair', desc: "Suivez les matchs, les contacts et l'état de chaque animal depuis une interface simple." },
  { emoji: '⚡', title: 'Mise en ligne en 10 min', desc: "De la création du compte à la première fiche publiée, moins de 10 minutes." },
  { emoji: '🔒', title: 'Vos données protégées', desc: "Vos coordonnées ne sont communiquées aux adoptants qu'après confirmation de leur intérêt." },
];

const faqs = [
  {
    q: "C'est vraiment gratuit ? Il n'y a pas de frais cachés ?",
    a: "Oui, totalement gratuit. Pas d'abonnement, pas de commission sur les adoptions, pas de limite d'animaux. Notre modèle économique reposera un jour sur des options premium pour les grands refuges — jamais sur une obligation pour les petites associations.",
  },
  {
    q: 'Combien de temps pour se lancer ?',
    a: "Moins de 10 minutes. Création du compte (5 min) + première fiche animal (2-3 min). Après, chaque nouvel animal prend 2 minutes à mettre en ligne.",
  },
  {
    q: "Est-ce que ça remplace notre site ou nos réseaux sociaux ?",
    a: "Non, c'est complémentaire. Adoptly vous apporte un flux d'adoptants pré-qualifiés supplémentaire. Vous gardez le contrôle total sur vos adoptions et continuez à utiliser vos canaux habituels.",
  },
  {
    q: "Comment fonctionne l'algorithme de compatibilité ?",
    a: "Les adoptants répondent à 14 questions sur leur mode de vie (logement, enfants, animaux présents, budget, activité…). L'algorithme croise ces données avec les besoins de chaque animal et ne présente l'animal qu'aux profils vraiment compatibles. Résultat : moins d'adoptions ratées.",
  },
  {
    q: "Quelles informations les adoptants voient-ils ?",
    a: "Les adoptants voient la fiche de l'animal (photo, caractère, besoins) et le nom de votre refuge. Votre email et téléphone ne sont partagés qu'une fois que l'adoptant a exprimé un intérêt — et vous en êtes notifié immédiatement.",
  },
];

const fadeUpView = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="font-semibold text-gray-800 text-sm">{q}</span>
        <span className={`text-secondary flex-shrink-0 text-xl font-light transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
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

export default function ForRefuges() {
  return (
    <div className="min-h-screen bg-bg-light overflow-x-hidden">

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-colors">
              <span className="text-white font-black text-sm leading-none select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/adoptant/login" className="hidden md:block btn-ghost text-sm py-1.5 px-4 text-gray-500">
              Je cherche à adopter
            </Link>
            <Link to="/shelter/login" className="btn-ghost text-sm py-1.5 px-4">
              Connexion
            </Link>
            <Link to="/shelter/register" className="btn-primary text-sm py-2 px-4">
              Inscrire mon refuge →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
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

        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-white text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-sm font-semibold mb-6"
          >
            🏠 Pour les refuges & associations animales
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            Vos pensionnaires méritent
            <br />
            <span className="text-orange-300">la bonne famille.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-blue-100 mb-3 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            Adoptly connecte votre refuge avec des adoptants pré-qualifiés grâce à un algorithme de compatibilité.
            <strong className="text-white"> Gratuitement.</strong>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center mt-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
          >
            <Link
              to="/shelter/register"
              className="bg-accent hover:bg-orange-500 text-white font-bold px-7 py-4 rounded-2xl
                         text-base shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              Inscrire mon refuge — c'est gratuit
            </Link>
            <Link
              to="/shelter/login"
              className="bg-white/10 hover:bg-white/18 text-white font-semibold px-7 py-4 rounded-2xl
                         text-base border border-white/25 backdrop-blur-sm active:scale-95 transition-all"
            >
              Déjà inscrit ? Connexion
            </Link>
          </motion.div>

          <motion.p
            className="text-blue-200/60 text-xs mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            🔒 Sans carte bancaire · Sans engagement · Belgique & Nord de la France
          </motion.p>
        </div>
      </section>

      {/* ── Chiffres ───────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '100 %', label: 'gratuit',            emoji: '💚' },
              { value: '< 10 min', label: 'pour démarrer',  emoji: '⚡' },
              { value: '14',    label: 'critères analysés',  emoji: '🎯' },
              { value: '0',     label: 'commission prélevée',emoji: '🔒' },
            ].map((s, i) => (
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

      {/* ── Problème ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <motion.div {...fadeUpView()} className="space-y-6">
          <div className="inline-block bg-accent-light border border-orange-100 text-accent font-bold text-3xl md:text-4xl px-6 py-3 rounded-2xl">
            1 adoption sur 4
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-primary">
            revient au refuge dans les 12 mois.
          </h2>
          <p className="text-gray-600 leading-relaxed max-w-xl mx-auto">
            Pas par mauvaise volonté — mais par mauvaise compatibilité. Adoptly réduit ce chiffre
            en analysant le mode de vie de chaque adoptant avant de lui présenter vos animaux.
            Moins de retours. Plus d'adoptions qui durent.
          </p>
        </motion.div>
      </section>

      {/* ── Comment ça marche ──────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUpView()} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-primary">
              Trois étapes.
              <span className="text-secondary"> Aucune complexité.</span>
            </h2>
            <p className="text-gray-400 mt-2">De l'inscription à votre premier match en moins de 10 minutes.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {etapes.map((etape, i) => (
              <motion.div
                key={etape.title}
                className="relative p-6 rounded-3xl border-2 border-gray-100
                           hover:border-secondary/30 hover:shadow-card transition-all"
                {...fadeUpView(i * 0.15)}
              >
                <div className="w-8 h-8 bg-primary text-white rounded-full text-sm font-bold
                                flex items-center justify-center mb-4">
                  {i + 1}
                </div>
                <div className="text-4xl mb-3">{etape.emoji}</div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{etape.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">{etape.desc}</p>
                <span className="inline-block text-xs bg-primary-light text-secondary font-semibold px-3 py-1 rounded-full">
                  ⚡ {etape.detail}
                </span>
                {i < etapes.length - 1 && (
                  <div className="hidden md:block absolute top-12 -right-3 text-gray-300 text-xl z-10">→</div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/shelter/register" className="btn-primary inline-block px-8 py-4 text-base">
              Inscrire mon refuge gratuitement →
            </Link>
            <p className="text-gray-400 text-xs mt-3">Sans carte bancaire. Sans engagement.</p>
          </div>
        </div>
      </section>

      {/* ── Avantages ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <motion.div {...fadeUpView()} className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-primary">Tout ce dont votre refuge a besoin.</h2>
          <p className="text-gray-400 mt-2">Sans rien dont vous n'avez pas besoin.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {avantages.map((a, i) => (
            <motion.div key={a.title} className="card p-5 space-y-2" {...fadeUpView(i * 0.08)}>
              <p className="text-3xl">{a.emoji}</p>
              <h3 className="font-bold text-gray-800">{a.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Aperçu dashboard ───────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="card p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <span className="section-label">Votre tableau de bord</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-primary leading-tight">
                  Suivez chaque animal, chaque intérêt.
                </h2>
                <p className="text-gray-500 leading-relaxed">
                  Depuis votre espace refuge, visualisez en temps réel le nombre de matchs et de
                  contacts pour chaque animal. Cliquez pour voir qui est intéressé et les contacter
                  directement.
                </p>
                <Link to="/shelter/register" className="btn-primary inline-block text-sm py-3 px-6">
                  Créer mon espace refuge →
                </Link>
              </div>

              {/* Mini dashboard preview */}
              <div className="bg-bg-light rounded-2xl p-5 space-y-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Votre impact ce mois-ci
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: '12', l: 'Animaux', e: '🐾' },
                    { n: '47', l: 'Matchs',  e: '💚' },
                    { n: '8',  l: 'Contacts',e: '📬' },
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
                    { name: 'Luna', status: 'En recherche de famille', color: 'bg-green-100 text-green-700' },
                    { name: 'Milo', status: 'A trouvé sa famille 🎉',  color: 'bg-purple-100 text-purple-700' },
                    { name: 'Rex',  status: '3 familles intéressées',  color: 'bg-blue-100 text-blue-700' },
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
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <motion.div {...fadeUpView()} className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-primary">Questions fréquentes</h2>
          <p className="text-gray-400 mt-2 text-sm">Tout ce que vous voulez savoir avant de vous lancer.</p>
        </motion.div>
        <motion.div className="card p-6 md:p-8 divide-y divide-gray-100" {...fadeUpView(0.1)}>
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

      {/* ── CTA final ──────────────────────────────────────── */}
      <section className="bg-cta-gradient py-20 text-center text-white">
        <div className="max-w-lg mx-auto px-6 space-y-6">
          <motion.p
            className="text-orange-300 font-semibold text-sm uppercase tracking-widest"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Gratuit · Sans engagement · 10 minutes pour démarrer
          </motion.p>
          <motion.h2
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            {...fadeUpView()}
          >
            Prêt à trouver de meilleures familles pour vos animaux ?
          </motion.h2>
          <motion.p
            className="text-blue-100 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Rejoignez les refuges partenaires d'Adoptly.<br />
            Inscrivez-vous en 5 minutes.
          </motion.p>
          <motion.div {...fadeUpView(0.2)}>
            <Link
              to="/shelter/register"
              className="inline-block bg-accent hover:bg-orange-500 text-white font-bold
                         px-10 py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl
                         active:scale-95 transition-all"
            >
              Inscrire mon refuge — c'est gratuit →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
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
              <p className="text-gray-400 text-sm font-medium">Pour les adoptions qui durent.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/"               className="text-gray-400 hover:text-primary transition-colors">Accueil</Link>
              <Link to="/adoptant/login" className="text-gray-400 hover:text-primary transition-colors">Espace adoptant</Link>
              <Link to="/shelter/login"  className="text-gray-400 hover:text-primary transition-colors">Espace refuge</Link>
              <Link to="/refuges"        className="text-gray-400 hover:text-primary transition-colors">Nos refuges</Link>
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
