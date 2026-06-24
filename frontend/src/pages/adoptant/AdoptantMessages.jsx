import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';

const SUPABASE_STORAGE = 'lybvajageblpdauprnus.supabase.co/storage';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function previewContent(content) {
  if (content?.includes(SUPABASE_STORAGE)) return '📷 Photo';
  return content;
}

export default function AdoptantMessages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/messages/conversations')
      .then(({ data }) => setConversations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-primary">Messages</h1>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <div className="text-5xl">💬</div>
            <p className="text-gray-500 font-medium">Aucun message pour le moment</p>
            <p className="text-gray-400 text-sm">
              Matchez avec un animal et envoyez un premier message au refuge !
            </p>
            <button
              onClick={() => navigate('/adoptant/swipe')}
              className="btn-primary px-6 py-2 text-sm mt-2"
            >
              Découvrir des animaux
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, i) => (
              <motion.button
                key={conv.match_id}
                onClick={() => navigate(`/chat/${conv.match_id}`)}
                className="card p-4 flex gap-3 w-full text-left hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
                  {conv.animal_photo ? (
                    <img src={conv.animal_photo} alt={conv.animal_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">🐾</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {conv.animal_name}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.last_date)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {conv.shelter_name}
                  </p>
                  <p className={`text-sm mt-1 truncate ${conv.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {conv.last_sender === 'adoptant' ? 'Vous : ' : ''}{previewContent(conv.last_message)}
                  </p>
                </div>

                {conv.unread > 0 && (
                  <div className="flex-shrink-0 self-center">
                    <span className="min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                      {conv.unread}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
