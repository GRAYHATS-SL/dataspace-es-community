import Typography from '@/components/atoms/Typography';
import type { RelatedParty } from '@/types/api';

export interface PartyRowProps {
  party: RelatedParty;
  roleLabel: string;
}

/**
 * PartyRow - Related party row
 *
 * @param {RelatedParty} party - Party to show.
 * @param {string} roleLabel - Role label.
 */
function PartyRow({ party, roleLabel }: Readonly<PartyRowProps>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <Typography variant="small" color="gray" className="shrink-0">
        {roleLabel}
      </Typography>
      <div className="text-right">
        <Typography variant="small">{party.name ?? party.id}</Typography>
        <Typography variant="small" className="break-all font-mono text-xs text-gray-400">
          {party.id}
        </Typography>
      </div>
    </div>
  );
}

export default PartyRow;
