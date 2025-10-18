import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TestUsersButtonProps {
  userLocation: { latitude: number; longitude: number } | null;
}

export const TestUsersButton = ({ userLocation }: TestUsersButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const createTestUsers = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-test-users', {
        body: {
          userLatitude: userLocation?.latitude,
          userLongitude: userLocation?.longitude
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Test users created!',
        description: `${data.users.length} test users are now active nearby. Refresh to see them.`
      });

      setOpen(false);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error creating test users:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create test users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          Create Test Users
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Test Users</DialogTitle>
          <DialogDescription>
            This will create 4 test users at different distances from your location:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">TestUser1</p>
            <p className="text-xs text-muted-foreground">~30 meters away</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">TestUser2</p>
            <p className="text-xs text-muted-foreground">~65 meters away</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">TestUser3</p>
            <p className="text-xs text-muted-foreground">~90 meters away</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">TestUser4</p>
            <p className="text-xs text-muted-foreground">~200 meters away (outside range)</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
          <p className="text-sm font-medium mb-2">Test Credentials:</p>
          <p className="text-xs text-muted-foreground">
            Email: test.user[1-4]@proximity.app<br />
            Password: testpass123
          </p>
        </div>

        <Button 
          onClick={createTestUsers} 
          disabled={loading || !userLocation}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating test users...
            </>
          ) : (
            'Create Test Users'
          )}
        </Button>

        {!userLocation && (
          <p className="text-xs text-destructive text-center">
            Enable location sharing first to create test users near you
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
