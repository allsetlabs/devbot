import { useQuery } from '@tanstack/react-query';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
} from 'lucide-react';
import { lawnCareApi } from '@devbot/plugin-lawn-care/frontend/api';
import type { WeatherData, WeatherTreatment } from '@devbot/plugin-lawn-care/frontend/types';

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 2) return <CloudSun className={className} />;
  if (code <= 3) return <Cloud className={className} />;
  if (code <= 48) return <CloudFog className={className} />;
  if (code <= 67) return <CloudRain className={className} />;
  if (code <= 86) return <CloudSnow className={className} />;
  return <CloudLightning className={className} />;
}

const STATUS_STYLES = {
  ready: { bg: 'bg-success/10 border-success/20', text: 'text-success', Icon: CheckCircle },
  wait: { bg: 'bg-warning/10 border-warning/20', text: 'text-warning', Icon: Clock },
  not_recommended: { bg: 'bg-muted border-border', text: 'text-muted-foreground', Icon: XCircle },
} as const;

function TreatmentBadge({ treatment }: { treatment: WeatherTreatment }) {
  const style = STATUS_STYLES[treatment.status];
  return (
    <div
      className={`flex min-w-[90px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${style.bg}`}
    >
      <style.Icon className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
      <div>
        <p className={`text-xs font-medium ${style.text}`}>{treatment.name}</p>
        <p className="text-[10px] text-muted-foreground">{treatment.threshold}</p>
      </div>
    </div>
  );
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function soilTempColor(temp: number): string {
  if (temp >= 65) return 'text-success';
  if (temp >= 50) return 'text-warning';
  return 'text-primary';
}

interface WeatherDashboardProps {
  zipCode: string;
  grassType: string;
  locationName?: string;
}

export function WeatherDashboard({ zipCode, grassType, locationName }: WeatherDashboardProps) {
  const {
    data: weather,
    isLoading,
    error,
  } = useQuery<WeatherData>({
    queryKey: ['weather', zipCode, grassType],
    queryFn: () => lawnCareApi.getWeather(zipCode, grassType),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mb-4 animate-pulse rounded-xl border border-border bg-card p-4">
        <div className="h-24 rounded bg-muted" />
      </div>
    );
  }

  if (error || !weather) return null;

  const { current, daily, soilTemperature, treatments } = weather;
  const soilColor = soilTempColor(soilTemperature);

  return (
    <div className="mb-4 space-y-3">
      {/* Current Conditions + Soil Temp */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WeatherIcon code={current.weatherCode} className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(current.temperature)}&deg;F
              </p>
              <p className="text-sm text-muted-foreground">
                {getWeatherDescription(current.weatherCode)}
              </p>
              {locationName && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {locationName}
                </p>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center justify-end gap-1">
              <Thermometer className="h-3.5 w-3.5" />
              <span>Feels {Math.round(current.feelsLike)}&deg;</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Wind className="h-3.5 w-3.5" />
              <span>{Math.round(current.windSpeed)} mph</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Droplets className="h-3.5 w-3.5" />
              <span>{current.humidity}%</span>
            </div>
          </div>
        </div>

        {/* Soil Temperature */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Thermometer className={`h-5 w-5 ${soilColor}`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              Soil: <span className={soilColor}>{Math.round(soilTemperature)}&deg;F</span>
            </p>
            <p className="text-xs text-muted-foreground">at 2-inch depth</p>
          </div>
        </div>
      </div>

      {/* Treatment Readiness */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {treatments.map((t) => (
          <TreatmentBadge key={t.name} treatment={t} />
        ))}
      </div>

      {/* 7-Day Forecast */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-3">
        {daily.map((day) => (
          <div key={day.date} className="flex min-w-[48px] flex-1 flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground">{formatDay(day.date)}</p>
            <WeatherIcon code={day.weatherCode} className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">{Math.round(day.tempMax)}&deg;</p>
            <p className="text-xs text-muted-foreground">{Math.round(day.tempMin)}&deg;</p>
          </div>
        ))}
      </div>
    </div>
  );
}
