import { describe, expect, it } from 'vitest';

import { classifyDataQuality, computeOverallDataQualityScore } from '@/lib/utils/dataQuality';

describe('classifyDataQuality', () => {
  it.each([
    [0, 'deficiente'],
    [19.9, 'deficiente'],
    [20, 'insuficiente'],
    [39.9, 'insuficiente'],
    [40, 'buena'],
    [64.9, 'buena'],
    [65, 'muyBuena'],
    [89.9, 'muyBuena'],
    [90, 'excelente'],
    [100, 'excelente'],
  ])('clasifica %s como %s', (score, expectedKey) => {
    expect(classifyDataQuality(score).key).toBe(expectedKey);
  });

  it('recorta valores fuera de rango antes de clasificar', () => {
    expect(classifyDataQuality(-10).key).toBe('deficiente');
    expect(classifyDataQuality(150).key).toBe('excelente');
  });
});

describe('computeOverallDataQualityScore', () => {
  it('devuelve la media de las dimensiones presentes', () => {
    const score = computeOverallDataQualityScore({
      accuracy: 80,
      completeness: 60,
      consistency: 100,
      credibility: 40,
      timeliness: 20,
    });
    expect(score).toBe(60);
  });

  it('ignora dimensiones ausentes en el promedio', () => {
    const score = computeOverallDataQualityScore({ accuracy: 50, completeness: 100 });
    expect(score).toBe(75);
  });

  it('devuelve null si no hay ninguna dimensión informada', () => {
    expect(computeOverallDataQualityScore({})).toBeNull();
  });
});
