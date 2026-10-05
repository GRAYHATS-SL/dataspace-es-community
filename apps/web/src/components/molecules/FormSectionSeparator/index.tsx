import Typography from '@/components/atoms/Typography';

/** Props of `FormSectionSeparator`. */
export interface FormSectionSeparatorProps {
  title: string;
  description?: string;
}

/** Titled divider between groups of form fields. */
export default function FormSectionSeparator({
  title,
  description,
}: Readonly<FormSectionSeparatorProps>) {
  return (
    <div className="border-t border-gray-lightest pt-4">
      <Typography as="h3" variant="form-label" color="primary" className="font-semibold">
        {title}
      </Typography>
      {description && (
        <Typography as="p" variant="form-hint" color="gray" className="mt-0.5">
          {description}
        </Typography>
      )}
    </div>
  );
}
