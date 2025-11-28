import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const path = formData.get('path') as string;

        if (!file || !path) {
            return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Explicitly handle bucket name for robustness
        let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

        // Sanitize bucket name (remove gs:// prefix)
        if (bucketName) {
            bucketName = bucketName.replace(/^gs:\/\//, '').trim();
        }

        // Use the explicit bucket name if available, otherwise default
        const bucket = bucketName ? adminStorage.bucket(bucketName) : adminStorage.bucket();
        const fileRef = bucket.file(path);

        await fileRef.save(buffer, {
            contentType: file.type,
            metadata: {
                contentType: file.type,
            },
        });

        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Far future
        });

        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Upload error:', error);
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'unknown';
        // Added (v3) to verify deployment update
        return NextResponse.json({
            error: `(v3) Upload failed to bucket '${bucketName}'. Details: ${error.message}`
        }, { status: 500 });
    }
}
