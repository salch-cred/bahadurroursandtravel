import { put } from '@vercel/blob';
import {db,clean,requireAdmin} from './_db.js';

export const config={api:{bodyParser:{sizeLimit:'50mb'}}};

function safeFileName(raw: string): string {
  // Keep only safe characters for Vercel Blob path
  return String(raw||'upload')
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'upload';
}

async function uploadFile(data:string,mimeType:string,fileName:string){
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Media storage is not configured. Please contact us on WhatsApp.');
  const buffer=Buffer.from(String(data),'base64');
  const MAX=50*1024*1024; // 50 MB
  if(buffer.length>MAX)throw new Error('File too large. Maximum size is 50 MB per file.');
  const allowed=['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/webm','video/quicktime','video/mov','video/avi'];
  const mime=String(mimeType).toLowerCase();
  if(!allowed.includes(mime))throw new Error('Unsupported file type. Upload images (JPEG, PNG, WebP) or videos (MP4, WebM, MOV).');
  const ext=mime.includes('video/')?'video':'image';
  const safe=safeFileName(fileName);
  const blob=await put(`reviews/${ext}/${Date.now()}-${safe}`,buffer,{access:'public',contentType:mime});
  return {url:blob.url,type:ext};
}

export default async function handler(req:any,res:any){
  const sql=db();
  try{
    // ── GET ──────────────────────────────────────────────────────────
    if(req.method==='GET'){
      const slug=clean(req.query?.package,160);
      const limit=Math.min(200,Math.max(1,Number(req.query?.limit)||8));
      const isAdmin=req.query?.admin==='1';
      if(isAdmin){
        if(!requireAdmin(req,res))return;
        const rows=await sql`select id,name,trip,rating,text,booking_ref,package_slug,media_url,media_type,status,created_at from reviews order by created_at desc limit ${limit}`;
        return res.status(200).json({reviews:rows});
      }
      const rows=slug
        ?await sql`select name,trip,rating,text,media_url,media_type,created_at from reviews where status='approved' and (package_slug=${slug} or package_slug is null) order by created_at desc limit ${limit}`
        :await sql`select name,trip,rating,text,media_url,media_type,created_at from reviews where status='approved' order by created_at desc limit ${limit}`;
      return res.status(200).json({reviews:rows});
    }

    // ── POST (submit new review) ──────────────────────────────────────
    if(req.method==='POST'){
      const b=req.body||{};
      if(!b.consent)return res.status(400).json({error:'Publication consent is required'});
      let media_url=null,media_type=null;
      const filePayload = b.files && b.files.length > 0 ? b.files[0] : b;
      
      if(filePayload.url && filePayload.mimeType && filePayload.url.includes('vercel-storage.com')){
        // Direct Client Upload support
        media_url = filePayload.url;
        media_type = String(filePayload.mimeType).startsWith('video/')?'video':'image';
      } else if(filePayload.data&&filePayload.mimeType){
        if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Visitor media storage is not configured'});
        const buffer=Buffer.from(String(filePayload.data),'base64');
        if(buffer.length>5*1024*1024)return res.status(400).json({error:'Media must be smaller than 5 MB'});
        const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
        if(!allowed.includes(filePayload.mimeType))return res.status(400).json({error:'Unsupported media type'});
        const safeName = clean(filePayload.fileName,120).replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const blob=await put(`reviews/${Date.now()}-${safeName}`,buffer,{access:'public',contentType:filePayload.mimeType});
        media_url=blob.url;
        media_type=String(filePayload.mimeType).startsWith('video/')?'video':'image';
      }
      const row={
        name:clean(b.name,120),trip:clean(b.trip,160),
        rating:Math.max(1,Math.min(5,Number(b.rating)||5)),
        booking_ref:clean(b.bookingRef,80).replace(/^#/,'').toUpperCase(),
        package_slug:clean(b.packageSlug,160)||null,
        text:clean(b.text,1200),media_url,media_type,consent:true
      };
      if(!row.name||!row.trip||!row.booking_ref||!row.text)return res.status(400).json({error:'Complete all required fields'});
      const booking=await sql`select booking_ref from bookings where upper(booking_ref)=${row.booking_ref} limit 1`;
      const status=booking.length?'approved':'pending';
      await sql`insert into reviews(name,trip,rating,booking_ref,package_slug,text,media_url,media_type,consent,status) values(${row.name},${row.trip},${row.rating},${row.booking_ref},${row.package_slug},${row.text},${row.media_url},${row.media_type},true,${status})`;
      return res.status(201).json({ok:true,status});
    }

    // ── PATCH (update status) ─────────────────────────────────────────
    if(req.method==='PATCH'){
      if(!requireAdmin(req,res))return;
      const id=clean(req.query?.id||'',40);
      const {status}=req.body||{};
      if(!id||!['approved','pending','rejected'].includes(status))return res.status(400).json({error:'Invalid request'});
      await sql`update reviews set status=${status} where id=${id}::uuid`;
      return res.status(200).json({ok:true});
    }

    // ── DELETE ────────────────────────────────────────────────────────
    if(req.method==='DELETE'){
      if(!requireAdmin(req,res))return;
      const id=clean(req.query?.id||'',40);
      if(!id)return res.status(400).json({error:'Review ID required'});
      await sql`delete from reviews where id=${id}::uuid`;
      return res.status(200).json({ok:true});
    }

    return res.status(405).json({error:'Method not allowed'});
  }catch(error){
    console.error('Review error:',error);
    return res.status(500).json({error:error instanceof Error?error.message:'Review request failed'});
  }
}
