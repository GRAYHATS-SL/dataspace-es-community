'use client';

import React from 'react';

import EmailForm from '@/components/molecules/EmailForm';

/** AccessRequestForm - Hero variant of `EmailForm` used to request access. */

/** Props of `AccessRequestForm`. */
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
      placeholder="Tu correo electrónico"
      submitText="Solicitar acceso"
      className={className}
      showConsent={true}
      showIcon={true}
      disabled={disabled}
    />
  );
};

export default AccessRequestForm;
