export const DATA_QUALITY_DIMENSIONS = [
  { key: 'accuracy', label: 'Exactitud' },
  { key: 'completeness', label: 'Completitud' },
  { key: 'consistency', label: 'Consistencia' },
  { key: 'credibility', label: 'Credibilidad' },
  { key: 'timeliness', label: 'Actualidad' },
] as const;

export type DataQualityDimensionKey = (typeof DATA_QUALITY_DIMENSIONS)[number]['key'];

export type DataQualityScores = Partial<Record<DataQualityDimensionKey, number>>;

export type DataQualityCategory =
  | 'deficiente'
  | 'insuficiente'
  | 'buena'
  | 'muyBuena'
  | 'excelente';

interface DataQualityCategoryInfo {
  key: DataQualityCategory;
  label: string;
  minScore: number;
  maxScore: number;
  colorClassName: string;
}

// Bands per the UNE/ISO data quality standard: [min, max) except "excellent", which includes 100.
export const DATA_QUALITY_CATEGORIES: DataQualityCategoryInfo[] = [
  {
    key: 'deficiente',
    label: 'Deficiente',
    minScore: 0,
    maxScore: 20,
    colorClassName: 'border-red-300 bg-red-50 text-red-700',
  },
  {
    key: 'insuficiente',
    label: 'Insuficiente',
    minScore: 20,
    maxScore: 40,
    colorClassName: 'border-orange-300 bg-orange-50 text-orange-700',
  },
  {
    key: 'buena',
    label: 'Buena',
    minScore: 40,
    maxScore: 65,
    colorClassName: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  },
  {
    key: 'muyBuena',
    label: 'Muy buena',
    minScore: 65,
    maxScore: 90,
    colorClassName: 'border-lime-300 bg-lime-50 text-lime-700',
  },
  {
    key: 'excelente',
    label: 'Excelente',
    minScore: 90,
    maxScore: 100,
    colorClassName: 'border-green-300 bg-green-50 text-green-700',
  },
];

export const classifyDataQuality = (score: number): DataQualityCategoryInfo => {
  const clamped = Math.min(100, Math.max(0, score));
  const category = DATA_QUALITY_CATEGORIES.find(
    (c) => clamped >= c.minScore && (clamped < c.maxScore || c.maxScore === 100),
  );
  return category ?? DATA_QUALITY_CATEGORIES[0];
};

export const computeOverallDataQualityScore = (scores: DataQualityScores): number | null => {
  const values = DATA_QUALITY_DIMENSIONS.map((d) => scores[d.key]).filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v),
  );
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};
