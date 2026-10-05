import Typography from '@/components/atoms/Typography';
import BadgeList from '@/components/molecules/BadgeList';
import { SummarySection } from '@/components/molecules/FormSummary/SummarySection';
import MetadataItem from '@/components/molecules/MetadataItem';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

import { DATA_FORMATS, ROLE_OPTIONS, SCHEDULING_URL } from './constants';

interface Step5SummaryProps {
  meetingConfirmed: boolean;
  onEditStep: (step: number) => void;
  selectedCountry: { code: string; flag: string; name: string } | undefined;
  selectedUseCase: { label: string; value: string } | undefined;
  watchedData: OnboardingFormData;
}

/** Step5Summary - Onboarding step 5: editable summary of every answer before submitting. */
export function Step5Summary({
  meetingConfirmed,
  onEditStep,
  selectedCountry,
  selectedUseCase,
  watchedData,
}: Readonly<Step5SummaryProps>) {
  return (
    <>
      <div className="space-y-5 sm:space-y-8">
        <div className="mb-4 text-left">
          <Typography as="h2" variant="title" className="mb-1">
            Revisa tu información
          </Typography>
          <Typography variant="small" color="gray">
            Confirma que todos los datos son correctos antes de finalizar el registro.
          </Typography>
        </div>

        <SummarySection
          title="Datos de la organización"
          icon="Building2"
          onEdit={() => onEditStep(1)}
        >
          <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
            <MetadataItem label="Nombre" value={watchedData.organizationName} />
            <MetadataItem
              label="País"
              value={
                selectedCountry
                  ? `${selectedCountry.flag} ${selectedCountry.name}`
                  : watchedData.country
              }
            />
            <MetadataItem
              label="Sitio web"
              value={watchedData.website ? `https://${watchedData.website}` : 'No especificado'}
            />
            <div>
              <MetadataItem
                label="Contacto"
                value={`${watchedData.contactName} ${watchedData.contactPosition ? '(' + watchedData.contactPosition + ')' : ''}`}
              />
              <Typography variant="small" color="gray" className="mt-1 italic">
                {watchedData.contactEmail}
              </Typography>
            </div>
          </div>
        </SummarySection>

        <SummarySection
          title="Rol seleccionado"
          icon="Tag"
          onEdit={() => onEditStep(2)}
          backgroundColor="muted"
        >
          <MetadataItem
            label="Rol"
            value={
              ROLE_OPTIONS.find((r) => r.value === watchedData.role)?.title ||
              watchedData.role ||
              'No especificado'
            }
            icon={ROLE_OPTIONS.find((r) => r.value === watchedData.role)?.icon}
          />
        </SummarySection>

        <SummarySection title="Caso de uso y formatos" icon="Settings" onEdit={() => onEditStep(3)}>
          <div className="space-y-6">
            <MetadataItem
              label="Caso de uso principal"
              value={selectedUseCase?.label || watchedData.useCase || 'No especificado'}
            />
            <div>
              <Typography variant="caption" color="gray" className="mb-2 tracking-wider">
                Formatos de datos
              </Typography>

              <BadgeList
                items={DATA_FORMATS}
                selectedItems={watchedData.dataFormats || []}
                mode="static"
                variant="badge"
              />
            </div>
          </div>
        </SummarySection>

        {SCHEDULING_URL && (
          <SummarySection
            title="Reunión inicial"
            icon="Calendar"
            onEdit={() => onEditStep(4)}
            backgroundColor="muted"
          >
            <MetadataItem
              label="Reunión"
              value={meetingConfirmed ? 'Cita agendada ✓' : 'No programada'}
              icon={meetingConfirmed ? 'CheckCircle' : 'Calendar'}
            />
          </SummarySection>
        )}

        {watchedData.comments && (
          <SummarySection
            title="Comentarios adicionales"
            icon="MessageCircle"
            onEdit={() => onEditStep(4)}
          >
            <Typography variant="body" color="black">
              {watchedData.comments}
            </Typography>
          </SummarySection>
        )}
      </div>

      <div className="mt-5 sm:mt-8 text-center">
        <Typography variant="small" color="gray" className="mx-auto max-w-lg leading-relaxed">
          Al confirmar, tus datos serán enviados para revisión. Recibirás un correo electrónico de
          confirmación con los siguientes pasos.
        </Typography>
      </div>
    </>
  );
}
