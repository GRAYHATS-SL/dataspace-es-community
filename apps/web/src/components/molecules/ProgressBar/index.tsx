import { Check } from 'lucide-react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  className?: string;
}

/**
 * ProgressBar - Stepper progress bar with numbered circles and step labels
 *
 * @param {number} currentStep - Current step (1-indexed).
 * @param {number} totalSteps - Total number of steps.
 * @param {string[]} stepLabels - Label of each step.
 * @param {string} [className] - Additional CSS classes.
 */
export function ProgressBar({
  currentStep,
  totalSteps,
  stepLabels,
  className,
}: Readonly<ProgressBarProps>) {
  const headerPercent = Math.round((currentStep / totalSteps) * 100);
  const linePercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div
      className={cn('mb-10', className)}
      role="progressbar"
      aria-valuenow={headerPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso: paso ${currentStep} de ${totalSteps}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Header */}
      <div className="mb-5">
        <Typography as="h1" variant="subtitle" color="primary">
          {stepLabels[currentStep - 1]}
        </Typography>

        <div className="mt-1.5 flex items-center justify-between gap-3">
          <Typography variant="caption" color="gray">
            Paso {currentStep} de {totalSteps}
          </Typography>
          <Typography variant="caption" color="primary" className="font-semibold">
            {headerPercent}% completado
          </Typography>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative" aria-hidden="true">
        {/* Línea de fondo de centro a centro */}
        <div className="absolute inset-x-3.5 top-3.5 h-0.5 bg-gray-200">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${linePercent}%` }}
          />
        </div>

        {/* Círculos + etiquetas */}
        <div className="relative flex justify-between">
          {stepLabels.map((label, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-white',
                    isCurrent && 'border-primary bg-white text-primary shadow-sm',
                    !isCompleted && !isCurrent && 'border-gray-200 bg-white text-gray-400',
                  )}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : stepNum}
                </div>

                <Typography
                  variant="caption"
                  color={isCompleted || isCurrent ? 'primary' : 'gray'}
                  className="hidden max-w-[72px] text-center text-[10px] leading-tight sm:block"
                >
                  {label}
                </Typography>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
