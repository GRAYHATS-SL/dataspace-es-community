import countriesData from '@/data/countries.json';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

export const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? '';

export const STEP_VALIDATION_FIELDS: Record<number, (keyof OnboardingFormData)[]> = {
  1: ['organizationName', 'country', 'contactName', 'contactEmail', 'contactPhone'],
  2: ['role'],
  3: [],
  4: ['acceptTerms', 'acceptPrivacy', 'acceptProcessing'],
  5: [],
};

export const STEP_LABELS = [
  'Datos de la Organización',
  'Rol en el Espacio de Datos',
  'Caso de Uso',
  'Aceptaciones y Cita',
  'Resumen y Confirmación',
];

export const COUNTRIES = countriesData
  .map((country) => ({
    value: country.code.toLowerCase(),
    label: `${country.flag} ${country.name}`,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));

export const USE_CASES = [
  { value: 'analysis', label: 'Análisis de Datos & Business Intelligence' },
  { value: 'ml', label: 'Machine Learning & Modelado Predictivo' },
  { value: 'reporting', label: 'Automatización de Reportes' },
  { value: 'archiving', label: 'Almacenamiento y Backup' },
  { value: 'dev', label: 'Desarrollo de Aplicaciones' },
];

export const ROLE_OPTIONS = [
  {
    value: 'consumer',
    title: 'Consumidor de datos/servicios',
    description: 'Accede, descarga y utiliza recursos compartidos por otros participantes.',
    icon: 'Download' as const,
  },
  {
    value: 'producer',
    title: 'Productor de datos/servicios',
    description: 'Publica, gestiona tus propios recursos en el catálogo global.',
    icon: 'Upload' as const,
  },
  {
    value: 'both',
    title: 'Ambos',
    description: 'Capacidad total para participar como proveedor y consumidor de recursos.',
    icon: 'ArrowLeftRight' as const,
  },
];

export const DATA_FORMATS = [
  { id: 'json', label: 'JSON' },
  { id: 'csv', label: 'CSV' },
  { id: 'xml', label: 'XML' },
  { id: 'rest-api', label: 'REST API' },
  { id: 'parquet', label: 'Parquet' },
  { id: 'sql', label: 'SQL' },
  { id: 'graphql', label: 'GraphQL' },
];
