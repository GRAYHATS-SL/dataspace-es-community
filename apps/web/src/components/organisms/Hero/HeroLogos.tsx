import Image from 'next/image';
import React from 'react';

const LABEL_CLASS = 'text-xs font-medium uppercase tracking-widest text-white/50';

/** HeroLogos - Institutional logos row of the Hero */
const HeroLogos: React.FC = () => (
  <div className="mt-2 flex w-full flex-col items-center gap-8 border-t border-white/10 pt-8 sm:flex-row sm:items-start sm:justify-between">
    {/* Left: Promovido / Operado */}
    <div className="flex flex-row justify-center gap-10 sm:justify-start sm:gap-12 md:gap-14">
      <div className="flex flex-col items-center gap-3 sm:items-start">
        <span className={LABEL_CLASS}>Promovido por</span>
        <div className="relative h-20 w-40 md:h-24 md:w-40">
          <Image
            src="/corporate/cordubaWhite.png"
            alt="Cordubatech"
            fill
            sizes="(max-width: 768px) 160px, 176px"
            className="object-contain object-center sm:object-left"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:items-start">
        <span className={LABEL_CLASS}>Operado por</span>
        <div className="relative h-16 w-40 md:h-20 md:w-44">
          <Image
            src="/corporate/grayhatsWhite.png"
            alt="GrayHats"
            fill
            sizes="(max-width: 768px) 160px, 176px"
            className="object-contain object-center sm:object-left"
          />
        </div>
      </div>
    </div>

    {/* Right: Financiado por */}
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <span className={LABEL_CLASS}>Financiado por</span>
      <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-start sm:gap-6">
        <div className="relative h-14 w-40 md:h-14 md:w-42 ">
          <Image
            src="/corporate/foundedLogo.webp"
            alt="Financiado por la Unión Europea – NextGenerationEU"
            fill
            sizes="(max-width: 768px) 160px, 176px"
            className="object-contain"
          />
        </div>
        {/* 4459×1070 — ratio 4.17:1 */}
        <div className="relative h-10 w-44 md:h-12 md:w-52 lg:h-14 lg:w-60 xl:h-16 xl:w-64">
          <Image
            src="/corporate/MTDFPGob.svg"
            alt="Ministerio para la Transformación Digital y de la Función Pública"
            fill
            sizes="(max-width: 768px) 352px, 416px"
            className="object-contain"
          />
        </div>
        <div className="relative h-20 w-38 md:h-16 md:w-40">
          <Image
            src="/corporate/prtrLogo.webp"
            alt="Plan de Recuperación, Transformación y Resiliencia"
            fill
            sizes="(max-width: 768px) 160px, 176px"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  </div>
);

HeroLogos.displayName = 'HeroLogos';

export default HeroLogos;
