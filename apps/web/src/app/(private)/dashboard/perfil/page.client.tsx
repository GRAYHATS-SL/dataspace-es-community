'use client';

import { type ReactNode, useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import FaqItem from '@/components/molecules/FaqItem';
import MetadataItem from '@/components/molecules/MetadataItem';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import SmartForm, {
  type SmartFormField,
  type SmartFormRenderActionsProps,
} from '@/components/organisms/SmartForm';
import { useIndividual, useOrganizationById, usePatchIndividual, usePatchOrganization } from '@/hooks/queries';
import { useAutoDismissMessage } from '@/hooks/useAutoDismissMessage';
import {
  linkIndividualProfile,
  type LinkIndividualProfileResult,
} from '@/lib/services/queries/linkIndividualProfile';
import type { UserProfile } from '@/lib/session';
import { replaceContactMedium } from '@/lib/utils/contactMedium';
import { getIdentification } from '@/lib/utils/organizationIdentification';
import {
  type IndividualProfileFormData,
  individualProfileSchema,
} from '@/lib/validations/individual.schema';
import {
  type FiscalDataFormData,
  fiscalDataSchema,
  type IntegrationSettingsFormData,
  integrationSettingsSchema,
  type PayoutAccountFormData,
  payoutAccountSchema,
} from '@/lib/validations/organization.schema';
import type {
  ContactMedium,
  Individual,
  MediumCharacteristic,
  NewIndividual,
  Organization,
} from '@/types/api';

type Tab = 'perfil' | 'organizacion' | 'sesion';

// Characteristic names used to store organization settings.
// Here you define your business logic (characteristic naming and value shapes).
const CHAR_INTEGRATION = 'integrationSettings';
const CHAR_PAYOUT_ACCOUNT = 'payoutAccountId';
const CHAR_PAYOUTS_ENABLED = 'payoutsEnabled';
const TAX_ID_TYPE = 'taxId';

const DEFAULT_INTEGRATION: IntegrationSettingsFormData = { address: '', clientId: '', scopes: '' };

const INTEGRATION_FIELDS: SmartFormField<IntegrationSettingsFormData>[] = [
  {
    name: 'address',
    type: 'text',
    label: 'URL de notificaciones',
    required: true,
    placeholder: 'https://notificaciones.example.org',
    description: 'Endpoint al que se enviarán las notificaciones de órdenes.',
    wrapperClassName: 'col-span-2',
  },
  {
    name: 'clientId',
    type: 'text',
    label: 'Client ID',
    required: true,
    placeholder: 'mi-cliente',
    description: 'Identificador del cliente OAuth2 usado para autenticar las notificaciones.',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'scopes',
    type: 'text',
    label: 'Scopes',
    required: true,
    placeholder: 'scope-a, scope-b',
    description: 'Scopes OAuth2 separados por coma.',
    wrapperClassName: 'col-span-1',
  },
];

const PAYOUT_FIELDS: SmartFormField<PayoutAccountFormData>[] = [
  {
    name: 'payoutAccountId',
    type: 'text',
    label: 'Identificador de la cuenta de cobros',
    required: true,
    placeholder: 'ID de la cuenta en tu proveedor de pagos',
    wrapperClassName: 'col-span-2',
  },
];

const FISCAL_DATA_FIELDS: SmartFormField<FiscalDataFormData>[] = [
  { name: 'name', type: 'text', label: 'Razón social', required: true, placeholder: 'Mi Organización', wrapperClassName: 'col-span-2' },
  { name: 'taxId', type: 'text', label: 'Identificador fiscal', required: true, placeholder: 'X0000000X', wrapperClassName: 'col-span-1' },
  { name: 'street1', type: 'text', label: 'Dirección', required: true, placeholder: 'Calle, número', wrapperClassName: 'col-span-1' },
  { name: 'city', type: 'text', label: 'Ciudad', required: true, placeholder: 'Ciudad', wrapperClassName: 'col-span-1' },
  { name: 'postCode', type: 'text', label: 'Código postal', required: true, placeholder: '00000', wrapperClassName: 'col-span-1' },
  { name: 'country', type: 'text', label: 'País', required: true, placeholder: 'País', wrapperClassName: 'col-span-1' },
];

const TITLE_OPTIONS = [
  { value: '', label: 'Sin tratamiento' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'Sra.', label: 'Sra.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Dra.', label: 'Dra.' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'Hombre', label: 'Hombre' },
  { value: 'Mujer', label: 'Mujer' },
  { value: 'No binario', label: 'No binario' },
  { value: 'Prefiero no decirlo', label: 'Prefiero no decirlo' },
];

const EDIT_FIELDS: SmartFormField<IndividualProfileFormData>[] = [
  { name: 'givenName', type: 'text', label: 'Nombre', required: true, placeholder: 'Tu nombre', wrapperClassName: 'col-span-1' },
  { name: 'familyName', type: 'text', label: 'Apellidos', required: true, placeholder: 'Tus apellidos', wrapperClassName: 'col-span-1' },
  { name: 'title', type: 'select', label: 'Tratamiento', options: TITLE_OPTIONS, wrapperClassName: 'col-span-1' },
  { name: 'gender', type: 'select', label: 'Género', options: GENDER_OPTIONS, wrapperClassName: 'col-span-1' },
  { name: 'nationality', type: 'text', label: 'Nacionalidad', placeholder: 'Nacionalidad', wrapperClassName: 'col-span-1' },
  { name: 'birthDate', type: 'text', label: 'Fecha de nacimiento', placeholder: 'YYYY-MM-DD', wrapperClassName: 'col-span-1' },
  { name: 'phone', type: 'tel', label: 'Teléfono', placeholder: '+00 000 000 000', wrapperClassName: 'col-span-1' },
];

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: 'User' },
  { id: 'organizacion', label: 'Organización', icon: 'Building2' },
  { id: 'sesion', label: 'Sesión', icon: 'Shield' },
];

