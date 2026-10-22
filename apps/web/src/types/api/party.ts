// TMF Party (Organization) models and specific subtypes

import type { AttachmentRefOrValue, RelatedParty, TimePeriod } from './shared';

export interface MediumCharacteristic {
  city?: string;
  contactType?: string;
  country?: string;
  emailAddress?: string;
  faxNumber?: string;
  phoneNumber?: string;
  postCode?: string;
  socialNetworkId?: string;
  stateOrProvince?: string;
  street1?: string;
  street2?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ContactMedium {
  mediumType?: string;
  preferred?: boolean;
  characteristic?: MediumCharacteristic;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface PartyCreditProfile {
  creditAgencyName?: string;
  creditAgencyType?: string;
  ratingReference?: string;
  ratingScore?: number;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ExternalReference {
  externalReferenceType?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface OrganizationRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface OrganizationChildRelationship {
  relationshipType?: string;
  organization?: OrganizationRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface OrganizationIdentification {
  identificationId?: string;
  identificationType?: string;
  issuingAuthority?: string;
  issuingDate?: string;
  attachment?: AttachmentRefOrValue;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface OrganizationParentRelationship {
  relationshipType?: string;
  organization?: OrganizationRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface OtherNameOrganization {
  name?: string;
  nameType?: string;
  tradingName?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Characteristic {
  name: string;
  valueType?: string;
  value: string | number | boolean | object;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type OrganizationStateType = 'initialized' | 'validated' | 'closed';

export interface TaxDefinition {
  id?: string;
  name?: string;
  taxType?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface TaxExemptionCertificate {
  id?: string;
  attachment?: AttachmentRefOrValue;
  taxDefinition?: TaxDefinition[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Organization {
  id: string;
  href?: string;
  isHeadOffice?: boolean;
  isLegalEntity?: boolean;
  name?: string;
  nameType?: string;
  organizationType?: string;
  tradingName?: string;
  contactMedium?: ContactMedium[];
  creditRating?: PartyCreditProfile[];
  existsDuring?: TimePeriod;
  externalReference?: ExternalReference[];
  organizationChildRelationship?: OrganizationChildRelationship[];
  organizationIdentification?: OrganizationIdentification[];
  organizationParentRelationship?: OrganizationParentRelationship;
  otherName?: OtherNameOrganization[];
  partyCharacteristic?: Characteristic[];
  relatedParty?: RelatedParty[];
  status?: OrganizationStateType;
  taxExemptionCertificate?: TaxExemptionCertificate[];
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type NewOrganization = Omit<Organization, 'id' | 'href'>;
