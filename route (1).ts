import {NextResponse} from 'next/server';
export async function POST(req:Request){const f=await req.formData();const slug=String(f.get('slug')||'');return NextResponse.redirect(new URL(`/training/${slug}?acknowledged=1`,req.url),303)}
