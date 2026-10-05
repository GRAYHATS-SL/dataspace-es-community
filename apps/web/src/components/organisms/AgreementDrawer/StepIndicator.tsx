import Icon from '@/components/atoms/Icon';

import { type Step, STEP_LABELS, STEPS } from './constants';

/** Props of `StepIndicator`. */
export interface StepIndicatorProps {
  current: Step;
}

/** StepIndicator - Progress indicator of the agreement wizard. */
function StepIndicator({ current }: Readonly<StepIndicatorProps>) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="mb-6 flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className={[
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                i <= currentIndex ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400',
              ].join(' ')}
            >
              {i < currentIndex ? <Icon name="Check" size={12} /> : i + 1}
            </span>
            <span
              className={[
                'text-xs font-medium',
                i <= currentIndex ? 'text-primary' : 'text-gray-400',
              ].join(' ')}
            >
              {STEP_LABELS[step]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <span
              className={[
                'mx-1 h-px w-5 shrink-0',
                i < currentIndex ? 'bg-primary' : 'bg-gray-200',
              ].join(' ')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default StepIndicator;
