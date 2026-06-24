/**
 * Service d'envoi d'emails — Adoptly
 * Utilise l'API Brevo (brevo.com) via fetch natif (Node 18+).
 * Free tier : 300 emails/jour — 3x plus que Resend.
 *
 * Configuration : ajouter BREVO_API_KEY dans .env
 * Fallback : utilise RESEND_API_KEY si BREVO_API_KEY absent (rétrocompatibilité).
 */

const BREVO_URL  = 'https://api.brevo.com/v3/smtp/email';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM_NAME  = 'Adoptly';
const FROM_EMAIL = 'info@adoptly.fr';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Envoie une liste d'emails en respectant le rate limit (max 4/seconde).
 * @param {Array<() => Promise>} fns - Fonctions async retournant chacune un appel sendEmail
 */
export async function sendEmailsThrottled(fns) {
  const results = [];
  for (const fn of fns) {
    results.push(await fn().catch((e) => e));
    await sleep(250);
  }
  return results;
}

/** Envoie via Resend (prioritaire), fallback Brevo */
async function sendEmail({ to, subject, html }) {
  let sent = false;

  // Resend en priorité — domaine vérifié, fiable
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to, subject, html }),
      });
      if (res.ok) {
        sent = true;
      } else {
        const body = await res.text();
        console.error('[Email/Resend] Échec :', res.status, body);
      }
    } catch (err) {
      console.error('[Email/Resend] Erreur réseau :', err.message);
    }
  }

  // Fallback Brevo si Resend a échoué ou n'est pas configuré
  if (!sent && process.env.BREVO_API_KEY) {
    try {
      const res = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'api-key':      process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (res.ok) {
        sent = true;
      } else {
        const body = await res.text();
        console.error('[Email/Brevo] Échec :', res.status, body);
      }
    } catch (err) {
      console.error('[Email/Brevo] Erreur réseau :', err.message);
    }
  }

  if (!sent) {
    console.error('[Email] ÉCHEC TOTAL — aucun provider n\'a pu envoyer à', to, '| sujet:', subject);
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
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
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
                        <strong>Répondez au questionnaire</strong> — quelques questions sur votre logement et votre style de vie
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
            Définir mes préférences →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">Prend moins de 3 minutes.</p>
        </div>
      </div>

      <!-- Partage & Facebook -->
      <div style="background:#F0F4FF;padding:28px 32px;text-align:center;">
        <p style="color:#374151;font-size:14px;font-weight:700;margin:0 0 8px;">
          Aidez-nous à sauver plus d'animaux 💙
        </p>
        <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0 0 16px;">
          Partagez Adoptly autour de vous — chaque partage peut mener à une adoption.
        </p>
        <div style="margin-bottom:12px;">
          <a href="https://www.facebook.com/profile.php?id=61590534638627"
             style="background:#1877F2;color:#fff;text-decoration:none;font-weight:700;
                    font-size:13px;padding:10px 24px;border-radius:10px;display:inline-block;">
            Suivre notre page Facebook →
          </a>
        </div>
        <div>
          <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fadoptly.fr"
             style="background:#fff;color:#1B4F8A;text-decoration:none;font-weight:600;
                    font-size:13px;padding:10px 24px;border-radius:10px;display:inline-block;
                    border:1px solid #D1D5DB;">
            Partager Adoptly avec mes amis
          </a>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly ·
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
 * Notifie un refuge qu'un adoptant est intéressé par l'un de ses animaux.
 * @param {{ shelterEmail: string, shelterName: string, animalName: string,
 *           adoptantEmail: string, adoptantFirstName?: string, adoptantLastName?: string }} params
 */
export async function sendMatchNotificationEmail({
  shelterEmail, shelterName, animalName,
  adoptantEmail, adoptantFirstName, adoptantLastName,
}) {
  const adoptantDisplay = [adoptantFirstName, adoptantLastName].filter(Boolean).join(' ') || 'Un adoptant';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau match sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:40px 32px;text-align:center;">
        <div style="display:inline-block;text-align:center;margin-bottom:4px;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
              <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
            </div>
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;vertical-align:middle;">Adoptly</span>
          </div>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:8px 0 0;">La plateforme des refuges engagés</p>
      </div>

      <!-- Corps -->
      <div style="padding:40px 32px;">
        <!-- Badge match -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#FFF3E0;border-radius:50px;padding:12px 24px;">
            <span style="font-size:28px;">💚</span>
            <span style="color:#F07A2A;font-weight:800;font-size:18px;margin-left:8px;vertical-align:middle;">Nouveau match !</span>
          </div>
        </div>

        <h1 style="color:#1B4F8A;font-size:20px;font-weight:800;margin:0 0 12px;letter-spacing:-0.3px;text-align:center;">
          ${adoptantDisplay} s'intéresse à <strong>${animalName}</strong>
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 28px;text-align:center;">
          Un(e) adoptant(e) compatible a swipé à droite sur <strong>${animalName}</strong>.<br>
          Vous pouvez le/la contacter directement.
        </p>

        <!-- Infos adoptant -->
        <div style="background:#F4F7FF;border-radius:16px;padding:24px;margin-bottom:28px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">
            Coordonnées de l'adoptant(e)
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:10px;">
                <span style="font-size:16px;">👤</span>
                <span style="color:#4B5563;font-size:14px;margin-left:8px;">${adoptantDisplay}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style="font-size:16px;">✉️</span>
                <a href="mailto:${adoptantEmail}" style="color:#1B4F8A;font-size:14px;margin-left:8px;text-decoration:none;font-weight:600;">${adoptantEmail}</a>
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
            Voir mon tableau de bord →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            Répondez à cet email ou contactez directement l'adoptant(e).
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Notification envoyée à ${shelterName} pour l'animal ${animalName}.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      shelterEmail,
    subject: `💚 Nouveau match — ${adoptantDisplay} est intéressé(e) par ${animalName}`,
    html,
  });
}

