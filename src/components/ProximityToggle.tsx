import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Radar, Shield, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProximitySetting {
  sharing_enabled: boolean;
  visibility: 'off' | 'everyone' | 'contacts' | 'groups';
  session_expires_at: string | null;
}

export const ProximityToggle = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ProximitySetting>({
    sharing_enabled: false,
    visibility: 'off',
    session_expires_at: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('proximity_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      setSettings(data);
    }
  };

  const updateSettings = async (updates: Partial<ProximitySetting>) => {
    setLoading(true);
    const { error } = await supabase
      .from('proximity_settings')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
    } else {
      setSettings({ ...settings, ...updates });
      toast({
        title: 'Settings updated',
        description: 'Your proximity settings have been saved'
      });
    }
    setLoading(false);
  };

  const handleToggleSharing = async (enabled: boolean) => {
    if (enabled && settings.visibility === 'off') {
      toast({
        title: 'Set visibility first',
        description: 'Please choose who can see you before enabling sharing',
        variant: 'destructive'
      });
      return;
    }
    await updateSettings({ sharing_enabled: enabled });
  };

  const handleVisibilityChange = async (visibility: string) => {
    await updateSettings({ 
      visibility: visibility as ProximitySetting['visibility'],
      sharing_enabled: visibility !== 'off' ? settings.sharing_enabled : false
    });
  };

  const handleTimeLimitChange = async (minutes: string) => {
    const expires = minutes === 'unlimited' 
      ? null 
      : new Date(Date.now() + parseInt(minutes) * 60000).toISOString();
    
    await updateSettings({ session_expires_at: expires });
  };

  return (
    <Card className="p-6 space-y-6 border-border/50 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
          <Radar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Proximity Sharing</h2>
          <p className="text-sm text-muted-foreground">Control who can see you nearby</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-secondary" />
            <div>
              <Label htmlFor="sharing-toggle" className="text-base">Enable Sharing</Label>
              <p className="text-xs text-muted-foreground">Share your proximity with others</p>
            </div>
          </div>
          <Switch
            id="sharing-toggle"
            checked={settings.sharing_enabled}
            onCheckedChange={handleToggleSharing}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Visibility
          </Label>
          <Select value={settings.visibility} onValueChange={handleVisibilityChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off - No one can see you</SelectItem>
              <SelectItem value="everyone">Everyone - All users nearby</SelectItem>
              <SelectItem value="contacts">Contacts - Only your contacts</SelectItem>
              <SelectItem value="groups">Groups - Specific groups only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Limit
          </Label>
          <Select 
            value={settings.session_expires_at ? '60' : 'unlimited'} 
            onValueChange={handleTimeLimitChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="unlimited">Unlimited</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {settings.sharing_enabled && (
        <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
          <p className="text-sm text-secondary font-medium">
            ✓ You're now visible to {settings.visibility === 'everyone' ? 'everyone' : settings.visibility} nearby
          </p>
        </div>
      )}
    </Card>
  );
};
