// Lawn Photo types
export interface LawnPhoto {
  id: string;
  profileId: string;
  applicationOrder: number | null;
  fileUrl: string;
  caption: string | null;
  takenAt: string;
  createdAt: string;
}

// Lawn Care types
export type SunExposure = 'full_sun' | 'partial_shade' | 'full_shade';
export type ApplicationMethod = 'spreader' | 'sprayer';

export interface LawnProfile {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  grassType: string;
  sqft: number | null;
  climateZone: string | null;
  sunExposure: SunExposure | null;
  applicationMethod: ApplicationMethod | null;
  equipmentModel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLawnProfileRequest {
  address: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  grassType: string;
  sqft?: number | null;
  climateZone?: string | null;
  sunExposure?: SunExposure | null;
  applicationMethod?: ApplicationMethod | null;
  equipmentModel?: string | null;
  notes?: string | null;
}

export interface UpdateLawnProfileRequest {
  address?: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  grassType?: string;
  sqft?: number | null;
  climateZone?: string | null;
  sunExposure?: SunExposure | null;
  applicationMethod?: ApplicationMethod | null;
  equipmentModel?: string | null;
  notes?: string | null;
}

export interface LawnApplication {
  order: number;
  date: string;
  name: string;
  description: string;
  product: string;
  productUrl: string;
  store: string;
  productCovers: number;
  productPrice: number;
  applicationCost: number;
  howToApply: string;
  walkingPace: string;
  overlap: string;
  amount: string;
  tips: string;
  watering: string;
  warnings: string;
}

export interface LawnPlanData {
  summary: string;
  totalCost: number;
  store: string;
  applications: LawnApplication[];
}

export interface LawnPlan {
  id: string;
  profileId: string;
  chatId: string | null;
  status: 'generating' | 'completed' | 'failed';
  planData: LawnPlanData | null;
  errorMessage: string | null;
  generatedAt: string | null;
  createdAt: string;
}

// Weather types
export interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
}

export interface WeatherDaily {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  weatherCode: number;
}

export interface WeatherTreatment {
  name: string;
  status: 'ready' | 'wait' | 'not_recommended';
  threshold: string;
  message: string;
}

export interface WeatherLocation {
  lat: number;
  lon: number;
  name: string;
}

export interface WeatherData {
  current: WeatherCurrent;
  daily: WeatherDaily[];
  soilTemperature: number;
  treatments: WeatherTreatment[];
  location: WeatherLocation;
  updatedAt: string;
}
