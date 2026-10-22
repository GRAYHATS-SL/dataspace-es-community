// TMF Party Individual models and associated types
import {
  Characteristic,
  ContactMedium,
  ExternalReference,
  PartyCreditProfile,
  TaxExemptionCertificate,
} from './party';
import type { AttachmentRefOrValue, RelatedParty, TimePeriod } from './shared';

export interface IndividualIdentification {
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

export interface OtherNameIndividual {
  name?: string;
  nameType?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type IndividualStateType = 'initialized' | 'validated' | 'closed';

export interface Disability {
  disabilityCode?: string;
  disabilityName?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface LanguageAbility {
  isFavouriteLanguage?: boolean;
  languageCode?: string;
  languageName?: string;
  listeningProficiency?: string;
  readingProficiency?: string;
  speakingProficiency?: string;
  writingProficiency?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Skill {
  comment?: string;
  evaluatedLevel?: string;
  skillCode?: string;
  skillName?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Individual {
  id: string;
  href?: string;
  aristocraticTitle?: string;
  birthDate?: string;
  countryOfBirth?: string;
  deathDate?: string;
  familyName?: string;
  familyNamePrefix?: string;
  formattedName?: string;
  fullName?: string;
  gender?: string;
  generation?: string;
  givenName?: string;
  legalName?: string;
  location?: string;
  maritalStatus?: string;
  middleName?: string;
  nationality?: string;
  placeOfBirth?: string;
  preferredGivenName?: string;
  title?: string;
  contactMedium?: ContactMedium[];
  creditRating?: PartyCreditProfile[];
  disability?: Disability[];
  externalReference?: ExternalReference[];
  individualIdentification?: IndividualIdentification[];
  languageAbility?: LanguageAbility[];
  otherName?: OtherNameIndividual[];
  partyCharacteristic?: Characteristic[];
  partyCreditProfile?: PartyCreditProfile[];
  relatedParty?: RelatedParty[];
  skill?: Skill[];
  status?: IndividualStateType;
  taxExemptionCertificate?: TaxExemptionCertificate[];
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type NewIndividual = Omit<Individual, 'id' | 'href'>;
