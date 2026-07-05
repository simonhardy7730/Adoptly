import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const SUPABASE_STORAGE = 'lybvajageblpdauprnus.supabase.co/storage';
function isImageMsg(content) {
  return content?.includes(SUPABASE_STORAGE) && /\.(jpg|jpeg|png|webp|gif)$/i.test(content);
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function Chat() {
  const { match_id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages]     = useState([]);
  const [matchInfo, setMatchInfo]   = useState(null);
  const [content, setContent]       = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [zoomedImg, setZoomedImg]   = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const pollRef        = useRef(null);
  const lastCountRef   = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch match metadata from the adoptant matches list
  useEffect(() => {
    api.get('/adoptant/matches')
      .then(({ data }) => {
        const m = data.find((m) => m.id === match_id);
        if (m) setMatchInfo(m);
      })
      .catch(() => {});
  }, [match_id]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/${match_id}`);
      setMessages((prev) => {
        if (data.length !== prev.length) {
          // New messages arrived — scroll
          setTimeout(scrollToBottom, 50);
        }
        lastCountRef.current = data.length;
        return data;
      });
    } catch {}
  }, [match_id, scrollToBottom]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  // Auto-scroll on initial load
  useEffect(() => {
    if (!loading) setTimeout(scrollToBottom, 100);
  }, [loading, scrollToBottom]);

  // Polling every 3 seconds
  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  async function sendMessage(text) {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data: newMsg } = await api.post(`/messages/${match_id}`, { content: text });
      setMessages((prev) => [...prev, newMsg]);
      setContent('');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('[Chat] Erreur envoi:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Erreur lors de l\'envoi. Le serveur redémarre peut-être — réessayez dans 1 minute.');
    }
    setSending(false);
  }

  async function handleSend(e) {
    e.preventDefault();
    await sendMessage(content);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data: newMsg } = await api.post(`/messages/${match_id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      alert('Erreur lors de l\'envoi de l\'image.');
    }
    setUploading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const animal  = matchInfo?.animals;
  const shelter = animal?.shelters;
  const photo   = animal?.photos?.[0];

  return (
    <div className="flex flex-col h-screen bg-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/adoptant/matches')}
          className="text-gray-400 hover:text-primary transition-colors p-1 -ml-1"
          aria-label="Retour"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {photo ? (
          <img src={photo} alt={animal?.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg">🐾</div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate leading-tight">
            {animal?.name || '…'}
          </p>
          <p className="text-gray-400 text-xs truncate leading-tight">
            {shelter?.name || ''}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
            <span className="text-5xl">💬</span>
            <p className="text-gray-700 font-bold text-base text-center">
              Fais le premier pas !
            </p>
            <p className="text-gray-400 text-sm text-center max-w-[280px]">
              {shelter?.name || 'Le refuge'} peut voir ton intérêt pour {animal?.name || 'cet animal'}, mais attend un petit message de ta part.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[320px]">
              {[
                `Bonjour ! J'ai craqué pour ${animal?.name || 'votre animal'} et j'aimerais en savoir plus. Est-il toujours disponible ?`,
                `Bonjour ! Comment ${animal?.name || 'votre animal'} se comporte-t-il au quotidien ? J'aimerais savoir s'il correspondrait à mon mode de vie.`,
                `Bonjour ! Je serais intéressé(e) pour rencontrer ${animal?.name || 'votre animal'}. Comment se passe la suite ?`,
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  disabled={sending}
                  className="bg-orange-50 border-2 border-orange-200 text-orange-700 rounded-2xl px-4 py-3 text-sm font-medium text-left hover:bg-orange-100 transition-colors active:scale-95 disabled:opacity-50"
                >
                  💬 <span className="italic">« {suggestion} »</span>
                </button>
              ))}
            </div>
            <p className="text-gray-300 text-xs">Touche un message pour l'envoyer, ou écris le tien</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.sender_role === 'adoptant';
              const showDate =
                i === 0 ||
                formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] space-y-1`}>
                      {isImageMsg(msg.content) ? (
                        <img
                          src={msg.content}
                          alt="Photo"
                          className={`max-w-full rounded-2xl cursor-pointer ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                          style={{ maxHeight: 280 }}
                          onClick={() => setZoomedImg(msg.content)}
                        />
                      ) : (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isMe
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      )}
                      <p className={`text-[10px] text-gray-400 ${isMe ? 'text-right' : 'text-left'} px-1`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2.5 rounded-2xl text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors flex-shrink-0 disabled:opacity-40"
            aria-label="Envoyer une photo"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message…"
            rows={1}
            maxLength={1000}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="btn-primary p-2.5 rounded-2xl flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>

      {/* Image zoom overlay */}
      {zoomedImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoomedImg(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl font-light" onClick={() => setZoomedImg(null)}>&times;</button>
          <img src={zoomedImg} alt="Photo" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
