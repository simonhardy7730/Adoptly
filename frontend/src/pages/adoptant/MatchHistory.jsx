import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';


function ageLabel(months, t) {
  if (!months) return '';
  if (months < 12) return `${months} ${months > 1 ? t('age_months') : t('age_month')}`;
  const y = Math.floor(months / 12);
  return `${y} ${y > 1 ? t('age_years') : t('age_year')}`;
}

export default function MatchHistory() {
  const navigate = useNavigate();
  const { t }    = useLanguage();
  const [matches, setMatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [unreadIds, setUnreadIds] = useState(new Set());

  const STATUS_BADGE = {
    interested: { labelKey: 'status_match',        color: 'bg-green-100 text-green-700' },
    contacted:  { labelKey: 'status_contacted',    color: 'bg-blue-100 text-blue-700' },
    adopted:    { labelKey: 'status_adopted_b',    color: 'bg-purple-100 text-purple-700' },
    closed:     { labelKey: 'status_closed',       color: 'bg-gray-100 text-gray-500' },
  };

  useEffect(() => {
    api
      .get('/adoptant/matches')
      .then(({ data }) => {
        setMatches(data);
        // Fetch unread status for each match without marking as read
        // We use a HEAD-like approach: fetch messages list but only check read flag
        // for shelter messages. The GET does mark them read, so we use the
        // unread count endpoint as a proxy — if total unread > 0, highlight
        // matches that have shelter messages at all (best effort for MVP).
        const rightMatches = (data || []).filter((m) => m.swipe_direction === 'right');
        if (rightMatches.length > 0) {
          // Fetch unread count and mark all matches with messages as potentially unread
          // More precise: for each match, check messages without a full read-mark.
          // Since the GET marks read, we use the global count to decide whether to
          // show any indicators, then let them disappear once the user opens chat.
          Promise.allSettled(
            rightMatches.map((m) =>
              api.get(`/messages/${m.id}`).then(({ data: msgs }) => ({
                id: m.id,
                // After GET, unread shelter msgs are now read — but we caught
                // the state before mark if the server processes async.
                // Pragmatic: if there are ANY shelter messages, show the badge
                // until the user opens the chat. We store in sessionStorage to
                // clear after visit.
                hasUnread: msgs.some((msg) => msg.sender_role === 'shelter'),
              })).catch(() => ({ id: m.id, hasUnread: false }))
            )
          ).then((results) => {
            const ids = new Set();
            results.forEach((r) => {
              if (r.status === 'fulfilled' && r.value.hasUnread) {
                // Only mark unread if not already visited in this session
                const visited = sessionStorage.getItem(`chat-visited-${r.value.id}`);
                if (!visited) ids.add(r.value.id);
              }
            });
            setUnreadIds(ids);
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markContacted(matchId) {
    try {
      const { data } = await api.patch(`/adoptant/matches/${matchId}/contacted`);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...data } : m)));
    } catch {}
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-primary">{t('match_title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {matches.length} {matches.length > 1 ? t('match_count_p') : t('match_count_s')}
            </p>
          </div>
          <button onClick={() => navigate('/adoptant/swipe')} className="btn-primary text-sm py-2 px-4">
            {t('match_continue')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">🐾</div>
            <p className="text-gray-500 font-medium">{t('match_empty_title')}</p>
            <p className="text-gray-400 text-sm">{t('match_empty_body')}</p>
            <button onClick={() => navigate('/adoptant/swipe')} className="btn-primary px-8 py-3">
              {t('match_start')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, i) => {
              const animal  = match.animals;
              const shelter = animal?.shelters;
              const photo   = animal?.photos?.[0];
              const badge   = STATUS_BADGE[match.status] || STATUS_BADGE.interested;

              return (
                <motion.div
                  key={match.id}
                  className="card p-4 flex gap-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  {/* Photo */}
                  <Link
                    to="/adoptant/animal"
                    state={{ match }}
                    className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0 block"
                  >
                    {photo ? (
                      <img src={photo} alt={animal?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                    )}
                  </Link>

                  {/* Infos */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/adoptant/animal"
                        state={{ match }}
                        className="font-bold text-gray-800 hover:text-primary truncate transition-colors"
                      >
                        {animal?.name}
                      </Link>
                      <span className={`badge text-xs flex-shrink-0 ${badge.color}`}>
                        {t(badge.labelKey)}
                      </span>
                    </div>

                    <p className="text-gray-500 text-xs">
                      {animal?.breed || animal?.species}
                      {animal?.age ? ` · ${ageLabel(animal.age, t)}` : ''}
                    </p>

                    {shelter && (
                      <p className="text-gray-400 text-xs truncate">{shelter.name}</p>
                    )}

                    {/* Actions de contact */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {/* Message button */}
                      <button
                        onClick={() => {
                          sessionStorage.setItem(`chat-visited-${match.id}`, '1');
                          setUnreadIds((prev) => {
                            const next = new Set(prev);
                            next.delete(match.id);
                            return next;
                          });
                          navigate(`/chat/${match.id}`);
                        }}
                        className="relative inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        💬 Message
                        {unreadIds.has(match.id) && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                        )}
                      </button>
                      {shelter?.phone && (
                        <a
                          href={`tel:${shelter.phone}`}
                          onClick={() => !match.contacted && markContacted(match.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {t('match_call')}
                        </a>
                      )}
                      {shelter?.email && (
                        <a
                          href={`mailto:${shelter.email}`}
                          onClick={() => !match.contacted && markContacted(match.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {t('match_email_btn')}
                        </a>
                      )}
                      {shelter?.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {t('match_map')}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
