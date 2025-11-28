'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Tenant, Room } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, Pencil, Trash2, Search, Phone, User as UserIcon } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

    // Initial Form State
    const initialFormState = {
        tenant_id: '', // Usually auto-generated or same as Auth UID, but for manual entry let's use a random ID or phone
        full_name: '',
        id_card_number: '',
        phone_number: '',
        current_room_id: '',
        deposit_amount: 0,
        emergency_contact: {
            name: '',
            phone: '',
            relation: '',
        },
        contract_start_date: new Date().toISOString().split('T')[0], // For input type="date"
        contract_end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    };

    const [formData, setFormData] = useState(initialFormState);

    // Real-time Fetch
    useEffect(() => {
        const unsubTenants = onSnapshot(collection(db, 'tenants'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Tenant);
            setTenants(data);
            setLoading(false);
        });

        const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
            setRooms(snapshot.docs.map(doc => doc.data() as Room));
        });

        return () => {
            unsubTenants();
            unsubRooms();
        };
    }, []);

    const handleOpenDialog = (tenant?: Tenant) => {
        if (tenant) {
            setEditingTenant(tenant);
            setFormData({
                tenant_id: tenant.tenant_id,
                full_name: tenant.full_name,
                id_card_number: tenant.id_card_number,
                phone_number: tenant.phone_number,
                current_room_id: tenant.current_room_id,
                deposit_amount: tenant.deposit_amount,
                emergency_contact: { ...tenant.emergency_contact },
                contract_start_date: tenant.contract_start_date.toDate().toISOString().split('T')[0],
                contract_end_date: tenant.contract_end_date.toDate().toISOString().split('T')[0],
            });
        } else {
            setEditingTenant(null);
            setFormData({ ...initialFormState, tenant_id: crypto.randomUUID() }); // Generate ID for new tenant
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const tenantData: any = {
                ...formData,
                contract_start_date: Timestamp.fromDate(new Date(formData.contract_start_date)),
                contract_end_date: Timestamp.fromDate(new Date(formData.contract_end_date)),
                deposit_amount: Number(formData.deposit_amount),
                documents: editingTenant?.documents || [], // Preserve documents
            };

            if (editingTenant) {
                await updateDoc(doc(db, 'tenants', editingTenant.tenant_id), tenantData);

                // Update Room Status if room changed (Optional: handle old room vacant, new room occupied)
                // This logic can be complex. For now, let's assume manual room status update or handle basic switch.
                if (editingTenant.current_room_id !== formData.current_room_id) {
                    // Free up old room
                    if (editingTenant.current_room_id) {
                        await updateDoc(doc(db, 'rooms', editingTenant.current_room_id), { status: 'vacant', current_tenant_id: null });
                    }
                    // Occupy new room
                    if (formData.current_room_id) {
                        await updateDoc(doc(db, 'rooms', formData.current_room_id), { status: 'occupied', current_tenant_id: formData.tenant_id });
                    }
                }
            } else {
                await setDoc(doc(db, 'tenants', formData.tenant_id), tenantData);
                // Set room to occupied
                if (formData.current_room_id) {
                    await updateDoc(doc(db, 'rooms', formData.current_room_id), { status: 'occupied', current_tenant_id: formData.tenant_id });
                }
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving tenant:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    const handleDelete = async (tenantId: string, roomId: string) => {
        if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้เช่านี้?")) {
            try {
                await deleteDoc(doc(db, 'tenants', tenantId));
                // Free up room
                if (roomId) {
                    await updateDoc(doc(db, 'rooms', roomId), { status: 'vacant', current_tenant_id: null });
                }
            } catch (error) {
                console.error("Error deleting tenant:", error);
                alert(`เกิดข้อผิดพลาดในการลบข้อมูล: ${(error as Error).message}`);
            }
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.current_room_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">จัดการผู้เช่า</h2>
                    <p className="text-muted-foreground">รายชื่อผู้เช่าและสัญญาเช่า</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> เพิ่มผู้เช่า
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหาชื่อ หรือ เลขห้อง..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อ-นามสกุล</TableHead>
                            <TableHead>ห้องพัก</TableHead>
                            <TableHead>เบอร์โทร</TableHead>
                            <TableHead>วันเริ่มสัญญา</TableHead>
                            <TableHead>วันสิ้นสุด</TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">กำลังโหลด...</TableCell>
                            </TableRow>
                        ) : filteredTenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">ไม่พบข้อมูลผู้เช่า</TableCell>
                            </TableRow>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <TableRow key={tenant.tenant_id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                            {tenant.full_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{tenant.current_room_id}</Badge>
                                    </TableCell>
                                    <TableCell>{tenant.phone_number}</TableCell>
                                    <TableCell>{tenant.contract_start_date.toDate().toLocaleDateString('th-TH')}</TableCell>
                                    <TableCell>{tenant.contract_end_date.toDate().toLocaleDateString('th-TH')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(tenant)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> แก้ไข
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(tenant.tenant_id, tenant.current_room_id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> ลบ
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTenant ? 'แก้ไขข้อมูลผู้เช่า' : 'เพิ่มผู้เช่าใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="id_card">เลขบัตรประชาชน</Label>
                                <Input
                                    id="id_card"
                                    value={formData.id_card_number}
                                    onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room">ห้องพัก</Label>
                                <Select
                                    value={formData.current_room_id}
                                    onValueChange={(v) => setFormData({ ...formData, current_room_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกห้องพัก" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rooms.map((room) => (
                                            <SelectItem
                                                key={room.room_number}
                                                value={room.room_number}
                                                disabled={room.status === 'occupied' && room.room_number !== editingTenant?.current_room_id}
                                            >
                                                {room.room_number} {room.status === 'occupied' ? '(ไม่ว่าง)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">วันเริ่มสัญญา</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={formData.contract_start_date}
                                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">วันสิ้นสุดสัญญา</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={formData.contract_end_date}
                                    onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deposit">เงินประกัน (บาท)</Label>
                            <Input
                                id="deposit"
                                type="number"
                                value={formData.deposit_amount}
                                onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                            />
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-3">ผู้ติดต่อฉุกเฉิน</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="em_name">ชื่อ</Label>
                                    <Input
                                        id="em_name"
                                        value={formData.emergency_contact.name}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="em_phone">เบอร์โทร</Label>
                                    <Input
                                        id="em_phone"
                                        value={formData.emergency_contact.phone}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="em_relation">ความสัมพันธ์</Label>
                                    <Input
                                        id="em_relation"
                                        value={formData.emergency_contact.relation}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            emergency_contact: { ...formData.emergency_contact, relation: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit">บันทึก</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
