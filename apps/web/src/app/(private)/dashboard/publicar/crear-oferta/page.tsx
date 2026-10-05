import CreatePageLayout from '../_sections/CreatePageLayout';
import PublishFormShell from '../_sections/PublishFormShell';

/** Page to create a new product offering. */
export default function CreateOfferingPage() {
  return (
    <CreatePageLayout
      title="Crear oferta de producto"
      subtitle="Completa el formulario para crear una nueva oferta de producto."
    >
      <PublishFormShell entity="offering" />
    </CreatePageLayout>
  );
}
