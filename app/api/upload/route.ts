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

        // Make the file public or generate a signed URL
        // For simplicity and since we want a permanent URL, we'll make it public.
        // Note: This requires the bucket to allow public access or we use a signed URL with long expiration.
        // Better approach for private data: Generate a signed URL.
        // But for this app, we want a simple URL. Let's use getSignedUrl with a very long expiration (e.g., 100 years)
        // OR just return the storage path and let the client use getDownloadURL?
        // Wait, getDownloadURL is client-side and might still have CORS issues if not configured?
        // No, getDownloadURL fetches metadata. The actual download link might be different.

        // Let's try to make it public for now as it's the easiest for "payment slips" which are somewhat transient.
        // Actually, better to use signed URL for security.

        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Far future
        });

        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
