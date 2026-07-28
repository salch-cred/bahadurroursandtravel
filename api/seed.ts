import { db, requireAdmin } from './_db.js';

type SeedPackage = {
  name: string;
  slug: string;
  category: string;
  package_type: 'domestic' | 'international' | 'pilgrimage' | 'transport';
  region: string;
  duration: string;
  price: string;
  summary: string;
  image_url: string;
  highlights: string[];
  active: boolean;
};

const packages: SeedPackage[] = [
  // Lakshadweep
  { name: 'Island escape', slug: 'island-escape', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'Crystal lagoons, coral life and slow island mornings.', image_url: 'assets/images/island-beach.jpg', highlights: ['Return boat transfer to island', 'Permit handling included', 'Stay at island resort', 'Daily meals included'], active: true },
  { name: 'Discover scuba', slug: 'discover-scuba', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '3 Days', price: 'Custom quote', summary: 'A guided first dive in clear Lakshadweep water with certified instructors.', image_url: 'assets/images/scuba.jpg', highlights: ['PADI certified dive instructor', 'All equipment provided', 'Coral reef dive site', 'Safety briefing included'], active: true },
  { name: 'Sunset kayaking', slug: 'sunset-kayaking', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '2 Days', price: 'Custom quote', summary: 'Quiet water, a slow horizon. Guided kayaking at golden hour.', image_url: 'assets/images/kayak-sunset.jpg', highlights: ['Guided kayaking tour', 'Sunset timing', 'Life jackets provided', 'Photography session'], active: true },
  { name: 'Water sports day', slug: 'water-sports-day', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '1 Day', price: 'Custom quote', summary: 'Banana boat, jet ski and snorkelling in one high-energy island day.', image_url: 'assets/images/banana-boat.jpg', highlights: ['Banana boat', 'Jet ski slot', 'Snorkelling gear', 'Island support team'], active: true },
  { name: 'Agatti Island stay', slug: 'agatti-island-stay', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Agatti, Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'Airport-side island stay with lagoon time and local sightseeing.', image_url: 'assets/images/package-posters/lakshadweep.jpg', highlights: ['Airport proximity', 'Lagoon access', 'Local sightseeing', 'Permit support'], active: true },
  { name: 'Bangaram private island', slug: 'bangaram-private-island', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Bangaram, Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'Quiet private-island energy with clear water and unhurried days.', image_url: 'assets/images/sunset-beach.jpg', highlights: ['Private island feel', 'Beach time', 'Water activities', 'Resort stay'], active: true },
  { name: 'Minicoy island escape', slug: 'minicoy-island-escape', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Minicoy, Lakshadweep', duration: '5 Days', price: 'Custom quote', summary: 'Southernmost island calm with culture, lighthouse views and lagoon life.', image_url: 'assets/images/island-beach.jpg', highlights: ['Lighthouse visit', 'Local culture', 'Lagoon activities', 'Stay and meals'], active: true },
  { name: 'Kadmat beach retreat', slug: 'kadmat-beach-retreat', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Kadmat, Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'Long beaches, soft sand and easy water days on Kadmat.', image_url: 'assets/images/kid-beach.jpg', highlights: ['Beachfront stay', 'Snorkelling', 'Family friendly', 'Permit handling'], active: true },

  // Umrah / pilgrimage
  { name: 'Umrah – Economy package', slug: 'umrah-economy-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '10–12 Days', price: 'Custom quote', summary: 'Essential Umrah with flights, visa, stay and group transfers.', image_url: 'assets/images/umrah/kaaba-day.png', highlights: ['Return flights', 'Saudi Umrah visa', 'Hotel near Haram', 'Group transfers'], active: true },
  { name: 'Umrah – Standard package', slug: 'umrah-standard-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '12–14 Days', price: 'Custom quote', summary: 'Comfort Umrah with better hotels and smoother private transfers.', image_url: 'assets/images/umrah/kaaba-sunset.jpg', highlights: ['Return flights', 'Fast-track visa support', 'Closer hotels', 'Private car transfers'], active: true },
  { name: 'Umrah – Premium package', slug: 'umrah-premium-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '14–15 Days', price: 'From ₹1.2L', summary: 'Premium hotels, guided ziyarat and a calmer private itinerary.', image_url: 'assets/images/umrah/kaaba-night.png', highlights: ['Premium hotels', 'Guided ziyarat', 'Private transfers', 'Priority support'], active: true },
  { name: 'Umrah – Deluxe package', slug: 'umrah-deluxe-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '15 Days', price: 'Custom quote', summary: 'Higher-end stay options with refined pacing and dedicated support.', image_url: 'assets/images/umrah/masjid-haram.png', highlights: ['Deluxe stay options', 'Haramain access planning', 'Private transport', 'Dedicated coordinator'], active: true },
  { name: 'Umrah – Family package', slug: 'umrah-family-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '12–15 Days', price: 'Custom quote', summary: 'Family-friendly rooms, pacing and support for multi-generation groups.', image_url: 'assets/images/umrah/kaaba-aerial.jpg', highlights: ['Family rooms', 'Flexible pacing', 'Visa support', 'Group coordination'], active: true },
  { name: 'Umrah – Ramadan package', slug: 'umrah-ramadan-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: 'Seasonal', price: 'Custom quote', summary: 'Seasonal Ramadan Umrah planning with early booking guidance.', image_url: 'assets/images/umrah/kaaba-spiral.jpg', highlights: ['Ramadan timing guidance', 'Stay near prayer areas', 'Iftar planning support', 'Early booking recommended'], active: true },
  { name: 'Umrah – VIP package', slug: 'umrah-vip-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '15 Days', price: 'Custom quote', summary: 'VIP comfort with premium stay, private movement and white-glove support.', image_url: 'assets/images/package-posters/umrah.jpg', highlights: ['VIP hotel options', 'Private transport', 'Priority handling', 'Personal coordinator'], active: true },
  { name: 'Ajmer Sharif ziyarat', slug: 'ajmer-sharif-ziyarat', category: 'Pilgrimage Tours', package_type: 'pilgrimage', region: 'Ajmer, Rajasthan', duration: '3 Days', price: 'Custom quote', summary: 'A respectful, well-paced ziyarat itinerary to Dargah Ajmer Sharif.', image_url: 'assets/images/packages/ajmer.jpg', highlights: ['Dargah Ajmer Sharif visit', 'Pushkar lake darshan', 'Return AC transport', 'Hotel near dargah'], active: true },
  { name: 'Tirupati Balaji package', slug: 'tirupati-balaji-package', category: 'Pilgrimage Tours', package_type: 'pilgrimage', region: 'Tirupati, AP', duration: '2 Days', price: 'Custom quote', summary: 'VIP darshan tokens, comfortable transport and stay near the temple.', image_url: 'assets/images/packages/tirupati.jpg', highlights: ['VIP darshan arrangement', 'Accommodation near temple', 'Return AC vehicle', 'Prasad arrangement'], active: true },

  // Domestic
  { name: 'Kashmir – Valley in bloom', slug: 'kashmir-valley-in-bloom', category: 'Domestic Tours', package_type: 'domestic', region: 'Kashmir', duration: '6 Days', price: 'From ₹28,000', summary: 'Gulmarg, Pahalgam and Dal Lake with a balanced valley itinerary.', image_url: 'assets/images/packages/kashmir.jpg', highlights: ['Gulmarg', 'Pahalgam', 'Shikara ride', 'Houseboat option'], active: true },
  { name: 'Kashmir – Dal Lake houseboat', slug: 'kashmir-dal-lake-houseboat', category: 'Domestic Tours', package_type: 'domestic', region: 'Srinagar', duration: '4 Days', price: 'Custom quote', summary: 'Houseboat nights on Dal Lake with garden and gondola time.', image_url: 'assets/images/package-posters/kashmir.jpg', highlights: ['Houseboat stay', 'Shikara ride', 'Mughal gardens', 'Local cuisine'], active: true },
  { name: 'Himachal Pradesh tour', slug: 'himachal-pradesh-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Himachal Pradesh', duration: '6 Days', price: 'Custom quote', summary: 'Hill stations, pine roads and cool-weather mountain days.', image_url: 'assets/images/package-posters/manali.jpg', highlights: ['Manali / hill stays', 'Scenic drives', 'Local sightseeing', 'Hotel stays'], active: true },
  { name: 'Rajasthan heritage tour', slug: 'rajasthan-heritage-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Rajasthan', duration: '6 Days', price: 'Custom quote', summary: 'Forts, palaces and desert colour across classic Rajasthan stops.', image_url: 'assets/images/packages/ajmer.jpg', highlights: ['Fort visits', 'Palace towns', 'Desert evening option', 'Heritage hotels'], active: true },
  { name: 'Goa beach holiday', slug: 'goa-beach-holiday', category: 'Domestic Tours', package_type: 'domestic', region: 'Goa', duration: '4 Days', price: 'From ₹18,000', summary: 'Beach days, easy evenings and a relaxed coastal reset.', image_url: 'assets/images/packages/goa.jpg', highlights: ['Beach hotels', 'North or South Goa options', 'Airport transfers', 'Leisure days'], active: true },
  { name: 'Kerala backwaters tour', slug: 'kerala-backwaters-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Kerala', duration: '5 Days', price: 'From ₹19,500', summary: 'Houseboat calm, hills and spice-scented South India days.', image_url: 'assets/images/packages/kerala.jpg', highlights: ['Alleppey houseboat', 'Munnar option', 'Airport transfers', 'Meals on selected days'], active: true },
  { name: 'Andaman island escape', slug: 'andaman-island-escape', category: 'Domestic Tours', package_type: 'domestic', region: 'Andaman', duration: '5 Days', price: 'Custom quote', summary: 'Havelock beaches, clear water and ferry-linked island days.', image_url: 'assets/images/island-beach.jpg', highlights: ['Havelock stay', 'Beach time', 'Ferry coordination', 'Snorkelling option'], active: true },
  { name: 'Coorg hill station retreat', slug: 'coorg-hill-station-retreat', category: 'Domestic Tours', package_type: 'domestic', region: 'Coorg', duration: '3 Days', price: 'Custom quote', summary: 'Coffee estates, misty mornings and quiet hill-station pace.', image_url: 'assets/images/packages/kerala.jpg', highlights: ['Estate stay options', 'Waterfalls', 'Local sightseeing', 'Private transfers'], active: true },
  { name: 'Ooty & Kodaikanal tour', slug: 'ooty-kodaikanal-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Tamil Nadu', duration: '5 Days', price: 'Custom quote', summary: 'Two classic South India hill stations in one cool-weather loop.', image_url: 'assets/images/package-posters/manali.jpg', highlights: ['Ooty lake', 'Kodaikanal viewpoints', 'Hotel stays', 'Private cab'], active: true },
  { name: 'Mysore & Coorg circuit', slug: 'mysore-coorg-circuit', category: 'Domestic Tours', package_type: 'domestic', region: 'Karnataka', duration: '4 Days', price: 'Custom quote', summary: 'Palace city heritage paired with Coorg’s coffee-country calm.', image_url: 'assets/images/packages/kerala.jpg', highlights: ['Mysore Palace', 'Coorg stay', 'Local food stops', 'Private transport'], active: true },
  { name: 'Manali snow trip', slug: 'manali-snow-trip', category: 'Domestic Tours', package_type: 'domestic', region: 'Manali', duration: '5 Days', price: 'Custom quote', summary: 'Snow days, mountain air and an easy Himachal getaway.', image_url: 'assets/images/package-posters/manali.jpg', highlights: ['Snow point visit', 'Solang option', 'Hotel stay', 'Transfers'], active: true },
  { name: 'Wayanad nature escape', slug: 'wayanad-nature-escape', category: 'Domestic Tours', package_type: 'domestic', region: 'Wayanad, Kerala', duration: '3 Days', price: 'Custom quote', summary: 'Green hills, viewpoints and a soft nature reset in Wayanad.', image_url: 'assets/images/packages/kerala.jpg', highlights: ['Viewpoint visits', 'Nature stays', 'Local sightseeing', 'Private cab'], active: true },

  // International
  { name: 'Maldives – Overwater quiet', slug: 'maldives-overwater-quiet', category: 'International Tours', package_type: 'international', region: 'Maldives', duration: '5 Days', price: 'From ₹80,000/couple', summary: 'Overwater calm, reef colours and honeymoon-ready island time.', image_url: 'assets/images/packages/maldives.jpg', highlights: ['Resort stay', 'Breakfast options', 'Speedboat or seaplane transfer guidance', 'Snorkelling'], active: true },
  { name: 'Dubai city tour', slug: 'dubai-city-tour', category: 'International Tours', package_type: 'international', region: 'Dubai', duration: '5 Days', price: 'From ₹55,000', summary: 'City icons, desert evening and polished shopping days in Dubai.', image_url: 'assets/images/packages/dubai.jpg', highlights: ['Burj Khalifa option', 'Desert safari', 'City tour', 'Hotel stay'], active: true },
  { name: 'Thailand beach escape', slug: 'thailand-beach-escape', category: 'International Tours', package_type: 'international', region: 'Thailand', duration: '6 Days', price: 'From ₹52,000', summary: 'Bangkok energy with beach days in Pattaya or Phuket options.', image_url: 'assets/images/packages/thailand.jpg', highlights: ['City + beach mix', 'Hotel stays', 'Local transfers', 'Tour options'], active: true },
  { name: 'Singapore & Malaysia tour', slug: 'singapore-malaysia-tour', category: 'International Tours', package_type: 'international', region: 'Singapore & Malaysia', duration: '7 Days', price: 'From ₹68,000', summary: 'A clean twin-country circuit with city highlights and easy pacing.', image_url: 'assets/images/packages/dubai.jpg', highlights: ['Singapore city highlights', 'Malaysia stopovers', 'Hotel stays', 'Transfers'], active: true },
  { name: 'Bali cultural retreat', slug: 'bali-cultural-retreat', category: 'International Tours', package_type: 'international', region: 'Bali', duration: '6 Days', price: 'Custom quote', summary: 'Temples, rice terraces and beach evenings across Bali.', image_url: 'assets/images/packages/maldives.jpg', highlights: ['Ubud culture', 'Beach time', 'Temple visits', 'Private transfers'], active: true },
  { name: 'Europe group tour', slug: 'europe-group-tour', category: 'International Tours', package_type: 'international', region: 'Europe', duration: 'Custom', price: 'Custom quote', summary: 'Group-friendly Europe itineraries shaped around season and budget.', image_url: 'assets/images/packages/dubai.jpg', highlights: ['Multi-city options', 'Group departures', 'Hotel stays', 'Guided sightseeing'], active: true },
  { name: 'Turkey heritage tour', slug: 'turkey-heritage-tour', category: 'International Tours', package_type: 'international', region: 'Turkey', duration: '7 Days', price: 'Custom quote', summary: 'Istanbul heritage with optional Cappadocia or coastal extensions.', image_url: 'assets/images/packages/dubai.jpg', highlights: ['Istanbul old city', 'Bosphorus option', 'Hotel stays', 'Local guide options'], active: true },
  { name: 'Sri Lanka holiday', slug: 'sri-lanka-holiday', category: 'International Tours', package_type: 'international', region: 'Sri Lanka', duration: '5 Days', price: 'Custom quote', summary: 'Beaches, culture and tea-country landscapes in one island loop.', image_url: 'assets/images/packages/maldives.jpg', highlights: ['Beach time', 'Cultural stops', 'Tea country option', 'Private transfers'], active: true },
  { name: 'Azerbaijan tour', slug: 'azerbaijan-tour', category: 'International Tours', package_type: 'international', region: 'Azerbaijan', duration: '5 Days', price: 'Custom quote', summary: 'Baku skyline, old city lanes and Caucasus heritage highlights.', image_url: 'assets/images/packages/dubai.jpg', highlights: ['Baku city tour', 'Old City walk', 'Hotel stay', 'Local transfers'], active: true },

  // Vehicle hire
  { name: 'Force Urbania rental', slug: 'force-urbania-rental', category: 'Vehicle Hire', package_type: 'transport', region: 'Kerala & South India', duration: 'Flexible', price: 'From ₹6,000/day', summary: 'Spacious Force Urbania for group trips, pilgrimages and long-distance journeys.', image_url: 'assets/images/urbania.png', highlights: ['AC 12-seater van', 'Experienced driver', 'Pilgrimage & airport trips', 'South India coverage'], active: true },
  { name: 'Force Urbania – Airport transfer', slug: 'force-urbania-airport-transfer', category: 'Vehicle Hire', package_type: 'transport', region: 'Kerala', duration: 'As needed', price: 'From ₹4,000', summary: 'Reliable group airport pick-up and drop across Kerala airports.', image_url: 'assets/images/urbania/2.jpg', highlights: ['Cochin / Calicut / TVM airports', 'Driver with sign board', 'Punctual service', 'Luggage capacity'], active: true },
  { name: 'Force Urbania – Long distance', slug: 'force-urbania-long-distance', category: 'Vehicle Hire', package_type: 'transport', region: 'South India', duration: 'Per trip', price: 'Contact for price', summary: 'Comfortable long-distance group travel with an experienced driver.', image_url: 'assets/images/urbania/5.png', highlights: ['Long-route comfort', 'Experienced driver', 'AC seating', 'Flexible itinerary'], active: true },
  { name: 'Force Urbania – Pilgrimage trip', slug: 'force-urbania-pilgrimage-trip', category: 'Vehicle Hire', package_type: 'transport', region: 'South India', duration: 'Per trip', price: 'Contact for price', summary: 'Group pilgrimage transport with space, comfort and reliable timing.', image_url: 'assets/images/urbania/1.png', highlights: ['Pilgrimage routes', 'Group seating', 'Driver support', 'Luggage room'], active: true },
  { name: 'Force Urbania – Corporate travel', slug: 'force-urbania-corporate-travel', category: 'Vehicle Hire', package_type: 'transport', region: 'Kerala & South India', duration: 'Flexible', price: 'Contact for price', summary: 'Corporate staff movement, offsites and airport groups in one vehicle.', image_url: 'assets/images/urbania/3.png', highlights: ['Corporate groups', 'Airport & offsite runs', 'Professional driver', 'AC comfort'], active: true },
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET to seed' });
  if (!requireAdmin(req, res)) return;

  try {
    const sql = db();
    let insertCount = 0;
    let updateCount = 0;
    const seedSlugs = packages.map((p) => p.slug);

    for (const pkg of packages) {
      const existing = await sql`SELECT id FROM packages WHERE slug = ${pkg.slug}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO packages (name, slug, category, package_type, region, duration, price, summary, image_url, highlights, active)
          VALUES (
            ${pkg.name}, ${pkg.slug}, ${pkg.category}, ${pkg.package_type},
            ${pkg.region || ''}, ${pkg.duration || ''}, ${pkg.price || 'Custom quote'},
            ${pkg.summary || ''}, ${pkg.image_url}, ${JSON.stringify(pkg.highlights || [])}::jsonb, ${pkg.active}
          )
        `;
        insertCount++;
      } else {
        await sql`
          UPDATE packages SET
            name = ${pkg.name},
            category = ${pkg.category},
            package_type = ${pkg.package_type},
            region = ${pkg.region || ''},
            duration = ${pkg.duration || ''},
            price = ${pkg.price || 'Custom quote'},
            summary = ${pkg.summary || ''},
            image_url = ${pkg.image_url},
            highlights = ${JSON.stringify(pkg.highlights || [])}::jsonb,
            active = ${pkg.active},
            updated_at = now()
          WHERE slug = ${pkg.slug}
        `;
        updateCount++;
      }
    }

    // Deactivate packages not in the canonical seed list so filters stay clean
    const all = await sql`SELECT id, slug FROM packages`;
    let deactivated = 0;
    for (const row of all as Array<{ id: string; slug: string }>) {
      if (!seedSlugs.includes(row.slug)) {
        await sql`UPDATE packages SET active = false, updated_at = now() WHERE id = ${row.id}::uuid`;
        deactivated++;
      }
    }

    const activeRows = await sql`SELECT count(*)::int AS c FROM packages WHERE active = true`;
    return res.status(200).json({
      ok: true,
      inserted: insertCount,
      updated: updateCount,
      deactivated,
      active: activeRows[0]?.c || 0,
      totalSeed: packages.length,
      message: `Seed complete. Inserted ${insertCount}, updated ${updateCount}, deactivated ${deactivated}.`,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Seed failed' });
  }
}
