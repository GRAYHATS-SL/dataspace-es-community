import type { RelatedParty } from '@/types/api';

/** Props of `RelatedPartyList`. */
export interface RelatedPartyListProps {
  value?: RelatedParty[];
  label?: string;
}

/** RelatedPartyList - Compact list of an entity's related parties (name, role, type). */
export default function RelatedPartyList({
  value,
  label = 'Partes relacionadas',
}: Readonly<RelatedPartyListProps>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="mt-1 text-xs">
      <span className="font-semibold text-gray-700">{label}:</span>
      <ul className="mt-0.5 ml-3 list-disc">
        {value.map((rp, i) => (
          <li key={rp.id ?? i} className="text-gray-600">
            <span title={rp.id}>{rp.name || rp.id}</span>
            {rp.role && <span className="text-gray-400"> — {rp.role}</span>}
            {rp['@referredType'] && <span className="text-gray-400"> ({rp['@referredType']})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
