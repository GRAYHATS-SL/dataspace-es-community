import React from 'react';

import Typography from '@/components/atoms/Typography';

/** Single step of `TutorialSteps`. */
export interface TutorialStep {
  title: string;
  description: string;
}

/** TutorialSteps - Numbered list of steps used in tutorial-style FAQ answers. */
const TutorialSteps: React.FC<Readonly<{ steps: TutorialStep[] }>> = ({ steps }) => (
  <ol className="flex flex-col gap-4" aria-label="Pasos del tutorial">
    {steps.map(({ title, description }, index) => (
      <li key={title} className="flex gap-3">
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="flex flex-col gap-0.5">
          <Typography
            as="span"
            variant="subtitle"
            color="primary"
            className="text-sm font-semibold"
          >
            {title}
          </Typography>
          <Typography variant="small" color="gray" className="leading-relaxed">
            {description}
          </Typography>
        </div>
      </li>
    ))}
  </ol>
);

export default TutorialSteps;