/**
 * Envoie un email de réinitialisation de mot de passe.
 * @param {{ email: string, resetUrl: string, role: 'adoptant'|'shelter' }} params
 */
export async function sendPasswordResetEmail({ email, resetUrl, role }) {
  const isAdoptant = role === 'adoptant';
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de votre mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:40px 32px;text-align:center;">
        <div style="display:inline-block;text-align:center;margin-bottom:4px;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
              <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
            </div>
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;vertical-align:middle;">Adoptly</span>
          </div>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:8px 0 0;">Sécurité de votre compte</p>
      </div>

      <!-- Corps -->
      <div style="padding:40px 32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:48px;">🔑</span>
        </div>
        <h1 style="color:#1B4F8A;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.3px;text-align:center;">
          Réinitialiser votre mot de passe
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 28px;text-align:center;">
          Vous avez demandé à réinitialiser votre mot de passe.<br>
          Ce lien est valable <strong>1 heure</strong>.
        </p>

        <!-- CTA -->
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${resetUrl}"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;
                    letter-spacing:-0.2px;">
            Choisir un nouveau mot de passe →
          </a>
        </div>

        <div style="background:#FFF3E0;border-radius:12px;padding:16px;text-align:center;">
          <p style="color:#92400E;font-size:13px;margin:0;line-height:1.5;">
            ⚠️ Si vous n'avez pas demandé cette réinitialisation,<br>
            ignorez simplement cet email. Votre mot de passe restera inchangé.
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Demande reçue pour le compte ${isAdoptant ? 'adoptant' : 'refuge'} : ${email}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      email,
    subject: 'Réinitialisez votre mot de passe Adoptly 🔑',
    html,
  });
}

/**
 * Notifie un refuge qu'une famille d'accueil est intéressée par l'un de ses animaux.
 * @param {{ shelterEmail: string, shelterName: string, animalName: string,
 *           fosterEmail: string, fosterFirstName?: string, fosterLastName?: string }} params
 */
