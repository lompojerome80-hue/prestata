import { config } from '../config.js';
import { randomToken, randomPin } from '../utils/crypto.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../db.js';

// -----------------------------------------------------------------------
//  Service de paiement Mobile Money (Orange Money + Moov Money)
//  MVP : paiement direct (sans escrow). Mode sandbox = aucun débit réel.
// -----------------------------------------------------------------------

class MobileMoneyClient {
  constructor({ name, baseUrl, credentials }) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.credentials = credentials;
  }

  async getAccessToken() {
    if (config.paymentsSandbox) return `SANDBOX-${this.name}`;
    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      throw new AppError(
        501,
        'PAYMENT_NOT_CONFIGURED',
        `Clés ${this.name} non configurées dans .env (PAYER_CLIENT_ID/PAYER_CLIENT_SECRET).`,
      );
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
    });
    const res = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new AppError(502, `${this.name}_TOKEN_ERROR`, `Impossible d'obtenir le token ${this.name}`);
    const data = await res.json();
    return data.access_token || data.access_token || data?.access_token;
  }

  /** Initier un paiement côté client. Renvoie {providerRef, sandbox, sandboxOtp} */
  async initiatePayment({ phone, amount, reference }) {
    if (config.paymentsSandbox) {
      const providerRef = `${this.name}-${Date.now()}-${randomToken(4)}`;
      const otp = randomPin();
      return {
        providerRef,
        status: 'REQUEST_TO_PAY',
        sandbox: true,
        sandboxOtp: otp,
        instructions: `Sandbox ${this.name} : aucun débit réel. Confirmez avec le code ${otp}.`,
      };
    }

    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/payments/debit/requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-User-Id': phone,
      },
      body: JSON.stringify({
        amount: { currency: 'XOF', value: String(amount) },
        reference,
        payerMessage: `Prestata commande ${reference}`,
        payeeNote: `Paiement reçu commande ${reference}`,
        callbackUrl: config.om.callbackUrl, // OM
      }),
    });
    if (!res.ok) throw new AppError(502, `${this.name}_API_ERROR`, `${this.name} a refusé le paiement`);
    const data = await res.json();
    return {
      providerRef: data?.getPaymentUrl || data?.paymentDetails?.paymentRef || data?.payment_ref,
      status: data?.status || 'REQUEST_TO_PAY',
      sandbox: false,
    };
  }

  async confirmPayment({ providerRef }) {
    if (config.paymentsSandbox) {
      return { providerRef, status: 'SUCCESSFUL', confirmedAt: new Date().toISOString() };
    }
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/payments/debit/${providerRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new AppError(502, `${this.name}_API_ERROR`, `Impossible de vérifier le paiement`);
    const data = await res.json();
    return { providerRef, status: data?.status || 'FAILED', confirmedAt: new Date().toISOString() };
  }
}

export const paymentClients = {
  ORANGE_MONEY: new MobileMoneyClient({
    name: 'ORANGE_MONEY',
    baseUrl: config.om.apiBaseUrl,
    credentials: { clientId: config.om.clientId, clientSecret: config.om.clientSecret },
  }),
  MOOV_MONEY: new MobileMoneyClient({
    name: 'MOOV_MONEY',
    baseUrl: config.moov.apiBaseUrl,
    credentials: { clientId: config.moov.clientId, clientSecret: config.moov.clientSecret },
  }),
};

/**
 * Initier le paiement d'une prestation et enregistrer l'enregistrement dans la DB.
 * Renvoie l'objet Payment créé + les instructions (sandboxOtp en dev).
 */
export async function initiatePrestationPayment({ prestationId, provider, payerPhone, payeePhone }) {
  if (!config.paymentsAvailable) {
    throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Le paiement en ligne sera bientôt disponible.');
  }

  const client = paymentClients[provider];
  if (!client) throw new AppError(400, 'BAD_PAYMENT_PROVIDER', 'Fournisseur inconnu', { provider });
  if (!config.availableProviders.includes(provider)) {
    throw new AppError(501, 'PAYMENT_NOT_CONFIGURED', `Le paiement ${provider} n'est pas encore configuré.`);
  }

  const prestation = await prisma.prestation.findUnique({
    where: { id: prestationId },
    include: { request: { select: { reference: true } } },
  });
  if (!prestation) throw new AppError(404, 'NOT_FOUND', 'Prestation introuvable');
  if (prestation.status !== 'COMPLETED') throw new AppError(400, 'BAD_STATUS', 'La prestation n\'est pas encore terminée');

  const reference = prestation.request.reference;
  const result = await client.initiatePayment({ phone: payerPhone, amount: prestation.amount, reference });

  // Créer l'enregistrement Payment
  const payment = await prisma.payment.create({
    data: {
      reference: `${reference}-PAY`,
      prestationId: prestation.id,
      provider,
      providerRef: result.providerRef,
      amount: prestation.amount,
      payerPhone,
      payeePhone,
      status: 'INITIATED',
      history: {
        create: { status: 'INITIATED', note: `Initié via ${provider} (sandbox=${result.sandbox})` },
      },
    },
  });

  return { payment, providerRef: result.providerRef, sandbox: result.sandbox, sandboxOtp: result.sandboxOtp, instructions: result.instructions };
}

/**
 * Confirmer un paiement (appelé soit par le webhook, soit manuellement en sandbox).
 */
export async function confirmPaymentById({ paymentId, providerRef, sandboxOtp }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { prestation: true, history: true },
  });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Paiement introuvable');
  if (payment.status === 'SUCCESSFUL') return payment; // idempotent

  const client = paymentClients[payment.provider];
  const result = await client.confirmPayment({ providerRef: providerRef || payment.providerRef });

  const newStatus = result.status === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'FAILED';

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: newStatus,
      paidAt: newStatus === 'SUCCESSFUL' ? new Date() : null,
      failureReason: newStatus === 'FAILED' ? 'Paiement échoué (provider)' : null,
      history: {
        create: { status: newStatus, note: newStatus === 'SUCCESSFUL' ? 'Paiement confirmé' : 'Paiement échoué' },
      },
    },
  });

  // Mettre à jour la prestation si succès
  if (newStatus === 'SUCCESSFUL') {
    await prisma.prestation.update({
      where: { id: payment.prestationId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  return updated;
}