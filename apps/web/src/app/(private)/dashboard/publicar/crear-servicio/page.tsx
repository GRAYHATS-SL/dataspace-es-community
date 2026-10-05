import CreatePageLayout from '../_sections/CreatePageLayout';
import PublishFormShell from '../_sections/PublishFormShell';

/** Page to create a new service specification. */
export default function CreateServiceSpecPage() {
  return (
    <CreatePageLayout
      title="Crear especificación de servicio"
      subtitle="Completa el formulario para crear una nueva especificación de servicio."
    >
      <PublishFormShell entity="service" />
    </CreatePageLayout>
  );
}
