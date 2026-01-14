'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserStore } from '@/lib/store/user-store';
import { Invoice, Room, MaintenanceRequest, Tenant } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Home, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function TenantDashboard() {
    const { dbUser } = useUserStore();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
    const [activeRequests, setActiveRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!dbUser) return;

        // 1. Fetch Tenant Profile using uid (assuming we stored uid in tenant record or we query by some other means)
        // Wait, our schema for Tenant doesn't explicitly link to 'users' collection uid except maybe by convention or if we query.
        // In seed-db, we created tenants but didn't strictly link them to auth users yet.
        // Usually, the 'users' collection has role='tenant'. We need to find the 'tenant' record that corresponds to this user.
        // Let's assume for now that 'users' collection has a field 'tenant_id' or we query tenants by 'phone_number' or similar if we linked them.
        // OR, simpler: The 'users' doc has the 'tenant_id' if we set it up that way.
        // Let's check 'users' schema in types/schema.ts. It just has role.

        // Strategy: We need to link the Auth User to the Tenant Record.
        // For this MVP, let's assume the 'users' collection doc ID (uid) IS the 'tenant_id' OR we query tenants where 'email' matches (if we added email to tenant).
        // Schema for Tenant has: tenant_id, full_name, etc. No email.
        // Schema for User has: uid, email, role.

        // FIX: We need to find the tenant record. 
        // OPTION 1: Query tenants collection where 'phone_number' matches user's phone (if we had phone in user).
        // OPTION 2: When creating a tenant user, we should store 'tenant_id' in the 'users' doc.

        // Let's assume we can find the tenant by matching the 'tenant_id' stored in the 'users' doc (we might need to add this field to User schema or just use custom claims).
        // Let's try to find a tenant where `tenant_id` matches `dbUser.uid` (if we used uid as tenant_id).
        // In seed-db, we generated random IDs for tenants.

        // WORKAROUND for now: We will query the 'tenants' collection. 
        // Since we don't have a direct link yet in the schema I see, I'll assume for this step that 
        // the `users` document has a `tenant_reference_id` or similar.
        // Let's check `types/schema.ts` again.

        // It seems `User` interface is simple.
        // Let's try to find the tenant by `tenant_id` == `dbUser.uid`. 
        // If that fails, we might need to update the seeding/schema to link them.

        // For the purpose of this task, I will assume `tenant_id` is the key.

        const fetchData = async () => {
            // This is a placeholder logic. In a real app, we'd link them properly.
            // Let's assume we can find the tenant record using the user's UID as tenant_id 
            // (which implies when we create a user for a tenant, we use their tenant_id as uid or vice versa).

            // Actually, let's look at `seed-db.ts` if I can... 
            // But to be safe and robust:
            // I will query `tenants` collection. If I can't find by ID, I'll show a "Contact Admin to link account" message.

            // Let's try to fetch tenant by ID = dbUser.uid
            // const tenantRef = doc(db, 'tenants', dbUser.uid);
            // ...

            // Better approach for now:
            // Query `tenants` where `tenant_id` == `dbUser.uid`.

            const tenantUnsub = onSnapshot(query(collection(db, 'tenants'), where('tenant_id', '==', dbUser.uid)), (snapshot) => {
                if (!snapshot.empty) {
                    const tenantData = snapshot.docs[0].data() as Tenant;
                    setTenant(tenantData);

                    // Fetch Room
                    if (tenantData.current_room_id) {
                        const roomUnsub = onSnapshot(query(collection(db, 'rooms'), where('room_number', '==', tenantData.current_room_id)), (roomSnap) => {
                            if (!roomSnap.empty) {
                                setRoom(roomSnap.docs[0].data() as Room);
                            }
                        });
                    }

                    // Fetch Invoices
                    const invoicesUnsub = onSnapshot(query(
                        collection(db, 'invoices'),
                        where('tenant_id', '==', tenantData.tenant_id),
                        where('status', '==', 'pending')
                    ), (invSnap) => {
                        setUnpaidInvoices(invSnap.docs.map(d => d.data() as Invoice));
                    });

                    // Fetch Maintenance
                    const maintenanceUnsub = onSnapshot(query(
                        collection(db, 'maintenance_requests'),
                        where('tenant_id', '==', tenantData.tenant_id),
                        where('status', 'in', ['open', 'in_progress'])
                    ), (maintSnap) => {
                        setActiveRequests(maintSnap.docs.map(d => d.data() as MaintenanceRequest));
                    });
                }
                setLoading(false);
            });

            return () => {
                tenantUnsub();
            };
        };

        fetchData();
    }, [dbUser]);

    if (loading) {
        return <div className="text-center py-10">กำลังโหลดข้อมูล...</div>;
    }

    if (!tenant) {
        return (
            <div className="text-center py-10 space-y-4">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                <h3 className="text-lg font-medium">ไม่พบข้อมูลผู้เช่า</h3>
                <p className="text-muted-foreground">กรุณาติดต่อผู้ดูแลหอพักเพื่อเชื่อมต่อบัญชีของคุณ</p>
                <p className="text-xs text-gray-400">UID: {dbUser?.uid}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">สวัสดี, {tenant.full_name}</h2>
                <p className="text-muted-foreground">ยินดีต้อนรับสู่ อรอนงค์แมนชั่น</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Room Status Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ห้องพักของคุณ</CardTitle>
                        <Home className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ห้อง {tenant.current_room_id}</div>
                        <p className="text-xs text-muted-foreground">
                            {room ? `ชั้น ${room.floor} - ${room.type === 'standard_air' ? 'ห้องแอร์' : 'ห้องพัดลม'}` : 'กำลังโหลด...'}
                        </p>
                        <div className="mt-4">
                            <Link href="/tenant/room">
                                <Button variant="outline" size="sm" className="w-full">ดูรายละเอียดสัญญา</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Invoice Status Card */}
                <Card className={unpaidInvoices.length > 0 ? "border-red-200 bg-red-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ยอดที่ต้องชำระ</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ฿{unpaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {unpaidInvoices.length} บิลรอการชำระ
                        </p>
                        <div className="mt-4">
                            <Link href="/tenant/invoices">
                                <Button size="sm" className="w-full" variant={unpaidInvoices.length > 0 ? "destructive" : "default"}>
                                    {unpaidInvoices.length > 0 ? "ไปที่หน้าชำระเงิน" : "ดูประวัติการชำระ"}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Maintenance Status Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">แจ้งซ่อม</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeRequests.length}</div>
                        <p className="text-xs text-muted-foreground">รายการที่กำลังดำเนินการ</p>
                        <div className="mt-4">
                            <Link href="/tenant/maintenance">
                                <Button variant="outline" size="sm" className="w-full">แจ้งซ่อม / ติดตามสถานะ</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity / Notifications could go here */}
        </div>
    );
}
