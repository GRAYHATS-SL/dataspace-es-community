import CreatePageLayout from '../_sections/CreatePageLayout';
import PublishFormShell from '../_sections/PublishFormShell';

/** Page to create a new resource specification. */
export default function CreateResourceSpecPage() {
  return (
    <CreatePageLayout
      title="Crear especificación de recurso"
      subtitle="Completa el formulario para crear una nueva especificación de recurso."
    >
      <PublishFormShell entity="resource" />
    </CreatePageLayout>
  );
}
