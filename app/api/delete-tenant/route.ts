import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
    try {
        const { tenant_id } = await req.json();

        if (!tenant_id) {
            return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
        }

        // Delete Firebase Auth user
        await adminAuth.deleteUser(tenant_id);

        return NextResponse.json({ success: true, message: 'Auth account deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting auth account:', error);

        // Handle case where user doesn't exist
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ success: true, message: 'Auth account already deleted or not found' });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
