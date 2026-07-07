import { supabase } from './supabase.js';

/**
 * Exécute un `.select().in(col, values)` en découpant `values` en lots.
 *
 * Pourquoi : PostgREST encode un `.in(col, [ids])` dans l'URL de la requête.
 * Avec des centaines d'ids (gros refuges = beaucoup de matchs/adoptants),
 * l'URL dépasse la limite du serveur et la requête échoue silencieusement
 * (« fetch failed »). Découper en lots garde chaque URL sous la limite et
 * rend le comportement identique quelle que soit la taille des données.
 *
 * @param {string} table
 * @param {string} columns   - colonnes à sélectionner (ex: 'id, email')
 * @param {string} inColumn  - colonne du filtre IN (ex: 'match_id')
 * @param {Array}  values    - valeurs du filtre IN
 * @param {(q:any)=>any} [applyFilters] - filtres supplémentaires optionnels
 * @returns {Promise<Array>} toutes les lignes concaténées
 */
export async function selectIn(table, columns, inColumn, values, applyFilters) {
  const CHUNK = 100;
  let rows = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    let q = supabase.from(table).select(columns).in(inColumn, values.slice(i, i + CHUNK));
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw error;
    rows = rows.concat(data || []);
  }
  return rows;
}