export async function sendFosterMatchNotificationEmail({
  shelterEmail, shelterName, animalName,
  fosterEmail, fosterFirstName, fosterLastName,
}) {
  const fosterDisplay = [fosterFirstName, fosterLastName].filter(Boolean).join(' ') || 'Une famille d\'accueil';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle demande d'accueil sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:40px 32px;text-align:center;">
        <div style="display:inline-block;text-align:center;margin-bottom:4px;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
              <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
            </div>
            <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;vertical-align:middle;">Adoptly</span>
          </div>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:8px 0 0;">La plateforme des refuges engagés</p>
      </div>

      <!-- Corps -->
      <div style="padding:40px 32px;">
        <!-- Badge -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#FFF3E0;border-radius:50px;padding:12px 24px;">
            <span style="font-size:28px;">🏠</span>
            <span style="color:#F07A2A;font-weight:800;font-size:18px;margin-left:8px;vertical-align:middle;">Nouvelle famille d'accueil !</span>
          </div>
        </div>

        <h1 style="color:#1B4F8A;font-size:20px;font-weight:800;margin:0 0 12px;letter-spacing:-0.3px;text-align:center;">
          ${fosterDisplay} souhaite accueillir <strong>${animalName}</strong>
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 28px;text-align:center;">
          Une famille d'accueil compatible a exprimé son intérêt pour <strong>${animalName}</strong>.<br>
          Vous pouvez la contacter directement.
        </p>

        <!-- Infos famille d'accueil -->
        <div style="background:#F4F7FF;border-radius:16px;padding:24px;margin-bottom:28px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">
            Coordonnées de la famille d'accueil
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:10px;">
                <span style="font-size:16px;">👤</span>
                <span style="color:#4B5563;font-size:14px;margin-left:8px;">${fosterDisplay}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style="font-size:16px;">✉️</span>
                <a href="mailto:${fosterEmail}" style="color:#1B4F8A;font-size:14px;margin-left:8px;text-decoration:none;font-weight:600;">${fosterEmail}</a>
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
            Voir mon tableau de bord →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            Répondez à cet email ou contactez directement la famille d'accueil.
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Notification envoyée à ${shelterName} pour l'animal ${animalName} (accueil temporaire).
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      shelterEmail,
    subject: `🏠 Nouvelle famille d'accueil — ${fosterDisplay} est disponible pour ${animalName}`,
    html,
  });
}

/**
 * Notifie un adoptant qu'un nouvel animal compatible vient d'être ajouté.
 * @param {{ adoptantEmail: string, adoptantFirstName?: string,
 *           animalName: string, animalSpecies: string, animalBreed?: string,
 *           shelterName: string, photoUrl?: string }} params
 */
export async function sendNewAnimalNotificationEmail({
  adoptantEmail, adoptantFirstName,
  animalName, animalSpecies, animalBreed,
  shelterName, photoUrl,
}) {
  const firstName = adoptantFirstName || 'Bonjour';
  const speciesEmoji = {
    dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾',
  }[animalSpecies] || '🐾';
  const animalDesc = animalBreed ? `${animalBreed} (${animalSpecies})` : animalSpecies;

  const photoBlock = photoUrl
    ? `<img src="${photoUrl}" alt="${animalName}" style="width:100%;display:block;border-radius:16px 16px 0 0;" />`
    : `<div style="width:100%;height:180px;background:#E0E9FF;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:center;font-size:64px;text-align:center;line-height:180px;">${speciesEmoji}</div>`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Un nouvel animal vous attend sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:32px 32px 20px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0;">Un animal compatible vous attend</p>
      </div>

      <!-- Photo animal -->
      <div style="margin:0;">
        ${photoBlock}
      </div>

      <!-- Corps -->
      <div style="padding:32px 32px 40px;">
        <!-- Badge -->
        <div style="text-align:center;margin-bottom:20px;">
          <div style="display:inline-block;background:#FFF3E0;border-radius:50px;padding:10px 20px;">
            <span style="font-size:22px;">${speciesEmoji}</span>
            <span style="color:#F07A2A;font-weight:800;font-size:16px;margin-left:8px;vertical-align:middle;">Nouveau match potentiel !</span>
          </div>
        </div>

        <h1 style="color:#1B4F8A;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;text-align:center;">
          ${firstName}, rencontrez <strong>${animalName}</strong>&nbsp;!
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">
          Le refuge <strong>${shelterName}</strong> vient d'ajouter<br>
          <strong>${animalName}</strong> (${animalDesc}) — et son profil correspond à vos préférences.
        </p>

        <!-- Infos rapides -->
        <div style="background:#F4F7FF;border-radius:16px;padding:20px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#374151;font-size:14px;margin:0 0 4px;">
            <strong>${animalName}</strong> est disponible à l'adoption chez
          </p>
          <p style="color:#1B4F8A;font-size:15px;font-weight:700;margin:0;">
            🏠 ${shelterName}
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="https://adoptly.fr/adoptant/swipe"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;
                    letter-spacing:-0.2px;">
            Voir ${animalName} →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            Retrouvez-le dans votre file de matchs sur Adoptly.
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Vous recevez ce message car votre profil est compatible avec cet animal.<br>
          Connectez-vous à votre compte pour gérer vos préférences.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      adoptantEmail,
    subject: `${speciesEmoji} ${animalName} vous attend — nouveau match sur Adoptly !`,
    html,
  });
}

