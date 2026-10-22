'use server';

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import nodemailer from 'nodemailer';
import { z } from 'zod';

import { getCountryName } from '@/lib/utils/getCountryName';
import { trackError, trackEvent } from '@/lib/utils/sentry';
import { generateToken } from '@/lib/utils/tokens';
import { onboardingSchema } from '@/lib/validations/onboarding.schema';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * @summary Sends the onboarding confirmation emails to the user and the internal team.
 *
 * @param {z.infer<typeof onboardingSchema>}  formData - Validated onboarding form data.
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>} Send result.
 *
 * @example
 * const result = await sendOnboardingEmail({
 *   contactName: 'Ana García',
 *   contactEmail: 'ana@example.com',
 *   organizationName: 'Acme Corp',
 *   country: 'ES',
 *   role: 'data-provider',
 *   acceptTerms: true,
 *   acceptPrivacy: true,
 *   acceptProcessing: true,
 * });
 * if (!result.ok) console.error(result.error);
 */
export async function sendOnboardingEmail(formData: z.infer<typeof onboardingSchema>) {
  // Read user template (template3.html)
  const templateUserPath = path.join(process.cwd(), 'src', 'templates', 'template3.html');
  let htmlUser = fs.readFileSync(templateUserPath, 'utf8');
  htmlUser = htmlUser
    .replaceAll('{{name}}', escapeHtml(formData.contactName))
    .replaceAll('{{meetingDate}}', escapeHtml(formData.meetingDate || '-'))
    .replaceAll('{{meetingTime}}', escapeHtml(formData.meetingTime || '-'))
    .replaceAll('{{organization}}', escapeHtml(formData.organizationName))
    .replaceAll('{{country}}', escapeHtml(getCountryName(formData.country)))
    .replaceAll('{{website}}', escapeHtml(formData.website || '-'))
    .replaceAll('{{contactPosition}}', escapeHtml(formData.contactPosition || '-'))
    .replaceAll('{{contactEmail}}', escapeHtml(formData.contactEmail))
    .replaceAll('{{contactPhone}}', escapeHtml(formData.contactPhone || '-'))
    .replaceAll('{{role}}', escapeHtml(formData.role))
    .replaceAll('{{useCase}}', escapeHtml(formData.useCase || '-'))
    .replaceAll(
      '{{dataFormats}}',
      escapeHtml(Array.isArray(formData.dataFormats) ? formData.dataFormats.join(', ') : '-'),
    )
    .replaceAll('{{comments}}', escapeHtml(formData.comments || '-'))
    .replaceAll('{{acceptTerms}}', formData.acceptTerms ? 'Sí' : 'No')
    .replaceAll('{{acceptPrivacy}}', formData.acceptPrivacy ? 'Sí' : 'No')
    .replaceAll('{{acceptProcessing}}', formData.acceptProcessing ? 'Sí' : 'No')
    .replaceAll('{{year}}', new Date().getFullYear().toString());

  // Read team template (template4.html)
  const templateTeamPath = path.join(process.cwd(), 'src', 'templates', 'template4.html');
  let htmlTeam = fs.readFileSync(templateTeamPath, 'utf8');
  htmlTeam = htmlTeam
    .replaceAll('{{name}}', escapeHtml(formData.contactName))
    .replaceAll('{{email}}', escapeHtml(formData.contactEmail))
    .replaceAll('{{organization}}', escapeHtml(formData.organizationName))
    .replaceAll('{{country}}', escapeHtml(getCountryName(formData.country)))
    .replaceAll('{{website}}', escapeHtml(formData.website || '-'))
    .replaceAll('{{contactPosition}}', escapeHtml(formData.contactPosition || '-'))
    .replaceAll('{{contactPhone}}', escapeHtml(formData.contactPhone || '-'))
    .replaceAll('{{role}}', escapeHtml(formData.role))
    .replaceAll('{{useCase}}', escapeHtml(formData.useCase || '-'))
    .replaceAll(
      '{{dataFormats}}',
      escapeHtml(Array.isArray(formData.dataFormats) ? formData.dataFormats.join(', ') : '-'),
    )
    .replaceAll('{{comments}}', escapeHtml(formData.comments || '-'))
    .replaceAll('{{acceptTerms}}', formData.acceptTerms ? 'Sí' : 'No')
    .replaceAll('{{acceptPrivacy}}', formData.acceptPrivacy ? 'Sí' : 'No')
    .replaceAll('{{acceptProcessing}}', formData.acceptProcessing ? 'Sí' : 'No')
    .replaceAll('{{meetingDate}}', escapeHtml(formData.meetingDate || '-'))
    .replaceAll('{{meetingTime}}', escapeHtml(formData.meetingTime || '-'))
    .replaceAll('{{year}}', new Date().getFullYear().toString());

  const userMail = {
    from: `Dataspace Onboarding <${process.env.SMTP_SENDER}>`,
    to: formData.contactEmail,
    subject: '¡Registro recibido!',
    html: htmlUser,
  };

  const teamMail = {
    from: `Dataspace Onboarding <${process.env.SMTP_SENDER}>`,
    to: process.env.ONBOARDING_TEAM_EMAIL,
    subject: `Nuevo registro de onboarding: ${formData.organizationName}`,
    html: htmlTeam,
  };

  try {
    await Promise.all([transporter.sendMail(userMail), transporter.sendMail(teamMail)]);
    trackEvent('auth', 'onboarding_email_sent', { recipientType: 'user_and_team' });
    return { ok: true };
  } catch (error) {
    trackError(error, { step: 'smtp_send', fn: 'sendOnboardingEmail' });
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * @summary Sends the access-request confirmation emails to the user and the internal team.
 *
 * @param {string}  email - Requester email (PII).
 * @param {string}  [fecha] - Formatted request date; defaults to today.
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>} Send result.
 *
 * @example
 * const result = await accessRequestEmail('usuario@example.com');
 * if (!result.ok) console.error(result.error);
 *
 * @example
 * // Con fecha personalizada
 * const result = await accessRequestEmail('usuario@example.com', '15 de mayo de 2026');
 */
export async function accessRequestEmail(email: string, fecha?: string) {
  const parsed = z.email().max(254).safeParse(email);
  if (!parsed.success) return { ok: false, error: 'Email inválido.' };

  // Generate token for the user
  const token = await generateToken(crypto.randomUUID());
  const appUrl = process.env.APP_URL;
  if (!appUrl) return { ok: false, error: 'No se ha definido APP_URL.' };
  const onboardingUrl = `${appUrl}/onboarding/${token}`;
  // User template (template1.html)
  const templateUserPath = path.join(process.cwd(), 'src', 'templates', 'template1.html');
  let htmlUser = fs.readFileSync(templateUserPath, 'utf8');
  htmlUser = htmlUser
    .replaceAll('{{year}}', new Date().getFullYear().toString())
    .replaceAll('{{email}}', escapeHtml(parsed.data))
    .replaceAll('{{onboardingUrl}}', onboardingUrl);

  // Team template (template2.html)
  const templateTeamPath = path.join(process.cwd(), 'src', 'templates', 'template2.html');
  let htmlTeam = fs.readFileSync(templateTeamPath, 'utf8');
  htmlTeam = htmlTeam
    .replaceAll('{{year}}', new Date().getFullYear().toString())
    .replaceAll('{{email}}', escapeHtml(parsed.data))
    .replaceAll(
      '{{fecha}}',
      escapeHtml(
        fecha ||
          new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
      ),
    );

  // Email to the user
  const userMail = {
    from: `Dataspace.es <${process.env.SMTP_SENDER}>`,
    to: email,
    subject: 'Solicitud de acceso recibida',
    html: htmlUser,
  };

  // Email to the team
  const teamMail = {
    from: `Dataspace.es <${process.env.SMTP_SENDER}>`,
    to: process.env.ONBOARDING_TEAM_EMAIL,
    subject: `Nueva solicitud de acceso: ${email}`,
    html: htmlTeam,
  };

  try {
    await Promise.all([transporter.sendMail(userMail), transporter.sendMail(teamMail)]);
    trackEvent('auth', 'access_request_email_sent');
    return { ok: true };
  } catch (error) {
    trackError(error, { step: 'smtp_send', fn: 'accessRequestEmail' });
    return { ok: false, error: toErrorMessage(error) };
  }
}

/**
 * @summary Notifies the team of a new newsletter subscription.
 *
 * @param {string}  email - Subscriber email (PII).
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>} Send result.
 */
export async function sendNewsletterSubscriptionEmail(email: string) {
  const parsed = z.email().max(254).safeParse(email);
  if (!parsed.success) return { ok: false, error: 'Email inválido.' };

  const templatePath = path.join(process.cwd(), 'src', 'templates', 'newsletter.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html
    .replaceAll('{{email}}', escapeHtml(parsed.data))
    .replaceAll(
      '{{fecha}}',
      new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
    )
    .replaceAll('{{year}}', new Date().getFullYear().toString());

  try {
    await transporter.sendMail({
      from: `Dataspace.es <${process.env.SMTP_SENDER}>`,
      to: process.env.ONBOARDING_TEAM_EMAIL,
      subject: `Newsletter Dataspace.es — nueva suscripción: ${email}`,
      html,
    });
    trackEvent('form', 'newsletter_subscription', { email });
    return { ok: true };
  } catch (error) {
    trackError(error, { step: 'smtp_send', fn: 'sendNewsletterSubscriptionEmail' });
    return { ok: false, error: toErrorMessage(error) };
  }
}
