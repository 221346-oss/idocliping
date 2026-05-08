-- Seed file for Brands and Campaigns
-- This can be run in the Supabase SQL Editor to populate sample data

-- Insert Sample Brands
INSERT INTO brands (id, name, description, website, logo_url)
VALUES 
  (
    '11111111-1111-4111-a111-111111111111',
    'Red Bull',
    'Energy drink company looking for extreme sports and gaming clips.',
    'https://redbull.com',
    'https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/RedBullEnergyDrink.svg/1200px-RedBullEnergyDrink.svg.png'
  ),
  (
    '22222222-2222-4222-a222-222222222222',
    'GFuel',
    'The official energy drink of Esports.',
    'https://gfuel.com',
    'https://upload.wikimedia.org/wikipedia/commons/4/4b/G_Fuel_Logo.svg'
  ),
  (
    '33333333-3333-4333-a333-333333333333',
    'Razer',
    'For Gamers. By Gamers.',
    'https://razer.com',
    'https://upload.wikimedia.org/wikipedia/en/thumb/4/40/Razer_snake_logo.svg/1200px-Razer_snake_logo.svg.png'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Campaigns
INSERT INTO campaigns (id, brand_id, title, description, category, budget_total, budget_remaining, payout_per_1m_views, status, platforms, badges, instructions)
VALUES 
  (
    '10000000-1000-4000-a000-100000000001',
    '11111111-1111-4111-a111-111111111111', -- Red Bull
    'Epic Gaming Moments',
    'Submit your most insane clutch moments in FPS games.',
    'gaming',
    5000,
    5000,
    500,
    'active',
    ARRAY['tiktok', 'youtube'],
    ARRAY['High Payout', 'Trending'],
    'Must include #RedBullGaming and focus on high energy gameplay.'
  ),
  (
    '10000000-1000-4000-a000-100000000002',
    '11111111-1111-4111-a111-111111111111', -- Red Bull
    'Extreme Sports Highlights',
    'Skateboarding, BMX, or Parkour clips.',
    'other',
    10000,
    10000,
    750,
    'active',
    ARRAY['instagram', 'tiktok'],
    ARRAY['Official'],
    'No music overlay, keep original audio. Tag @redbull.'
  ),
  (
    '10000000-1000-4000-a000-100000000003',
    '22222222-2222-4222-a222-222222222222', -- GFuel
    'Streamer Rage / Funny Moments',
    'Funny clips from live streams, must be entertaining.',
    'gaming',
    3000,
    3000,
    300,
    'active',
    ARRAY['tiktok', 'youtube', 'instagram'],
    ARRAY['Beginner Friendly'],
    'Include a GFUEL shaker in the background if possible, or just be funny.'
  ),
  (
    '10000000-1000-4000-a000-100000000004',
    '33333333-3333-4333-a333-333333333333', -- Razer
    'Setup Tours & Aesthetics',
    'Show off your RGB gaming setups.',
    'ugc',
    2000,
    2000,
    400,
    'active',
    ARRAY['tiktok'],
    ARRAY['Aesthetic'],
    'Good lighting required. Tag #RazerChroma.'
  )
ON CONFLICT (id) DO NOTHING;
