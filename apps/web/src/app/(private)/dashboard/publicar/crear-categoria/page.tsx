import CreatePageLayout from '../_sections/CreatePageLayout';
import PublishFormShell from '../_sections/PublishFormShell';

/** Page to create a new category. */
export default function CreateCategoryPage() {
  return (
    <CreatePageLayout
      title="Crear categoría"
      subtitle="Completa el formulario para crear una nueva categoría."
    >
      <PublishFormShell entity="category" />
    </CreatePageLayout>
  );
}
