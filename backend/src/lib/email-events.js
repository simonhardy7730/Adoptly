import { supabase } from './supabase.js';

/**
 * Journalise un évènement email (funnel des relances). Non-bloquant :
 * si la table `email_events` n'existe pas encore, l'erreur est ignorée.
 *   type   : 'relance_sent' | 'magic_click'
 *   source : 'relance' | 'notif' | null
 */
export async function logEmailEvent({ type, source = null, adoptantId = null, matchId = null }) {
  try {
    await supabase.from('email_events').insert({
      type, source, adoptant_id: adoptantId, match_id: matchId,
    });
  } catch { /* non-bloquant */ }
}
