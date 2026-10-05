'use server';

import crypto from 'node:crypto';

import { z } from 'zod';

import { getCountryName } from '@/lib/utils/getCountryName';
import { trackError, trackEvent } from '@/lib/utils/sentry';
import { generateToken, isOnboardingTokenConfigured } from '@/lib/utils/tokens';
import { type OnboardingFormData, onboardingSchema } from '@/lib/validations/onboarding.schema';

import {
  deliverMail,
  escapeHtml,
  isSmtpConfigured,
  type MailResult,
  type OutgoingMail,
  renderEmailTemplate,
} from './mailer';

const NOT_CONFIGURED: MailResult = { ok: false, error: 'El envío de correo no está configurado.' };

const emailInput = z.email().max(254);

function summaryList(rows: [string, string | undefined][]): string {
  const items = rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || '-')}</li>`)
    .join('');
  return `<ul>${items}</ul>`;
}

async function buildOnboardingMessages(data: OnboardingFormData): Promise<OutgoingMail[]> {
  // Here you define your business logic (recipients, subjects and content of the onboarding mails).
  // Example: acknowledge the applicant. Add internal notifications here if you need them.
  const subject = 'Solicitud de registro recibida';
  const html = await renderEmailTemplate({
    subject,
    heading: `Hola ${data.contactName}`,
    body:
      '<p>Hemos recibido tu solicitud de registro. Estos son los datos enviados:</p>' +
      summaryList([
        ['Organización', data.organizationName],
        ['País', getCountryName(data.country)],
        ['Sitio web', data.website],
        ['Cargo', data.contactPosition],
        ['Teléfono', data.contactPhone],
        ['Rol', data.role],
        ['Caso de uso', data.useCase],
        ['Formatos', data.dataFormats?.join(', ')],
        ['Comentarios', data.comments],
      ]),
  });
  return [{ to: data.contactEmail, subject, html }];
}

async function buildAccessRequestMessages(
  email: string,
  onboardingUrl: string,
): Promise<OutgoingMail[]> {
  // Here you define your business logic (recipients, subjects and content of the access-request mails).
  const subject = 'Completa tu registro';
  const html = await renderEmailTemplate({
    subject,
    heading: 'Solicitud de acceso recibida',
    body: '<p>Usa el siguiente enlace para completar el registro de tu organización.</p>',
    ctaUrl: onboardingUrl,
    ctaLabel: 'Completar registro',
  });
  return [{ to: email, subject, html }];
}

function getNewsletterRecipients(): string[] {
  // Here you define your business logic (who is notified of a new subscription).
  return [];
}

async function buildNewsletterMessages(email: string): Promise<OutgoingMail[]> {
  // Here you define your business logic (content of the subscription notification).
  const recipients = getNewsletterRecipients();
  const subject = 'Nueva suscripción a la newsletter';
  const html = await renderEmailTemplate({
    subject,
    heading: subject,
    body: `<p>Nuevo suscriptor: ${escapeHtml(email)}</p>`,
  });
  return recipients.map((to) => ({ to, subject, html }));
}

/** Sends the mails triggered by a completed onboarding wizard. */
export async function sendOnboardingEmail(formData: OnboardingFormData): Promise<MailResult> {
  const parsed = onboardingSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, error: 'Los datos del formulario no son válidos.' };
  if (!isSmtpConfigured()) return NOT_CONFIGURED;

  try {
    const result = await deliverMail(await buildOnboardingMessages(parsed.data));
    if (result.ok) trackEvent('auth', 'onboarding_email_sent');
    return result;
  } catch (error) {
    trackError(error, { step: 'smtp_send', fn: 'sendOnboardingEmail' });
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** Sends the signed onboarding link to a user requesting access. */
export async function accessRequestEmail(email: string): Promise<MailResult> {
  const parsed = emailInput.safeParse(email);
  if (!parsed.success) return { ok: false, error: 'Email inválido.' };
  if (!isSmtpConfigured()) return NOT_CONFIGURED;
  if (!(await isOnboardingTokenConfigured()) || !process.env.APP_URL) {
    return { ok: false, error: 'Los enlaces de registro no están configurados.' };
  }

  try {
    const token = await generateToken(crypto.randomUUID());
    const onboardingUrl = `${process.env.APP_URL}/onboarding/${token}`;
    const result = await deliverMail(await buildAccessRequestMessages(parsed.data, onboardingUrl));
    if (result.ok) trackEvent('auth', 'access_request_email_sent');
    return result;
  } catch (error) {
    trackError(error, { step: 'smtp_send', fn: 'accessRequestEmail' });
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** Notifies a new newsletter subscription. */
export async function sendNewsletterSubscriptionEmail(email: string): Promise<MailResult> {
  const parsed = emailInput.safeParse(email);
  if (!parsed.success) return { ok: false, error: 'Email inválido.' };
  if (!isSmtpConfigured()) return NOT_CONFIGURED;

  try {
    const result = await deliverMail(await buildNewsletterMessages(parsed.data));
    if (result.ok) trackEvent('form', 'newsletter_subscription');
    return result;
  } catch (error) {
    trackError(error, { step: 'smtp_send', fn: 'sendNewsletterSubscriptionEmail' });
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
