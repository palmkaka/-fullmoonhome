'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserStore } from '@/lib/store/user-store';
import { Room, Tenant } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Phone, Home, FileText } from 'lucide-react';

export default function MyRoomPage() {
    const { dbUser } = useUserStore();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!dbUser) return;

        // Similar logic to Dashboard to fetch tenant
        const tenantUnsub = onSnapshot(query(collection(db, 'tenants'), where('tenant_id', '==', dbUser.uid)), (snapshot) => {
            if (!snapshot.empty) {
                const tenantData = snapshot.docs[0].data() as Tenant;
                setTenant(tenantData);

                if (tenantData.current_room_id) {
                    const roomUnsub = onSnapshot(query(collection(db, 'rooms'), where('room_number', '==', tenantData.current_room_id)), (roomSnap) => {
                        if (!roomSnap.empty) {
                            setRoom(roomSnap.docs[0].data() as Room);
                        }
                    });
                }
            }
            setLoading(false);
        });

        return () => tenantUnsub();
    }, [dbUser]);

    if (loading) return <div className="text-center py-10">กำลังโหลด...</div>;
    if (!tenant) return <div className="text-center py-10">ไม่พบข้อมูลผู้เช่า</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">ข้อมูลห้องพักและสัญญา</h2>
                <p className="text-muted-foreground">รายละเอียดสัญญาเช่าและข้อมูลส่วนตัว</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Room Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="h-5 w-5" />
                            ข้อมูลห้องพัก
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">หมายเลขห้อง</p>
                                <p className="text-2xl font-bold">{tenant.current_room_id}</p>
                            </div>
                            <Badge variant="outline" className="text-lg px-3 py-1">
                                {room?.status === 'occupied' ? 'เข้าพักอยู่' : room?.status}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">ชั้น</p>
                                <p className="font-medium">{room?.floor || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">ประเภทห้อง</p>
                                <p className="font-medium">
                                    {room?.type === 'standard_air' ? 'ห้องแอร์' :
                                        room?.type === 'standard_fan' ? 'ห้องพัดลม' : room?.type}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">ค่าเช่ารายเดือน</p>
                                <p className="font-medium">฿{room?.base_price.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">สิ่งอำนวยความสะดวก</p>
                                <p className="font-medium text-sm">
                                    {room?.facilities?.join(', ') || '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contract Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            ข้อมูลสัญญา
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">ชื่อผู้เช่า</p>
                                    <p className="font-medium">{tenant.full_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">เบอร์โทรศัพท์</p>
                                    <p className="font-medium">{tenant.phone_number}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">วันที่เริ่มสัญญา</p>
                                    <p className="font-medium">
                                        {tenant.contract_start_date.toDate().toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">วันสิ้นสุดสัญญา</p>
                                    <p className="font-medium">
                                        {tenant.contract_end_date.toDate().toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-sm font-medium mb-2">ผู้ติดต่อฉุกเฉิน</p>
                            <div className="text-sm space-y-1 text-muted-foreground">
                                <p>ชื่อ: {tenant.emergency_contact.name}</p>
                                <p>เบอร์โทร: {tenant.emergency_contact.phone}</p>
                                <p>ความสัมพันธ์: {tenant.emergency_contact.relation}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
