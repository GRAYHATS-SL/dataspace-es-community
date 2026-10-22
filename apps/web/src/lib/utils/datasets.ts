import { getOwn } from '@/lib/utils/getOwn';
import { CatalogDataset } from '@/types/data';

/** Filters datasets by search term and distribution formats. */
function normalizeFormat(format: string) {
  return format.trim().toLowerCase();
}

export function filterDatasets(
  datasets: CatalogDataset[],
  searchTerm: string,
  distributionFilters: string[],
): CatalogDataset[] {
  const term = searchTerm.trim().toLowerCase();

  // Mapping of equivalent formats
  const formatMap: Record<string, string[]> = {
    rest: ['rest', 'rest api', 'api'],
    json: ['json'],
    csv: ['csv'],
    xml: ['xml'],
    xlsx: ['xlsx'],
    geojson: ['geojson'],
    kml: ['kml'],
    mqtt: ['mqtt'],
  };

  function matchesDistribution(datasetDistribution: string, filters: string[]) {
    const distNorm = normalizeFormat(datasetDistribution);
    return filters.some((filter) => {
      const normFilter = normalizeFormat(filter);
      const mapped = getOwn(formatMap, normFilter) || [normFilter];
      return mapped.some((f) => distNorm.includes(f));
    });
  }

  return datasets.filter((dataset) => {
    if (!dataset.distribution) return false;
    const matchesSearch =
      !term ||
      dataset.title.toLowerCase().includes(term) ||
      dataset.description.toLowerCase().includes(term) ||
      dataset.publisher.toLowerCase().includes(term);

    const matchesDist =
      distributionFilters.length === 0 ||
      matchesDistribution(dataset.distribution, distributionFilters);

    return matchesSearch && matchesDist;
  });
}
