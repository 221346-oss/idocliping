import { createClient } from "@supabase/supabase-js";

// Load from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const sampleBrands = [
  {
    name: "Red Bull",
    description: "Energy drink company looking for extreme sports and gaming clips.",
    website: "https://redbull.com",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/RedBullEnergyDrink.svg/1200px-RedBullEnergyDrink.svg.png"
  },
  {
    name: "GFuel",
    description: "The official energy drink of Esports.",
    website: "https://gfuel.com",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/4/4b/G_Fuel_Logo.svg"
  },
  {
    name: "Razer",
    description: "For Gamers. By Gamers.",
    website: "https://razer.com",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/4/40/Razer_snake_logo.svg/1200px-Razer_snake_logo.svg.png"
  }
];

async function seed() {
  console.log("Seeding brands...");
  
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .insert(sampleBrands)
    .select();

  if (brandsError) {
    console.error("Error inserting brands:", brandsError);
    return;
  }

  console.log("Brands inserted:", brands?.map(b => b.name).join(", "));

  if (!brands || brands.length === 0) return;

  const sampleCampaigns = [
    {
      brand_id: brands[0].id, // Red Bull
      title: "Epic Gaming Moments",
      description: "Submit your most insane clutch moments in FPS games.",
      category: "gaming",
      budget_total: 5000,
      budget_remaining: 5000,
      payout_per_1m_views: 500,
      status: "active",
      platforms: ["tiktok", "youtube"],
      badges: ["High Payout", "Trending"],
      instructions: "Must include #RedBullGaming and focus on high energy gameplay."
    },
    {
      brand_id: brands[0].id, // Red Bull
      title: "Extreme Sports Highlights",
      description: "Skateboarding, BMX, or Parkour clips.",
      category: "other",
      budget_total: 10000,
      budget_remaining: 10000,
      payout_per_1m_views: 750,
      status: "active",
      platforms: ["instagram", "tiktok"],
      badges: ["Official"],
      instructions: "No music overlay, keep original audio. Tag @redbull."
    },
    {
      brand_id: brands[1].id, // GFuel
      title: "Streamer Rage / Funny Moments",
      description: "Funny clips from live streams, must be entertaining.",
      category: "gaming",
      budget_total: 3000,
      budget_remaining: 3000,
      payout_per_1m_views: 300,
      status: "active",
      platforms: ["tiktok", "youtube", "instagram"],
      badges: ["Beginner Friendly"],
      instructions: "Include a GFUEL shaker in the background if possible, or just be funny."
    },
    {
      brand_id: brands[2].id, // Razer
      title: "Setup Tours & Aesthetics",
      description: "Show off your RGB gaming setups.",
      category: "ugc",
      budget_total: 2000,
      budget_remaining: 2000,
      payout_per_1m_views: 400,
      status: "active",
      platforms: ["tiktok"],
      badges: ["Aesthetic"],
      instructions: "Good lighting required. Tag #RazerChroma."
    }
  ];

  console.log("Seeding campaigns...");

  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .insert(sampleCampaigns)
    .select();

  if (campaignsError) {
    console.error("Error inserting campaigns:", campaignsError);
    return;
  }

  console.log("Campaigns inserted successfully:", campaigns?.length);
  console.log("Seed complete!");
}

seed().catch(console.error);
