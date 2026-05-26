import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header minimal */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center
                            group-hover:bg-primary-dark transition-colors">
              <span className="text-white font-black text-sm leading-none select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold text-primary mb-2">
          Politique de Confidentialité
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Dernière mise à jour : mai 2026 · Conforme RGPD
        </p>

        <div className="space-y-8 text-gray-600 leading-relaxed text-sm">

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles collectées via Adoptly est
              l'éditeur du service. Pour toute question relative à vos données, contactez-nous à :
              <br />
              <a href="mailto:info@adoptly.fr" className="text-secondary font-medium">
                info@adoptly.fr
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">2. Données collectées</h2>
            <p className="mb-3">Nous collectons les données suivantes :</p>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div>
                <p className="font-semibold text-gray-700 text-sm">Adoptants</p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-gray-500">
                  <li>Adresse email et mot de passe chiffré (bcrypt)</li>
                  <li>Prénom et nom (optionnels, fournis volontairement)</li>
                  <li>Réponses au questionnaire de compatibilité (logement, mode de vie, préférences)</li>
                  <li>Historique des swipes (animaux vus, direction du swipe)</li>
                  <li>Localisation approximative (saisie manuelle pour le rayon de recherche)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-700 text-sm">Refuges</p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-gray-500">
                  <li>Email, nom, téléphone, adresse du refuge</li>
                  <li>Mot de passe chiffré (bcrypt)</li>
                  <li>Informations sur les animaux publiés (photos, caractéristiques)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">3. Finalités du traitement</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Gestion des comptes</strong> : authentification, sécurité, communication.</li>
              <li><strong>Algorithme de matching</strong> : mise en relation Adoptants / Refuges sur la base des préférences.</li>
              <li><strong>Notifications email</strong> : emails de bienvenue, notifications de match, réinitialisation de mot de passe.</li>
              <li><strong>Amélioration du service</strong> : analyse statistique anonymisée de l'utilisation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">4. Base légale</h2>
            <p>
              Le traitement est fondé sur l'<strong>exécution du contrat</strong> (article 6(1)(b) RGPD)
              pour les fonctionnalités essentielles, et sur notre <strong>intérêt légitime</strong>
              (article 6(1)(f)) pour les communications liées au service.
              Lorsque votre consentement est requis, il vous sera explicitement demandé.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">5. Partage des données</h2>
            <p className="mb-2">
              Vos données sont partagées de manière limitée :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Email des Adoptants → Refuges</strong> : uniquement lorsqu'un match est
                créé (swipe à droite), afin de permettre au refuge de vous contacter.
              </li>
              <li>
                <strong>Supabase</strong> (hébergement base de données, Irlande — UE) :
                sous-traitant conforme RGPD.
              </li>
              <li>
                <strong>Resend</strong> (envoi d'emails, États-Unis) : sous-traitant conforme
                aux clauses contractuelles types de l'UE.
              </li>
            </ul>
            <p className="mt-2">
              Nous ne vendons jamais vos données à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">6. Durée de conservation</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Données de compte : conservées tant que le compte est actif.</li>
              <li>Après suppression du compte : données effacées sous 30 jours.</li>
              <li>Logs techniques : 30 jours maximum.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">7. Vos droits (RGPD)</h2>
            <p className="mb-3">
              Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['👁️', 'Accès', 'Obtenir une copie de vos données'],
                ['✏️', 'Rectification', 'Corriger vos données inexactes'],
                ['🗑️', 'Effacement', 'Supprimer vos données (droit à l\'oubli)'],
                ['⏸️', 'Limitation', 'Suspendre un traitement'],
                ['📦', 'Portabilité', 'Exporter vos données'],
                ['✋', 'Opposition', 'Refuser certains traitements'],
              ].map(([emoji, title, desc]) => (
                <div key={title} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-700 text-xs">{emoji} {title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:info@adoptly.fr" className="text-secondary font-medium">
                info@adoptly.fr
              </a>.
              Vous pouvez également introduire une réclamation auprès de la{' '}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary font-medium"
              >
                CNIL
              </a>{' '}
              (France) ou de l'
              <a
                href="https://www.autoriteprotectiondonnees.be"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary font-medium"
              >
                APD
              </a>{' '}
              (Belgique).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">8. Cookies</h2>
            <p>
              Adoptly n'utilise pas de cookies publicitaires ou de traçage tiers.
              Un token d'authentification est stocké dans <code className="bg-gray-100 px-1 rounded">localStorage</code>
              &nbsp;uniquement pour maintenir votre session active. Il ne contient aucune donnée sensible.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">9. Sécurité</h2>
            <p>
              Vos mots de passe sont chiffrés avec bcrypt (facteur de coût 10).
              Les communications sont chiffrées via HTTPS/TLS.
              L'accès aux données est restreint par des tokens JWT à durée limitée (30 jours).
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link to="/legal/cgu" className="text-secondary hover:underline">
            Conditions Générales d'Utilisation
          </Link>
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
