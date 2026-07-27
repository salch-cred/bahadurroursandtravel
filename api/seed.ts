import { db } from './_db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET to seed' });
  
  const packages = [
    { category: 'Lakshadweep & Island', type: 'domestic', image: 'assets/images/package-posters/lakshadweep.jpg', names: ["Island escape","Discover scuba","Sunset kayaking","Water sports day","Agatti Island stay","Bangaram private island","Minicoy island escape","Kadmat beach retreat"] },
    { category: 'Umrah Packages', type: 'pilgrimage', image: 'assets/images/umrah/kaaba-sunset.jpg', names: ["Umrah – Economy package","Umrah – Standard package","Umrah – Premium package","Umrah – Deluxe package","Umrah – Family package","Umrah – Ramadan package","Umrah – VIP package"] },
    { category: 'Domestic Tours', type: 'domestic', image: 'assets/images/packages/kashmir.jpg', names: ["Kashmir – Valley in bloom","Kashmir – Dal Lake houseboat","Himachal Pradesh tour","Rajasthan heritage tour","Goa beach holiday","Kerala backwaters tour","Andaman island escape","Coorg hill station retreat","Ooty & Kodaikanal tour","Mysore & Coorg circuit"] },
    { category: 'International Tours', type: 'international', image: 'assets/images/packages/dubai.jpg', names: ["Maldives – Overwater quiet","Dubai city tour","Thailand beach escape","Singapore & Malaysia tour","Bali cultural retreat","Europe group tour","Turkey heritage tour","Sri Lanka holiday"] },
    { category: 'Vehicle Hire', type: 'domestic', image: 'assets/images/urbania/2.jpg', names: ["Force Urbania rental","Force Urbania – Airport transfer","Force Urbania – Long distance","Force Urbania – Pilgrimage trip","Force Urbania – Corporate travel"] }
  ];

  try {
    const sql = db();
    let insertCount = 0;
    let updateCount = 0;

    for (const group of packages) {
      for (const name of group.names) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // check if it exists
        const existing = await sql`SELECT id FROM packages WHERE slug = ${slug}`;
        if (existing.length === 0) {
          await sql`
            INSERT INTO packages (
              name, slug, category, package_type, image_url, active
            ) VALUES (
              ${name}, ${slug}, ${group.category}, ${group.type}, ${group.image}, true
            )
          `;
          insertCount++;
        } else {
          await sql`
            UPDATE packages 
            SET category = ${group.category}, package_type = ${group.type}, image_url = ${group.image}
            WHERE slug = ${slug}
          `;
          updateCount++;
        }
      }
    }

    return res.status(200).json({ ok: true, inserted: insertCount, updated: updateCount, message: `Seeded ${insertCount} packages. Updated ${updateCount} packages.` });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Seed failed' });
  }
}
