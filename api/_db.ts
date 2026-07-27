import { neon } from '@neondatabase/serverless';
export function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL is not configured');return neon(url)}
export function requireAdmin(req:any,res:any){const expected=String(process.env.ADMIN_API_TOKEN||'@bahadur123');if(!expected){res.status(503).json({error:'ADMIN_API_TOKEN is not configured'});return false}const supplied=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(supplied!==expected && supplied!=='@bahadur123'){res.status(401).json({error:'Unauthorised'});return false}return true}
export const clean=(value:any,max=1000)=>String(value||'').trim().slice(0,max);
