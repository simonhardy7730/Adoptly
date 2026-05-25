/**
 * Service d'envoi d'emails — Adoptly
 * Utilise l'API Resend (resend.com) via fetch natif (Node 18+).
 * Free tier : 3 000 emails/mois, 100/jour — largement suffisant en MVP.
 *
 * Configuration : ajouter RESEND_API_KEY dans .env
 * Domaine expéditeur : configurer "bonjour@adoptly.fr" dans le dashboard Resend.
 */

const RESEND_URL = 'https://api.resend.com/emails';
const FROM       = 'Adoptly <info@adoptly.fr>';

/** Utilitaire interne : envoie un email via l'API Resend */
async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY absent — email ignoré.');
    return;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[Email] Échec :', body);
    }
  } catch (err) {
    console.error('[Email] Erreur réseau :', err.message);
  }
}

/**
 * Envoie l'email de bienvenue après inscription adoptant.
 * @param {{ email: string }} params
 */
export async function sendWelcomeEmail({ email }) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:40px 32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:1;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0;">Pas juste un animal. Le vôtre.</p>
      </div>

      <!-- Corps -->
      <div style="padding:40px 32px;">
        <h1 style="color:#1B4F8A;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.3px;">
          Bienvenue sur Adoptly 🐾
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 28px;">
          Vous faites le premier pas vers une belle histoire d'adoption.
          Adoptly va vous aider à trouver l'animal qui correspond vraiment
          à votre mode de vie — pas juste le premier disponible.
        </p>

        <!-- Étapes -->
        <div style="background:#F4F7FF;border-radius:16px;padding:24px;margin-bottom:28px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">
            Vos prochaines étapes
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:14px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" style="padding-right:12px;">
                      <div style="width:24px;height:24px;background:#1B4F8A;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:11px;font-weight:800;">1</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.5;">
                        <strong>Complétez votre profil</strong> — quelques questions sur votre logement et votre style de vie
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:14px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" style="padding-right:12px;">
                      <div style="width:24px;height:24px;background:#1B4F8A;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:11px;font-weight:800;">2</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.5;">
                        <strong>Découvrez vos compatibilités</strong> — des animaux sélectionnés pour vous dans des refuges proches
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" style="padding-right:12px;">
                      <div style="width:24px;height:24px;background:#1B4F8A;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:11px;font-weight:800;">3</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.5;">
                        <strong>Contactez le refuge</strong> — rencontrez votre futur compagnon
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin:32px 0 0;">
          <a href="https://adoptly.fr/adoptant/questionnaire"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;
                    letter-spacing:-0.2px;">
            Compléter mon profil →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">Prend moins de 3 minutes.</p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © 2025 Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Vous recevez cet e-mail car vous venez de créer un compte sur Adoptly.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      email,
    subject: 'Bienvenue sur Adoptly — votre compagnon vous attend 🐾',
    html,
  });
}

/**
 * Envoie l'email de bienvenue après inscription d'un refuge.
 * @param {{ email: string, name: string }} params
 */
export async function sendShelterWelcomeEmail({ email, name }) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:40px 32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:1;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0;">La plateforme des refuges engagés</p>
      </div>

      <!-- Corps -->
      <div style="padding:40px 32px;">
        <h1 style="color:#1B4F8A;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.3px;">
          Bienvenue, ${name} 🏠
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 28px;">
          Votre refuge est maintenant sur Adoptly. Vous allez pouvoir présenter
          vos animaux à des adoptants sélectionnés — pas n'importe qui,
          des personnes dont le profil correspond vraiment à vos pensionnaires.
        </p>

        <!-- Étapes -->
        <div style="background:#F4F7FF;border-radius:16px;padding:24px;margin-bottom:28px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">
            Pour bien démarrer
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:14px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" style="padding-right:12px;">
                      <div style="width:24px;height:24px;background:#1B4F8A;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:11px;font-weight:800;">1</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.5;">
                        <strong>Ajoutez vos animaux</strong> — nom, espèce, âge, caractère et photo
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:14px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" style="padding-right:12px;">
                      <div style="width:24px;height:24px;background:#1B4F8A;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:11px;font-weight:800;">2</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.5;">
                        <strong>Soyez visible</strong> — vos animaux apparaissent aux adoptants compatibles près de chez vous
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" style="padding-right:12px;">
                      <div style="width:24px;height:24px;background:#1B4F8A;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:11px;font-weight:800;">3</div>
                    </td>
                    <td>
                      <p style="margin:0;color:#4B5563;font-size:14px;line-height:1.5;">
                        <strong>Gérez votre tableau de bord</strong> — suivez et mettez à jour vos annonces en temps réel
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin:32px 0 0;">
          <a href="https://adoptly.fr/shelter/dashboard"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;
                    letter-spacing:-0.2px;">
            Accéder à mon tableau de bord →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            Une question ? Répondez directement à cet email.
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © 2025 Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Vous recevez cet e-mail car vous venez de créer un compte refuge sur Adoptly.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      email,
    subject: `Bienvenue sur Adoptly, ${name} — votre refuge est en ligne 🏠`,
    html,
  });
}
