export type BabyLogType = 'feeding' | 'diaper' | 'weight' | 'height' | 'head_circumference';
export type FeedingType = 'bottle' | 'breast';
export type BreastSide = 'left' | 'right' | 'both';

export interface BabyLog {
  id: string;
  logType: BabyLogType;
  feedingType: FeedingType | null;
  feedingDurationMin: number | null;
  feedingMl: number | null;
  breastSide: BreastSide | null;
  diaperWetPct: 25 | 50 | 75 | 100 | null;
  diaperPoop: 'small' | 'large' | null;
  fedBy: string | null;
  note: string | null;
  weightKg: number | null;
  heightCm: number | null;
  headCircumferenceCm: number | null;
  loggedAt: string;
  createdAt: string;
}

export interface CreateBabyLogRequest {
  logType: BabyLogType;
  feedingType?: FeedingType | null;
  feedingDurationMin?: number | null;
  feedingMl?: number | null;
  breastSide?: BreastSide | null;
  diaperWetPct?: 25 | 50 | 75 | 100 | null;
  diaperPoop?: 'small' | 'large' | null;
  fedBy?: string | null;
  note?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  headCircumferenceCm?: number | null;
  loggedAt?: string;
}

export interface UpdateBabyLogRequest {
  feedingType?: FeedingType | null;
  feedingDurationMin?: number | null;
  feedingMl?: number | null;
  breastSide?: BreastSide | null;
  diaperWetPct?: 25 | 50 | 75 | 100 | null;
  diaperPoop?: 'small' | 'large' | null;
  fedBy?: string | null;
  note?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  headCircumferenceCm?: number | null;
  loggedAt?: string;
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Gender = 'male' | 'female';

export interface BabyProfile {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  timeOfBirth: string | null;
  gender: Gender;
  bloodType: BloodType | null;
  placeOfBirth: string | null;
  cityOfBirth: string | null;
  stateOfBirth: string | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  fatherName: string | null;
  motherName: string | null;
  birthWeightKg: number | null;
  birthHeightCm: number | null;
  gestationalWeek: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBabyProfileRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  timeOfBirth?: string | null;
  gender: Gender;
  bloodType?: BloodType | null;
  placeOfBirth?: string | null;
  cityOfBirth?: string | null;
  stateOfBirth?: string | null;
  countryOfBirth?: string | null;
  citizenship?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  birthWeightKg?: number | null;
  birthHeightCm?: number | null;
  gestationalWeek?: number | null;
  note?: string | null;
}

export interface UpdateBabyProfileRequest {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  dateOfBirth?: string;
  timeOfBirth?: string | null;
  gender?: Gender;
  bloodType?: BloodType | null;
  placeOfBirth?: string | null;
  cityOfBirth?: string | null;
  stateOfBirth?: string | null;
  countryOfBirth?: string | null;
  citizenship?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  birthWeightKg?: number | null;
  birthHeightCm?: number | null;
  gestationalWeek?: number | null;
  note?: string | null;
}
