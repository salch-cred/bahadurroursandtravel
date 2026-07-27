import { put } from '@vercel/blob';
import {db,clean,requireAdmin} from './_db.js';

export default async function handler(req:any,res:any){
  const sql=db();
  try{
    // ── GET ─────────────────────────────────────────────────
    if(req.method==='GET'){
      const slug=clean(req.query?.package,160);
      const limit=Math.min(200,Math.max(1,Number(req.query?.limit)||8));
      const isAdmin=req.query?.admin==='1';

      // Admin: return all reviews with full details including id and status
      if(isAdmin){
        if(!requireAdmin(req,res))return;
        const rows=await sql`select id,name,trip,rating,text,booking_ref,package_slug,media_url,media_type,status,created_at from reviews order by created_at desc limit ${limit}`;
        return res.status(200).json({reviews:rows});
      }

      // Public: only approved reviews
      const rows=slug
        ?await sql`select name,trip,rating,text,media_url,media_type,created_at from reviews where status='approved' and (package_slug=${slug} or package_slug is null) order by created_at desc limit ${limit}`
        :await sql`select name,trip,rating,text,media_url,media_type,created_at from reviews where status='approved' order by created_at desc limit ${limit}`;
      return res.status(200).json({reviews:rows});
    }

    // ── POST (submit new review) ─────────────────────────────
    if(req.method==='POST'){
      const b=req.body||{};
      if(!b.consent)return res.status(400).json({error:'Publication consent is required'});
      let media_url=null,media_type=null;
      if(b.data&&b.mimeType){
        if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Visitor media storage is not configured'});
        const buffer=Buffer.from(String(b.data),'base64');
        if(buffer.length>3*1024*1024)return res.status(400).json({error:'Media must be smaller than 3 MB'});
        const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
        if(!allowed.includes(b.mimeType))return res.status(400).json({error:'Unsupported media type'});
        const blob=await put(`reviews/${Date.now()}-${clean(b.fileName,120)}`,buffer,{access:'public',contentType:b.mimeType});
        media_url=blob.url;
        media_type=String(b.mimeType).startsWith('video/')?'video':'image';
      }
      const text=clean(b.text||b.review||b.comment||'',5000);
      if(text.length<10)return res.status(400).json({error:'Review must be at least 10 characters'});
      const row={
        name:clean(b.name,120),trip:clean(b.trip,160),
        rating:Math.max(1,Math.min(5,Number(b.rating)||5)),
        booking_ref:clean(b.bookingRef,80).replace(/^#/,'').toUpperCase(),
        package_slug:clean(b.packageSlug,160)||null,
        text,media_url,media_type,consent:true
      };
      if(!row.name||!row.trip||!row.booking_ref||!row.text)return res.status(400).json({error:'Complete all required fields'});
      const booking=await sql`select booking_id from bookings where upper(booking_id)=${row.booking_ref} limit 1`;
      const status=booking.length?'approved':'pending';
      await sql`insert into reviews(name,trip,rating,booking_ref,package_slug,text,media_url,media_type,consent,status) values(${row.name},${row.trip},${row.rating},${row.booking_ref},${row.package_slug},${row.text},${row.media_url},${row.media_type},true,${status})`;
      return res.status(201).json({ok:true,status});
    }

    // ── PATCH (update status) ─────────────────────────────────
    if(req.method==='PATCH'){
      if(!requireAdmin(req,res))return;
      const id=Number(req.query?.id);
      const {status}=req.body||{};
      if(!id||!['approved','pending','rejected'].includes(status))return res.status(400).json({error:'Invalid request'});
      await sql`update reviews set status=${status} where id=${id}`;
      return res.status(200).json({ok:true});
    }

    // ── DELETE ───────────────────────────────────────────────
    if(req.method==='DELETE'){
      if(!requireAdmin(req,res))return;
      const id=Number(req.query?.id);
      if(!id)return res.status(400).json({error:'Review ID required'});
      await sql`delete from reviews where id=${id}`;
      return res.status(200).json({ok:true});
    }

    return res.status(405).json({error:'Method not allowed'});
  }catch(error){
    return res.status(500).json({error:error instanceof Error?error.message:'Review request failed'});
  }
}
