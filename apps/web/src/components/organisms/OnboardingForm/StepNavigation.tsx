import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

interface StepNavigationProps {
  currentStep: number;
  isPending: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
}

/** StepNavigation - Previous/next/submit controls of the onboarding wizard. */
export function StepNavigation({
  currentStep,
  isPending,
  onNext,
  onPrev,
  onSubmit,
}: Readonly<StepNavigationProps>) {
  return (
    <div className="border-muted mt-8 flex items-center justify-between gap-4 sm:gap-6 border-t pt-5 sm:pt-6 flex-row md:gap-0">
      <Button
        type="button"
        variant="ghost"
        onClick={onPrev}
        disabled={currentStep === 1}
        className="flex items-center gap-2"
      >
        <Icon name="ArrowLeft" className="text-sm" size={16} /> Anterior
      </Button>

      {currentStep === 5 ? (
        <Button onClick={onSubmit} className="md:px-12" disabled={isPending}>
          {isPending ? 'Enviando...' : 'Confirmar y Enviar Registro'}
          <Icon name="Send" className="ml-2" size={16} />
        </Button>
      ) : (
        <Button type="button" onClick={onNext} className="flex items-center gap-2">
          Siguiente Paso
          <Icon name="ArrowRight" className="text-sm" size={16} />
        </Button>
      )}
    </div>
  );
}
