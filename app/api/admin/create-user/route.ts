import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { email, password, displayName, role, tenantData } = await request.json();

        if (!email || !password || !displayName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Create User in Firebase Auth
        let uid;
        try {
            const userRecord = await adminAuth.createUser({
                email,
                password,
                displayName,
            });
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                // If user exists, try to get UID (might be re-adding a tenant)
                const userRecord = await adminAuth.getUserByEmail(email);
                uid = userRecord.uid;
                // Optional: Update password if provided? For now, assume new user or error.
                return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
            } else {
                throw error;
            }
        }

        // 2. Create User Profile in Firestore
        await adminDb.collection('users').doc(uid).set({
            uid,
            email,
            role: role || 'tenant',
            created_at: Timestamp.now(),
        });

        // 3. Create Tenant Profile (if role is tenant)
        if (role === 'tenant' && tenantData) {
            await adminDb.collection('tenants').doc(uid).set({
                ...tenantData,
                tenant_id: uid,
                // Ensure dates are Timestamps
                contract_start_date: Timestamp.fromDate(new Date(tenantData.contract_start_date)),
                contract_end_date: Timestamp.fromDate(new Date(tenantData.contract_end_date)),
            });

            // 4. Update Room Status
            if (tenantData.current_room_id) {
                await adminDb.collection('rooms').doc(tenantData.current_room_id).update({
                    status: 'occupied',
                    current_tenant_id: uid,
                });
            }
        }

        return NextResponse.json({ success: true, uid });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
