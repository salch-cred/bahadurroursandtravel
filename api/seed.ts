import { db } from './_db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET to seed' });
  
  const packages = [
    { category: 'Lakshadweep & Island', type: 'domestic', names: ["Island escape","Discover scuba","Sunset kayaking","Water sports day","Agatti Island stay","Bangaram private island","Minicoy island escape","Kadmat beach retreat"] },
    { category: 'Umrah Packages', type: 'pilgrimage', names: ["Umrah – Economy package","Umrah – Standard package","Umrah – Premium package","Umrah – Deluxe package","Umrah – Family package","Umrah – Ramadan package","Umrah – VIP package"] },
    { category: 'Domestic Tours', type: 'domestic', names: ["Kashmir – Valley in bloom","Kashmir – Dal Lake houseboat","Himachal Pradesh tour","Rajasthan heritage tour","Goa beach holiday","Kerala backwaters tour","Andaman island escape","Coorg hill station retreat","Ooty & Kodaikanal tour","Mysore & Coorg circuit","Force Urbania rental"] },
    { category: 'International Tours', type: 'international', names: ["Maldives – Overwater quiet","Dubai city tour","Thailand beach escape","Singapore & Malaysia tour","Bali cultural retreat","Europe group tour","Turkey heritage tour","Sri Lanka holiday"] },
    { category: 'Vehicle Hire', type: 'domestic', names: ["Force Urbania – Airport transfer","Force Urbania – Long distance","Force Urbania – Pilgrimage trip","Force Urbania – Corporate travel"] }
  ];

  try {
    const sql = db();
    let count = 0;

    for (const group of packages) {
      for (const name of group.names) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // check if it exists
        const existing = await sql`SELECT id FROM packages WHERE slug = ${slug}`;
        if (existing.length === 0) {
          await sql`
            INSERT INTO packages (
              name, slug, category, package_type, active
            ) VALUES (
              ${name}, ${slug}, ${group.category}, ${group.type}, true
            )
          `;
          count++;
        }
      }
    }

    return res.status(200).json({ ok: true, inserted: count, message: `Seeded ${count} packages.` });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Seed failed' });
  }
}
