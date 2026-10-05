import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

/** Props of `TermRow`. */
export interface TermRowProps {
  description: string;
}

/** TermRow - Agreed condition row of the agreement summary. */
function TermRow({ description }: Readonly<TermRowProps>) {
  return (
    <div className="flex items-start gap-2 border-b border-gray-100 py-1.5 last:border-0">
      <Icon name="Check" size={13} className="mt-0.5 shrink-0 text-emerald-500" />
      <Typography variant="small">{description}</Typography>
    </div>
  );
}

export default TermRow;