/**
 * Notifie un adoptant que l'animal qu'il avait liké vient d'être adopté.
 * @param {{ adoptantEmail: string, adoptantFirstName?: string,
 *           animalName: string, animalSpecies: string, shelterName: string }} params
 */
export async function sendAnimalAdoptedEmail({
  adoptantEmail, adoptantFirstName,
  animalName, animalSpecies, shelterName,
}) {
  const firstName = adoptantFirstName ? `, ${adoptantFirstName}` : '';
  const speciesEmoji = {
    dog: '🐕', cat: '🐈', rabbit: '🐇', guinea_pig: '🐹', other: '🐾',
  }[animalSpecies] || '🐾';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${animalName} a trouvé sa famille</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:32px 32px 24px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0;">Une belle nouvelle à partager</p>
      </div>

      <!-- Corps -->
      <div style="padding:40px 32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:56px;">🎉</span>
        </div>

        <h1 style="color:#1B4F8A;font-size:22px;font-weight:800;margin:0 0 12px;text-align:center;letter-spacing:-0.3px;">
          Bonne nouvelle${firstName} !
        </h1>
        <p style="color:#6B7280;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">
          ${speciesEmoji} <strong>${animalName}</strong> a trouvé sa famille pour toujours.<br>
          Merci d'avoir aimé ${animalName} chez <strong>${shelterName}</strong>.
        </p>

        <!-- Message encourageant -->
        <div style="background:#F4F7FF;border-radius:16px;padding:20px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">
            Votre prochain compagnon vous attend peut-être déjà.<br>
            De nouveaux animaux compatibles avec votre profil<br>
            sont ajoutés régulièrement par nos refuges partenaires.
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="https://adoptly.fr/adoptant/swipe"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;
                    letter-spacing:-0.2px;">
            Continuer à explorer →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            De nouveaux animaux vous attendent sur Adoptly.
          </p>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly ·
          <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
        <p style="color:#D1D5DB;font-size:11px;margin:8px 0 0;">
          Vous recevez ce message car vous aviez manifesté un intérêt pour ${animalName}.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      adoptantEmail,
    subject: `🎉 ${animalName} a trouvé sa famille — et le vôtre vous attend !`,
    html,
  });
}

/**
 * Envoie l'email de bienvenue après inscription d'un refuge.
 * Inclut un template Facebook prêt à publier pour maximiser leur visibilité.
 * @param {{ email: string, name: string }} params
 */
