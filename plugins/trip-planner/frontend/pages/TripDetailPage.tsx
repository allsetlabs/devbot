import { useParams } from 'react-router-dom';
import { TripDetail } from '../components/TripDetail';

/**
 * Route-level wrapper for TripDetail — extracts :tripId from the URL params.
 * Mounted at /plugins/trip-planner/:tripId
 */
export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();

  if (!tripId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Trip ID missing from URL
      </div>
    );
  }

  return <TripDetail tripId={tripId} />;
}
