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

        let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            return NextResponse.json({ error: 'Server Error: Storage bucket not configured' }, { status: 500 });
        }

        bucketName = bucketName.trim();
        // Strip gs:// if present, as admin SDK expects just the name
        if (bucketName.startsWith('gs://')) {
            bucketName = bucketName.slice(5);
        }

        const bucket = adminStorage.bucket(bucketName);
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
        // Include bucket name in error message for debugging
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'unknown';
        return NextResponse.json({
            error: `Upload failed to bucket '${bucketName}'. Details: ${error.message}`
        }, { status: 500 });
    }
}
