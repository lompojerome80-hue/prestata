import { config } from '../config.js';

/**
 * Passerelle SMS générique, configurable via variables d'environnement :
 *   SMS_API_URL  -> endpoint recevant un POST JSON { to, message }
 *   SMS_API_KEY  -> clé transmise dans l'en-tête "Authorization: Bearer <clé>"
 *
 * Sans passerelle configurée : aucune livraison, mais l'inscription reste possible
 * (le code n'est jamais renvoyé au client en production).
 */
export async function sendSms({ to, message }) {
  if (!config.sms.apiUrl) {
    if (config.env === 'production') {
      console.warn('[SMS] Passerelle non configurée — le code ne peut pas être livré');
    }
    return { delivered: false, reason: 'NO_SMS_GATEWAY' };
  }

  try {
    const res = await fetch(config.sms.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.sms.apiKey ? { Authorization: `Bearer ${config.sms.apiKey}` } : {}),
      },
      body: JSON.stringify({ to, message }),
    });
    return { delivered: res.ok };
  } catch (err) {
    console.warn(`[SMS] Envoi impossible : ${err.message}`);
    return { delivered: false };
  }
}