export async function sendShelterWelcomeEmail({ email, name }) {
  const fbTemplate = `🐾 Bonne nouvelle ! ${name} rejoint Adoptly, la plateforme qui connecte les animaux à adopter avec les familles qui leur correspondent vraiment.\n\nRetrouvez tous nos pensionnaires sur adoptly.fr et trouvez votre futur compagnon idéal !\n\n👉 adoptly.fr\n\n#Adoption #Refuge #Animaux #Adoptly #AdoptionResponsable`;

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
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
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

        <!-- Section Facebook -->
        <div style="border:2px solid #E8F0FE;border-radius:16px;padding:24px;margin-bottom:28px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:32px;height:32px;background:#1877F2;border-radius:8px;text-align:center;line-height:32px;flex-shrink:0;">
              <span style="color:#fff;font-weight:900;font-size:16px;">f</span>
            </div>
            <p style="color:#374151;font-size:13px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.05em;">
              Annoncez-le à votre communauté Facebook !
            </p>
          </div>
          <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0 0 14px;">
            Copiez ce message et publiez-le sur la page Facebook de votre refuge.
            Plus vous serez visibles, plus vous recevrez de demandes d'adoption !
          </p>
          <div style="background:#F8F9FF;border:1px solid #DBEAFE;border-radius:12px;padding:16px;">
            <p style="color:#374151;font-size:13px;line-height:1.7;margin:0;white-space:pre-line;font-family:Georgia,serif;">🐾 Bonne nouvelle ! ${name} rejoint Adoptly, la plateforme qui connecte les animaux à adopter avec les familles qui leur correspondent vraiment.

Retrouvez tous nos pensionnaires sur adoptly.fr et trouvez votre futur compagnon idéal !

👉 adoptly.fr

#Adoption #Refuge #Animaux #Adoptly #AdoptionResponsable</p>
          </div>
          <p style="color:#9CA3AF;font-size:11px;margin:10px 0 0;">
            💡 Astuce : ajoutez une photo de l'un de vos animaux pour maximiser l'engagement.
          </p>
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
          © ${new Date().getFullYear()} Adoptly ·
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

/**
 * Notifie l'admin (Simon) qu'un nouvel adoptant vient de s'inscrire.
 * @param {{ adoptantEmail: string, via?: 'email'|'google' }} params
 */
export async function sendAdminNewAdoptantEmail({ adoptantEmail, via = 'email' }) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@adoptly.fr';
  console.log(`[Email] sendAdminNewAdoptantEmail → ${ADMIN_EMAIL} (inscrit: ${adoptantEmail}, via: ${via})`);
  const registeredAt = new Date().toLocaleString('fr-BE', {
    timeZone: 'Europe/Brussels',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const viaLabel = via === 'google' ? 'Google OAuth' : 'Email / mot de passe';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvel adoptant inscrit sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:36px 32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">Notification admin</p>
      </div>

      <!-- Corps -->
      <div style="padding:36px 32px;">

        <!-- Badge -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#EFF6FF;border-radius:50px;padding:12px 24px;">
            <span style="font-size:26px;">🐾</span>
            <span style="color:#1B4F8A;font-weight:800;font-size:17px;margin-left:8px;vertical-align:middle;">Nouvel adoptant inscrit !</span>
          </div>
        </div>

        <p style="color:#9CA3AF;font-size:13px;text-align:center;margin:0 0 28px;">${registeredAt}</p>

        <!-- Infos adoptant -->
        <div style="background:#F4F7FF;border-radius:16px;padding:24px;margin-bottom:24px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">
            Détails
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-size:15px;">✉️</span>
                <span style="color:#374151;font-size:14px;font-weight:600;margin-left:8px;">Email :</span>
                <a href="mailto:${adoptantEmail}" style="color:#1B4F8A;font-size:14px;margin-left:4px;text-decoration:none;font-weight:600;">${adoptantEmail}</a>
              </td>
            </tr>
            <tr>
              <td>
                <span style="font-size:15px;">🔑</span>
                <span style="color:#374151;font-size:14px;font-weight:600;margin-left:8px;">Inscription via :</span>
                <span style="color:#4B5563;font-size:14px;margin-left:4px;">${viaLabel}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA admin -->
        <div style="text-align:center;">
          <a href="https://adoptly.fr"
             style="background:#1B4F8A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:14px;padding:12px 28px;border-radius:12px;display:inline-block;
                    letter-spacing:-0.2px;">
            Voir la plateforme →
          </a>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:20px 32px;text-align:center;">
        <p style="color:#D1D5DB;font-size:11px;margin:0;">
          Notification automatique Adoptly — nouvel adoptant inscrit.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: `🐾 Nouvel adoptant : ${adoptantEmail} vient de s'inscrire sur Adoptly`,
    html,
  });
}

