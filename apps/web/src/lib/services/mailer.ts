import fs from 'node:fs/promises';
import path from 'node:path';

import nodemailer, { type Transporter } from 'nodemailer';

/** Result of any mail-sending operation. */
export type MailResult = { ok: true } | { ok: false; error: string };

/** Variables accepted by the generic `src/templates/email.html` template. */
export interface EmailTemplateVariables {
  subject: string;
  heading: string;
  /** Trusted HTML fragment. Escape user input with `escapeHtml` before composing it. */
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  footer?: string;
}

/** Outgoing message handed to `sendMail`. */
export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
}

const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'templates', 'email.html');
const DEFAULT_SMTP_PORT = 465;
// Here you define your business logic (sender display name, branding).
const APP_NAME = 'Marketplace';

let cachedTransporter: Transporter | null = null;

/** Returns whether every SMTP variable required to send mail is set. */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_SENDER,
  );
}

/** Lazily creates the nodemailer transport from the SMTP_* env vars (null when unconfigured). */
export function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === DEFAULT_SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

/** Escapes a string for safe interpolation inside HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Renders the generic email template with the given variables. */
export async function renderEmailTemplate(vars: EmailTemplateVariables): Promise<string> {
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  const hasCta = Boolean(vars.ctaUrl && vars.ctaLabel);
  const replacements: Record<string, string> = {
    appName: escapeHtml(APP_NAME),
    subject: escapeHtml(vars.subject),
    heading: escapeHtml(vars.heading),
    body: vars.body,
    ctaUrl: hasCta ? escapeHtml(vars.ctaUrl ?? '') : '#',
    ctaLabel: hasCta ? escapeHtml(vars.ctaLabel ?? '') : '',
    ctaStyle: hasCta ? '' : 'display: none;',
    footer: escapeHtml(vars.footer ?? ''),
    year: new Date().getFullYear().toString(),
  };
  return Object.entries(replacements).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}

/** Sends one or more messages through the SMTP transport; returns an error result when unconfigured. */
export async function deliverMail(messages: OutgoingMail[]): Promise<MailResult> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'El envío de correo no está configurado.' };
  if (messages.length === 0) return { ok: false, error: 'No hay destinatarios definidos.' };

  try {
    await Promise.all(
      messages.map((message) =>
        transporter.sendMail({
          from: process.env.SMTP_SENDER,
          to: message.to,
          subject: message.subject,
          html: message.html,
        }),
      ),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
