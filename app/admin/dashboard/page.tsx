'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Room, MaintenanceRequest, Invoice } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Wrench,
    MoreVertical
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function DashboardPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [issues, setIssues] = useState<MaintenanceRequest[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    // Real-time Listeners
    useEffect(() => {
        // 1. Rooms
        const roomsUnsub = onSnapshot(collection(db, 'rooms'), (snapshot) => {
            const roomsData = snapshot.docs.map(doc => doc.data() as Room);
            // Sort by room number
            roomsData.sort((a, b) => a.room_number.localeCompare(b.room_number));
            setRooms(roomsData);
        });

        // 2. Active Issues
        const issuesQuery = query(
            collection(db, 'maintenance_requests'),
            where('status', 'in', ['open', 'in_progress']),
            orderBy('created_at', 'desc')
        );
        const issuesUnsub = onSnapshot(issuesQuery, (snapshot) => {
            setIssues(snapshot.docs.map(doc => doc.data() as MaintenanceRequest));
        });

        // 3. Pending Invoices (Just fetch once or listener? Listener is better for dashboard)
        const invoicesQuery = query(
            collection(db, 'invoices'),
            where('status', '==', 'pending')
        );
        const invoicesUnsub = onSnapshot(invoicesQuery, (snapshot) => {
            setPendingInvoices(snapshot.docs.map(doc => doc.data() as Invoice));
            setLoading(false);
        });

        return () => {
            roomsUnsub();
            issuesUnsub();
            invoicesUnsub();
        };
    }, []);

    // Metrics Calculation
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const totalPendingAmount = pendingInvoices
        .filter(inv => rooms.some(r => r.room_number === inv.room_id))
        .reduce((sum, inv) => sum + inv.total_amount, 0);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'vacant': return 'bg-green-100 text-green-800 border-green-200';
            case 'occupied': return 'bg-red-100 text-red-800 border-red-200';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'vacant': return 'ว่าง';
            case 'occupied': return 'มีผู้เช่า';
            case 'maintenance': return 'ซ่อมบำรุง';
            default: return status;
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">ภาพรวมสถานะหอพักวันนี้</p>
            </div>

            {/* Section A: Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">รายได้รอเรียกเก็บ</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">฿{totalPendingAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">จาก {pendingInvoices.length} บิลที่ยังไม่จ่าย</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">อัตราการเข้าพัก</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{occupancyRate}%</div>
                        <p className="text-xs text-muted-foreground">{occupiedRooms} จาก {totalRooms} ห้อง</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">แจ้งซ่อม (Active)</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{issues.length}</div>
                        <p className="text-xs text-muted-foreground">รายการที่กำลังดำเนินการ</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ห้องว่าง</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRooms - occupiedRooms}</div>
                        <p className="text-xs text-muted-foreground">พร้อมเข้าอยู่</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Section B: Room Grid */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>ผังห้องพัก</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {rooms.map((room) => (
                                <Dialog key={room.room_number}>
                                    <DialogTrigger asChild>
                                        <div
                                            className={`
                        cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105
                        ${getStatusColor(room.status)}
                      `}
                                        >
                                            <span className="text-2xl font-bold">{room.room_number}</span>
                                            <Badge variant="secondary" className="bg-white/50">
                                                {getStatusLabel(room.status)}
                                            </Badge>
                                            {room.status === 'occupied' && (
                                                <span className="text-xs opacity-75">ชั้น {room.floor}</span>
                                            )}
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>รายละเอียดห้อง {room.room_number}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">สถานะ</p>
                                                    <p>{getStatusLabel(room.status)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">ประเภท</p>
                                                    <p>{room.type === 'standard_air' ? 'แอร์' : 'พัดลม'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">ราคา</p>
                                                    <p>฿{room.base_price.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">ชั้น</p>
                                                    <p>{room.floor}</p>
                                                </div>
                                            </div>

                                            {room.status === 'occupied' && (
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-2">การจัดการ</h4>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => window.location.href = `/admin/invoices?room=${room.room_number}`}>จดมิเตอร์</Button>
                                                        <Button size="sm" variant="outline" onClick={() => window.location.href = `/admin/invoices?room=${room.room_number}`}>สร้างบิล</Button>
                                                        <Button size="sm" variant="outline" onClick={() => window.location.href = '/admin/rooms'}>ดูประวัติ</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Section C: Recent Activity */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>แจ้งซ่อมล่าสุด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {issues.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">ไม่มีรายการแจ้งซ่อม</p>
                            ) : (
                                issues.slice(0, 5).map((issue) => (
                                    <div key={issue.request_id} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                ห้อง {issue.room_id} - {issue.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {issue.description}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium">
                                            <Badge variant={issue.priority === 'high' ? 'destructive' : 'default'}>
                                                {issue.priority}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
