'use client';

import RelatedPartyList from '@/components/molecules/RelatedPartyList';
import { useIndividuals } from '@/hooks/queries/useIndividualQueries';
import { useOrganizations } from '@/hooks/queries/usePartyQueries';

export default function PartyPageClient() {
  const { data: actualParties = [], isLoading: loadingOrgs } = useOrganizations();
  const { data: individuals = [], isLoading: loadingIndividuals } = useIndividuals();

  let individualsContent: React.ReactNode;
  if (loadingIndividuals) {
    individualsContent = <p className="text-sm text-gray-500">Cargando individuals...</p>;
  } else if (individuals.length > 0) {
    individualsContent = (
      <ul className="space-y-2">
        {individuals.map((ind) => (
          <li key={ind.id} className="border border-gray-200 rounded p-3">
            <p className="font-medium">{ind.fullName || ind.formattedName || '-'}</p>
            <p className="text-sm text-gray-500">ID: {ind.id}</p>
            {ind.status && <p className="text-sm text-gray-500">Estado: {ind.status}</p>}
            {ind.birthDate && <p className="text-sm text-gray-500">Nacimiento: {ind.birthDate}</p>}
            {ind.contactMedium?.[0]?.characteristic?.emailAddress && (
              <p className="text-sm text-gray-500">
                Email: {ind.contactMedium[0].characteristic.emailAddress}
              </p>
            )}
            {ind.relatedParty && Array.isArray(ind.relatedParty) && ind.relatedParty.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold mb-1">Related Party:</p>
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
        ))}
      </ul>
    );
  } else {
    individualsContent = <p className="text-sm text-gray-500">No se han encontrado individuals.</p>;
  }

  let orgsContent: React.ReactNode;
  if (loadingOrgs) {
    orgsContent = (
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <h2 className="text-xl font-semibold mb-4">Organizaciones en el Espacio de Datos</h2>
        <p className="text-sm text-gray-500">Cargando organizaciones...</p>
      </div>
    );
  } else if (actualParties.length > 0) {
    orgsContent = (
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <h2 className="text-xl font-semibold mb-4">Organizaciones en el Espacio de Datos</h2>
        <ul className="space-y-2">
          {actualParties.map((party) => (
            <li key={party.id} className="border border-gray-200 rounded p-3">
              <p className="font-medium">{party.name}</p>
              <p className="text-sm text-gray-500">ID: {party.id}</p>
              {party.tradingName && (
                <p className="text-sm text-gray-500">Trading name: {party.tradingName}</p>
              )}
              {party.organizationType && (
                <p className="text-sm text-gray-500">Tipo: {party.organizationType}</p>
              )}
              {party.status && <p className="text-sm text-gray-500">Estado: {party.status}</p>}
              {typeof party.isHeadOffice === 'boolean' && (
                <p className="text-sm text-gray-500">
                  Head office: {party.isHeadOffice ? 'sí' : 'no'}
                </p>
              )}
              {typeof party.isLegalEntity === 'boolean' && (
                <p className="text-sm text-gray-500">
                  Entidad legal: {party.isLegalEntity ? 'sí' : 'no'}
                </p>
              )}
              {party.href && <p className="text-xs text-gray-400">href: {party.href}</p>}
              {party.partyCharacteristic &&
                Array.isArray(party.partyCharacteristic) &&
                party.partyCharacteristic.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-1">Características:</p>
                    <ul className="pl-4 list-disc text-xs">
                      {party.partyCharacteristic.map((char) => (
                        <li key={char.name}>
                          <span className="font-semibold">{char.name}:</span>{' '}
                          {typeof char.value === 'object' && char.value !== null ? (
                            <pre className="inline whitespace-pre-wrap">
                              {JSON.stringify(char.value, null, 2)}
                            </pre>
                          ) : (
                            <span>{String(char.value)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              <RelatedPartyList value={party.relatedParty} />
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    orgsContent = (
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <h2 className="text-xl font-semibold mb-4">Organizaciones en el Espacio de Datos</h2>
        <p className="text-sm text-gray-500">No se han encontrado organizaciones.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <h2 className="text-xl font-semibold mb-4">Individuals existentes</h2>
        {individualsContent}
      </div>
      {orgsContent}
    </div>
  );
}
