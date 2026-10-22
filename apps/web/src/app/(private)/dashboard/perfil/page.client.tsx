'use client';

import { type ReactNode, useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import FaqItem from '@/components/molecules/FaqItem';
import MetadataItem from '@/components/molecules/MetadataItem';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import SmartForm, { type SmartFormField } from '@/components/organisms/SmartForm';
import {
  useOrganizationById,
  usePatchOrganization,
  useSaveStripeConnectAccountId,
} from '@/hooks/queries/usePartyQueries';
import { useAutoDismissMessage } from '@/hooks/useAutoDismissMessage';
import type { UserProfile } from '@/lib/session';
import { replaceContactMedium } from '@/lib/utils/contactMedium';
import { getIdentification } from '@/lib/utils/organizationIdentification';
import { getLatestCharacteristicValue } from '@/lib/utils/partyCharacteristic';
import {
  type ContractManagementFormData,
  contractManagementSchema,
  type FiscalDataFormData,
  fiscalDataSchema,
  type StripeAccountFormData,
  stripeAccountSchema,
} from '@/lib/validations/organization.schema';

type Tab = 'perfil' | 'organizacion' | 'sesion';

const CONTRACT_MANAGEMENT_FIELDS: SmartFormField<ContractManagementFormData>[] = [
  {
    name: 'address',
    type: 'text',
    label: 'Dirección del Contract Management',
    required: true,
    placeholder: 'https://tu-contrato.ejemplo.com:443',
    description:
      'URL pública donde el marketplace centralizado enviará las notificaciones de pedidos.',
    wrapperClassName: 'col-span-2',
  },
  {
    name: 'clientId',
    type: 'text',
    label: 'Client ID',
    required: true,
    placeholder: 'contract-management',
    description: 'Identificador del cliente OAuth2 usado para autenticar las notificaciones.',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'scopes',
    type: 'text',
    label: 'Scopes',
    required: true,
    placeholder: 'external-marketplace',
    description: 'Scopes OAuth2 separados por coma (p. ej. external-marketplace).',
    wrapperClassName: 'col-span-1',
  },
];

const STRIPE_ACCOUNT_FIELDS: SmartFormField<StripeAccountFormData>[] = [
  {
    name: 'stripeConnectAccountId',
    type: 'text',
    label: 'Stripe ID',
    required: true,
    placeholder: 'acct_...',
    description:
      'Identificador de tu cuenta Stripe Connect. Se valida contra Stripe antes de guardarse.',
    wrapperClassName: 'col-span-2',
  },
];

const FISCAL_DATA_FIELDS: SmartFormField<FiscalDataFormData>[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Razón social',
    required: true,
    placeholder: 'Acme Telecom S.L.',
    wrapperClassName: 'col-span-2',
  },
  {
    name: 'taxId',
    type: 'text',
    label: 'CIF',
    required: true,
    placeholder: 'B12345678',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'street1',
    type: 'text',
    label: 'Dirección',
    required: true,
    placeholder: 'Calle Mayor, 1',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'city',
    type: 'text',
    label: 'Ciudad',
    required: true,
    placeholder: 'Madrid',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'postCode',
    type: 'text',
    label: 'Código postal',
    required: true,
    placeholder: '28001',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'country',
    type: 'text',
    label: 'País',
    required: true,
    placeholder: 'España',
    wrapperClassName: 'col-span-1',
  },
];

function formatAudClaim(aud: unknown): string {
  if (Array.isArray(aud)) return aud.join(', ');
  if (typeof aud === 'string') return aud;
  return '-';
}

interface PerfilPageClientProps {
  userProfile: UserProfile | null;
  token: Record<string, unknown> | null;
}

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: 'User' },
  { id: 'organizacion', label: 'Organización', icon: 'Building2' },
  { id: 'sesion', label: 'Sesión', icon: 'Shield' },
];

