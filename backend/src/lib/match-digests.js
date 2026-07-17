import { supabase } from './supabase.js';
import { sendMatchEncouragementDigestEmail, sendMatchNotificationDigestEmail } from './email.js';

// On attend la fin de la « session de swipe » avant d'envoyer un récap :
// tant que l'adoptant a liké quelque chose il y a moins de DEBOUNCE_MIN,
// on patiente — sinon on regrouperait sa session en plusieurs emails.
const DEBOUNCE_MIN = 20;

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

/**
 * Envoie les récaps de matchs en attente (adoptants + refuges) et marque
 * les matchs comme notifiés. Appelé par le cron toutes les ~15 min.
 * Remplace les emails instantanés « 1 par swipe » (spam + quota).
 */
export async function runMatchDigests() {
  const cutoff = Date.now() - DEBOUNCE_MIN * 60 * 1000;
  let adopterEmails = 0, shelterEmails = 0;

  // ── Récaps ADOPTANTS ──────────────────────────────────────────────
  const { data: pendA, error: eA } = await supabase
    .from('matches')
    .select('id, adoptant_id, animal_id, timestamp')
    .eq('adoptant_notified', false)
    .eq('status', 'interested');
  if (eA) throw new Error('lecture adoptants: ' + eA.message);

  for (const [adoptantId, rows] of groupBy(pendA || [], 'adoptant_id')) {
    const newest = Math.max(...rows.map((r) => new Date(r.timestamp).getTime()));
    if (newest > cutoff) continue; // session encore en cours

    const ids = rows.map((r) => r.id);
    const { data: ad } = await supabase.from('adoptants').select('email, first_name').eq('id', adoptantId).single();
    if (!ad?.email) { await supabase.from('matches').update({ adoptant_notified: true }).in('id', ids); continue; }

    const { data: animals } = await supabase
      .from('animals').select('id, name, photos, shelters(name)')
      .in('id', rows.map((r) => r.animal_id));
    const items = (animals || []).map((a) => ({
      animalName: a.name, animalPhoto: a.photos?.[0] || null, shelterName: a.shelters?.name || 'un refuge',
    }));
    if (items.length) {
      try { await sendMatchEncouragementDigestEmail({ adoptantEmail: ad.email, adoptantName: ad.first_name || '', items }); adopterEmails++; }
      catch (e) { console.error('[Digest adoptant]', e.message); continue; }
    }
    await supabase.from('matches').update({ adoptant_notified: true }).in('id', ids);
  }

  // ── Récaps REFUGES ────────────────────────────────────────────────
  const { data: pendS, error: eS } = await supabase
    .from('matches')
    .select('id, adoptant_id, timestamp, animals(name, shelter_id, shelters(name, email))')
    .eq('shelter_notified', false)
    .eq('status', 'interested');
  if (eS) throw new Error('lecture refuges: ' + eS.message);

  // regrouper par refuge (via l'animal)
  const byShelter = new Map();
  for (const m of pendS || []) {
    const sid = m.animals?.shelter_id;
    if (!sid) continue;
    if (!byShelter.has(sid)) byShelter.set(sid, []);
    byShelter.get(sid).push(m);
  }

  for (const [, rows] of byShelter) {
    const newest = Math.max(...rows.map((r) => new Date(r.timestamp).getTime()));
    if (newest > cutoff) continue;

    const ids = rows.map((r) => r.id);
    const shelter = rows[0].animals?.shelters;
    if (!shelter?.email) { await supabase.from('matches').update({ shelter_notified: true }).in('id', ids); continue; }

    // noms/emails des adoptants concernés
    const adoptantIds = [...new Set(rows.map((r) => r.adoptant_id))];
    const { data: ads } = await supabase.from('adoptants').select('id, email, first_name, last_name').in('id', adoptantIds);
    const adMap = new Map((ads || []).map((a) => [a.id, a]));
    const items = rows.map((r) => {
      const a = adMap.get(r.adoptant_id) || {};
      return {
        animalName: r.animals?.name || 'un animal',
        adoptantName: [a.first_name, a.last_name].filter(Boolean).join(' '),
        adoptantEmail: a.email || '',
      };
    }).filter((it) => it.adoptantEmail);

    if (items.length) {
      try { await sendMatchNotificationDigestEmail({ shelterEmail: shelter.email, shelterName: shelter.name, items }); shelterEmails++; }
      catch (e) { console.error('[Digest refuge]', e.message); continue; }
    }
    await supabase.from('matches').update({ shelter_notified: true }).in('id', ids);
  }

  return { adopterEmails, shelterEmails };
}
