import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

/** Props of `SuccessStep`. */
export interface SuccessStepProps {
  onClose: () => void;
}

/** SuccessStep - Confirmation shown once the order has been placed. */
function SuccessStep({ onClose }: Readonly<SuccessStepProps>) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center" role="status">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <Icon name="Check" size={28} className="text-green-600" />
      </div>
      <div className="flex flex-col gap-1">
        <Typography as="h3" variant="subtitle">
          ¡Solicitud enviada!
        </Typography>
        <Typography variant="body" color="gray">
          Tu orden ha sido recibida. El proveedor la revisará y actualizará el estado en breve.
        </Typography>
      </div>
      <Button variant="primary" className="mt-2 w-full" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );
}

export default SuccessStep;