/**
 * Notifie l'admin (Simon) qu'un nouveau refuge vient de s'inscrire.
 * @param {{ shelterEmail: string, shelterName: string, shelterPhone?: string, shelterAddress?: string }} params
 */
export async function sendAdminNewShelterEmail({ shelterEmail, shelterName, shelterPhone, shelterAddress }) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@adoptly.fr';
  console.log(`[Email] sendAdminNewShelterEmail → ${ADMIN_EMAIL} (refuge: ${shelterName})`);
  const registeredAt = new Date().toLocaleString('fr-BE', {
    timeZone: 'Europe/Brussels',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau refuge inscrit sur Adoptly</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- En-tête gradient -->
      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:36px 32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">Notification admin</p>
      </div>

      <!-- Corps -->
      <div style="padding:36px 32px;">

        <!-- Badge -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#ECFDF5;border-radius:50px;padding:12px 24px;">
            <span style="font-size:26px;">🏠</span>
            <span style="color:#059669;font-weight:800;font-size:17px;margin-left:8px;vertical-align:middle;">Nouveau refuge inscrit !</span>
          </div>
        </div>

        <h1 style="color:#1B4F8A;font-size:20px;font-weight:800;margin:0 0 6px;text-align:center;letter-spacing:-0.3px;">
          ${shelterName}
        </h1>
        <p style="color:#9CA3AF;font-size:13px;text-align:center;margin:0 0 28px;">${registeredAt}</p>

        <!-- Infos refuge -->
        <div style="background:#F4F7FF;border-radius:16px;padding:24px;margin-bottom:24px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">
            Détails du refuge
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-size:15px;">🏷️</span>
                <span style="color:#374151;font-size:14px;font-weight:600;margin-left:8px;">Nom :</span>
                <span style="color:#4B5563;font-size:14px;margin-left:4px;">${shelterName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-size:15px;">✉️</span>
                <span style="color:#374151;font-size:14px;font-weight:600;margin-left:8px;">Email :</span>
                <a href="mailto:${shelterEmail}" style="color:#1B4F8A;font-size:14px;margin-left:4px;text-decoration:none;font-weight:600;">${shelterEmail}</a>
              </td>
            </tr>
            ${shelterPhone ? `
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-size:15px;">📞</span>
                <span style="color:#374151;font-size:14px;font-weight:600;margin-left:8px;">Téléphone :</span>
                <span style="color:#4B5563;font-size:14px;margin-left:4px;">${shelterPhone}</span>
              </td>
            </tr>` : ''}
            ${shelterAddress ? `
            <tr>
              <td>
                <span style="font-size:15px;">📍</span>
                <span style="color:#374151;font-size:14px;font-weight:600;margin-left:8px;">Adresse :</span>
                <span style="color:#4B5563;font-size:14px;margin-left:4px;">${shelterAddress}</span>
              </td>
            </tr>` : ''}
          </table>
        </div>

        <!-- CTA admin -->
        <div style="text-align:center;">
          <a href="https://adoptly.fr/shelter/dashboard"
             style="background:#1B4F8A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:14px;padding:12px 28px;border-radius:12px;display:inline-block;
                    letter-spacing:-0.2px;">
            Voir le tableau de bord →
          </a>
        </div>
      </div>

      <!-- Pied de page -->
      <div style="border-top:1px solid #F3F4F6;padding:20px 32px;text-align:center;">
        <p style="color:#D1D5DB;font-size:11px;margin:0;">
          Notification automatique Adoptly — nouveau refuge partenaire.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: `🏠 Nouveau refuge : ${shelterName} vient de s'inscrire sur Adoptly`,
    html,
  });
}

/**
 * Notifie un refuge qu'un adoptant lui a envoyé un message via la plateforme.
 */