function FormActions({
  isSubmitting,
  loading,
  onCancel,
  submitLabel = 'Guardar cambios',
}: Readonly<SmartFormRenderActionsProps & { submitLabel?: string }>) {
  const busy = isSubmitting || loading;
  return (
    <div className="flex gap-3 mt-4">
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? 'Guardando...' : submitLabel}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
        Cancelar
      </Button>
    </div>
  );
}

function getLinkProfileMessage(result: LinkIndividualProfileResult): string | null {
  switch (result.status) {
    case 'linked':
      return null;
    case 'no_organization':
      return 'No se encontró ninguna organización asociada a tu identidad.';
    case 'no_email':
      return 'Tu identidad no incluye un email. Configúralo en tu proveedor de identidad.';
    default:
      return `No se pudo vincular tu perfil: ${result.message}`;
  }
}

function formatAudClaim(aud: unknown): string {
  if (Array.isArray(aud)) return aud.join(', ');
  if (typeof aud === 'string') return aud;
  return '-';
}

function formatEpoch(ts: unknown): string {
  const n = typeof ts === 'string' ? Number(ts) : ts;
  if (typeof n !== 'number' || Number.isNaN(n)) return '-';
  return new Date(n * 1000).toLocaleString('es-ES');
}

function SaveNotice({ message }: Readonly<{ message: string | null }>) {
  if (!message) return null;
  return <p className="text-sm text-green-600 mb-3">{message}</p>;
}

function ErrorNotice({ message }: Readonly<{ message: string | null }>) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 mb-3" role="alert">
      {message}
    </p>
  );
}

function getLatestChar(organization: Organization | undefined, charName: string): unknown {
  // The latest entry wins when the backend accumulates characteristics.
  return [...(organization?.partyCharacteristic ?? [])].reverse().find((c) => c.name === charName)
    ?.value;
}

