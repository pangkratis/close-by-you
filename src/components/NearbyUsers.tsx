import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Ban, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface NearbyUser {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  distance?: number;
  profile?: Profile;
}

export const NearbyUsers = ({ currentUserId, userLocation }: { 
  currentUserId: string;
  userLocation: { latitude: number; longitude: number } | null;
}) => {
  const { toast } = useToast();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLocation) return;
    
    fetchNearbyUsers();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('nearby-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_presence'
        },
        () => {
          fetchNearbyUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation]);

  const fetchNearbyUsers = async () => {
    if (!userLocation) return;

    const { data: presenceData, error: presenceError } = await supabase
      .from('active_presence')
      .select('*')
      .neq('user_id', currentUserId);

    if (presenceData && !presenceError) {
      // Fetch profiles separately
      const userIds = presenceData.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      // Calculate distances and combine with profiles
      const usersWithDistance = presenceData.map(user => {
        const profile = profilesData?.find(p => p.id === user.user_id);
        return {
          ...user,
          profile,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            user.latitude,
            user.longitude
          )
        };
      })
      .filter(user => user.distance && user.distance <= 100)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setNearbyUsers(usersWithDistance);
    }
    setLoading(false);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleBlock = async (userId: string) => {
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: currentUserId, blocked_id: userId });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to block user',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'User blocked',
        description: 'This user will no longer appear in your nearby list'
      });
      fetchNearbyUsers();
    }
  };

  const handleReport = async (userId: string) => {
    const { error } = await supabase
      .from('reports')
      .insert({ 
        reporter_id: currentUserId, 
        reported_id: userId,
        reason: 'Reported from nearby users list'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to report user',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep the community safe'
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading nearby users...</div>
      </Card>
    );
  }

  if (!userLocation) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Enable location sharing to see nearby users
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4 border-border/50 shadow-soft">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        Nearby Users ({nearbyUsers.length})
      </h3>

      {nearbyUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No users nearby within 100 meters
        </p>
      ) : (
        <div className="space-y-3">
          {nearbyUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {user.profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.profile?.username || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(user.distance || 0)}m away
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReport(user.user_id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Flag className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleBlock(user.user_id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Ban className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
