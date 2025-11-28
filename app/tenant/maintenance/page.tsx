'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserStore } from '@/lib/store/user-store';
import { MaintenanceRequest, Tenant } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function TenantMaintenancePage() {
    const { dbUser } = useUserStore();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<Tenant | null>(null);

    // Create Request State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({
        title: '',
        description: ''
    });

    useEffect(() => {
        if (!dbUser) return;

        // Fetch Tenant to get room_id
        const tenantUnsub = onSnapshot(query(collection(db, 'tenants'), where('tenant_id', '==', dbUser.uid)), (snapshot) => {
            if (!snapshot.empty) {
                const tenantData = snapshot.docs[0].data() as Tenant;
                setTenant(tenantData);

                // Fetch Requests
                const q = query(
                    collection(db, 'maintenance_requests'),
                    where('tenant_id', '==', tenantData.tenant_id)
                    // orderBy('created_at', 'desc') // Needs index
                );

                const requestsUnsub = onSnapshot(q, (reqSnapshot) => {
                    const data = reqSnapshot.docs.map(doc => ({
                        ...(doc.data() as MaintenanceRequest),
                        request_id: doc.id
                    }));
                    data.sort((a, b) => b.created_at.seconds - a.created_at.seconds);
                    setRequests(data);
                    setLoading(false);
                });

                return () => requestsUnsub();
            } else {
                setLoading(false);
            }
        });

        return () => tenantUnsub();
    }, [dbUser]);

    const handleCreateRequest = async () => {
        if (!tenant || !newRequest.title) return;

        try {
            const docRef = await addDoc(collection(db, 'maintenance_requests'), {
                room_id: tenant.current_room_id,
                tenant_id: tenant.tenant_id,
                title: newRequest.title,
                description: newRequest.description,
                images: [],
                priority: 'medium', // Default for tenant
                status: 'open',
                created_at: Timestamp.now()
            });

            await updateDoc(docRef, { request_id: docRef.id });

            setIsCreateOpen(false);
            setNewRequest({ title: '', description: '' });
            alert("แจ้งซ่อมเรียบร้อย");
        } catch (error) {
            console.error("Error creating request:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge className="bg-red-500">รอดำเนินการ</Badge>;
            case 'in_progress': return <Badge className="bg-yellow-500 text-black">กำลังซ่อม</Badge>;
            case 'resolved': return <Badge className="bg-green-500">เสร็จสิ้น</Badge>;
            case 'closed': return <Badge variant="secondary">ปิดงาน</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) return <div className="text-center py-10">กำลังโหลด...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">แจ้งซ่อม</h2>
                    <p className="text-muted-foreground">รายการแจ้งซ่อมและติดตามสถานะ</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> แจ้งซ่อมใหม่
                </Button>
            </div>

            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/10">
                        <Wrench className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>ยังไม่มีประวัติการแจ้งซ่อม</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <Card key={req.request_id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-bold">{req.title}</CardTitle>
                                        <CardDescription>
                                            แจ้งเมื่อ: {req.created_at.toDate().toLocaleDateString('th-TH')}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(req.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600">{req.description || '-'}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>แจ้งปัญหาการใช้งาน</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>หัวข้อปัญหา</Label>
                            <Input
                                placeholder="เช่น แอร์ไม่เย็น, น้ำไม่ไหล"
                                value={newRequest.title}
                                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>รายละเอียด</Label>
                            <Textarea
                                placeholder="อธิบายเพิ่มเติม..."
                                value={newRequest.description}
                                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleCreateRequest} disabled={!newRequest.title}>ส่งเรื่อง</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
