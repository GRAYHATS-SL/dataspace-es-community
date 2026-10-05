'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { cva, type VariantProps } from 'class-variance-authority';
import React, { useId } from 'react';
import { useForm } from 'react-hook-form';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Input from '@/components/atoms/Input';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import { type EmailWithConsentData, emailWithConsentSchema } from '@/lib/validations/email.schema';

/** EmailForm - Email capture form with consent checkbox and honeypot (`hero` or `footer` variant). */

const emailFormVariants = cva(
  'flex w-full items-center gap-0 rounded-full border shadow-sm transition-all focus-within:ring-2 bg-muted border-muted focus-within:ring-primary/20',
  {
    variants: {
      size: {
        default: 'p-1',
        compact: 'p-0.5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const consentVariants = cva('mt-3 flex gap-2 md:mt-4', {
  variants: {
    variant: {
      hero: 'items-center justify-center',
      footer: 'items-start',
    },
  },
});

/** Props of `EmailForm`. */
export interface EmailFormProps extends VariantProps<typeof emailFormVariants> {
  variant?: 'hero' | 'footer';
  onSubmit: (email: string) => Promise<void> | void;
  placeholder?: string;
  submitText?: string;
  className?: string;
  showConsent?: boolean;
  showIcon?: boolean;
  disabled?: boolean;
}

const EmailForm = React.forwardRef<HTMLFormElement, Readonly<EmailFormProps>>(
  (
    {
      onSubmit: onSubmitProp,
      variant = 'hero',
      size = 'default',
      placeholder = 'correo@ejemplo.com',
      submitText = 'Enviar',
      className,
      showConsent = true,
      showIcon = true,
      disabled = false,
    },
    ref,
  ) => {
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
    } = useForm<EmailWithConsentData>({
      resolver: zodResolver(emailWithConsentSchema),
      defaultValues: {
        email: '',
        acceptTerms: false,
        fullName: '', // honeypot
      },
    });

    const onSubmit = async (data: EmailWithConsentData) => {
      // Honeypot: silently drop bot submissions
      if (data.fullName?.trim()) return;

      try {
        await onSubmitProp(data.email);
        reset();
      } catch {
        // The parent surfaces the error message.
      }
    };

    const consentId = useId();
    const isHero = variant === 'hero';
    const isDisabled = disabled || isSubmitting;

    return (
      <div className={cn('w-full', className)}>
        <form
          ref={ref}
          onSubmit={handleSubmit(onSubmit)}
          className={cn(
            'relative',
            emailFormVariants({ size }),
            variant === 'hero' ? 'max-w-2xl mx-auto' : '',
          )}
        >
          {/* Honeypot field */}
          <input
            type="text"
            {...register('fullName')}
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-2499.75 h-0 w-0 opacity-0"
            aria-hidden="true"
          />

          {/* Icon */}
          {showIcon && (
            <div
              className={cn(
                'hidden md:flex shrink-0 items-center text-primary',
                size === 'compact' ? 'pl-3' : 'pl-4',
              )}
            >
              <Icon name="AtSign" size={size === 'compact' ? 16 : 20} />
            </div>
          )}

          {/* Email input */}
          <div className="min-w-0 flex-1">
            <Input
              type="email"
              placeholder={placeholder}
              variant="filled"
              {...register('email')}
              disabled={isDisabled}
              className={cn(
                'text-base w-full border-none bg-transparent text-primary placeholder:text-gray-400 focus-visible:ring-0',
                size === 'compact' ? 'py-2.5' : 'py-3',
              )}
            />
          </div>

          {/* Submit button */}
          <div className="shrink-0">
            <Button type="submit" size={size === 'compact' ? 'md' : 'lg'} disabled={isDisabled}>
              {isSubmitting ? 'Enviando...' : submitText}
            </Button>
          </div>
        </form>

        {/* Email error */}
        {errors.email && (
          <Typography variant="small" className="mt-2 text-danger">
            {errors.email.message}
          </Typography>
        )}

        {/* Consent checkbox */}
        {showConsent && (
          <>
            <div className={cn(consentVariants({ variant }))}>
              <input
                type="checkbox"
                id={consentId}
                {...register('acceptTerms')}
                disabled={isDisabled}
                className={cn(
                  'cursor-pointer shrink-0',
                  isHero
                    ? 'accent-white size-4 md:size-5'
                    : 'accent-primary border-gray-300 bg-white size-3 md:size-4 mt-1',
                )}
              />
              <label
                htmlFor={consentId}
                className={cn(
                  'text-xs select-none leading-snug cursor-pointer',
                  isHero
                    ? 'text-left md:text-sm xl:text-base text-white'
                    : 'w-full text-left text-gray-light',
                )}
              >
                {isHero ? (
                  <>
                    Al solicitar acceso aceptas nuestra{' '}
                    <a
                      href="/politica-privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium transition-colors duration-300 text-white hover:text-gray-light"
                    >
                      Política de Privacidad.
                    </a>
                  </>
                ) : (
                  <>
                    <span>
                      Acepto recibir comunicaciones y novedades sobre la plataforma y sus productos.
                    </span>
                    <div className="py-1" />
                    <span>
                      Al suscribirte aceptas nuestra{' '}
                      <a
                        href="/politica-privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium transition-colors duration-300 text-gray-light hover:text-primary"
                        aria-label="Leer la Política de Privacidad (se abre en una nueva pestaña)"
                      >
                        Política de Privacidad
                      </a>
                      .
                    </span>
                  </>
                )}
              </label>
            </div>

            {errors.acceptTerms && (
              <Typography variant="small" className="mt-1 text-danger">
                {errors.acceptTerms.message}
              </Typography>
            )}
          </>
        )}
      </div>
    );
  },
);

EmailForm.displayName = 'EmailForm';

export default EmailForm;
