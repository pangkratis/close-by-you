import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ProximityToggle } from '@/components/ProximityToggle';
import { NearbyUsers } from '@/components/NearbyUsers';
import { LocationTracker } from '@/components/LocationTracker';
import { TestUsersButton } from '@/components/TestUsersButton';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Radar } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Radar className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <LocationTracker userId={user.id} onLocationUpdate={setUserLocation} />
      
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
              <Radar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ProximityPro</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TestUsersButton userLocation={userLocation} />
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ProximityToggle userId={user.id} />

        <NearbyUsers currentUserId={user.id} userLocation={userLocation} />

        <div className="text-center space-y-2 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Your location is encrypted and only shared with consenting users nearby
          </p>
          <p className="text-xs text-muted-foreground">
            GPS-based proximity detection • 100m radius • Privacy-first
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