function getCharString(organization: Organization | undefined, charName: string): string | undefined {
  const val = getLatestChar(organization, charName);
  return val === undefined || typeof val === 'object' ? undefined : String(val);
}

function parseIntegration(value: unknown): IntegrationSettingsFormData | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  return {
    address: typeof record.address === 'string' ? record.address : '',
    clientId: typeof record.clientId === 'string' ? record.clientId : '',
    scopes: Array.isArray(record.scope) ? record.scope.join(', ') : String(record.scope ?? ''),
  };
}

function getOrgNotice(organizationId: string, isError: boolean): ReactNode {
  if (!organizationId) {
    return (
      <Typography variant="small" color="gray">
        No hay ninguna organización asociada a tu cuenta.
      </Typography>
    );
  }
  if (isError) {
    return (
      <Typography variant="small" color="danger" role="alert">
        No se pudo cargar la organización.
      </Typography>
    );
  }
  return null;
}

interface PersonalDataViewProps {
  individual: Individual | undefined;
  fallbackName: string;
  email: string;
  phone: string | undefined;
  subject: string;
}

function PersonalDataView({
  individual,
  fallbackName,
  email,
  phone,
  subject,
}: Readonly<PersonalDataViewProps>) {
  const optional: [string, string, string | undefined][] = [
    ['Tag', 'Tratamiento', individual?.title],
    ['User', 'Nombre', (individual?.givenName ?? fallbackName) || '-'],
    ['User', 'Apellidos', individual?.familyName || '-'],
    ['User', 'Género', individual?.gender],
    ['Globe', 'Nacionalidad', individual?.nationality],
    ['Calendar', 'Nacimiento', individual?.birthDate],
    ['Mail', 'Email', email || '-'],
    ['Phone', 'Teléfono', phone],
  ];
  return (
    <>
      {optional
        .filter(([, , value]) => Boolean(value))
        .map(([icon, label, value]) => (
          <MetadataItem key={label} icon={icon} label={label} value={value ?? ''} />
        ))}
      <div>
        <MetadataItem icon="Fingerprint" label="Identificador" value={subject || '-'} />
        <p className="text-xs text-muted-foreground mt-1">
          Identificador único de tu cuenta en el proveedor de identidad.
        </p>
      </div>
    </>
  );
}

function SessionTab({ token, roles }: Readonly<{ token: Record<string, unknown> | null; roles: string[] }>) {
  const [open, setOpen] = useState(false);
  if (!token) {
    return (
      <Typography variant="small" color="gray">
        No se pudieron leer los datos del token de sesión.
      </Typography>
    );
  }
  return (
    <>
      <div className="space-y-3">
        <MetadataItem icon="Clock" label="Expira" value={formatEpoch(token.exp)} />
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
        isOpen={open}
        onToggle={() => setOpen((prev) => !prev)}
        className="mt-4"
        answer={
          <div className="space-y-3">
            <MetadataItem
              icon="Globe"
              label="Emisor"
              value={typeof token.iss === 'string' ? token.iss : '-'}
            />
            <MetadataItem icon="Server" label="Audiencia" value={formatAudClaim(token.aud)} />
          </div>
        }
      />
    </>
  );
}

function buildIndividualPatch(
  data: IndividualProfileFormData,
  individual: Individual | undefined,
): Partial<NewIndividual> {
  const { phone, ...scalar } = data;
  // Here you define your business logic (which individual fields are editable).
  const patch: Partial<NewIndividual> = {
    givenName: scalar.givenName,
    familyName: scalar.familyName,
    ...(scalar.title && { title: scalar.title }),
    ...(scalar.gender && { gender: scalar.gender }),
    ...(scalar.nationality && { nationality: scalar.nationality }),
    ...(scalar.birthDate && { birthDate: scalar.birthDate }),
  };
  const media: ContactMedium[] = (individual?.contactMedium ?? []).filter(
    (cm) => cm.mediumType !== 'phone',
  );
  if (phone) media.push({ mediumType: 'phone', characteristic: { phoneNumber: phone } });
  if (media.length > 0) patch.contactMedium = media;
  return patch;
}

function toSaveErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error al guardar. Inténtalo de nuevo.';
}

function LinkProfileNotice({
  message,
  isLinking,
  onLink,
}: Readonly<{ message: string | null; isLinking: boolean; onLink: () => void }>) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5">
      <Icon name="Info" size={14} className="shrink-0 text-neutral-500" />
      <Typography variant="small" className="flex-1 text-neutral-700">
        {message ?? 'Tu perfil todavía no está vinculado a un registro editable.'}
      </Typography>
      <Button variant="outline" size="sm" className="shrink-0" onClick={onLink} disabled={isLinking}>
        {isLinking ? 'Vinculando...' : 'Vincular mi perfil'}
      </Button>
    </div>
  );
}

function OrganizationSummary({
  organization,
  organizationId,
}: Readonly<{ organization: Organization | undefined; organizationId: string }>) {
  const rows: [string, string, string | undefined][] = [
    ['Building2', 'Nombre', organization?.tradingName ?? organization?.name ?? '-'],
    ['Hash', 'ID', organizationId || '-'],
    ['Globe', 'Sitio web', getCharString(organization, 'website')],
    ['Tag', 'Tipo', organization?.organizationType],
    ['CheckCircle', 'Estado', organization?.status],
  ];
  return (
    <>
      {rows
        .filter(([, , value]) => Boolean(value))
        .map(([icon, label, value]) => (
          <MetadataItem key={label} icon={icon} label={label} value={value ?? ''} />
        ))}
    </>
  );
}

function IntegrationView({ integration }: Readonly<{ integration: IntegrationSettingsFormData | null }>) {
  if (!integration) return null;
  return (
    <>
      <MetadataItem icon="Link" label="URL de notificaciones" value={integration.address || '-'} />
      <MetadataItem icon="Key" label="Client ID" value={integration.clientId || '-'} />
      <MetadataItem icon="Tag" label="Scopes" value={integration.scopes || '-'} />
    </>
  );
}

function FiscalDataView({
  name,
  taxId,
  address,
}: Readonly<{ name?: string; taxId?: string; address?: MediumCharacteristic }>) {
  const formattedAddress = address
    ? [address.street1, address.postCode, address.city, address.country].filter(Boolean).join(', ')
    : '';
  return (
    <div className="space-y-3">
      <MetadataItem icon="Building2" label="Razón social" value={name ?? '-'} />
      <MetadataItem icon="Hash" label="Identificador fiscal" value={taxId ?? '-'} />
      <MetadataItem icon="MapPin" label="Dirección fiscal" value={formattedAddress || '-'} />
    </div>
  );
}

function PayoutView({ enabled, accountId }: Readonly<{ enabled: boolean; accountId?: string }>) {
  return (
    <div className="space-y-3">
      <Typography variant="small" color="gray" className="mb-3">
        Necesario para publicar ofertas con precio en el catálogo.
      </Typography>
      <MetadataItem
        icon="Banknote"
        label="Estado de cobros"
        value={enabled ? 'Activos' : 'Pendiente de configurar'}
      />
      {accountId && <MetadataItem icon="Hash" label="Cuenta" value={accountId} />}
    </div>
  );
}

/** Props of `PerfilPageClient`. */
export interface PerfilPageClientProps {
  userProfile: UserProfile | null;
  token: Record<string, unknown> | null;
  organizationId: string;
}

