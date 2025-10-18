import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the current user's location from the request
    const { userLatitude, userLongitude } = await req.json();
    
    // Use default location if not provided (San Francisco coords)
    const baseLatitude = userLatitude || 37.7749;
    const baseLongitude = userLongitude || -122.4194;

    console.log('Creating test users near:', { baseLatitude, baseLongitude });

    const testUsers = [
      {
        email: 'test.user1@proximity.app',
        password: 'testpass123',
        username: 'TestUser1',
        latOffset: 0.0003, // ~30 meters north
        lonOffset: 0,
        visibility: 'everyone',
      },
      {
        email: 'test.user2@proximity.app',
        password: 'testpass123',
        username: 'TestUser2',
        latOffset: 0.0006, // ~60 meters north
        lonOffset: 0.0002, // ~20 meters east
        visibility: 'everyone',
      },
      {
        email: 'test.user3@proximity.app',
        password: 'testpass123',
        username: 'TestUser3',
        latOffset: 0.0008, // ~90 meters north
        lonOffset: 0,
        visibility: 'everyone',
      },
      {
        email: 'test.user4@proximity.app',
        password: 'testpass123',
        username: 'TestUser4',
        latOffset: 0.002, // ~200 meters north (outside 100m radius)
        lonOffset: 0,
        visibility: 'everyone',
      },
    ];

    const createdUsers = [];

    for (const testUser of testUsers) {
      console.log('Creating user:', testUser.email);
      
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser?.users.find(u => u.email === testUser.email);

      let userId;
      
      if (userExists) {
        console.log('User already exists:', testUser.email);
        userId = userExists.id;
      } else {
        // Create user with admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            username: testUser.username
          }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          continue;
        }

        userId = newUser.user.id;
        console.log('Created user:', userId);
      }

      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          username: testUser.username,
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Update proximity settings
      const { error: settingsError } = await supabaseAdmin
        .from('proximity_settings')
        .upsert({
          user_id: userId,
          sharing_enabled: true,
          visibility: testUser.visibility,
          session_expires_at: null,
        });

      if (settingsError) {
        console.error('Error updating settings:', settingsError);
      }

      // Create active presence
      const latitude = baseLatitude + testUser.latOffset;
      const longitude = baseLongitude + testUser.lonOffset;
      
      const { error: presenceError } = await supabaseAdmin
        .from('active_presence')
        .upsert({
          user_id: userId,
          ephemeral_id: `${userId}-${Math.floor(Date.now() / 3600000)}`,
          latitude,
          longitude,
          accuracy_meters: 10,
          last_seen: new Date().toISOString(),
        });

      if (presenceError) {
        console.error('Error creating presence:', presenceError);
      }

      createdUsers.push({
        email: testUser.email,
        username: testUser.username,
        location: { latitude, longitude }
      });
    }

    console.log('Successfully created/updated test users:', createdUsers.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created/updated ${createdUsers.length} test users`,
        users: createdUsers,
        credentials: {
          email: 'test.user[1-4]@proximity.app',
          password: 'testpass123'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
