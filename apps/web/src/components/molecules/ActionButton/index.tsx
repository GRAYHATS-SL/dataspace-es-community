import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: string;
  title: string;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  href?: string;
}

function variantClass(variant: NonNullable<ActionButtonProps['variant']>): string {
  switch (variant) {
    case 'secondary':
      return 'bg-secondary hover:bg-secondary/90 focus-visible:ring-secondary text-white shadow-md';
    case 'ghost':
      return 'bg-transparent hover:bg-primary/10 focus-visible:ring-primary text-primary';
    default:
      return 'bg-primary hover:bg-primary/90 focus-visible:ring-primary text-white shadow-md';
  }
}

const baseClass = (variant: NonNullable<ActionButtonProps['variant']>, className?: string) =>
  cn(
    'flex w-full flex-row items-center gap-4 rounded-xl px-5 py-6',
    'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'active:scale-95 cursor-pointer',
    variantClass(variant),
    className,
  );

/**
 * ActionButton - Large icon + title action, rendered as a link when `href` is set.
 */
export default function ActionButton({
  icon,
  title,
  onClick,
  className,
  variant = 'primary',
  disabled = false,
  href,
}: Readonly<ActionButtonProps>) {
  const content = (
    <>
      <Icon name={icon} size={24} />
      <Typography variant="body" className="font-semibold" color="white">
        {title}
      </Typography>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        variant="unstyled"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={baseClass(variant, className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClass(variant, className)}
    >
      {content}
    </button>
  );
}
