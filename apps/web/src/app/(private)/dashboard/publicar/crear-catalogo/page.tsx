import CreatePageLayout from '../_sections/CreatePageLayout';
import PublishFormShell from '../_sections/PublishFormShell';

/** Page to create a new catalog. */
export default function CreateCatalogPage() {
  return (
    <CreatePageLayout
      title="Crear catálogo"
      subtitle="Completa el formulario para crear un nuevo catálogo."
    >
      <PublishFormShell entity="catalog" />
    </CreatePageLayout>
  );
}
