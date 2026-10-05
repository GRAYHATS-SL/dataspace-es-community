import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

/** Props of `PolicyItem`. */
export interface PolicyItemProps {
  icon: string;
  label: string;
  value: string;
}

/** PolicyItem - Icon + label + value of an access policy entry. */
const PolicyItem = ({ icon, label, value }: Readonly<PolicyItemProps>) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      <Icon name={icon} size={13} className="text-gray-light" />
      <Typography variant="metadata-label" color="gray-light">
        {label}
      </Typography>
    </div>
    <Typography variant="metadata-value" color="black">
      {value}
    </Typography>
  </div>
);

export default PolicyItem;
