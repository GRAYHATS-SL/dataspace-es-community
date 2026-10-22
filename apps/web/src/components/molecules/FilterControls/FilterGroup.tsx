import Typography from '@/components/atoms/Typography';

export interface FilterGroupProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

/**
 * FilterGroup - Semantic group of pills with an accessible label
 *
 * @param {string} id - Id used for `aria-labelledby`.
 * @param {string} label - Group label.
 * @param {React.ReactNode} children - Pills or other controls.
 */
const FilterGroup = ({ id, label, children }: Readonly<FilterGroupProps>) => (
  <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
    <Typography as="p" variant="metadata-label" id={id} className="text-gray-400 select-none">
      {label}
    </Typography>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

export default FilterGroup;
