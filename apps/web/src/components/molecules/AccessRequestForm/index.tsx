'use client';

import React from 'react';

import EmailForm from '@/components/molecules/EmailForm';

/**
 * AccessRequestForm - Form to request access with a corporate email
 *
 * @example
 * <AccessRequestForm
 *   onSubmit={handleAccessRequest}
 *   className="mt-6"
 * />
 */

export interface AccessRequestFormProps {
  onSubmit: (email: string) => Promise<void> | void;
  className?: string;
  disabled?: boolean;
}

const AccessRequestForm: React.FC<Readonly<AccessRequestFormProps>> = ({
  onSubmit,
  className,
  disabled = false,
}) => {
  return (
    <EmailForm
      variant="hero"
      size="default"
      onSubmit={onSubmit}
      placeholder="Tu email corporativo"
      submitText="Solicitar adhesión"
      className={className}
      showConsent={true}
      showIcon={true}
      disabled={disabled}
    />
  );
};

export default AccessRequestForm;
