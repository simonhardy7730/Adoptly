import sharp from 'sharp';
import { supabase } from './supabase.js';

const KIT_DIR = 'fb-kit-7h2p';
const BUCKET = 'animal-photos';

// Regroupement d'affichage : chiens / chats / NACs (lapins, rongeurs, autres).
const speciesGroup = (sp) => (sp === 'dog' ? 'dog' : sp === 'cat' ? 'cat' : 'nac');
const GROUP_RANK = { dog: 0, cat: 1, nac: 2 };

function ageLabel(months) {
  if (months == null) return null;
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} an${y > 1 ? 's' : ''} et ${m} mois` : `${y} an${y > 1 ? 's' : ''}`;
}

const SIZE_FR = { small: 'petit gabarit', medium: 'gabarit moyen', large: 'grand gabarit' };
const TEMP_FR = {
  playful: 'joueur', cuddly: 'câlin', calm: 'calme', affectionate: 'affectueux',
  energetic: 'plein d\'énergie', shy: 'un peu timide au début', sociable: 'sociable',
  independent: 'indépendant', curious: 'curieux', gentle: 'doux', protective: 'protecteur',
};
const TEMP_FR_F = {
  playful: 'joueuse', cuddly: 'câline', calm: 'calme', affectionate: 'affectueuse',
  energetic: 'pleine d\'énergie', shy: 'un peu timide au début', sociable: 'sociable',
  independent: 'indépendante', curious: 'curieuse', gentle: 'douce', protective: 'protectrice',
};

// Pas de champ sexe en base : on le déduit de l'histoire écrite par le refuge
function isFemale(story) {
  if (!story) return false;
  const s = story.toLowerCase();
  const fem  = (s.match(/\b(elle|née|chatte|chienne|minette|louloute|puce|câline|joueuse|douce|gentille|craintive|stérilisée|adoptée|trouvée|recueillie|sauvée)\b/g) || []).length;
  const masc = (s.match(/\b(il|né|chaton|loulou|câlin|joueur|doux|gentil|craintif|castré|stérilisé|adopté|trouvé|recueilli|sauvé)\b/g) || []).length;
  return fem > masc;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Extrait court de l'histoire, en filtrant les phrases qui citent une association
function storyExcerpt(story, shelterNames) {
  if (!story) return '';
  const clean = story
    .replace(/[\r\n]+/g, ' ')
    // certains refuges écrivent déjà "Son histoire :" dans leur texte — on retire
    // l'étiquette pour ne pas la doubler avec la nôtre
    .replace(/(son|sa|leur)\s+histoire\s*:/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = clean.split(/(?<=[.!?])\s+/);
  // On écarte : les phrases citant une association par son nom (via shelterNames),
  // les appels aux dons/cagnottes et les liens — pas les mentions génériques du refuge.
  const banned = ['association', 'la mairie nous', 'gofund', 'paypal', 'cagnotte', 'http', 'www.', 'frais d\'adoption'];
  const kept = [];
  for (const s of sentences) {
    const low = s.toLowerCase();
    if (shelterNames.some(n => low.includes(n))) continue;
    if (banned.some(b => low.includes(b))) continue;
    kept.push(s.trim());
    if (kept.join(' ').length > 420) break;
  }
  let out = kept.join(' ');
  if (out.length > 480) {
    out = out.slice(0, 480);
    out = out.slice(0, out.lastIndexOf(' ')) + '…';
  }
  return out;
}

// Ligne d'entente chiens / chats / enfants depuis requirements
function compatLine(req) {
  if (!req) return '';
  const out = [];
  if (req.dogs_compatible === 'yes') out.push('OK chiens ✔️');
  else if (req.dogs_compatible === 'no') out.push('sans autre chien');
  if (req.cats_compatible === 'yes') out.push('OK chats ✔️');
  else if (req.cats_compatible === 'no') out.push('sans chat');
  if (req.children_compatible === 'yes') out.push('OK enfants ✔️');
  else if (req.children_compatible === 'no') out.push('sans enfant');
  else if (/^\d+\+$/.test(req.children_compatible || '')) out.push(`enfants à partir de ${req.children_compatible.replace('+', '')} ans`);
  return out.length ? `🤝 Entente : ${out.join(' · ')}` : '';
}

function caption(d, shelterNames = [], shelterName = '') {
  const name = d.name.trim().replace(/\s+/g, ' ');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const female = isFemale(d.story);
  const isPet = d.species === 'dog' || d.species === 'cat';
  const breed = (d.breed || (isPet ? 'croisé' : '')).trim();
  const age = ageLabel(d.age);
  const size = SIZE_FR[d.size];
  const tempMap = female ? TEMP_FR_F : TEMP_FR;
  const traits = (d.temperament || '').split(',').map(t => tempMap[t.trim()]).filter(Boolean);

  let desc = !breed ? '' : breed.toLowerCase().startsWith('crois') ? 'Croisé' : breed.charAt(0).toUpperCase() + breed.slice(1);
  if (female && desc) {
    if (desc === 'Croisé') desc = 'Croisée';
    else if (desc.endsWith('éen')) desc += 'ne';
  }
  const parts = [];
  if (age) parts.push(age);
  if (size) parts.push(size);
  let line2;
  if (desc) line2 = desc + (parts.length ? ` de ${parts.join(', ')}` : '');
  else if (parts.length) { const p = parts.join(', '); line2 = p.charAt(0).toUpperCase() + p.slice(1); }
  else line2 = '';

  let line3 = '';
  if (traits.length === 1) line3 = `${displayName} est ${traits[0]}.`;
  else if (traits.length > 1) line3 = `${displayName} est ${traits.slice(0, -1).join(', ')} et ${traits[traits.length - 1]}.`;

  const story = storyExcerpt(d.story, shelterNames);
  const compat = compatLine(d.requirements);

  const tags = d.species === 'cat'
    ? '#ChatAAdopter #AdoptionChat #AdoptionAnimale #Adoptly'
    : d.species === 'dog'
      ? '#ChienAAdopter #AdoptionChien #AdoptionAnimale #Adoptly'
      : '#NAC #AdoptionNAC #AdoptionAnimale #Adoptly';

  const blocks = [`🐾 Voici ${displayName} !`];
  const intro = [line2 ? `${line2}.` : '', line3].filter(Boolean).join('\n');
  if (intro) blocks.push(intro);
  if (story) blocks.push(`📖 Son histoire : ${story}`);
  if (compat) blocks.push(compat);
  blocks.push(`${female ? 'Elle' : 'Il'} ne demande qu'une chose : une famille qui lui donnera sa chance. 🧡`);
  if (shelterName) blocks.push(`🏠 Proposé par ${shelterName}.`);
  blocks.push(`💙 Son profil complet est ici :\nhttps://adoptly.fr/animal/${d.id}`);
  blocks.push(tags);

  return blocks.join('\n\n');
}

