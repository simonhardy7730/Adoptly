import sharp from 'sharp';
import { supabase } from './supabase.js';

const KIT_DIR = 'fb-kit-7h2p';
const BUCKET = 'animal-photos';

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

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function caption(d) {
  const name = d.name.trim().replace(/\s+/g, ' ');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const breed = (d.breed || 'croisé').trim();
  const age = ageLabel(d.age);
  const size = SIZE_FR[d.size];
  const traits = (d.temperament || '').split(',').map(t => TEMP_FR[t.trim()]).filter(Boolean);

  const desc = breed.toLowerCase().startsWith('crois') ? 'Croisé' : breed.charAt(0).toUpperCase() + breed.slice(1);
  const parts = [];
  if (age) parts.push(age);
  if (size) parts.push(size);
  const line2 = desc + (parts.length ? ` de ${parts.join(', ')}` : '');

  let line3 = '';
  if (traits.length === 1) line3 = `${displayName} est ${traits[0]}.`;
  else if (traits.length > 1) line3 = `${displayName} est ${traits.slice(0, -1).join(', ')} et ${traits[traits.length - 1]}.`;

  const tags = d.species === 'cat'
    ? '#ChatAAdopter #AdoptionChat #AdoptionAnimale #Adoptly'
    : '#ChienAAdopter #AdoptionChien #AdoptionAnimale #Adoptly';

  return `🐾 Voici ${displayName} !

${line2}.
${line3}

Il ne demande qu'une chose : une famille qui lui donnera sa chance. 🧡

💙 Son profil complet est ici :
https://adoptly.fr/animal/${d.id}

${tags}`;
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
    <text x="48" y="${H - 84}" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="600" fill="#ffffff" opacity="0.9">Je cherche une famille 🧡</text>
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
    .select('id, name, breed, age, size, temperament, photos, species, created_at')
    .eq('status', 'active').in('species', ['dog', 'cat'])
    .not('photos', 'is', null)
    .order('created_at', { ascending: false });
  if (dogsErr) throw new Error(dogsErr.message);

  const activeDogs = (dogs || []).filter(d => d.photos?.length);
  activeDogs.sort((a, b) => a.species === b.species ? 0 : a.species === 'dog' ? -1 : 1);
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
      return { id: d.id, species: d.species, name: d.name.trim(), img: pub.publicUrl, text: caption(d) };
    });

  const nbDogs = items.filter(i => i.species === 'dog').length;
  const nbCats = items.filter(i => i.species === 'cat').length;

  let cards = '';
  let lastSpecies = null;
  items.forEach((it, i) => {
    if (it.species !== lastSpecies) {
      cards += `\n  <h3 class="section">${it.species === 'dog' ? `🐶 Chiens (${nbDogs})` : `🐱 Chats (${nbCats})`}</h3>\n`;
      lastSpecies = it.species;
    }
    cards += `
  <div class="card" data-id="${it.id}">
    <a href="${it.img}" target="_blank"><img src="${it.img}" alt="${esc(it.name)}" loading="lazy"/></a>
    <div class="body">
      <h2>${esc(it.name.toUpperCase())}</h2>
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
<title>Kit Facebook — ${nbDogs} chiens et ${nbCats} chats Adoptly</title>
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
  .card.fait { opacity: 0.45; }
  .card.fait img { filter: grayscale(1); }
  .card.fait h2 { text-decoration: line-through; }
  .card.fait .done-btn { background: #22a06b; color: #fff; }
</style>
</head>
<body>
<header>
  <h1>🐾 Kit publications Facebook — ${nbDogs} chiens et ${nbCats} chats</h1>
  <p><strong>1.</strong> Touche une photo pour l'ouvrir, puis appuie longuement dessus pour l'enregistrer.<br/>
  <strong>2.</strong> Touche « Copier le texte » et colle-le dans ta publication Facebook.<br/>
  <strong>3.</strong> Une fois publiée, touche « Publication faite » — l'animal sera barré pour t'y retrouver.</p>
</header>
<div class="grid">
${cards}
</div>
<script>
function copie(i, btn) {
  navigator.clipboard.writeText(document.getElementById('t' + i).textContent).then(() => {
    btn.textContent = '✅ Copié !';
    btn.classList.add('ok');
    setTimeout(() => { btn.textContent = '📋 Copier le texte'; btn.classList.remove('ok'); }, 2000);
  });
}
function faits() {
  try { return JSON.parse(localStorage.getItem('fbkit-faits') || '[]'); } catch { return []; }
}
function basculeFait(id, btn) {
  let list = faits();
  const card = btn.closest('.card');
  if (list.includes(id)) {
    list = list.filter(x => x !== id);
    card.classList.remove('fait');
    btn.textContent = '☑️ Publication faite';
  } else {
    list.push(id);
    card.classList.add('fait');
    btn.textContent = '✅ Publiée — annuler';
  }
  localStorage.setItem('fbkit-faits', JSON.stringify(list));
}
// Restaurer l'état au chargement
faits().forEach(id => {
  const card = document.querySelector('.card[data-id="' + id + '"]');
  if (card) {
    card.classList.add('fait');
    card.querySelector('.done-btn').textContent = '✅ Publiée — annuler';
  }
});
</script>
</body>
</html>`;

  const { error: htmlErr } = await supabase.storage.from(BUCKET).upload(`${KIT_DIR}/index.html`, Buffer.from(html), {
    contentType: 'text/html; charset=utf-8', upsert: true,
  });
  if (htmlErr) throw new Error(htmlErr.message);

  return { total: items.length, created, removed: toRemove.length, failed: failedIds.size };
}
