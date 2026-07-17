import { supabase } from './supabase.js';

/**
 * Nombre de mois révolus depuis une date de naissance.
 * Le mois en cours n'est compté que lorsqu'il est terminé :
 * né le 15/04, on passe à 3 mois le 15/07, pas le 1er.
 */
export function monthsSince(birthDate) {
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  return Math.max(0, months);
}

/** Date de naissance déduite d'un âge en mois observé à une date donnée. */
export function birthDateFromAge(ageMonths, observedAt = new Date()) {
  const n = parseInt(ageMonths, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  const d = new Date(observedAt);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Resynchronise la colonne `age` de tous les animaux datés.
 * On garde `age` en base (40 endroits la lisent, et le matching s'en sert)
 * plutôt que de la recalculer à chaque lecture.
 * Seuls les animaux dont l'âge a réellement changé sont écrits.
 */
export async function refreshAges() {
  const { data, error } = await supabase
    .from('animals')
    .select('id, name, age, birth_date')
    .not('birth_date', 'is', null);

  if (error) throw new Error('lecture: ' + error.message);

  let updated = 0;
  for (const a of data) {
    const fresh = monthsSince(a.birth_date);
    if (fresh === null || fresh === a.age) continue;
    const { error: upErr } = await supabase.from('animals').update({ age: fresh }).eq('id', a.id);
    if (upErr) { console.error(`[Ages] ${a.name}: ${upErr.message}`); continue; }
    updated++;
  }
  return { scanned: data.length, updated };
}
