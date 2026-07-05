import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../lib/api';

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/articles/${slug}`)
      .then(({ data }) => {
        setArticle(data);
        document.title = `${data.title} | Adoptly`;
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
    return () => { document.title = 'Adoptly — Adopter un chien ou un chat en refuge'; };
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (notFound || !article) return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl">📰</div>
      <h1 className="text-2xl font-bold text-gray-700">Article introuvable</h1>
      <Link to="/actualites" className="btn-primary px-6 py-3 mt-2">Voir toutes les actualités</Link>
    </div>
  );

  const date = new Date(article.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Simple markdown-like rendering: split by paragraphs, handle ## headers and **bold**
  function renderContent(text) {
    return text.split('\n\n').map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // H2
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold text-primary mt-6 mb-2">
            {trimmed.slice(3)}
          </h2>
        );
      }

      // H3
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-bold text-gray-700 mt-4 mb-1">
            {trimmed.slice(4)}
          </h3>
        );
      }

      // Regular paragraph — handle **bold**, [links](url) and line breaks
      const parts = trimmed.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <a key={j} href={linkMatch[2]} className="text-primary font-semibold underline">
              {linkMatch[1]}
            </a>
          );
        }
        // Handle single line breaks within a paragraph
        return part.split('\n').map((line, k) => (
          <span key={`${j}-${k}`}>
            {k > 0 && <br />}
            {line}
          </span>
        ));
      });

      return (
        <p key={i} className="text-gray-600 leading-relaxed">
          {parts}
        </p>
      );
    });
  }

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
          <Link to="/adoptant/register" className="btn-primary text-sm py-1.5 px-4">
            Adopter →
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Retour + Partager */}
        <div className="flex items-center justify-between">
          <Link
            to="/actualites"
            className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium"
          >
            ← Toutes les actualités
          </Link>
          <button
            onClick={() => {
              const shareUrl = `https://adoptly.fr/share/article/${article.slug}`;
              const text = `📰 ${article.title}\n\n${article.excerpt}\n\n👉`;
              if (navigator.share) {
                navigator.share({ title: article.title, text, url: shareUrl }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(text + ' ' + shareUrl)
                  .then(() => alert('Lien copié ! Colle-le sur Facebook ou WhatsApp 👍'));
              }
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            🔗 Partager
          </button>
        </div>

        {/* Image de couverture */}
        {article.cover_image && (
          <motion.div
            className="rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full rounded-3xl"
            />
          </motion.div>
        )}

        {/* Titre + meta */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-extrabold text-primary leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>Par {article.author_name}</span>
            <span>·</span>
            <span>{date}</span>
          </div>
        </motion.div>

        {/* Contenu */}
        <motion.div
          className="card p-5 space-y-4 text-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {renderContent(article.content)}
        </motion.div>

        {/* Lien vers le refuge si associé */}
        {article.shelter_id && (
          <Link
            to={`/refuges/${article.shelter_id}`}
            className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary
                            flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">🏠</span>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Découvrir {article.author_name}</p>
              <p className="text-gray-400 text-xs">Voir la page du refuge →</p>
            </div>
          </Link>
        )}

        {/* CTA */}
        <div className="card p-6 text-center space-y-3 bg-gradient-to-br from-primary to-secondary text-white">
          <div className="text-3xl">💚</div>
          <h2 className="font-bold text-lg">Envie d'adopter ?</h2>
          <p className="text-white/80 text-sm">
            Adoptly trouve l'animal fait pour vous parmi nos refuges partenaires. Gratuit et sans engagement.
          </p>
          <Link
            to="/adoptant/register"
            className="inline-block bg-white text-primary font-bold text-sm
                       px-6 py-3 rounded-2xl hover:bg-white/90 transition-colors"
          >
            Commencer le questionnaire →
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-300 text-xs pb-20 space-x-3">
          <Link to="/" className="hover:text-gray-500 transition-colors">Accueil</Link>
          <span>·</span>
          <Link to="/actualites" className="hover:text-gray-500 transition-colors">Actualités</Link>
          <span>·</span>
          <Link to="/refuges" className="hover:text-gray-500 transition-colors">Refuges</Link>
        </div>
      </div>

      {/* Sticky CTA bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm truncate">Trouvez votre compagnon idéal</p>
            <p className="text-gray-400 text-xs">Test de compatibilité gratuit · 2 min</p>
          </div>
          <Link
            to="/adoptant/register"
            className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap flex-shrink-0"
          >
            Commencer →
          </Link>
        </div>
      </div>
    </div>
  );
}
