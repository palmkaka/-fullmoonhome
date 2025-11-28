'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, Timestamp, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Invoice, Room, Tenant, HostelSettings } from '@/types/schema';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, FileText, CheckCircle2, XCircle, Search, Printer, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function InvoicesPage() {
    const searchParams = useSearchParams();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [settings, setSettings] = useState<HostelSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Invoice Generation Form State
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
    const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());

    // Meter Readings
    const [waterOld, setWaterOld] = useState(0);
    const [waterNew, setWaterNew] = useState(0);
    const [electricOld, setElectricOld] = useState(0);
    const [electricNew, setElectricNew] = useState(0);

    // Extra Items
    const [waterCrateCount, setWaterCrateCount] = useState(0); // จำนวนลังน้ำดื่ม
    const [numberOfPeople, setNumberOfPeople] = useState(1); // For flat rate water
    const [extraItems, setExtraItems] = useState<{ name: string, amount: number }[]>([]);

    // Real-time Fetch
    useEffect(() => {
        const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), orderBy('created_at', 'desc')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                ...(doc.data() as Invoice),
                invoice_id: doc.id
            }));
            // Sort by due_date desc if created_at is missing or just rely on query
            data.sort((a, b) => b.due_date.seconds - a.due_date.seconds);
            setInvoices(data);
            setLoading(false);
        });

        const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
            setRooms(snapshot.docs.map(doc => doc.data() as Room));
        });

        const unsubTenants = onSnapshot(collection(db, 'tenants'), (snapshot) => {
            setTenants(snapshot.docs.map(doc => doc.data() as Tenant));
        });

        // Fetch Settings once
        getDoc(doc(db, 'hostel_settings', 'config')).then((docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as HostelSettings);
            }
        });

        return () => {
            unsubInvoices();
            unsubRooms();
            unsubTenants();
        };
    }, []);

    // Handle URL Params for Pre-selection
    useEffect(() => {
        const roomParam = searchParams.get('room');
        if (roomParam && rooms.length > 0 && !isDialogOpen) {
            const roomExists = rooms.find(r => r.room_number === roomParam);
            if (roomExists && roomExists.status === 'occupied') {
                handleRoomSelect(roomParam);
                setIsDialogOpen(true);
            }
        }
    }, [searchParams, rooms]);

    const handleRoomSelect = (roomId: string) => {
        setSelectedRoomId(roomId);
        // Reset meters (In real app, fetch last month's reading here)
        setWaterOld(0);
        setWaterNew(0);
        setElectricOld(0);
        setElectricNew(0);
        setNumberOfPeople(1);
        setWaterCrateCount(0);
    };

    const calculateTotal = () => {
        if (!settings || !selectedRoomId) return 0;

        const room = rooms.find(r => r.room_number === selectedRoomId);
        const rent = room?.base_price || 0;

        let waterCost = 0;
        if (settings.water_calculation_method === 'person') {
            waterCost = numberOfPeople * (settings.water_price_per_person || 100);
        } else {
            waterCost = (waterNew - waterOld) * settings.water_unit_price;
        }

        const electricCost = (electricNew - electricOld) * settings.electric_unit_price;
        const waterCrateCost = waterCrateCount * 50; // Assuming 50 THB per crate
        const extraCost = extraItems.reduce((sum, item) => sum + item.amount, 0);

        return rent + Math.max(0, waterCost) + Math.max(0, electricCost) + waterCrateCost + extraCost;
    };

    const handleCreateInvoice = async () => {
        if (!selectedRoomId || !settings) return;

        const room = rooms.find(r => r.room_number === selectedRoomId);
        if (!room || !room.current_tenant_id) {
            alert("ห้องนี้ไม่มีผู้เช่า");
            return;
        }

        const tenant = tenants.find(t => t.tenant_id === room.current_tenant_id);
        if (!tenant) return;

        const electricUsage = Math.max(0, electricNew - electricOld);
        const electricCost = electricUsage * settings.electric_unit_price;

        let waterCost = 0;
        let waterItemName = '';

        if (settings.water_calculation_method === 'person') {
            waterCost = numberOfPeople * (settings.water_price_per_person || 100);
            waterItemName = `ค่าน้ำ (เหมาจ่าย ${numberOfPeople} คน x ${settings.water_price_per_person || 100} บาท)`;
        } else {
            const waterUsage = Math.max(0, waterNew - waterOld);
            waterCost = waterUsage * settings.water_unit_price;
            waterItemName = `ค่าน้ำ (${waterNew} - ${waterOld} = ${waterUsage} หน่วย)`;
        }

        const items = [
            { name: 'ค่าเช่าห้อง', amount: room.base_price },
            { name: waterItemName, amount: waterCost },
            { name: `ค่าไฟ (${electricNew} - ${electricOld} = ${electricUsage} หน่วย)`, amount: electricCost },
        ];

        if (waterCrateCount > 0) {
            items.push({ name: `น้ำดื่ม (${waterCrateCount} ลัง)`, amount: waterCrateCount * 50 });
        }

        extraItems.forEach(item => items.push(item));

        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        const invoiceId = `INV-${invoiceYear}${String(invoiceMonth).padStart(2, '0')}-${room.room_number}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5); // Due in 5 days

        const newInvoice: Invoice = {
            invoice_id: invoiceId,
            room_id: room.room_number,
            tenant_id: tenant.tenant_id,
            month: invoiceMonth,
            year: invoiceYear,
            status: 'pending',
            items: items,
            total_amount: totalAmount,
            due_date: Timestamp.fromDate(dueDate),
            payment_proof_url: null,
            paid_at: null,
        };

        try {
            // Check if invoice exists
            const invoiceRef = doc(db, 'invoices', invoiceId);
            const invoiceSnap = await getDoc(invoiceRef);
            if (invoiceSnap.exists()) {
                alert("บิลรอบนี้ถูกสร้างไปแล้ว");
                return;
            }

            // Use setDoc to specify ID
            await setDoc(invoiceRef, {
                ...newInvoice,
                created_at: Timestamp.now() // Add created_at for sorting
            });

            setIsDialogOpen(false);
            // Reset form
            setSelectedRoomId('');
            setWaterCrateCount(0);
            setExtraItems([]);
            setNumberOfPeople(1);
        } catch (error) {
            console.error("Error creating invoice:", error);
            alert("เกิดข้อผิดพลาดในการสร้างบิล");
        }
    };

    const handleMarkAsPaid = async (invoice: Invoice) => {
        if (confirm("ยืนยันการชำระเงิน?")) {
            try {
                await updateDoc(doc(db, 'invoices', invoice.invoice_id), {
                    status: 'paid',
                    paid_at: Timestamp.now()
                });
            } catch (error) {
                console.error("Error updating invoice:", error);
                alert("เกิดข้อผิดพลาด");
            }
        }
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (confirm("คุณแน่ใจหรือไม่ที่จะลบใบแจ้งหนี้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
            try {
                await deleteDoc(doc(db, 'invoices', invoiceId));
            } catch (error) {
                console.error("Error deleting invoice:", error);
                alert("เกิดข้อผิดพลาดในการลบใบแจ้งหนี้");
            }
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-green-500">ชำระแล้ว</Badge>;
            case 'pending': return <Badge className="bg-yellow-500 text-black">รอชำระ</Badge>;
            case 'overdue': return <Badge className="bg-red-500">เกินกำหนด</Badge>;
            case 'cancelled': return <Badge variant="secondary">ยกเลิก</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.room_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">จัดการใบแจ้งหนี้</h2>
                    <p className="text-muted-foreground">รายการบิลและสถานะการชำระเงิน</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> สร้างบิลใหม่
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหาเลขบิล หรือ เลขห้อง..."
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
                            <TableHead>เลขบิล</TableHead>
                            <TableHead>ห้อง</TableHead>
                            <TableHead>รอบเดือน</TableHead>
                            <TableHead>ยอดรวม</TableHead>
                            <TableHead>ครบกำหนด</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">กำลังโหลด...</TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">ไม่พบข้อมูลใบแจ้งหนี้</TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.invoice_id}>
                                    <TableCell className="font-medium">{invoice.invoice_id}</TableCell>
                                    <TableCell>{invoice.room_id}</TableCell>
                                    <TableCell>{invoice.month}/{invoice.year}</TableCell>
                                    <TableCell>฿{invoice.total_amount.toLocaleString()}</TableCell>
                                    <TableCell>{invoice.due_date.toDate().toLocaleDateString('th-TH')}</TableCell>
                                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
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
                                                <DropdownMenuItem onClick={() => window.open(`/admin/invoices/print/${invoice.invoice_id}`, '_blank')}>
                                                    <Printer className="mr-2 h-4 w-4" /> พิมพ์บิล
                                                </DropdownMenuItem>
                                                {invoice.status === 'pending' && (
                                                    <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> แจ้งชำระเงิน
                                                    </DropdownMenuItem>
                                                )}
                                                {invoice.status === 'paid' && invoice.payment_proof_url && (
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedSlipUrl(invoice.payment_proof_url!);
                                                        setIsSlipDialogOpen(true);
                                                    }}>
                                                        <FileText className="mr-2 h-4 w-4" /> ดูสลิป
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDeleteInvoice(invoice.invoice_id)}
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
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>สร้างใบแจ้งหนี้ใหม่</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-6 py-4">
                        {/* Left Column: Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>เลือกห้องพัก</Label>
                                <Select value={selectedRoomId} onValueChange={handleRoomSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกห้อง" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rooms.map((room) => (
                                            <SelectItem
                                                key={room.room_number}
                                                value={room.room_number}
                                                disabled={room.status !== 'occupied'}
                                            >
                                                ห้อง {room.room_number} {room.status !== 'occupied' ? '(ว่าง)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedRoomId && (
                                    <p className="text-sm text-muted-foreground">
                                        ผู้เช่า: {tenants.find(t => t.tenant_id === rooms.find(r => r.room_number === selectedRoomId)?.current_tenant_id)?.full_name || '-'}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>เดือน</Label>
                                    <Input type="number" value={invoiceMonth} onChange={e => setInvoiceMonth(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ปี</Label>
                                    <Input type="number" value={invoiceYear} onChange={e => setInvoiceYear(Number(e.target.value))} />
                                </div>
                            </div>

                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-base">น้ำดื่ม (ลังละ 50 บาท)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="w-20 text-right"
                                            min="0"
                                            value={waterCrateCount}
                                            onChange={(e) => setWaterCrateCount(Number(e.target.value))}
                                        />
                                        <span className="text-sm text-muted-foreground">ลัง</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">ระบุจำนวนลังที่สั่ง</p>
                            </div>
                        </div>

                        {/* Right Column: Meters & Calculation */}
                        <div className="space-y-4">
                            {settings?.water_calculation_method === 'person' ? (
                                <div className="space-y-2">
                                    <Label>ค่าน้ำ (เหมาจ่าย {settings.water_price_per_person || 100} บาท/คน)</Label>
                                    <Input
                                        type="number"
                                        placeholder="จำนวนคน"
                                        value={numberOfPeople}
                                        onChange={e => setNumberOfPeople(Number(e.target.value))}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>มิเตอร์น้ำ (หน่วยละ {settings?.water_unit_price} บาท)</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="ครั้งก่อน" type="number" value={waterOld} onChange={e => setWaterOld(Number(e.target.value))} />
                                        <Input placeholder="ล่าสุด" type="number" value={waterNew} onChange={e => setWaterNew(Number(e.target.value))} />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>มิเตอร์ไฟ (หน่วยละ {settings?.electric_unit_price} บาท)</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="ครั้งก่อน" type="number" value={electricOld} onChange={e => setElectricOld(Number(e.target.value))} />
                                    <Input placeholder="ล่าสุด" type="number" value={electricNew} onChange={e => setElectricNew(Number(e.target.value))} />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>ยอดรวมโดยประมาณ:</span>
                                    <span>฿{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleCreateInvoice} disabled={!selectedRoomId}>สร้างบิล</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
