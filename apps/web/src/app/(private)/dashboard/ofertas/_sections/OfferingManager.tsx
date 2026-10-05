'use client';

import { useCallback, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import Drawer from '@/components/molecules/Drawer';
import TabNavigation from '@/components/molecules/TabNavigation';
import OfferingForm from '@/components/organisms/OfferingForm';
import type { ProductOffering } from '@/types/api';

import OfferingList from './OfferingList';

const TABS = [{ id: 'ofertas', label: 'Ofertas', icon: 'Tag' }] as const;

/**
 * OfferingManager - Offerings section: header with the create action, the list and the
 * drawer that mounts the create/edit form.
 */
export default function OfferingManager() {
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editingOffering, setEditingOffering] = useState<ProductOffering | null>(null);

  const openForm = useCallback((offering: ProductOffering | null = null) => {
    setEditingOffering(offering);
    setFormKey((k) => k + 1);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingOffering(null);
  }, []);

  const drawerTitle = editingOffering ? 'Editar oferta' : 'Crear oferta';
  const drawerDescription = editingOffering
    ? editingOffering.name
    : 'Completa el formulario para crear una nueva oferta de producto.';

  return (
    <>
      <Drawer
        open={showForm}
        onClose={closeForm}
        title={drawerTitle}
        description={drawerDescription}
      >
        {showForm && (
          <OfferingForm key={formKey} onClose={closeForm} editingOffering={editingOffering} />
        )}
      </Drawer>

      <TabNavigation tabs={TABS} activeTab="ofertas" onTabChange={() => {}} className="mb-8" />

      <div className="flex items-start justify-between mb-6">
        <div>
          <Typography as="h2" variant="subtitle" color="primary" className="tracking-tight font-semibold">
            Ofertas de producto
          </Typography>
          <Typography variant="small" color="gray" className="mt-0.5">
            Listado de ofertas (TMF620 ProductOffering).
          </Typography>
        </div>
        <Button
          variant={showForm ? 'outline' : 'primary'}
          size="md"
          onClick={() => (showForm ? closeForm() : openForm())}
          aria-expanded={showForm}
        >
          {showForm ? (
            <>
              <Icon name="X" size={14} className="mr-1.5" aria-hidden="true" />
              Cancelar
            </>
          ) : (
            <>
              <span aria-hidden="true" className="mr-1.5">
                +
              </span>
              Crear oferta
            </>
          )}
        </Button>
      </div>

      <OfferingList onEdit={openForm} />
    </>
  );
}
