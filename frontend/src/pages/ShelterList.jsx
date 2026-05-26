import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';

const SPECIES_EMOJI = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾',
};

const SPECIES_LABEL = {
  dog: 'Chiens', cat: 'Chats', rabbit: 'Lapins', guinea_pig: 'Cobayes', other: 'Autres',
};

export default function ShelterList() {
  const [shelters, setShelters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    api.get('/public/shelters')
      .then(({ data }) => setShelters(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = shelters.filter((s) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-light">

      {/* Navbar légère */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center
                            group-hover:bg-primary-dark transition-colors">
              <span className="text-white font-black text-sm leading-none select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/adoptant/login" className="btn-primary text-sm py-1.5 px-4">
              Trouver un animal →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* En-tête */}
        <div className="text-center space-y-3">
          <div className="text-4xl">🏠</div>
          <h1 className="text-3xl font-extrabold text-primary">Nos refuges partenaires</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            Ces refuges engagés font confiance à Adoptly pour trouver des familles
            compatibles avec leurs pensionnaires.
          </p>
        </div>

        {/* Barre de recherche */}
        {!loading && shelters.length > 3 && (
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Rechercher par nom ou ville…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        )}

        {/* Compteur */}
        {!loading && (
          <p className="text-gray-400 text-sm text-center">
            {filtered.length} refuge{filtered.length > 1 ? 's' : ''} ·{' '}
            {filtered.reduce((acc, s) => acc + s.animal_count, 0)} animal{filtered.reduce((acc, s) => acc + s.animal_count, 0) > 1 ? 'aux' : ''} disponibles
          </p>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">{search ? '🔍' : '🐾'}</div>
            <p className="text-gray-500 font-medium">
              {search ? 'Aucun résultat pour cette recherche' : 'Aucun refuge partenaire pour le moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((shelter, i) => (
              <motion.div
                key={shelter.id}
                className="card overflow-hidden"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex gap-0">
                  {/* Photo de couverture */}
                  <div className="w-28 flex-shrink-0 bg-blue-50 relative">
                    {shelter.cover ? (
                      <img
                        src={shelter.cover}
                        alt={shelter.name}
                        className="w-full h-full object-cover"
                        style={{ minHeight: '120px' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl"
                           style={{ minHeight: '120px' }}>
                        🏠
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-gray-800 leading-tight">{shelter.name}</h2>
                      <span className="badge bg-green-50 text-green-700 text-xs flex-shrink-0">
                        {shelter.animal_count} animal{shelter.animal_count > 1 ? 'aux' : ''}
                      </span>
                    </div>

                    {shelter.city && (
                      <p className="text-gray-400 text-xs">📍 {shelter.city}</p>
                    )}

                    {/* Espèces */}
                    {shelter.species.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {shelter.species.map((sp) => (
                          <span key={sp}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {SPECIES_EMOJI[sp]} {SPECIES_LABEL[sp] || sp}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <Link
                        to="/adoptant/login"
                        className="text-xs font-semibold text-white bg-secondary hover:bg-primary
                                   px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Voir les animaux →
                      </Link>
                      {shelter.phone && (
                        <a
                          href={`tel:${shelter.phone}`}
                          className="text-xs font-medium text-secondary bg-blue-50 hover:bg-blue-100
                                     px-3 py-1.5 rounded-lg transition-colors"
                        >
                          📞 Appeler
                        </a>
                      )}
                      {shelter.email && (
                        <a
                          href={`mailto:${shelter.email}`}
                          className="text-xs font-medium text-secondary bg-blue-50 hover:bg-blue-100
                                     px-3 py-1.5 rounded-lg transition-colors"
                        >
                          ✉️ Email
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA bas de page */}
        <div className="card p-6 text-center space-y-3 bg-gradient-to-br from-primary to-secondary text-white">
          <p className="font-bold text-lg">Votre refuge n'est pas encore partenaire ?</p>
          <p className="text-white/80 text-sm">
            Rejoignez Adoptly gratuitement et trouvez des familles compatibles pour vos pensionnaires.
          </p>
          <Link
            to="/pour-les-refuges"
            className="inline-block bg-white text-primary font-bold text-sm
                       px-6 py-3 rounded-2xl hover:bg-white/90 transition-colors"
          >
            Inscrire mon refuge →
          </Link>
        </div>

        {/* Footer minimaliste */}
        <div className="text-center text-gray-300 text-xs pb-4 space-x-3">
          <Link to="/" className="hover:text-gray-500 transition-colors">Accueil</Link>
          <span>·</span>
          <Link to="/legal/cgu" className="hover:text-gray-500 transition-colors">CGU</Link>
          <span>·</span>
          <Link to="/legal/privacy" className="hover:text-gray-500 transition-colors">Confidentialité</Link>
        </div>
      </div>
    </div>
  );
}
