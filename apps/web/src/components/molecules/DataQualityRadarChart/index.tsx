'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import Typography from '@/components/atoms/Typography';
import { DATA_QUALITY_DIMENSIONS, type DataQualityScores } from '@/lib/utils/dataQuality';

export interface DataQualityRadarChartProps {
  scores: DataQualityScores;
  height?: number;
}

/**
 * DataQualityRadarChart - Radar chart of the data quality dimensions
 *
 * @param {DataQualityScores} scores - Scores per dimension.
 * @param {number} [height=280] - Chart height in pixels.
 * @returns {React.ReactElement} The radar, or a "no data" message if all scores are 0.
 */
const DataQualityRadarChart = ({ scores, height = 280 }: Readonly<DataQualityRadarChartProps>) => {
  const data = DATA_QUALITY_DIMENSIONS.map((d) => ({
    dimension: d.label,
    value: scores[d.key] ?? 0,
  }));

  const hasAnyValue = data.some((d) => d.value > 0);

  if (!hasAnyValue) {
    return (
      <Typography variant="small" color="gray">
        Sin datos de calidad disponibles para esta oferta.
      </Typography>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="Calidad"
          dataKey="value"
          stroke="var(--color-primary)"
          fill="var(--color-primary)"
          fillOpacity={0.35}
        />
        <Tooltip formatter={(value) => `${value}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default DataQualityRadarChart;
