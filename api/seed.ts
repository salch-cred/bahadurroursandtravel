import { db, requireAdmin } from './_db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET to seed' });
  if (!requireAdmin(req, res)) return;

  // Each package has unique, correct Unsplash image + complete details
  const packages = [
    // ── LAKSHADWEEP & ISLAND ────────────────────────────────────────────────
    { name: 'Island escape', slug: 'island-escape', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'Crystal lagoons, coral life and slow island mornings.', image_url: 'assets/images/island-beach.jpg', highlights: ['Return boat transfer to island','Permit handling included','Stay at island resort','Daily meals included'], active: true },
    { name: 'Discover scuba', slug: 'discover-scuba', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '3 Days', price: 'Custom quote', summary: 'A guided first dive in clear Lakshadweep water with certified instructors.', image_url: 'assets/images/scuba.jpg', highlights: ['PADI certified dive instructor','All equipment provided','Coral reef dive site','Safety briefing included'], active: true },
    { name: 'Sunset kayaking', slug: 'sunset-kayaking', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '2 Days', price: 'Custom quote', summary: 'Quiet water, a slow horizon. Guided kayaking at golden hour.', image_url: 'assets/images/kayak-sunset.jpg', highlights: ['Guided kayaking tour','Sunset timing guaranteed','Life jackets provided','Photography session'], active: true },
    { name: 'Water sports day', slug: 'water-sports-day', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Lakshadweep', duration: '1 Day', price: 'Custom quote', summary: 'One lively day, fully coordinated. Banana boat, snorkelling and more.', image_url: 'assets/images/banana-boat.jpg', highlights: ['Banana boat ride','Snorkelling with gear','Jet ski ride','Packed lunch included'], active: true },
    { name: 'Agatti Island stay', slug: 'agatti-island-stay', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Agatti, Lakshadweep', duration: '5 Days', price: 'Custom quote', summary: 'Stay on the pristine beaches of Agatti with all meals and activities.', image_url: 'assets/images/sunset-beach.jpg', highlights: ['Agatti beach resort stay','All meals included','Permit arranged','Lagoon water sports'], active: true },
    { name: 'Bangaram private island', slug: 'bangaram-private-island', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Bangaram, Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'An untouched private island experience with white sand and clear water.', image_url: 'assets/images/hero-yacht.jpg', highlights: ['Bangaram island resort','Exclusive beach access','Snorkelling & diving','Full board stay'], active: true },
    { name: 'Minicoy island escape', slug: 'minicoy-island-escape', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Minicoy, Lakshadweep', duration: '4 Days', price: 'Custom quote', summary: 'Visit the southernmost island of Lakshadweep — unique culture and still water.', image_url: 'assets/images/scuba-gear.jpg', highlights: ['Tuna fishing experience','Lighthouse visit','Cultural village walk','Lagoon swimming'], active: true },
    { name: 'Kadmat beach retreat', slug: 'kadmat-beach-retreat', category: 'Lakshadweep & Island', package_type: 'domestic', region: 'Kadmat, Lakshadweep', duration: '3 Days', price: 'Custom quote', summary: 'One of the longest beaches in Lakshadweep — serene, calm and perfect for couples.', image_url: 'assets/images/scuba-team.jpg', highlights: ['Long white sand beach','Beach resort stay','Snorkelling session','Bonfire evening'], active: true },

    // ── UMRAH ─────────────────────────────────────────────────────────────────────
    { name: 'Umrah – Economy package', slug: 'umrah-economy-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '10 Days', price: 'Contact for price', summary: 'Complete Umrah with visa, flights, hotel near Haram and guided rituals. Budget-friendly.', image_url: 'assets/images/umrah/kaaba-day.png', highlights: ['Visa processing included','Return flights from Kochi','Hotel 500m from Haram','Guided ziyarat Madinah'], active: true },
    { name: 'Umrah – Standard package', slug: 'umrah-standard-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '12 Days', price: 'Contact for price', summary: 'Standard Umrah package with comfortable 4-star hotel and full support throughout.', image_url: 'assets/images/umrah/kaaba-aerial.jpg', highlights: ['4-star hotel near Haram','All meals (breakfast & dinner)','Airport transfer','Experienced mutawwif guide'], active: true },
    { name: 'Umrah – Premium package', slug: 'umrah-premium-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '14 Days', price: 'Contact for price', summary: 'Premium Umrah experience — 5-star hotel with Haram view, private transport and VIP service.', image_url: 'assets/images/umrah/kaaba-sunset.jpg', highlights: ['5-star hotel with Haram view','Business class flights','Private vehicle throughout','24/7 group coordinator'], active: true },
    { name: 'Umrah – Family package', slug: 'umrah-family-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '12 Days', price: 'Contact for price', summary: 'Family-friendly Umrah with child-appropriate support and comfortable hotels.', image_url: 'assets/images/umrah/kaaba-spiral.jpg', highlights: ['Family rooms available','Child visa assistance','Group travel coordination','Shopping time in Makkah'], active: true },
    { name: 'Umrah – Ramadan package', slug: 'umrah-ramadan-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '15 Days', price: 'Contact for price', summary: 'Perform Umrah during the blessed month of Ramadan. Taraweeh, Itikaf and full support.', image_url: 'assets/images/umrah/kaaba-night.png', highlights: ['Ramadan suhoor & iftar','Taraweeh in Haram','Laylatul Qadr planning','Experienced Ramadan guide'], active: true },
    { name: 'Umrah – VIP package', slug: 'umrah-vip-package', category: 'Umrah Packages', package_type: 'pilgrimage', region: 'Makkah & Madinah', duration: '14 Days', price: 'Contact for price', summary: 'All-inclusive luxury Umrah — direct Haram tower hotel, first class flights and personal service.', image_url: 'assets/images/umrah/masjid-haram.png', highlights: ['Haram tower hotel suite','First class flights','Personal guide and coordinator','Luxury ground transport'], active: true },

    // ── KASHMIR ───────────────────────────────────────────────────────────────────
    { name: 'Kashmir – Valley in bloom', slug: 'kashmir-valley-in-bloom', category: 'Domestic Tours', package_type: 'domestic', region: 'Kashmir', duration: '6 Days', price: 'Custom quote', summary: 'Lakes, alpine roads, tulip gardens and memorable mountain stays.', image_url: 'assets/images/packages/kashmir.jpg', highlights: ['Dal Lake shikara ride','Pahalgam valley visit','Gulmarg cable car','All transfers by private car'], active: true },
    { name: 'Kashmir – Dal Lake houseboat', slug: 'kashmir-dal-lake-houseboat', category: 'Domestic Tours', package_type: 'domestic', region: 'Kashmir', duration: '4 Days', price: 'Custom quote', summary: 'Nights on a heritage wooden houseboat on the serene Dal Lake.', image_url: 'assets/images/package-posters/kashmir.jpg', highlights: ['Heritage houseboat stay','Morning shikara market visit','Mughal garden tour','Local Kashmiri cuisine'], active: true },

    // ── OTHER DOMESTIC ──────────────────────────────────────────────────────────
    { name: 'Kerala backwaters tour', slug: 'kerala-backwaters-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Kerala', duration: '5 Days', price: 'Custom quote', summary: 'Houseboats, green hills, Alleppey canals and a gentler pace.', image_url: 'assets/images/packages/kerala.jpg', highlights: ['Alleppey houseboat cruise','Munnar hill station','Kathakali cultural show','Spice plantation visit'], active: true },
    { name: 'Goa beach holiday', slug: 'goa-beach-holiday', category: 'Domestic Tours', package_type: 'domestic', region: 'Goa', duration: '4 Days', price: 'Custom quote', summary: 'Beach time, old quarters, seafood and effortless evenings.', image_url: 'assets/images/packages/goa.jpg', highlights: ['North & South Goa beaches','Old Goa churches tour','Water sports package','Sunset cruise'], active: true },
    { name: 'Manali snow trip', slug: 'manali-snow-trip', category: 'Domestic Tours', package_type: 'domestic', region: 'Manali, Himachal Pradesh', duration: '5 Days', price: 'Custom quote', summary: 'Snow valleys, Rohtang Pass and Himalayan scenery year-round.', image_url: 'assets/images/package-posters/manali.jpg', highlights: ['Rohtang Pass excursion','Solang Valley activities','Hadimba Temple visit','Snow activities'], active: true },
    { name: 'Andaman island tour', slug: 'andaman-island-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Andaman & Nicobar', duration: '6 Days', price: 'Custom quote', summary: 'Pristine beaches, cellular jail history and crystal-clear Andaman waters.', image_url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&q=80&auto=format&fit=crop', highlights: ['Havelock Island trip','Radhanagar beach visit','Scuba diving','Cellular Jail light show'], active: true },
    { name: 'Rajasthan Royal tour', slug: 'rajasthan-royal-tour', category: 'Domestic Tours', package_type: 'domestic', region: 'Rajasthan', duration: '7 Days', price: 'Custom quote', summary: 'Forts, palaces, desert dunes and the royal colours of Rajasthan.', image_url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80&auto=format&fit=crop', highlights: ['Jaipur Amber Fort','Jodhpur blue city','Jaisalmer desert camp','Udaipur lake palace'], active: true },
    { name: 'Coorg coffee retreat', slug: 'coorg-coffee-retreat', category: 'Domestic Tours', package_type: 'domestic', region: 'Coorg, Karnataka', duration: '3 Days', price: 'Custom quote', summary: 'Misty hills, coffee estates and a peaceful weekend in Scotland of India.', image_url: 'https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=800&q=80&auto=format&fit=crop', highlights: ['Coffee estate tour','Abbey Falls visit','Raja seat sunset','Homestay in estate'], active: true },
    { name: 'Wayanad nature escape', slug: 'wayanad-nature-escape', category: 'Domestic Tours', package_type: 'domestic', region: 'Wayanad, Kerala', duration: '3 Days', price: 'Custom quote', summary: 'Tribal villages, waterfalls, wildlife and lush green forests of Wayanad.', image_url: 'https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800&q=80&auto=format&fit=crop', highlights: ['Chembra Peak trek','Edakkal caves visit','Wildlife safari','Bamboo resort stay'], active: true },

    // ── INTERNATIONAL ────────────────────────────────────────────────────────
    { name: 'Maldives honeymoon', slug: 'maldives-honeymoon', category: 'International Tours', package_type: 'international', region: 'Maldives', duration: '5 Days', price: 'Custom quote', summary: 'Overwater bungalow, turquoise lagoons and a private resort stay.', image_url: 'assets/images/packages/maldives.jpg', highlights: ['Overwater villa stay','Couple spa treatment','Snorkelling & diving','Dolphin cruise'], active: true },
    { name: 'Dubai city tour', slug: 'dubai-city-tour', category: 'International Tours', package_type: 'international', region: 'Dubai, UAE', duration: '5 Days', price: 'Custom quote', summary: 'Modern skyline, desert dunes, gold souk and world-class shopping.', image_url: 'assets/images/packages/dubai.jpg', highlights: ['Burj Khalifa visit','Desert safari & BBQ','Dubai Mall tour','Gold & Spice souk'], active: true },
    { name: 'Thailand beach escape', slug: 'thailand-beach-escape', category: 'International Tours', package_type: 'international', region: 'Thailand', duration: '6 Days', price: 'Custom quote', summary: 'Bright coastlines, Phi Phi islands, temples and local street flavours.', image_url: 'assets/images/packages/thailand.jpg', highlights: ['Phi Phi island boat trip','Bangkok temples tour','Phuket beach time','Night market food walk'], active: true },
    { name: 'Singapore & Malaysia tour', slug: 'singapore-malaysia-tour', category: 'International Tours', package_type: 'international', region: 'Singapore & Malaysia', duration: '7 Days', price: 'Custom quote', summary: 'Gardens by the Bay, Batu Caves and the cosmopolitan twin cities.', image_url: 'https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=800&q=80&auto=format&fit=crop', highlights: ['Marina Bay Sands view','Universal Studios','Batu Caves visit','Genting Highlands'], active: true },
    { name: 'Bali cultural retreat', slug: 'bali-cultural-retreat', category: 'International Tours', package_type: 'international', region: 'Bali, Indonesia', duration: '6 Days', price: 'Custom quote', summary: 'Temple walks, rice terraces, traditional dance and Bali sunsets.', image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80&auto=format&fit=crop', highlights: ['Ubud rice terrace walk','Tanah Lot temple visit','Balinese cooking class','Seminyak beach'], active: true },
    { name: 'Turkey heritage tour', slug: 'turkey-heritage-tour', category: 'International Tours', package_type: 'international', region: 'Turkey', duration: '8 Days', price: 'Custom quote', summary: 'Cappadocia balloon rides, Istanbul mosques and the Bosphorus.', image_url: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&q=80&auto=format&fit=crop', highlights: ['Hot air balloon Cappadocia','Blue Mosque & Hagia Sophia','Bosphorus cruise','Grand Bazaar shopping'], active: true },
    { name: 'Sri Lanka holiday', slug: 'sri-lanka-holiday', category: 'International Tours', package_type: 'international', region: 'Sri Lanka', duration: '5 Days', price: 'Custom quote', summary: 'Sigiriya rock fortress, tea estates and pristine beaches all in one island.', image_url: 'https://images.unsplash.com/photo-1586022730-08e09df1c8c2?w=800&q=80&auto=format&fit=crop', highlights: ['Sigiriya rock climb','Kandy Temple of Tooth','Nuwara Eliya tea estate','Bentota beach'], active: true },
    { name: 'Azerbaijan tour', slug: 'azerbaijan-tour', category: 'International Tours', package_type: 'international', region: 'Azerbaijan', duration: '5 Days', price: 'Custom quote', summary: 'The Land of Fire — Baku skyline, flame towers and ancient Caucasus heritage.', image_url: 'https://images.unsplash.com/photo-1569516449771-41c89ee14ca3?w=800&q=80&auto=format&fit=crop', highlights: ['Flame Towers Baku','Old City UNESCO walk','Gobustan Rock Art','Caspian Sea sunset'], active: true },

    // ── PILGRIMAGE ────────────────────────────────────────────────────────────────
    { name: 'Ajmer Sharif ziyarat', slug: 'ajmer-sharif-ziyarat', category: 'Pilgrimage Tours', package_type: 'pilgrimage', region: 'Ajmer, Rajasthan', duration: '3 Days', price: 'Custom quote', summary: 'A respectful, well-paced ziyarat itinerary to Dargah Ajmer Sharif.', image_url: 'assets/images/packages/ajmer.jpg', highlights: ['Dargah Ajmer Sharif visit','Pushkar lake darshan','Return AC transport','Hotel near dargah'], active: true },
    { name: 'Tirupati Balaji package', slug: 'tirupati-balaji-package', category: 'Pilgrimage Tours', package_type: 'pilgrimage', region: 'Tirupati, AP', duration: '2 Days', price: 'Custom quote', summary: 'VIP darshan tokens, comfortable transport and stay near the temple.', image_url: 'assets/images/packages/tirupati.jpg', highlights: ['VIP darshan arrangement','Accommodation near temple','Return AC vehicle','Prasad arrangement'], active: true },

    // ── VEHICLE HIRE ───────────────────────────────────────────────────────
    { name: 'Force Urbania rental', slug: 'force-urbania-rental', category: 'Vehicle Hire', package_type: 'domestic', region: 'Kerala & South India', duration: 'Flexible', price: 'From ₹6,000/day', summary: 'Spacious Force Urbania for group trips, pilgrimages and long-distance journeys.', image_url: 'assets/images/urbania.png', highlights: ['AC 12-seater van','Experienced driver','Pilgrimage & airport trips','All of South India'], active: true },
    { name: 'Force Urbania – Airport transfer', slug: 'force-urbania-airport-transfer', category: 'Vehicle Hire', package_type: 'domestic', region: 'Kerala', duration: 'As needed', price: 'From ₹4,000', summary: 'Reliable group airport pick-up and drop across Kerala airports.', image_url: 'assets/images/urbania/2.jpg', highlights: ['Cochin / Calicut / TVM airports','Driver with sign board','Punctual & reliable','Luggage capacity'], active: true },
    { name: 'Force Urbania – Long distance', slug: 'force-urbania-long-distance', category: 'Vehicle Hire', package_type: 'domestic', region: 'South India', duration: 'Per trip', price: 'Contact for price', summary: 'Long-distance travel across Kerala, Tamil Nadu and Karnataka in comfort.', image_url: 'assets/images/urbania-premium.png', highlights: ['Inter-state permits','Night travel available','Experienced driver','12 passengers max'], active: true },
  ];

  try {
    const sql = db();
    let insertCount = 0;
    let updateCount = 0;

    for (const pkg of packages) {
      const existing = await sql`SELECT id FROM packages WHERE slug = ${pkg.slug}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO packages (name, slug, category, package_type, region, duration, price, summary, image_url, highlights, active)
          VALUES (
            ${pkg.name}, ${pkg.slug}, ${pkg.category}, ${pkg.package_type},
            ${pkg.region || ''}, ${pkg.duration || ''}, ${pkg.price || 'Custom quote'},
            ${pkg.summary || ''}, ${pkg.image_url}, ${pkg.highlights || []}, ${pkg.active}
          )
        `;
        insertCount++;
      } else {
        await sql`
          UPDATE packages SET
            category = ${pkg.category},
            package_type = ${pkg.package_type},
            region = ${pkg.region || ''},
            duration = ${pkg.duration || ''},
            price = ${pkg.price || 'Custom quote'},
            summary = ${pkg.summary || ''},
            image_url = ${pkg.image_url},
            highlights = ${pkg.highlights || []},
            active = ${pkg.active}
          WHERE slug = ${pkg.slug}
        `;
        updateCount++;
      }
    }

    return res.status(200).json({ ok: true, inserted: insertCount, updated: updateCount, message: `Done. Inserted: ${insertCount}, Updated: ${updateCount}` });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Seed failed' });
  }
}
