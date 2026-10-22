import Icon from '@/components/atoms/Icon';
import Input from '@/components/atoms/Input';
import Dropdown from '@/components/molecules/Dropdown';

/**
 * SearchBar - Search bar with text field and distribution filters
 *
 * @example
 * <SearchBar
 *   searchTerm={query}
 *   onSearchChange={setQuery}
 *   distributionFilters={filters}
 *   onDistributionFiltersChange={setFilters}
 * />
 */

interface SearchBarProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  // New props for distribution filter
  distributionFilters?: string[];
  onDistributionFiltersChange?: (filters: string[]) => void;
}

// Distribution options
const distributionOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'api', label: 'API' },
  { value: 'xml', label: 'XML' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'geojson', label: 'GeoJSON' },
  { value: 'kml', label: 'KML' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'rest', label: 'REST API' },
];

export default function SearchBar({
  searchTerm = '',
  onSearchChange,
  placeholder = 'Buscar datasets, proveedores o categorías...',
  distributionFilters = [],
  onDistributionFiltersChange,
}: Readonly<SearchBarProps>) {
  return (
    <form
      role="search"
      className="flex flex-col gap-4 md:flex-row"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative flex-1">
        <Icon
          name="Search"
          size={20}
          aria-hidden="true"
          className="text-gray-light absolute top-1/2 left-4 -translate-y-1/2"
        />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-12 rounded-full"
          size="lg"
        />
      </div>

      {/* Distribution Filter Dropdown */}
      <Dropdown
        options={distributionOptions}
        value={distributionFilters}
        onSelectionChange={onDistributionFiltersChange}
        label="Formato"
        placeholder="Todos los formatos"
      />
    </form>
  );
}