/** PerfilPageClient - Profile, organization and session tabs of the current user. */
export default function PerfilPageClient({
  userProfile,
  token,
  organizationId,
}: Readonly<PerfilPageClientProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [editing, setEditing] = useState<'profile' | 'integration' | 'payout' | 'fiscal' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useAutoDismissMessage();
  const [individualId, setIndividualId] = useState('');
  const [isLinkingProfile, setIsLinkingProfile] = useState(false);
  const [linkProfileMessage, setLinkProfileMessage] = useState<string | null>(null);

  const { sub = '', email = '', name = '', roles = [] } = userProfile ?? {};

  const { data: individual, isLoading: individualLoading } = useIndividual(individualId);
  const {
    data: organization,
    isLoading: orgLoading,
    isError: orgError,
  } = useOrganizationById(organizationId);
  const { mutateAsync: patchIndividual, isPending: isSaving } = usePatchIndividual();
  const { mutateAsync: patchOrganization, isPending: isSavingOrg } = usePatchOrganization();

  const getOrgCharString = (charName: string): string | undefined =>
    getCharString(organization, charName);
  const integration = parseIntegration(getLatestChar(organization, CHAR_INTEGRATION));

  const indEmail = individual?.contactMedium?.find((cm) => cm.mediumType === 'email')
    ?.characteristic?.emailAddress;
  const indPhone = individual?.contactMedium?.find((cm) => cm.mediumType === 'phone')
    ?.characteristic?.phoneNumber;
  const fiscalTaxId = getIdentification(organization?.organizationIdentification, TAX_ID_TYPE);
  const fiscalAddress = organization?.contactMedium?.find((cm) => cm.mediumType === 'postal')
    ?.characteristic;

  const startEditing = (section: NonNullable<typeof editing>) => {
    setSaveError(null);
    setEditing(section);
  };
  const stopEditing = () => {
    setSaveError(null);
    setEditing(null);
  };
  const noticeFor = (section: NonNullable<typeof editing>): string | null =>
    editing === section ? null : saveSuccess;
  const onSaved = () => {
    setEditing(null);
    setSaveSuccess('Guardado correctamente');
  };
  const onSaveError = (err: unknown) => setSaveError(toSaveErrorMessage(err));

  const handleSaveProfile = async (data: IndividualProfileFormData) => {
    const patch = buildIndividualPatch(data, individual);
    await patchIndividual({ id: individualId, data: patch });
    onSaved();
  };

  const handleLinkProfile = async () => {
    setIsLinkingProfile(true);
    setLinkProfileMessage(null);
    const result = await linkIndividualProfile().catch(
      (): LinkIndividualProfileResult => ({ status: 'error', message: 'Error inesperado.' }),
    );
    setIsLinkingProfile(false);
    if (result.status === 'linked') {
      setIndividualId(result.individual.id);
      return;
    }
    setLinkProfileMessage(getLinkProfileMessage(result));
  };

  const handleSaveIntegration = async (data: IntegrationSettingsFormData) => {
    // Here you define your business logic (shape of the integration characteristic).
    await patchOrganization({
      id: organizationId,
      data: {
        partyCharacteristic: [
          {
            name: CHAR_INTEGRATION,
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
    onSaved();
  };

  const handleSavePayout = async (data: PayoutAccountFormData) => {
    // Here you define your business logic (validate the account with your payment provider first).
    await patchOrganization({
      id: organizationId,
      data: { partyCharacteristic: [{ name: CHAR_PAYOUT_ACCOUNT, value: data.payoutAccountId }] },
    });
    onSaved();
  };

  const handleSaveFiscal = async (data: FiscalDataFormData) => {
    const preserved = (organization?.organizationIdentification ?? []).filter(
      (i) => i.identificationType !== TAX_ID_TYPE,
    );
    await patchOrganization({
      id: organizationId,
      data: {
        name: data.name,
        organizationIdentification: [
          ...preserved,
          { identificationType: TAX_ID_TYPE, identificationId: data.taxId },
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
    onSaved();
  };

  if (!userProfile) {
    return (
      <SectionHeader
        title="Perfil"
        subtitle="No se encontró una sesión activa. Inicia sesión para ver tu perfil."
        className="py-16"
      />
    );
  }

  const orgUnavailable = getOrgNotice(organizationId, orgError);

  const renderOrgSection = (
    content: ReactNode,
  ): ReactNode => {
    if (orgUnavailable) return orgUnavailable;
    if (orgLoading) return <Typography>Cargando...</Typography>;
    return content;
  };

  const canEditOrg = Boolean(organizationId) && !orgLoading && !orgError && editing === null;

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mi perfil"
          subtitle="Consulta y gestiona tu información personal, organización y acceso."
          className="px-4"
        />
      </section>

      <Container className="py-10">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          aria-label="Secciones del perfil"
          onTabChange={(id) => {
            setActiveTab(id as Tab);
            stopEditing();
            setSaveSuccess(null);
            setLinkProfileMessage(null);
          }}
          className="mb-8"
        />

        {activeTab === 'perfil' && (
          <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <Typography color="primary" as="h2" variant="section-title">
                Datos personales
              </Typography>
              {individualId && editing === null && (
                <Button variant="outline" size="sm" onClick={() => startEditing('profile')}>
                  Editar
                </Button>
              )}
            </div>
            <SaveNotice message={noticeFor('profile')} />

            {editing === 'profile' ? (
              <div className="max-w-2xl">
                <div className="mb-4">
                  <MetadataItem icon="Mail" label="Email" value={(indEmail ?? email) || '-'} />
                  <p className="text-xs text-muted-foreground mt-1">
                    El email lo gestiona tu proveedor de identidad y no puede modificarse aquí.
                  </p>
                </div>
                <ErrorNotice message={saveError} />
                <SmartForm<IndividualProfileFormData>
                  schema={individualProfileSchema}
                  fields={EDIT_FIELDS}
                  columns={2}
                  values={{
                    givenName: individual?.givenName ?? name,
                    familyName: individual?.familyName ?? '',
                    title: individual?.title ?? '',
                    gender: individual?.gender ?? '',
                    nationality: individual?.nationality ?? '',
                    birthDate: individual?.birthDate ?? '',
                    phone: indPhone ?? '',
                  }}
                  resetOnSubmit={false}
                  loading={isSaving}
                  onSubmit={handleSaveProfile}
                  onSubmitError={onSaveError}
                  onCancel={stopEditing}
                  renderActions={(props) => <FormActions {...props} />}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {individualLoading ? (
                  <Typography>Cargando...</Typography>
                ) : (
                  <>
                    <PersonalDataView
                      individual={individual}
                      fallbackName={name}
                      email={indEmail ?? email}
                      phone={indPhone}
                      subject={sub}
                    />
                    {!individualId && (
                      <LinkProfileNotice
                        message={linkProfileMessage}
                        isLinking={isLinkingProfile}
                        onLink={handleLinkProfile}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'organizacion' && (
          <div className="space-y-6">
            <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <Typography color="primary" as="h2" variant="section-title">
                  Organización
                </Typography>
                {canEditOrg && (
                  <Button variant="outline" size="sm" onClick={() => startEditing('integration')}>
                    Editar integración
                  </Button>
                )}
              </div>
              <SaveNotice message={noticeFor('integration')} />
              {renderOrgSection(
                editing === 'integration' ? (
                  <div className="max-w-2xl">
                    <div className="mb-6 space-y-3">
                      <MetadataItem
                        icon="Building2"
                        label="Nombre"
                        value={organization?.tradingName ?? organization?.name ?? '-'}
                      />
                    </div>
                    <Typography color="primary" as="h3" variant="section-subtitle" className="mb-1">
                      Integración externa
                    </Typography>
                    <Typography variant="small" color="gray" className="mb-4">
                      Configura el endpoint que recibirá notificaciones cuando un consumidor
                      contrate tus productos.
                    </Typography>
                    {saveError && (
                      <p className="text-sm text-red-600 mb-4" role="alert">
                        {saveError}
                      </p>
                    )}
                    <SmartForm<IntegrationSettingsFormData>
                      schema={integrationSettingsSchema}
                      fields={INTEGRATION_FIELDS}
                      columns={2}
                      defaultValues={integration ?? DEFAULT_INTEGRATION}
                      resetOnSubmit={false}
                      loading={isSavingOrg}
                      onSubmit={handleSaveIntegration}
                      onSubmitError={onSaveError}
                      onCancel={stopEditing}
                      renderActions={(props) => <FormActions {...props} />}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <OrganizationSummary organization={organization} organizationId={organizationId} />
                    <IntegrationView integration={integration} />
                  </div>
                ),
              )}
            </Card>

            <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <Typography color="primary" as="h2" variant="section-title">
                  Datos fiscales
                </Typography>
                {canEditOrg && (
                  <Button variant="outline" size="sm" onClick={() => startEditing('fiscal')}>
                    Editar
                  </Button>
                )}
              </div>
              <SaveNotice message={noticeFor('fiscal')} />
              {renderOrgSection(
                editing === 'fiscal' ? (
                  <div className="max-w-2xl">
                    <ErrorNotice message={saveError} />
                    <SmartForm<FiscalDataFormData>
                      schema={fiscalDataSchema}
                      fields={FISCAL_DATA_FIELDS}
                      columns={2}
                      defaultValues={{
                        name: organization?.name ?? '',
                        taxId: fiscalTaxId?.identificationId ?? '',
                        street1: fiscalAddress?.street1 ?? '',
                        city: fiscalAddress?.city ?? '',
                        postCode: fiscalAddress?.postCode ?? '',
                        country: fiscalAddress?.country ?? '',
                      }}
                      resetOnSubmit={false}
                      loading={isSavingOrg}
                      onSubmit={handleSaveFiscal}
                      onSubmitError={onSaveError}
                      onCancel={stopEditing}
                      renderActions={(props) => <FormActions {...props} />}
                    />
                  </div>
                ) : (
                  <FiscalDataView
                    name={organization?.name}
                    taxId={fiscalTaxId?.identificationId}
                    address={fiscalAddress}
                  />
                ),
              )}
            </Card>

            <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <Typography color="primary" as="h2" variant="section-title">
                  Cobros
                </Typography>
                {canEditOrg && (
                  <Button variant="outline" size="sm" onClick={() => startEditing('payout')}>
                    {getOrgCharString(CHAR_PAYOUT_ACCOUNT) ? 'Cambiar cuenta' : 'Configurar cobros'}
                  </Button>
                )}
              </div>
              <SaveNotice message={noticeFor('payout')} />
              {renderOrgSection(
                editing === 'payout' ? (
                  <div className="max-w-md">
                    <ErrorNotice message={saveError} />
                    <SmartForm<PayoutAccountFormData>
                      schema={payoutAccountSchema}
                      fields={PAYOUT_FIELDS}
                      columns={1}
                      defaultValues={{ payoutAccountId: getOrgCharString(CHAR_PAYOUT_ACCOUNT) ?? '' }}
                      resetOnSubmit={false}
                      loading={isSavingOrg}
                      onSubmit={handleSavePayout}
                      onSubmitError={onSaveError}
                      onCancel={stopEditing}
                      renderActions={(props) => <FormActions {...props} submitLabel="Guardar" />}
                    />
                  </div>
                ) : (
                  <PayoutView
                    enabled={getOrgCharString(CHAR_PAYOUTS_ENABLED) === 'true'}
                    accountId={getOrgCharString(CHAR_PAYOUT_ACCOUNT)}
                  />
                ),
              )}
            </Card>
          </div>
        )}

        {activeTab === 'sesion' && (
          <Card variant="default" size="lg" radius="2xl" className="p-8 md:p-10">
            <Typography color="primary" as="h2" variant="section-title" className="mb-6">
              Información de sesión
            </Typography>
            <SessionTab token={token} roles={roles} />
          </Card>
        )}
      </Container>
    </div>
  );
}
