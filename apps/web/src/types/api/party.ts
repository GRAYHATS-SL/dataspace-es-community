import type { AttachmentRefOrValue, EntityRef, RelatedParty, TimePeriod } from './shared';

/** Details of a contact medium (email, phone, postal address...). */
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

/** Way to contact a party. */
export interface ContactMedium {
  mediumType?: string;
  preferred?: boolean;
  characteristic?: MediumCharacteristic;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Credit profile of a party. */
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

/** External reference of a party. */
export interface ExternalReference {
  externalReferenceType?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Reference to an Organization. */
export type OrganizationRef = EntityRef;

/** Child relationship of an organization. */
export interface OrganizationChildRelationship {
  relationshipType?: string;
  organization?: OrganizationRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Official identification of an organization. */
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

/** Parent relationship of an organization. */
export interface OrganizationParentRelationship {
  relationshipType?: string;
  organization?: OrganizationRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Alternative name of an organization. */
export interface OtherNameOrganization {
  name?: string;
  nameType?: string;
  tradingName?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Name/value characteristic of a party. */
export interface Characteristic {
  name: string;
  valueType?: string;
  value: string | number | boolean | object;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** TMF632 Organization state. */
export type OrganizationStateType = 'initialized' | 'validated' | 'closed';

/** Tax definition covered by an exemption certificate. */
export interface TaxDefinition {
  id?: string;
  name?: string;
  taxType?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

/** Tax exemption certificate of a party. */
export interface TaxExemptionCertificate {
  id?: string;
  attachment?: AttachmentRefOrValue;
  taxDefinition?: TaxDefinition[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** TMF632 Organization. */
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

/** Create payload for an Organization (without server-generated fields). */
export type NewOrganization = Omit<Organization, 'id' | 'href'>;