async function brandedImage(d) {
  const res = await fetch(d.photos[0]);
  if (!res.ok) throw new Error('photo HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const W = 1080, H = 1350;
  const base = await sharp(buf).resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer();

  const name = esc(d.name.trim().toUpperCase());
  const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${H - 320}" width="${W}" height="320" fill="url(#fade)"/>
    <text x="48" y="${H - 150}" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="800" fill="#ffffff">${name}</text>
    <text x="48" y="${H - 84}" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="600" fill="#ffffff" opacity="0.9">Je cherche une famille</text>
    <rect x="48" y="${H - 62}" width="300" height="46" rx="23" fill="#F07A2A"/>
    <text x="198" y="${H - 30}" font-family="Segoe UI, Arial, sans-serif" font-size="27" font-weight="700" fill="#ffffff" text-anchor="middle">adoptly.fr</text>
  </svg>`;

  return sharp(base).composite([{ input: Buffer.from(overlay) }]).jpeg({ quality: 88 }).toBuffer();
}

// Synchronise le kit : génère les images des nouveaux chiens actifs,
// supprime celles des chiens adoptés/retirés, régénère la page HTML.
export async function syncFbKit() {
  const { data: dogs, error: dogsErr } = await supabase
    .from('animals')
    .select('id, name, breed, age, size, temperament, photos, species, story, requirements, created_at, shelter_id')
    .eq('status', 'active').in('species', ['dog', 'cat', 'rabbit', 'guinea_pig', 'other'])
    .not('photos', 'is', null)
    .order('created_at', { ascending: false });
  if (dogsErr) throw new Error(dogsErr.message);

  // Noms des refuges (pour filtrer leurs mentions dans les histoires)
  const { data: shelters } = await supabase.from('shelters').select('id, name');
  const shelterNames = (shelters || [])
    .map(s => s.name.replace(/[^\p{L}\s']/gu, '').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(n => n.length > 3);
  const shelterById = Object.fromEntries((shelters || []).map(s => [s.id, s.name.trim()]));

  // Intérêt par animal (nb de swipes « j'aime ») — pour pousser en priorité
  // ceux que personne n'a encore repérés.
  const { data: matchRows } = await supabase
    .from('matches').select('animal_id').eq('swipe_direction', 'right');
  const interest = {};
  for (const m of matchRows || []) interest[m.animal_id] = (interest[m.animal_id] || 0) + 1;

  // Animaux déjà publiés sur Facebook (état partagé Simon/Coralie) : ils passent
  // en bas de liste, plus besoin de les repousser.
  let published = new Set();
  try {
    const { data: pub } = await supabase.storage.from(BUCKET).download(`${KIT_DIR}/published.json`);
    if (pub) {
      const arr = JSON.parse(Buffer.from(await pub.arrayBuffer()).toString('utf-8'));
      published = new Set(Array.isArray(arr) ? arr : []);
    }
  } catch { /* pas encore de fichier : tout est « à publier » */ }

  const activeDogs = (dogs || []).filter(d => d.photos?.length);
  // Tri : chiens avant chats ; dans chaque espèce, les NON publiés d'abord, puis
  // par intérêt croissant (0 like = priorité), puis les plus anciens en tête.
  activeDogs.sort((a, b) => {
    const ga = speciesGroup(a.species), gb = speciesGroup(b.species);
    if (ga !== gb) return GROUP_RANK[ga] - GROUP_RANK[gb];
    const pa = published.has(a.id) ? 1 : 0, pb = published.has(b.id) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    const ia = interest[a.id] || 0, ib = interest[b.id] || 0;
    if (ia !== ib) return ia - ib;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  const activeIds = new Set(activeDogs.map(d => d.id));

  // Images déjà présentes dans le dossier du kit
  const { data: files } = await supabase.storage.from(BUCKET).list(KIT_DIR, { limit: 1000 });
  const existing = new Set((files || []).map(f => f.name).filter(n => n.endsWith('.jpg')).map(n => n.replace('.jpg', '')));

  // Supprimer les images des chiens qui ne sont plus actifs
  const toRemove = [...existing].filter(id => !activeIds.has(id)).map(id => `${KIT_DIR}/${id}.jpg`);
  if (toRemove.length) await supabase.storage.from(BUCKET).remove(toRemove);

  // Générer les images manquantes
  let created = 0;
  const failedIds = new Set();
  for (const d of activeDogs) {
    if (existing.has(d.id)) continue;
    try {
      const img = await brandedImage(d);
      const { error } = await supabase.storage.from(BUCKET).upload(`${KIT_DIR}/${d.id}.jpg`, img, {
        contentType: 'image/jpeg', upsert: true,
      });
      if (error) throw new Error(error.message);
      created++;
    } catch (err) {
      console.error(`[FbKit] ✗ ${d.name}: ${err.message}`);
      failedIds.add(d.id);
    }
  }

  // Régénérer la page HTML (animaux actifs ayant une image)
  const items = activeDogs
    .filter(d => !failedIds.has(d.id))
    .map(d => {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${KIT_DIR}/${d.id}.jpg`);
      return {
        id: d.id, species: speciesGroup(d.species), name: d.name.trim(), img: pub.publicUrl,
        text: caption(d, shelterNames, shelterById[d.shelter_id] || ''),
        prio: !published.has(d.id) && !(interest[d.id] > 0),
      };
    });

  const nbDogs = items.filter(i => i.species === 'dog').length;
  const nbCats = items.filter(i => i.species === 'cat').length;
  const nbNacs = items.filter(i => i.species === 'nac').length;

  let cards = '';
  let lastSpecies = null;
  items.forEach((it, i) => {
    if (it.species !== lastSpecies) {
      const label = it.species === 'dog' ? `🐶 Chiens (${nbDogs})` : it.species === 'cat' ? `🐱 Chats (${nbCats})` : `🐰 NACs (${nbNacs})`;
      cards += `\n  <h3 class="section" data-species="${it.species}">${label}</h3>\n`;
      lastSpecies = it.species;
    }
    cards += `
  <div class="card" data-id="${it.id}" data-species="${it.species}" data-name="${esc(it.name.toLowerCase())}">
    <a href="${it.img}" target="_blank"><img src="${it.img}" alt="${esc(it.name)}" loading="lazy"/></a>
    <div class="body">
      <h2>${esc(it.name.toUpperCase())}</h2>
      ${it.prio ? '<div class="prio">⭐ À pousser en priorité</div>' : ''}
      <pre id="t${i}">${esc(it.text)}</pre>
      <button class="copy" onclick="copie(${i}, this)">📋 Copier le texte</button>
      <button class="done-btn" onclick="basculeFait('${it.id}', this)">☑️ Publication faite</button>
    </div>
  </div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>Kit Facebook Adoptly — ${nbDogs} chiens, ${nbCats} chats${nbNacs ? `, ${nbNacs} NACs` : ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f4fa; padding: 16px; }
  header { text-align: center; margin-bottom: 20px; }
  header h1 { color: #1B4F8A; font-size: 22px; margin-bottom: 6px; }
  header p { color: #667; font-size: 14px; line-height: 1.5; max-width: 420px; margin: 0 auto; }
  .section { grid-column: 1 / -1; color: #1B4F8A; font-size: 20px; margin: 12px 4px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; max-width: 1100px; margin: 0 auto; }
  .card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
  .card img { width: 100%; display: block; aspect-ratio: 4/5; object-fit: cover; }
  .body { padding: 14px; }
  h2 { color: #1B4F8A; font-size: 17px; margin-bottom: 8px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; color: #444; background: #f7f9fc; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
  button { width: 100%; border: 0; border-radius: 10px; padding: 12px; font-size: 15px; font-weight: 700; cursor: pointer; }
  button.copy { background: #1B4F8A; color: #fff; margin-bottom: 8px; }
  button.copy.ok { background: #22a06b; }
  button.done-btn { background: #eef2f8; color: #1B4F8A; }
  .search-wrap { position: sticky; top: 0; z-index: 20; background: #f0f4fa; padding: 8px 0 12px; max-width: 1100px; margin: 0 auto; }
  #search { width: 100%; padding: 13px 16px; font-size: 16px; border: 2px solid #dde5f0; border-radius: 12px; outline: none; }
  #search:focus { border-color: #1B4F8A; }
  .tabs { display: flex; gap: 8px; margin-top: 8px; }
  .tab { flex: 1; padding: 11px 8px; border-radius: 12px; border: 2px solid #dde5f0; background: #fff; color: #1B4F8A; font-weight: 700; font-size: 15px; cursor: pointer; transition: all .15s; }
  .tab.active { background: #1B4F8A; color: #fff; border-color: #1B4F8A; }
  .aucun { text-align: center; color: #889; padding: 30px; display: none; }
  .prio { display: inline-block; background: #fff4e6; color: #F07A2A; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 8px; margin-bottom: 8px; }
  .card.fait { opacity: 0.45; }
  .card.fait .prio { display: none; }
  .card.fait img { filter: grayscale(1); }
  .card.fait h2 { text-decoration: line-through; }
  .card.fait .done-btn { background: #22a06b; color: #fff; }
</style>
</head>
<body>
<header>
  <h1>🐾 Kit publications Facebook — ${nbDogs} chiens, ${nbCats} chats${nbNacs ? `, ${nbNacs} NACs` : ''}</h1>
  <p><strong>1.</strong> Touche une photo pour l'ouvrir, puis appuie longuement dessus pour l'enregistrer.<br/>
  <strong>2.</strong> Touche « Copier le texte » et colle-le dans ta publication Facebook.<br/>
  <strong>3.</strong> Une fois publiée, touche « Publication faite » — l'animal est barré et la coche est <strong>partagée</strong> : tu vois aussi ce que les autres ont déjà publié.</p>
</header>
<div class="search-wrap">
  <input id="search" type="search" placeholder="🔍 Rechercher un animal par son nom…" oninput="appliquer()" autocomplete="off"/>
  <div class="tabs">
    <button class="tab active" onclick="filtrerEspece('all', this)">🐾 Tous</button>
    <button class="tab" onclick="filtrerEspece('dog', this)">🐶 Chiens (${nbDogs})</button>
    <button class="tab" onclick="filtrerEspece('cat', this)">🐱 Chats (${nbCats})</button>
    ${nbNacs ? `<button class="tab" onclick="filtrerEspece('nac', this)">🐰 NACs (${nbNacs})</button>` : ''}
  </div>
</div>
<p class="aucun" id="aucun">Aucun animal ne correspond à cette recherche.</p>
<div class="grid">
${cards}
</div>
<script>
var filtreEspece = 'all';
function appliquer() {
  var q = (document.getElementById('search').value || '').trim().toLowerCase();
  var cards = document.querySelectorAll('.card');
  var visibles = 0;
  cards.forEach(function (c) {
    var okSp = filtreEspece === 'all' || c.dataset.species === filtreEspece;
    var okQ = !q || c.dataset.name.includes(q);
    var ok = okSp && okQ;
    c.style.display = ok ? '' : 'none';
    if (ok) visibles++;
  });
  // Titres de section : masqués si leur espèce est filtrée, ou si plus aucune carte visible dessous
  document.querySelectorAll('.section').forEach(function (sec) {
    if (filtreEspece !== 'all' && sec.dataset.species !== filtreEspece) { sec.style.display = 'none'; return; }
    var el = sec.nextElementSibling, anyVisible = false;
    while (el && !el.classList.contains('section')) {
      if (el.classList.contains('card') && el.style.display !== 'none') { anyVisible = true; break; }
      el = el.nextElementSibling;
    }
    sec.style.display = anyVisible ? '' : 'none';
  });
  document.getElementById('aucun').style.display = visibles === 0 ? 'block' : 'none';
}
function filtrerEspece(sp, btn) {
  filtreEspece = sp;
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  appliquer();
}
function copie(i, btn) {
  navigator.clipboard.writeText(document.getElementById('t' + i).textContent).then(() => {
    btn.textContent = '✅ Copié !';
    btn.classList.add('ok');
    setTimeout(() => { btn.textContent = '📋 Copier le texte'; btn.classList.remove('ok'); }, 2000);
  });
}
// État "Publication faite" PARTAGÉ (stocké côté serveur). Affichage instantané
// depuis un cache local, puis synchro serveur + rafraîchissement périodique
// pour que Simon et Coralie voient les mêmes coches.
var PUB_API = '/api/public/kit-facebook-7h2p/published';
var faitsSet = new Set();

function cacheGet() { try { return JSON.parse(localStorage.getItem('fbkit-faits') || '[]'); } catch { return []; } }
function cacheSet(arr) { try { localStorage.setItem('fbkit-faits', JSON.stringify(arr)); } catch {} }

function applyFaits() {
  document.querySelectorAll('.card').forEach(function (card) {
    var done = faitsSet.has(card.dataset.id);
    card.classList.toggle('fait', done);
    var btn = card.querySelector('.done-btn');
    if (btn) btn.textContent = done ? '✅ Publiée — annuler' : '☑️ Publication faite';
  });
}

function syncFaits() {
  fetch(PUB_API, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      faitsSet = new Set(d.ids || []);
      cacheSet(Array.from(faitsSet));
      applyFaits();
    })
    .catch(function () {});
}

function basculeFait(id, btn) {
  var done = !faitsSet.has(id);
  if (done) faitsSet.add(id); else faitsSet.delete(id);   // optimiste
  cacheSet(Array.from(faitsSet));
  applyFaits();
  fetch(PUB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id, done: done }),
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      faitsSet = new Set(d.ids || []);
      cacheSet(Array.from(faitsSet));
      applyFaits();
    })
    .catch(function () {});
}

// Affichage immédiat depuis le cache, puis synchro serveur
faitsSet = new Set(cacheGet());
applyFaits();
syncFaits();
setInterval(syncFaits, 20000);
</script>
</body>
</html>`;

  const { error: htmlErr } = await supabase.storage.from(BUCKET).upload(`${KIT_DIR}/index.html`, Buffer.from(html), {
    contentType: 'text/html; charset=utf-8', upsert: true,
  });
  if (htmlErr) throw new Error(htmlErr.message);

  return { total: items.length, created, removed: toRemove.length, failed: failedIds.size };
}
