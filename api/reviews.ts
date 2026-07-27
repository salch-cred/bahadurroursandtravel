import { put } from '@vercel/blob';
import {db,clean,requireAdmin} from './_db.js';

export const config={api:{bodyParser:{sizeLimit:'50mb'}}};

async function uploadFile(data:string,mimeType:string,fileName:string){
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Visitor media storage is not configured');
  const buffer=Buffer.from(String(data),'base64');
  const MAX=50*1024*1024; // 50 MB
  if(buffer.length>MAX)throw new Error('File too large. Maximum size is 50 MB per file.');
  const allowed=['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/webm','video/quicktime','video/mov','video/avi'];
  const mime=String(mimeType).toLowerCase();
  if(!allowed.includes(mime))throw new Error('Unsupported file type. Upload images (JPEG, PNG, WebP) or videos (MP4, WebM, MOV).');
  const ext=mime.includes('video/')?'video':'image';
  const blob=await put(`reviews/${ext}/${Date.now()}-${clean(fileName,120)}`,buffer,{access:'public',contentType:mime});
  return {url:blob.url,type:ext};
}

export default async function handler(req:any,res:any){
  const sql=db();
  try{
    // ── GET ─────────────────────────────────────────────────────────
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

    // ── POST (submit new review) ────────────────────────────────────
    if(req.method==='POST'){
      const b=req.body||{};
      if(!b.consent)return res.status(400).json({error:'Publication consent is required'});

      const text=clean(b.text||b.review||b.comment||'',5000);
      if(text.length<10)return res.status(400).json({error:'Review must be at least 10 characters'});

      // Handle media uploads — supports both single file (b.data) and multi-file array (b.files)
      let media_url:string|null=null;
      let media_type:string|null=null;

      const filesToUpload:Array<{data:string,mimeType:string,fileName:string}>=[];
      if(b.files&&Array.isArray(b.files)&&b.files.length){
        filesToUpload.push(...b.files);
      } else if(b.data&&b.mimeType){
        filesToUpload.push({data:b.data,mimeType:b.mimeType,fileName:b.fileName||'upload'});
      }

      if(filesToUpload.length){
        try{
          // Upload first file (primary media)
          const result=await uploadFile(filesToUpload[0].data,filesToUpload[0].mimeType,filesToUpload[0].fileName||'upload');
          media_url=result.url;
          media_type=result.type;
        }catch(err:any){
          return res.status(400).json({error:err.message||'File upload failed'});
        }
      }

      const bookingRef=clean(b.bookingRef||b.booking_ref||'',80).replace(/^#/,'').toUpperCase();
      const row={
        name:clean(b.name,120),
        trip:clean(b.trip,160),
        rating:Math.max(1,Math.min(5,Number(b.rating)||5)),
        booking_ref:bookingRef,
        package_slug:clean(b.packageSlug||b.package_slug,160)||null,
        text,media_url,media_type,consent:true
      };
      if(!row.name||!row.trip||!row.booking_ref||!row.text)
        return res.status(400).json({error:'Name, trip, booking reference and review text are all required'});

      // Check if booking exists (match booking_ref column)
      const booking=await sql`select id from bookings where upper(booking_ref)=${row.booking_ref} limit 1`;
      const status=booking.length?'approved':'pending';

      await sql`insert into reviews(name,trip,rating,booking_ref,package_slug,text,media_url,media_type,consent,status) values(${row.name},${row.trip},${row.rating},${row.booking_ref},${row.package_slug},${row.text},${row.media_url},${row.media_type},true,${status})`;
      return res.status(201).json({ok:true,status,message:status==='approved'?'Review published!':'Submitted for approval.'});
    }

    // ── PATCH (update status) ───────────────────────────────────────
    if(req.method==='PATCH'){
      if(!requireAdmin(req,res))return;
      const id=clean(req.query?.id||'',40);
      const {status}=req.body||{};
      if(!id||!['approved','pending','rejected'].includes(status))return res.status(400).json({error:'Invalid request'});
      await sql`update reviews set status=${status} where id=${id}::uuid`;
      return res.status(200).json({ok:true});
    }

    // ── DELETE ──────────────────────────────────────────────────────
    if(req.method==='DELETE'){
      if(!requireAdmin(req,res))return;
      const id=clean(req.query?.id||'',40);
      if(!id)return res.status(400).json({error:'Review ID required'});
      await sql`delete from reviews where id=${id}::uuid`;
      return res.status(200).json({ok:true});
    }

    return res.status(405).json({error:'Method not allowed'});
  }catch(error){
    return res.status(500).json({error:error instanceof Error?error.message:'Review request failed'});
  }
}
