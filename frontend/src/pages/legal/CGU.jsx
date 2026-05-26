import { Link } from 'react-router-dom';

export default function CGU() {
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

      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-sm prose-gray">
        <h1 className="text-2xl font-extrabold text-primary mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-gray-400 text-sm mb-8">Dernière mise à jour : mai 2026</p>

        <section className="space-y-6 text-gray-600 leading-relaxed">

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">1. Présentation du service</h2>
            <p>
              Adoptly est une plateforme en ligne d'aide à l'adoption animale responsable.
              Elle met en relation des particuliers souhaitant adopter un animal
              (ci-après « Adoptants ») avec des refuges et associations de protection animale
              (ci-après « Refuges »), sur la base d'un algorithme de compatibilité.
            </p>
            <p className="mt-2">
              Adoptly est édité et exploité à titre personnel. Pour toute question,
              contactez-nous à&nbsp;
              <a href="mailto:info@adoptly.fr" className="text-secondary font-medium">
                info@adoptly.fr
              </a>.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">2. Accès au service</h2>
            <p>
              L'utilisation d'Adoptly est gratuite pour les Adoptants et pour les Refuges
              dans le cadre de la version MVP actuelle. L'accès nécessite la création d'un
              compte avec une adresse email valide.
            </p>
            <p className="mt-2">
              Vous devez avoir au moins 18 ans pour créer un compte et utiliser le service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">3. Obligations des utilisateurs</h2>
            <p>En utilisant Adoptly, vous vous engagez à :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Fournir des informations exactes et sincères lors de votre inscription.</li>
              <li>Ne pas usurper l'identité d'un tiers ou d'un refuge.</li>
              <li>Utiliser la plateforme uniquement à des fins légales et dans le respect du bien-être animal.</li>
              <li>Ne pas tenter de pirater, perturber ou contourner les mesures de sécurité du service.</li>
              <li>Ne pas publier de contenu illégal, offensant ou trompeur.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">4. Responsabilité d'Adoptly</h2>
            <p>
              Adoptly est un intermédiaire technique facilitant la mise en relation.
              Nous ne sommes pas parties aux relations entre Adoptants et Refuges, et
              n'assumons aucune responsabilité quant à l'exactitude des informations
              publiées par les Refuges, ni quant aux suites données aux mises en relation.
            </p>
            <p className="mt-2">
              Adoptly s'efforce d'assurer la disponibilité du service mais ne garantit pas
              une disponibilité permanente et ininterrompue.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">5. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments composant la plateforme (textes, graphismes, algorithmes,
              logo, marque « Adoptly ») sont protégés par les droits de propriété intellectuelle
              applicables. Toute reproduction ou utilisation sans autorisation préalable est interdite.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">6. Suppression de compte</h2>
            <p>
              Vous pouvez demander la suppression de votre compte et de vos données personnelles
              à tout moment en nous contactant à{' '}
              <a href="mailto:info@adoptly.fr" className="text-secondary font-medium">
                info@adoptly.fr
              </a>.
              Nous traiterons votre demande dans un délai de 30 jours.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">7. Modification des CGU</h2>
            <p>
              Adoptly se réserve le droit de modifier les présentes CGU à tout moment.
              Les utilisateurs seront informés des modifications importantes par email.
              La poursuite de l'utilisation du service après modification vaut acceptation
              des nouvelles CGU.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">8. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit français. En cas de litige,
              les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.
            </p>
          </div>

        </section>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link to="/legal/privacy" className="text-secondary hover:underline">
            Politique de confidentialité
          </Link>
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
