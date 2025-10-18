import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationTrackerProps {
  userId: string;
  onLocationUpdate: (location: { latitude: number; longitude: number }) => void;
}

export const LocationTracker = ({ userId, onLocationUpdate }: LocationTrackerProps) => {
  const { toast } = useToast();
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    // Check if sharing is enabled
    checkSharingStatus();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [userId]);

  const checkSharingStatus = async () => {
    const { data } = await supabase
      .from('proximity_settings')
      .select('sharing_enabled')
      .eq('user_id', userId)
      .single();

    if (data?.sharing_enabled) {
      startTracking();
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location not supported',
        description: 'Your browser does not support geolocation',
        variant: 'destructive'
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        onLocationUpdate(location);
        updatePresence(location, position.coords.accuracy);
      },
      (error) => {
        console.error('Location error:', error);
        toast({
          title: 'Location error',
          description: 'Failed to get your location',
          variant: 'destructive'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const updatePresence = async (
    location: { latitude: number; longitude: number },
    accuracy: number
  ) => {
    // Generate ephemeral ID (rotates every hour)
    const ephemeralId = `${userId}-${Math.floor(Date.now() / 3600000)}`;

    const { error } = await supabase
      .from('active_presence')
      .upsert({
        user_id: userId,
        ephemeral_id: ephemeralId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy_meters: accuracy,
        last_seen: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating presence:', error);
    }
  };

  return null; // This component doesn't render anything
};
