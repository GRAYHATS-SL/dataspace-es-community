import React from 'react';

/**
 * MainLogo - Placeholder application logo. Replace it with your own SVG.
 * Uses `currentColor` to inherit the surrounding text color.
 *
 * @example
 * <MainLogo className="w-40 text-primary" />
 */

interface MainLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  title?: string;
}

export const MainLogo: React.FC<Readonly<MainLogoProps>> = ({
  width = 600,
  height = 270,
  className,
  title = 'Logo',
  ...rest
}) => (
  // Same 1200×540 canvas as the original brand logo, so every usage keeps its size.
  // Here you place your own logo paths (use `currentColor` to inherit the text color).
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1200 540"
    width={width}
    height={height}
    className={className}
    role="img"
    aria-label={title}
    {...rest}
  >
    <title>{title}</title>
    <g fill="none" stroke="currentColor" strokeWidth="24">
      <rect x="40" y="130" width="280" height="280" rx="56" />
    </g>
    <text x="380" y="320" fill="currentColor" fontFamily="inherit" fontSize="150" fontWeight="700">
      LOGO
    </text>
  </svg>
);

export default MainLogo;