export default function PerfilPageClient({ userProfile, token }: Readonly<PerfilPageClientProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgSaveError, setOrgSaveError] = useState<string | null>(null);
  const [isEditingStripe, setIsEditingStripe] = useState(false);
  const [stripeSaveError, setStripeSaveError] = useState<string | null>(null);
  const [isEditingFiscal, setIsEditingFiscal] = useState(false);
  const [fiscalSaveError, setFiscalSaveError] = useState<string | null>(null);
  const [orgInitialValues, setOrgInitialValues] = useState<ContractManagementFormData>({
    address: '',
    clientId: 'contract-management',
    scopes: 'external-marketplace',
  });
  const [orgSaveSuccess, setOrgSaveSuccess] = useAutoDismissMessage();
  const [stripeSaveSuccess, setStripeSaveSuccess] = useAutoDismissMessage();
  const [fiscalSaveSuccess, setFiscalSaveSuccess] = useAutoDismissMessage();
  const [openSessionDetail, setOpenSessionDetail] = useState<string | null>(null);

  const profile = userProfile ?? ({} as UserProfile);
  const {
    sub = '',
    organizationId = '',
    email = '',
    firstName = '',
    lastName = '',
    roles = [],
  } = profile;
  // Sessions prior to `businessRoles` do not have it in the cookie: they are treated as both roles (same criterion as `DropdownMenu`). ADMIN derives to `proveedor` (see `deriveBusinessRoles`).
  const isProvider = (profile.businessRoles ?? ['proveedor', 'consumidor']).includes('proveedor');
  // Tax data: ADMIN only. Contract management and Stripe: also the provider (SELLER). NOTE: in v2 `organization` is PATCH for ADMIN only per the doc (SELLER → 403 to be verified).
  const isAdmin = roles.some((r) => r.toUpperCase() === 'ADMIN');

  const { data: organization, isLoading: orgLoading } = useOrganizationById(organizationId);
  const { mutateAsync: patchOrganization, isPending: isSavingOrg } = usePatchOrganization();
  const { mutateAsync: saveStripeAccount, isPending: isSavingStripe } =
    useSaveStripeConnectAccountId();

  const { aud, iss, exp } = token ?? {};

  const formatDate = (ts?: number | string) => {
    if (!ts) return '-';
    const n = typeof ts === 'string' ? Number(ts) : ts;
    return Number.isNaN(n) ? '-' : new Date(n * 1000).toLocaleString('es-ES');
  };

  const getOrgChar = (name: string): string | undefined => {
    const val = getLatestCharacteristicValue(organization?.partyCharacteristic, name);
    return val === undefined ? undefined : String(val);
  };

  // Legacy v1 data may carry accumulated entries — use the last one.
  const getLastCm = (): Record<string, unknown> | null => {
    const chars = organization?.partyCharacteristic ?? [];
    const last = [...chars].reverse().find((c) => c.name === 'contractManagement')?.value;
    return typeof last === 'object' && last !== null ? (last as Record<string, unknown>) : null;
  };

  const fiscalCif = getIdentification(organization?.organizationIdentification, 'CIF');
  const fiscalAddress = organization?.contactMedium?.find(
    (cm) => cm.mediumType === 'postal',
  )?.characteristic;

  const handleSaveOrg = async (data: ContractManagementFormData) => {
    setOrgSaveError(null);
    await patchOrganization({
      id: organizationId,
      data: {
        partyCharacteristic: [
          ...(organization?.partyCharacteristic ?? []).filter(
            (c) => c.name !== 'contractManagement',
          ),
          {
            name: 'contractManagement',
            value: {
              address: data.address,
              clientId: data.clientId,
              scope: data.scopes
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            },
          },
        ],
      },
    });
    setIsEditingOrg(false);
    setOrgSaveSuccess('Guardado correctamente');
  };

  const handleSaveFiscal = async (data: FiscalDataFormData) => {
    setFiscalSaveError(null);

    const preservedIdentifications = (organization?.organizationIdentification ?? []).filter(
      (i) => i.identificationType !== 'CIF',
    );

    await patchOrganization({
      id: organizationId,
      data: {
        name: data.name,
        organizationIdentification: [
          ...preservedIdentifications,
          { identificationType: 'CIF', identificationId: data.taxId },
        ],
        contactMedium: replaceContactMedium(organization?.contactMedium, 'postal', {
          mediumType: 'postal',
          characteristic: {
            street1: data.street1,
            city: data.city,
            postCode: data.postCode,
            country: data.country,
          },
        }),
      },
    });
    setIsEditingFiscal(false);
    setFiscalSaveSuccess('Guardado correctamente');
  };

  const handleSaveStripeAccount = async (data: StripeAccountFormData) => {
    setStripeSaveError(null);
    const result = await saveStripeAccount({
      stripeAccountId: data.stripeConnectAccountId,
    });
    if (!result.ok) {
      setStripeSaveError(result.message);
      return;
    }
    setIsEditingStripe(false);
    setStripeSaveSuccess('Guardado correctamente');
  };

  if (!token) {
    return (
      <SectionHeader
        title="Perfil"
        subtitle="No se encontró una sesión activa. Por favor, inicia sesión para ver tu perfil."
        className="py-16"
      />
    );
  }

  const orgContent: ReactNode = (() => {
    if (orgLoading) return <Typography>Cargando...</Typography>;
    if (isEditingOrg) {
      return (
        <div className="max-w-2xl">
          <div className="mb-6 space-y-3">
            <MetadataItem
              icon="Building2"
              label="Nombre"
              value={organization?.tradingName ?? organization?.name ?? '-'}
            />
            <MetadataItem icon="Fingerprint" label="DID" value={getOrgChar('did') ?? '-'} />
          </div>
          <Typography color="primary" as="h3" variant="section-subtitle" className="mb-1">
            Integración con Marketplace Centralizado
          </Typography>
          <Typography variant="small" color="gray" className="mb-4">
            Configura el endpoint al que el marketplace enviará notificaciones cuando un consumidor
            compre acceso a tus servicios.
          </Typography>
          {orgSaveError && <p className="text-sm text-red-600 mb-4">{orgSaveError}</p>}
          <SmartForm<ContractManagementFormData>
            schema={contractManagementSchema}
            fields={CONTRACT_MANAGEMENT_FIELDS}
            columns={2}
            onSubmitError={(err) =>
              setOrgSaveError(
                err instanceof Error ? err.message : 'Error al guardar. Inténtalo de nuevo.',
              )
            }
            defaultValues={orgInitialValues}
            resetOnSubmit={false}
            loading={isSavingOrg}
            onSubmit={handleSaveOrg}
            onCancel={() => {
              setIsEditingOrg(false);
              setOrgSaveError(null);
            }}
            renderActions={({ isSubmitting, loading, onCancel }) => (
              <div className="flex gap-3 mt-4">
                <Button type="submit" size="sm" disabled={isSubmitting || loading}>
                  {isSubmitting || loading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting || loading}
                >
                  Cancelar
                </Button>
              </div>
            )}
          />
        </div>
      );
    }
    const cmObj = getLastCm();
    return (
      <div className="space-y-3">
        <MetadataItem
          icon="Building2"
          label="Nombre"
          value={organization?.tradingName ?? organization?.name ?? '-'}
        />
        <MetadataItem icon="IdBadge2" label="ID" value={organizationId || '-'} />
        <div>
          <MetadataItem icon="Fingerprint" label="DID" value={getOrgChar('did') ?? '-'} />
          <p className="text-xs text-muted-foreground mt-1">
            Identificador descentralizado: la identidad verificable de tu organización en el
            dataspace.
          </p>
        </div>
        {getOrgChar('website') && (
          <MetadataItem icon="Globe" label="Website" value={getOrgChar('website')!} />
        )}
        {getOrgChar('description') && (
          <MetadataItem icon="FileText" label="Descripción" value={getOrgChar('description')!} />
        )}
        {organization?.organizationType && (
          <MetadataItem icon="Tag" label="Tipo" value={organization.organizationType} />
        )}
        {organization?.status && (
          <MetadataItem icon="CheckCircle" label="Estado" value={organization.status} />
        )}
        {cmObj && (
          <>
            {cmObj.address && (
              <MetadataItem icon="Link" label="CM Address" value={String(cmObj.address)} />
            )}
            {cmObj.clientId && (
              <MetadataItem icon="Key" label="CM Client ID" value={String(cmObj.clientId)} />
            )}
            {cmObj.scope && (
              <MetadataItem
                icon="Tag"
                label="CM Scopes"
                value={Array.isArray(cmObj.scope) ? cmObj.scope.join(', ') : String(cmObj.scope)}
              />
            )}
          </>
        )}
      </div>
    );
  })();

  const stripeContent: ReactNode = (() => {
    if (orgLoading) return <Typography>Cargando...</Typography>;
    if (isEditingStripe) {
      return (
        <div className="max-w-md">
          {stripeSaveError && <p className="text-sm text-red-600 mb-3">{stripeSaveError}</p>}
          <SmartForm<StripeAccountFormData>
            schema={stripeAccountSchema}
            fields={STRIPE_ACCOUNT_FIELDS}
            columns={1}
            defaultValues={{ stripeConnectAccountId: getOrgChar('stripeConnectAccountId') ?? '' }}
            resetOnSubmit={false}
            loading={isSavingStripe}
            onSubmit={handleSaveStripeAccount}
            onCancel={() => {
              setIsEditingStripe(false);
              setStripeSaveError(null);
            }}
            renderActions={({ isSubmitting, loading, onCancel }) => (
              <div className="flex gap-3 mt-4">
                <Button type="submit" size="sm" disabled={isSubmitting || loading}>
                  {isSubmitting || loading ? 'Validando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting || loading}
                >
                  Cancelar
                </Button>
              </div>
            )}
          />
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <Typography variant="small" color="gray" className="mb-3">
          Necesario para publicar ofertas con precio en el catálogo.
        </Typography>
        <MetadataItem
          icon="Banknote"
          label="Estado de cobros"
          value={
            getOrgChar('stripePayoutsEnabled') === 'true' ? 'Activos' : 'Pendiente de configurar'
          }
        />
        {getOrgChar('stripeConnectAccountId') && (
          <MetadataItem
            icon="Hash"
            label="Stripe ID"
            value={getOrgChar('stripeConnectAccountId')!}
          />
        )}
      </div>
    );
  })();

  const fiscalContent: ReactNode = (() => {
    if (orgLoading) return <Typography>Cargando...</Typography>;
    if (isEditingFiscal) {
      return (
        <div className="max-w-2xl">
          {fiscalSaveError && <p className="text-sm text-red-600 mb-3">{fiscalSaveError}</p>}
          <SmartForm<FiscalDataFormData>
            schema={fiscalDataSchema}
            fields={FISCAL_DATA_FIELDS}
            columns={2}
            defaultValues={{
              name: organization?.name ?? '',
              taxId: fiscalCif?.identificationId ?? '',
              street1: fiscalAddress?.street1 ?? '',
              city: fiscalAddress?.city ?? '',
              postCode: fiscalAddress?.postCode ?? '',
              country: fiscalAddress?.country ?? '',
            }}
            resetOnSubmit={false}
            loading={isSavingOrg}
            onSubmit={handleSaveFiscal}
            onCancel={() => {
              setIsEditingFiscal(false);
              setFiscalSaveError(null);
            }}
            renderActions={({ isSubmitting, loading, onCancel }) => (
              <div className="flex gap-3 mt-4">
                <Button type="submit" size="sm" disabled={isSubmitting || loading}>
                  {isSubmitting || loading ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting || loading}
                >
                  Cancelar
                </Button>
              </div>
            )}
          />
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <MetadataItem icon="Building2" label="Razón social" value={organization?.name ?? '-'} />
        <MetadataItem icon="Hash" label="CIF" value={fiscalCif?.identificationId ?? '-'} />
        <MetadataItem
          icon="MapPin"
          label="Dirección fiscal"
          value={
            fiscalAddress
              ? [
                  fiscalAddress.street1,
                  fiscalAddress.postCode,
                  fiscalAddress.city,
                  fiscalAddress.country,
                ]
                  .filter(Boolean)
                  .join(', ')
              : '-'
          }
        />
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mi Perfil"
          subtitle="Consulta y gestiona tu información personal, organización y acceso."
          className="px-4"
        />
      </section>

      <Container className="py-10">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(id) => {
            setActiveTab(id as Tab);
            setIsEditingOrg(false);
            setOrgSaveError(null);
            setIsEditingStripe(false);
            setStripeSaveError(null);
            setIsEditingFiscal(false);
            setFiscalSaveError(null);
            setOrgSaveSuccess(null);
            setStripeSaveSuccess(null);
            setFiscalSaveSuccess(null);
          }}
          className="mb-8"
        />

        {activeTab === 'perfil' && (
          <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
            <div className="mb-6">
              <Typography color="primary" as="h2" variant="section-title">
                Datos personales
              </Typography>
            </div>
            <div className="space-y-3">
              <MetadataItem icon="User" label="Nombre" value={firstName || '-'} />
              <MetadataItem icon="User" label="Apellidos" value={lastName || '-'} />
              <div>
                <MetadataItem icon="Mail" label="Email" value={email || '-'} />
                <p className="text-xs text-muted-foreground mt-1">
                  Estos datos proceden de tu credencial verificable y se gestionan en el emisor.
                </p>
              </div>
              <div>
                <MetadataItem icon="Fingerprint" label="DID" value={sub || '-'} />
                <p className="text-xs text-muted-foreground mt-1">
                  Identificador descentralizado: tu identidad verificable en el dataspace.
                </p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'organizacion' && (
          <div className="space-y-6">
            <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <Typography color="primary" as="h2" variant="section-title">
                  Organización
                </Typography>
                {(isAdmin || isProvider) && organizationId && !isEditingOrg && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const cmObj = getLastCm();
                      const scope = cmObj?.scope;
                      let resolvedScope = 'external-marketplace';
                      if (scope) {
                        resolvedScope = Array.isArray(scope) ? scope.join(', ') : String(scope);
                      }
                      setOrgInitialValues({
                        address: cmObj?.address ? String(cmObj.address) : '',
                        clientId: cmObj?.clientId ? String(cmObj.clientId) : 'contract-management',
                        scopes: resolvedScope,
                      });
                      setIsEditingOrg(true);
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>
              {orgSaveSuccess && !isEditingOrg && (
                <p className="text-sm text-green-600 mb-3">{orgSaveSuccess}</p>
              )}
              {orgContent}
            </Card>

            <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <Typography color="primary" as="h2" variant="section-title">
                  Datos fiscales
                </Typography>
                {isAdmin && organizationId && !orgLoading && !isEditingFiscal && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingFiscal(true)}>
                    Editar
                  </Button>
                )}
              </div>
              {fiscalSaveSuccess && !isEditingFiscal && (
                <p className="text-sm text-green-600 mb-3">{fiscalSaveSuccess}</p>
              )}
              {fiscalContent}
            </Card>

            {isProvider && (
              <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-6">
                  <Typography color="primary" as="h2" variant="section-title">
                    Cobros (Stripe Connect)
                  </Typography>
                  {organizationId && !orgLoading && !isEditingStripe && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingStripe(true)}>
                      {getOrgChar('stripeConnectAccountId')
                        ? 'Cambiar Stripe ID'
                        : 'Configurar cobros'}
                    </Button>
                  )}
                </div>
                {stripeSaveSuccess && !isEditingStripe && (
                  <p className="text-sm text-green-600 mb-3">{stripeSaveSuccess}</p>
                )}
                {stripeContent}
              </Card>
            )}
          </div>
        )}

        {activeTab === 'sesion' && (
          <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
            <Typography color="primary" as="h2" variant="section-title" className="mb-6">
              Información de sesión
            </Typography>
            <div className="space-y-3">
              <MetadataItem
                icon="Clock"
                label="Expira"
                value={formatDate(
                  typeof exp === 'string' || typeof exp === 'number' ? exp : undefined,
                )}
              />
              {roles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {roles.map((r) => (
                    <Badge key={r} variant="outline" size="sm">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <FaqItem
              id="session-technical-details"
              question="Detalles técnicos"
              isOpen={openSessionDetail === 'session-technical-details'}
              onToggle={(id) => setOpenSessionDetail((prev) => (prev === id ? null : id))}
              className="mt-4"
              answer={
                <div className="space-y-3">
                  <MetadataItem
                    icon="Globe"
                    label="Emisor"
                    value={typeof iss === 'string' ? iss : '-'}
                  />
                  <MetadataItem icon="Server" label="Audiencia" value={formatAudClaim(aud)} />
                </div>
              }
            />
          </Card>
        )}
      </Container>
    </div>
  );
}