export async function sendNewMessageNotificationEmail({
  shelterEmail, shelterName, adoptantName, animalName, messagePreview,
}) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:36px 32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
      </div>

      <div style="padding:40px 32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#EFF6FF;border-radius:50px;padding:12px 24px;">
            <span style="font-size:28px;">💬</span>
            <span style="color:#1B4F8A;font-weight:800;font-size:18px;margin-left:8px;vertical-align:middle;">Nouveau message !</span>
          </div>
        </div>

        <h1 style="color:#1B4F8A;font-size:20px;font-weight:800;margin:0 0 12px;text-align:center;">
          ${adoptantName} vous a écrit à propos de ${animalName}
        </h1>

        <div style="background:#F4F7FF;border-radius:16px;padding:20px 24px;margin:24px 0;border-left:4px solid #1B4F8A;">
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;font-style:italic;">
            "${messagePreview}"
          </p>
        </div>

        <div style="text-align:center;margin:32px 0 0;">
          <a href="https://adoptly.fr/shelter/dashboard"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;">
            Répondre sur Adoptly →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            Connectez-vous à votre tableau de bord pour voir et répondre au message.
          </p>
        </div>
      </div>

      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly · <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

  await sendEmail({
    to:      shelterEmail,
    subject: `💬 Nouveau message de ${adoptantName} à propos de ${animalName}`,
    html,
  });
}

export async function sendAdoptantMessageNotificationEmail({
  adoptantEmail, adoptantName, shelterName, animalName, messagePreview,
}) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <div style="background:linear-gradient(135deg,#0F3460,#1B4F8A,#2271B3);padding:36px 32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:32px;height:32px;background:rgba(255,255,255,0.18);border-radius:10px;display:inline-block;text-align:center;line-height:32px;">
            <span style="color:#fff;font-weight:900;font-size:18px;line-height:32px;">A</span>
          </div>
          <span style="color:#fff;font-weight:900;font-size:22px;letter-spacing:-0.5px;">Adoptly</span>
        </div>
      </div>

      <div style="padding:40px 32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#FFF3E0;border-radius:50px;padding:12px 24px;">
            <span style="font-size:28px;">🐾</span>
            <span style="color:#F07A2A;font-weight:800;font-size:18px;margin-left:8px;vertical-align:middle;">Bonne nouvelle !</span>
          </div>
        </div>

        <h1 style="color:#1B4F8A;font-size:20px;font-weight:800;margin:0 0 12px;text-align:center;">
          ${shelterName} vous a répondu à propos de ${animalName} !
        </h1>

        <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
          Le refuge a pris le temps de vous écrire. Votre futur compagnon vous attend peut-être !
        </p>

        <div style="background:#F4F7FF;border-radius:16px;padding:20px 24px;margin:0 0 24px;border-left:4px solid #1B4F8A;">
          <p style="color:#9CA3AF;font-size:12px;margin:0 0 8px;font-weight:600;">APERÇU DU MESSAGE</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;font-style:italic;">
            "${messagePreview}"
          </p>
        </div>

        <div style="text-align:center;margin:32px 0 0;">
          <a href="https://adoptly.fr/adoptant/dashboard"
             style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;
                    font-size:15px;padding:14px 32px;border-radius:14px;display:inline-block;">
            Lire et répondre sur Adoptly →
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin:12px 0 0;">
            Connectez-vous pour voir le message complet et discuter avec le refuge.
          </p>
        </div>

        <div style="background:#ECFDF5;border-radius:12px;padding:16px;text-align:center;margin-top:24px;">
          <p style="color:#065F46;font-size:13px;margin:0;line-height:1.5;">
            💚 Adoptly est 100% gratuit. Le refuge et vous êtes directement en contact.
          </p>
        </div>
      </div>

      <div style="border-top:1px solid #F3F4F6;padding:24px 32px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} Adoptly · <a href="https://adoptly.fr" style="color:#6B7280;text-decoration:none;">adoptly.fr</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();

  await sendEmail({
    to:      adoptantEmail,
    subject: `🐾 ${shelterName} vous a répondu à propos de ${animalName} !`,
    html,
  });
}

