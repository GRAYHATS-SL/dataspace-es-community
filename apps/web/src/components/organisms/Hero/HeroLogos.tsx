import React from 'react';

import LogoPlaceholder from '@/components/atoms/LogoPlaceholder';

const LABEL_CLASS = 'text-xs font-medium uppercase tracking-widest text-white/50';

/** HeroLogos - Row of institutional logos (promoter, operator, funders). Here you place your logos. */
const HeroLogos: React.FC = () => (
  <div className="mt-2 flex w-full flex-col items-center gap-8 border-t border-white/10 pt-8 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex flex-row justify-center gap-10 sm:justify-start sm:gap-12 md:gap-14">
      <div className="flex flex-col items-center gap-3 sm:items-start">
        <span className={LABEL_CLASS}>Promovido por</span>
        <LogoPlaceholder />
      </div>

      <div className="flex flex-col items-center gap-3 sm:items-start">
        <span className={LABEL_CLASS}>Operado por</span>
        <LogoPlaceholder />
      </div>
    </div>

    <div className="flex flex-col items-center gap-3 sm:items-start">
      <span className={LABEL_CLASS}>Colaboradores</span>
      <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
        <LogoPlaceholder />
        <LogoPlaceholder />
        <LogoPlaceholder />
      </div>
    </div>
  </div>
);

HeroLogos.displayName = 'HeroLogos';

export default HeroLogos;
