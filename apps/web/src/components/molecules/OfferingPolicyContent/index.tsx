import Typography from '@/components/atoms/Typography';

import PolicyItem from './PolicyItem';

export interface OfferingPolicyContentProps {
  specId: string | undefined;
  specLoading: boolean;
}

/**
 * OfferingPolicyContent - Summary of an offering access policy (ODRL)
 *
 * @param {string|undefined} specId - Associated product specification id.
 * @param {boolean} specLoading - Whether the specification is loading.
 */
const OfferingPolicyContent = ({ specId, specLoading }: Readonly<OfferingPolicyContentProps>) => {
  if (!specId) {
    return (
      <Typography variant="small" color="gray">
        Sin especificación de producto asociada.
      </Typography>
    );
  }
  if (specLoading) {
    return (
      <Typography variant="small" color="gray">
        Cargando…
      </Typography>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <PolicyItem icon="ShieldCheck" label="Credencial requerida" value="ConsumerCredential" />
    </div>
  );
};

export default OfferingPolicyContent;