/**
 * Notifie l'admin (Simon) qu'un refuge vient d'ajouter un animal.
 */
export async function sendAdminNewAnimalEmail({ shelterName, shelterEmail, animalName, animalSpecies, animalBreed, photoUrl }) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@adoptly.fr';
  const species = { dog:'Chien', cat:'Chat', rabbit:'Lapin', guinea_pig:'Cobaye', other:'Autre' }[animalSpecies] || animalSpecies;
  const addedAt = new Date().toLocaleString('fr-BE', { timeZone:'Europe/Brussels', dateStyle:'full', timeStyle:'short' });

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1B4F8A,#2E86AB);padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-weight:900;font-size:18px;">A</span>
      </div>
      <div>
        <span style="color:#fff;font-weight:900;font-size:20px;">Adoptly</span>
        <p style="color:rgba(255,255,255,.6);font-size:11px;margin:0;">Notification admin — Nouvel animal</p>
      </div>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1B4F8A;margin:0 0 16px;">🐾 Nouvel animal publié</h2>
      ${photoUrl ? `<img src="${photoUrl}" style="width:100%;border-radius:12px;margin-bottom:16px;" />` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:40%;">Animal</td><td style="padding:8px 0;font-weight:700;color:#1B4F8A;">${animalName}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Espèce</td><td style="padding:8px 0;">${species}${animalBreed ? ` — ${animalBreed}` : ''}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Refuge</td><td style="padding:8px 0;font-weight:600;">${shelterName}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Contact</td><td style="padding:8px 0;">${shelterEmail}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Ajouté le</td><td style="padding:8px 0;">${addedAt}</td></tr>
      </table>
    </div>
  </div>
</body></html>`.trim();

  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: `🐾 Nouvel animal : ${animalName} (${species}) ajouté par ${shelterName}`,
    html,
  });
}

/**
 * Envoie un feedback de refuge à l'admin.
 */
export async function sendShelterFeedbackEmail({ shelterName, shelterEmail, category, message }) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@adoptly.fr';
  const categoryLabels = { bug: 'Bug / Problème', suggestion: 'Suggestion', question: 'Question' };
  const categoryLabel = categoryLabels[category] || category;
  const sentAt = new Date().toLocaleString('fr-BE', { timeZone: 'Europe/Brussels', dateStyle: 'full', timeStyle: 'short' });

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1B4F8A,#2E86AB);padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:900;font-size:18px;">A</span>
        </div>
        <div>
          <span style="color:#fff;font-weight:900;font-size:20px;">Adoptly</span>
          <p style="color:rgba(255,255,255,.6);font-size:11px;margin:0;">Feedback refuge</p>
        </div>
      </div>
    </div>
    <div style="padding:32px;">
      <div style="display:inline-block;background:${category === 'bug' ? '#FEE2E2' : category === 'suggestion' ? '#FFF3E0' : '#EFF6FF'};border-radius:50px;padding:8px 20px;margin-bottom:20px;">
        <span style="font-weight:800;font-size:14px;color:${category === 'bug' ? '#DC2626' : category === 'suggestion' ? '#F07A2A' : '#1B4F8A'};">${categoryLabel}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#888;width:30%;">Refuge</td><td style="padding:8px 0;font-weight:700;color:#1B4F8A;">${shelterName}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${shelterEmail}" style="color:#1B4F8A;text-decoration:none;">${shelterEmail}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888;">Date</td><td style="padding:8px 0;">${sentAt}</td></tr>
      </table>
      <div style="background:#F4F7FF;border-radius:12px;padding:20px;border-left:4px solid #1B4F8A;">
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="mailto:${shelterEmail}?subject=Re: Votre feedback sur Adoptly"
           style="background:#F07A2A;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:12px;display:inline-block;">
          Répondre au refuge →
        </a>
      </div>
    </div>
  </div>
</body></html>`.trim();

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `💬 Feedback refuge — ${categoryLabel} — ${shelterName}`,
    html,
  });
}
