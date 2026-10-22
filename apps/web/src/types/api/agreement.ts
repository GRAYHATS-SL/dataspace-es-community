import type { RelatedParty } from './shared';

export interface AgreementTermOrCondition {
  id?: string;
  description?: string;
}

export interface AgreementProductRef {
  id: string;
  href?: string;
  name?: string;
}

export interface AgreementItem {
  productOffering?: AgreementProductRef[];
  product?: AgreementProductRef[];
  termOrCondition?: AgreementTermOrCondition[];
}

export interface AgreementCharacteristic {
  name: string;
  value: string;
  valueType?: string;
}

export interface Agreement {
  id?: string;
  href?: string;
  name: string;
  agreementType: string;
  description?: string;
  status?: string;
  initialDate?: string;
  version?: string;
  statementOfIntent?: string;
  engagedParty: RelatedParty[];
  agreementItem: AgreementItem[];
  characteristic?: AgreementCharacteristic[];
}

export type NewAgreement = Omit<Agreement, 'id' | 'href' | 'version'>;
