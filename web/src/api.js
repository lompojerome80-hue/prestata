const API_URL = import.meta.env.VITE_API_URL || '';

export async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* réponse vide */
  }

  if (!res.ok) {
    const err = new Error(data?.error?.message || `Erreur ${res.status}`);
    err.status = res.status;
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

/** Lire une erreur pour l'afficher proprement. */
export function errMsg(e) {
  return e?.message || 'Une erreur est survenue';
}

/** Convertit un fichier image en data URI (base64) pour le stockage en base. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossible de lire l'image"));
    reader.readAsDataURL(file);
  });
}

export const RATE_UNIT_LABELS = {
  HEURE: '/h',
  JOUR: '/jour',
  FORFAIT: '/intervention',
  MOT: '/mot',
  PAGE: '/page',
  SESSION: '/session',
  SERVICE: '/service',
};

export const URGENCY_LABELS = {
  TODAY: "Aujourd'hui",
  THIS_WEEK: 'Cette semaine',
};

export const REQUEST_STATUS = {
  NEW: { label: 'Nouvelle', color: '#3b82f6' },
  QUOTE_SENT: { label: 'Devis reçu', color: '#f59e0b' },
  ACCEPTED: { label: 'Acceptée', color: '#8b5cf6' },
  IN_PROGRESS: { label: 'En cours', color: '#06b6d4' },
  COMPLETED: { label: 'Terminée', color: '#10b981' },
  PAID: { label: 'Payée', color: '#0f766e' },
  REVIEWED: { label: 'Terminée ✓', color: '#059669' },
  CANCELLED: { label: 'Annulée', color: '#ef4444' },
};

export const PRESTATION_STATUS = {
  IN_PROGRESS: { label: 'En cours', color: '#06b6d4' },
  COMPLETED: { label: 'À payer', color: '#f59e0b' },
  PAID: { label: 'À noter', color: '#8b5cf6' },
  REVIEWED: { label: 'Terminée ✓', color: '#059669' },
};

export const JOB_CONTRACT_LABELS = {
  CDI: 'CDI',
  CDD: 'CDD',
  FREELANCE: 'Freelance',
  STAGE: 'Stage',
};

export const JOB_APPLICATION_STATUS = {
  PENDING: { label: 'En attente', color: '#f59e0b' },
  ACCEPTED: { label: 'Acceptée', color: '#10b981' },
  REJECTED: { label: 'Refusée', color: '#ef4444' },
};

export const JOB_STATUS = {
  OPEN: { label: 'Active', color: '#10b981' },
  CLOSED: { label: 'Clôturée', color: '#64748b' },
};

export function money(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}