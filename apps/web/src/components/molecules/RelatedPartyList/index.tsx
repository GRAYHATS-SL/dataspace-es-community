import type { RelatedParty } from '@/types/api';

interface RelatedPartyListProps {
  value?: RelatedParty[];
  label?: string;
}

/**
 * RelatedPartyList - Compact list of `relatedParty` entries
 *
 * @param {RelatedParty[]} [value] - Related parties to list.
 * @param {string} [label='Related parties'] - Label shown before the list.
 */
export default function RelatedPartyList({
  value,
  label = 'Related parties',
}: Readonly<RelatedPartyListProps>) {
  if (!value || value.length === 0) return null;
  return (
    <div className="mt-1 text-xs">
      <span className="font-semibold text-gray-700">{label}:</span>
      <ul className="ml-3 mt-0.5 list-disc">
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
