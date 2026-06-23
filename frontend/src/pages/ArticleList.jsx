import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1)  return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)  return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine${Math.floor(days / 7) > 1 ? 's' : ''}`;
  return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ArticleList() {
  const [articles, setArticles] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    document.title = 'Actualités | Adoptly';
    api.get('/articles')
      .then(({ data }) => setArticles(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { document.title = 'Adoptly - Adopter un animal en refuge'; };
  }, []);

  return (
    <div className="min-h-screen bg-bg-light">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-dark transition-colors">
              <span className="text-white font-black text-sm select-none">A</span>
            </div>
            <span className="font-black text-primary text-lg tracking-tight">Adoptly</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/refuges" className="btn-ghost text-sm py-1.5 px-3">Refuges</Link>
            <Link to="/adoptant/register" className="btn-primary text-sm py-1.5 px-4">
              Adopter →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* En-tête */}
        <div className="text-center space-y-3">
          <div className="text-4xl">📰</div>
          <h1 className="text-3xl font-extrabold text-primary">Actualités</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            Découvrez les histoires de nos refuges partenaires, des conseils d'adoption
            et les dernières nouvelles d'Adoptly.
          </p>
        </div>

        {/* Articles */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">📝</div>
            <p className="text-gray-500 font-medium">Aucun article pour le moment</p>
            <p className="text-gray-400 text-sm">Les premiers articles arrivent bientôt !</p>
          </div>
        ) : (
          <div className="space-y-5">
            {articles.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/actualites/${article.slug}`}
                  className="card overflow-hidden block hover:shadow-lg transition-shadow group"
                >
                  {/* Image de couverture */}
                  {article.cover_image && (
                    <div className="w-full aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={article.cover_image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{article.author_name}</span>
                      <span>·</span>
                      <span>{timeAgo(article.created_at)}</span>
                    </div>

                    <h2 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-primary transition-colors">
                      {article.title}
                    </h2>

                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-secondary text-sm font-medium">
                        Lire la suite →
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const shareUrl = `https://adoptly.fr/share/article/${article.slug}`;
                          const text = `📰 ${article.title}\n\n${article.excerpt}\n\n👉`;
                          if (navigator.share) {
                            navigator.share({ title: article.title, text, url: shareUrl }).catch(() => {});
                          } else {
                            navigator.clipboard?.writeText(text + ' ' + shareUrl)
                              .then(() => alert('Lien copié !'));
                          }
                        }}
                        className="text-xs font-medium text-gray-400 hover:text-secondary bg-gray-50 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        🔗 Partager
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="card p-6 text-center space-y-3 bg-gradient-to-br from-primary to-secondary text-white">
          <div className="text-3xl">💚</div>
          <p className="font-bold text-lg">Prêt à adopter ?</p>
          <p className="text-white/80 text-sm">
            Créez un compte gratuit et découvrez les animaux compatibles avec votre mode de vie.
          </p>
          <Link
            to="/adoptant/register"
            className="inline-block bg-white text-primary font-bold text-sm
                       px-6 py-3 rounded-2xl hover:bg-white/90 transition-colors"
          >
            Commencer →
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-300 text-xs pb-4 space-x-3">
          <Link to="/" className="hover:text-gray-500 transition-colors">Accueil</Link>
          <span>·</span>
          <Link to="/refuges" className="hover:text-gray-500 transition-colors">Refuges</Link>
          <span>·</span>
          <Link to="/legal/cgu" className="hover:text-gray-500 transition-colors">CGU</Link>
        </div>
      </div>
    </div>
  );
}
