import Typography from '@/components/atoms/Typography';
import { formatDateEs } from '@/lib/utils/offeringMetadata';

import PolicyItem from './PolicyItem';

/** Props of `OfferingPolicyContent`. */
export interface OfferingPolicyContentProps {
  specId: string | undefined;
  specLoading: boolean;
  accessExpiresAt: string;
  /** Credential or requirement needed to access the offering. */
  requirement?: string;
}

/** OfferingPolicyContent - Summary of an offering's access policy. */
const OfferingPolicyContent = ({
  specId,
  specLoading,
  accessExpiresAt,
  requirement = 'Definida por el proveedor',
}: Readonly<OfferingPolicyContentProps>) => {
  if (!specId) {
    return (
      <Typography variant="small" color="gray">
        Sin especificación de producto asociada.
      </Typography>
    );
  }
  if (specLoading) {
    return (
      <Typography variant="small" color="gray" role="status">
        Cargando…
      </Typography>
    );
  }
  const durationValue = accessExpiresAt
    ? `Válido hasta ${formatDateEs(accessExpiresAt, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : 'Acceso indefinido';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PolicyItem icon="ShieldCheck" label="Requisito de acceso" value={requirement} />
      <PolicyItem icon="Clock" label="Duración del acceso" value={durationValue} />
    </div>
  );
};

export default OfferingPolicyContent;
