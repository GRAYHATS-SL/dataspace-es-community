import type { EntityRef, RelatedParty, TimePeriod } from './shared';

/** Term or condition of an agreement item. */
export interface AgreementTermOrCondition {
  id?: string;
  description?: string;
  validFor?: TimePeriod;
}

/** Item of an agreement (offerings/products it covers and its terms). */
export interface AgreementItem {
  productOffering?: EntityRef[];
  product?: EntityRef[];
  termOrCondition?: AgreementTermOrCondition[];
}

/** Name/value characteristic of an agreement. */
export interface AgreementCharacteristic {
  name: string;
  value: string;
  valueType?: string;
}

/** TMF651 Agreement. */
export interface Agreement {
  id?: string;
  href?: string;
  name: string;
  agreementType: string;
  description?: string;
  status?: string;
  initialDate?: string;
  completionDate?: TimePeriod;
  agreementPeriod?: TimePeriod;
  version?: string;
  statementOfIntent?: string;
  engagedParty: RelatedParty[];
  agreementItem: AgreementItem[];
  characteristic?: AgreementCharacteristic[];
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for an Agreement (without server-generated fields). */
export type NewAgreement = Omit<Agreement, 'id' | 'href' | 'version'>;
