import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/api';

const SPECIES_EMOJI = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾',
};

function ageLabel(months, t) {
  if (!months) return t('detail_age_unk');
  if (months < 12) return `${months} ${months > 1 ? t('age_months') : t('age_month')}`;
  const y = Math.floor(months / 12);
  return `${y} ${y > 1 ? t('age_years') : t('age_year')}`;
}

function CompatBadge({ label, value, icons, textKeys, t }) {
  const icon      = icons[value]    || '❓';
  const textKey   = textKeys[value] || value;
  const text      = t(textKey);
  const isPositive = value === 'yes';
  const isNegative = value === 'no';
  return (
    <div className={`rounded-2xl p-3 text-xs ${
      isPositive ? 'bg-green-50' : isNegative ? 'bg-red-50' : 'bg-gray-50'
    }`}>
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className={`font-semibold ${
        isPositive ? 'text-green-700' : isNegative ? 'text-red-600' : 'text-gray-600'
      }`}>
        {icon} {text}
      </p>
    </div>
  );
}

export default function AnimalDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t }    = useLanguage();
  const { match } = location.state || {};
  const [photoIndex, setPhotoIndex] = useState(0);

  const TEMPERAMENT = {
    calm:     `😌 ${t('tp_calm')}`,
    playful:  `🎾 ${t('tp_playful')}`,
    energetic:`⚡ ${t('tp_energetic')}`,
    mixed:    `🙂 ${t('tp_mixed')}`,
    resilient:`💪 ${t('tp_resilient')}`,
  };

  const SIZE_LABEL = {
    small:  `🐭 ${t('sz_small')}`,
    medium: `🐕 ${t('sz_medium')}`,
    large:  `🦮 ${t('sz_large')}`,
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-5xl">😕</div>
          <p className="text-gray-500">{t('detail_not_found')}</p>
          <button onClick={() => navigate('/adoptant/matches')} className="btn-primary px-6 py-2">
            {t('detail_back_m')}
          </button>
        </div>
      </div>
    );
  }

  const animal  = match.animals;
  const shelter = animal?.shelters;
  const photos  = animal?.photos || [];
  const req     = animal?.requirements || {};

  function markContacted() {
    api.patch(`/adoptant/matches/${match.id}/contacted`).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Bouton retour + partager */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/adoptant/matches')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium"
          >
            {t('detail_back')}
          </button>
          <button
            onClick={() => {
              const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
              const shareUrl = `${apiBase}/public/share/animal/${animal?.id}`;
              const age = animal?.age < 12 ? `${animal.age} mois` : `${Math.floor(animal.age / 12)} an(s)`;
              const text = `🐾 ${animal?.name} cherche une famille !\n${animal?.breed || animal?.species} · ${age} · ${shelter?.name || 'Refuge partenaire'}\n\nPeut-être votre futur compagnon ? 👉`;
              if (navigator.share) {
                navigator.share({ title: `${animal?.name} cherche une famille`, text, url: shareUrl }).catch(() => {});
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

        {/* Galerie photos */}
        <div className="card overflow-hidden">
          <div className="relative w-full bg-blue-50" style={{ paddingBottom: '75%' }}>
            {photos.length > 0 ? (
              <motion.img
                key={photoIndex}
                src={photos[photoIndex]}
                alt={animal?.name}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                {SPECIES_EMOJI[animal?.species] || '🐾'}
              </div>
            )}

            {/* Indicateurs photos */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === photoIndex ? 'bg-white w-4' : 'bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Vignettes */}
          {photos.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    i === photoIndex ? 'border-secondary' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos principales */}
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-primary">{animal?.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {SPECIES_EMOJI[animal?.species]} {animal?.breed || animal?.species}
                {animal?.age ? ` · ${ageLabel(animal.age, t)}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {animal?.size && (
                <span className="badge bg-blue-50 text-blue-600 text-xs">
                  {SIZE_LABEL[animal.size] || animal.size}
                </span>
              )}
              {animal?.temperament && animal.temperament.split(',').map(tp => tp.trim()).filter(Boolean).map(tp => (
                <span key={tp} className="badge bg-orange-50 text-orange-600 text-xs">
                  {TEMPERAMENT[tp] || tp}
                </span>
              ))}
            </div>
          </div>

          {animal?.story && (
            <div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1.5">{t('detail_story')}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{animal.story}</p>
            </div>
          )}

          {animal?.special_needs && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
              <p className="text-yellow-700 text-sm">
                ⚠️ <strong>{t('detail_special')}</strong> {animal.special_needs}
              </p>
            </div>
          )}
        </div>

        {/* Compatibilités */}
        {(req.children_compatible || req.cats_compatible || req.dogs_compatible ||
          req.needs_garden || req.daily_outdoor_time || req.spacious_home) && (
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">{t('detail_compat')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {req.children_compatible && (
                <CompatBadge
                  label={t('compat_children')}
                  value={req.children_compatible}
                  icons={{ yes: '✅', no: '❌', '6+': '⚠️', '12+': '⚠️' }}
                  textKeys={{ yes: 'val_yes', no: 'compat_no', '6+': 'compat_6plus', '12+': 'compat_12plus' }}
                  t={t}
                />
              )}
              {req.cats_compatible && (
                <CompatBadge
                  label={t('compat_cats')}
                  value={req.cats_compatible}
                  icons={{ yes: '✅', no: '❌', unknown: '❓' }}
                  textKeys={{ yes: 'compat_compat', no: 'compat_no', unknown: 'val_unknown' }}
                  t={t}
                />
              )}
              {req.dogs_compatible && (
                <CompatBadge
                  label={t('compat_dogs')}
                  value={req.dogs_compatible}
                  icons={{ yes: '✅', no: '❌', unknown: '❓' }}
                  textKeys={{ yes: 'compat_compat', no: 'compat_no', unknown: 'val_unknown' }}
                  t={t}
                />
              )}
              {req.needs_garden && (
                <CompatBadge
                  label={t('compat_garden')}
                  value={req.needs_garden}
                  icons={{ yes: '🌳', no: '🏢', preferable: '🌿' }}
                  textKeys={{ yes: 'compat_required', no: 'compat_not_req', preferable: 'val_preferable' }}
                  t={t}
                />
              )}
              {req.daily_outdoor_time && (
                <CompatBadge
                  label={t('compat_outdoor')}
                  value={req.daily_outdoor_time}
                  icons={{ yes: '🏃', no: '🛋️', ideal: '🚶' }}
                  textKeys={{ yes: 'compat_yes_req', no: 'compat_not_req', ideal: 'val_ideal' }}
                  t={t}
                />
              )}
              {req.spacious_home && (
                <CompatBadge
                  label={t('compat_space')}
                  value={req.spacious_home}
                  icons={{ yes: '🏡', no: '📦', flexible: '🏠' }}
                  textKeys={{ yes: 'compat_required', no: 'compat_not_req', flexible: 'val_flexible' }}
                  t={t}
                />
              )}
            </div>
          </div>
        )}

        {/* Refuge */}
        {shelter && (
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">🏠 {shelter.name}</h3>
            {shelter.address && (
              <p className="text-gray-500 text-sm">📍 {shelter.address}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {shelter.phone && (
                <a
                  href={`tel:${shelter.phone}`}
                  onClick={markContacted}
                  className="btn-primary text-sm py-2.5 px-4"
                >
                  {t('detail_call')}
                </a>
              )}
              {shelter.email && (
                <a
                  href={`mailto:${shelter.email}?subject=${encodeURIComponent(t('detail_email_sub', { name: animal?.name }))}&body=${encodeURIComponent(t('detail_email_body', { name: animal?.name }))}`}
                  onClick={markContacted}
                  className="btn-secondary text-sm py-2.5 px-4"
                >
                  {t('detail_email')}
                </a>
              )}
              {shelter.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(shelter.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm py-2.5 px-4"
                >
                  {t('detail_map')}
                </a>
              )}
            </div>

            {/* Bouton messagerie */}
            <button
              onClick={() => {
                markContacted();
                navigate(`/chat/${match.id}`);
              }}
              className="w-full mt-3 bg-gradient-to-r from-primary to-blue-500 text-white font-semibold py-3 rounded-2xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              💬 Envoyer un message au refuge
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
