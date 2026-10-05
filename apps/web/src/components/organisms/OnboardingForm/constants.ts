import type { ValidIconName } from '@/components/atoms/Icon';
import countriesData from '@/data/countries.json';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

/** External scheduling widget URL (iframe). The scheduling block is hidden when unset. */
export const SCHEDULING_URL: string = process.env.NEXT_PUBLIC_SCHEDULING_URL ?? '';

/** Fields validated before leaving each step. */
export const STEP_VALIDATION_FIELDS: Record<number, (keyof OnboardingFormData)[]> = {
  1: ['organizationName', 'country', 'contactName', 'contactEmail', 'contactPhone'],
  2: ['role'],
  3: [],
  4: ['acceptTerms', 'acceptPrivacy', 'acceptProcessing'],
  5: [],
};

/** Labels of the wizard steps, in order. */
export const STEP_LABELS: string[] = [
  'Datos de la organización',
  'Rol en la plataforma',
  'Caso de uso',
  'Aceptaciones y cita',
  'Resumen y confirmación',
];

/** Country options for the country select. */
export const COUNTRIES: { value: string; label: string }[] = countriesData
  .map((country) => ({
    value: country.code.toLowerCase(),
    label: `${country.flag} ${country.name}`,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));

/** Use-case options. */
export const USE_CASES: { value: string; label: string }[] = [
  // Here you define your business logic (use cases relevant to your platform).
  { value: 'analysis', label: 'Análisis de datos' },
  { value: 'ml', label: 'Modelado predictivo' },
  { value: 'reporting', label: 'Automatización de informes' },
  { value: 'dev', label: 'Desarrollo de aplicaciones' },
];

/** Role options of step 2. */
export const ROLE_OPTIONS: { value: string; title: string; description: string; icon: ValidIconName }[] = [
  // Here you define your business logic (roles offered at registration).
  {
    value: 'consumer',
    title: 'Consumidor',
    description: 'Descubre y utiliza productos y servicios publicados por otros participantes.',
    icon: 'Download',
  },
  {
    value: 'producer',
    title: 'Proveedor',
    description: 'Publica y gestiona tus propios productos y servicios en el catálogo.',
    icon: 'Upload',
  },
  {
    value: 'both',
    title: 'Ambos',
    description: 'Participa como proveedor y como consumidor.',
    icon: 'ArrowLeftRight',
  },
];

/** Data format options of step 3. */
export const DATA_FORMATS: { id: string; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'csv', label: 'CSV' },
  { id: 'xml', label: 'XML' },
  { id: 'rest-api', label: 'REST API' },
  { id: 'sql', label: 'SQL' },
];
