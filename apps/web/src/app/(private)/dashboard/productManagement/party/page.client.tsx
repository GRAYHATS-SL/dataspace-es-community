'use client';

import { type ReactNode, useState } from 'react';

import RelatedPartyList from '@/components/molecules/RelatedPartyList';
import { useIndividuals, useOrganizations } from '@/hooks/queries';
import type { Individual, Organization } from '@/types/api';

const formatCharacteristicValue = (value: unknown): ReactNode =>
  typeof value === 'object' && value !== null ? (
    <pre className="inline whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
  ) : (
    <span>{String(value)}</span>
  );

function IndividualItem({ ind }: Readonly<{ ind: Individual }>) {
  const email = ind.contactMedium?.[0]?.characteristic?.emailAddress;
  return (
    <li className="border border-gray-200 rounded p-3">
      <p className="font-medium">{ind.fullName || ind.formattedName || '-'}</p>
      <p className="text-sm text-gray-500">ID: {ind.id}</p>
      {ind.status && <p className="text-sm text-gray-500">Estado: {ind.status}</p>}
      {ind.birthDate && <p className="text-sm text-gray-500">Nacimiento: {ind.birthDate}</p>}
      {email && <p className="text-sm text-gray-500">Email: {email}</p>}
      {ind.relatedParty && ind.relatedParty.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold mb-1">Parte relacionada:</p>
          <ul className="pl-4 list-disc text-xs">
            {ind.relatedParty.map((rp) => (
              <li key={rp.id ?? rp.href}>
                {rp['@referredType']}: {rp.id}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function OrganizationItem({ party }: Readonly<{ party: Organization }>) {
  return (
    <li className="border border-gray-200 rounded p-3">
      <p className="font-medium">{party.name}</p>
      <p className="text-sm text-gray-500">ID: {party.id}</p>
      {party.tradingName && (
        <p className="text-sm text-gray-500">Nombre comercial: {party.tradingName}</p>
      )}
      {party.organizationType && (
        <p className="text-sm text-gray-500">Tipo: {party.organizationType}</p>
      )}
      {party.status && <p className="text-sm text-gray-500">Estado: {party.status}</p>}
      {typeof party.isHeadOffice === 'boolean' && (
        <p className="text-sm text-gray-500">Sede central: {party.isHeadOffice ? 'sí' : 'no'}</p>
      )}
      {typeof party.isLegalEntity === 'boolean' && (
        <p className="text-sm text-gray-500">Entidad legal: {party.isLegalEntity ? 'sí' : 'no'}</p>
      )}
      {party.href && <p className="text-xs text-gray-400">href: {party.href}</p>}
      {party.partyCharacteristic && party.partyCharacteristic.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold mb-1">Características:</p>
          <ul className="pl-4 list-disc text-xs">
            {party.partyCharacteristic.map((char) => (
              <li key={char.name}>
                <span className="font-semibold">{char.name}:</span>{' '}
                {formatCharacteristicValue(char.value)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <RelatedPartyList value={party.relatedParty} />
    </li>
  );
}

function ListSection<T extends { id?: string }>({
  title,
  query,
  emptyLabel,
  renderItem,
}: Readonly<{
  title: string;
  query: { data?: T[]; isLoading: boolean; isError: boolean };
  emptyLabel: string;
  renderItem: (item: T) => ReactNode;
}>) {
  const items = query.data ?? [];
  let content: ReactNode;
  if (query.isLoading) content = <p className="text-sm text-gray-500">Cargando…</p>;
  else if (query.isError)
    content = <p className="text-sm text-danger" role="alert">No se pudieron cargar los datos.</p>;
  else if (items.length === 0) content = <p className="text-sm text-gray-500">{emptyLabel}</p>;
  else content = <ul className="space-y-2">{items.map(renderItem)}</ul>;

  return (
    <div className="mx-auto mb-12 max-w-4xl px-4">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {content}
    </div>
  );
}

/** Internal view listing individuals and organizations, with a demo-provider action. */
export default function PartyPageClient() {
  const [message, setMessage] = useState<string | null>(null);
  const organizationsQuery = useOrganizations();
  const individualsQuery = useIndividuals();

  const handleCreateDemoProvider = () => {
    setMessage(null);
    // Here you define your business logic (create a demo provider organization and report the result).
    setMessage('La creación de proveedores de prueba no está configurada.');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="my-8 flex flex-col items-center">
        <button
          type="button"
          onClick={handleCreateDemoProvider}
          className="rounded bg-neutral-700 px-6 py-2 text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          Crear proveedor de prueba
        </button>
        {message && (
          <div className="mt-2 text-sm text-gray-700" role="status">
            {message}
          </div>
        )}
      </div>
      <ListSection<Individual>
        title="Individuos existentes"
        query={individualsQuery}
        emptyLabel="No se han encontrado individuos."
        renderItem={(ind) => <IndividualItem key={ind.id} ind={ind} />}
      />
      <ListSection<Organization>
        title="Organizaciones"
        query={organizationsQuery}
        emptyLabel="No se han encontrado organizaciones."
        renderItem={(party) => <OrganizationItem key={party.id} party={party} />}
      />
    </div>
  );
}
