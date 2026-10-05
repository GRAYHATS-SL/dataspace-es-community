import CreatePageLayout from '../_sections/CreatePageLayout';
import PublishFormShell from '../_sections/PublishFormShell';

/** Page to create a new product specification. */
export default function CreateProductSpecPage() {
  return (
    <CreatePageLayout
      title="Crear especificación de producto"
      subtitle="Completa el formulario para crear una nueva especificación de producto."
    >
      <PublishFormShell entity="product" />
    </CreatePageLayout>
  );
}
