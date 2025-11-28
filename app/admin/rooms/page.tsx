'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Room } from '@/types/schema';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState<Partial<Room>>({
        room_number: '',
        floor: 1,
        type: 'standard_fan',
        base_price: 3500,
        status: 'vacant',
        facilities: [],
    });
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Room; direction: 'asc' | 'desc' }>({
        key: 'room_number',
        direction: 'asc',
    });

    // Real-time Fetch
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot) => {
            const roomsData = snapshot.docs.map(doc => doc.data() as Room);
            setRooms(roomsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenDialog = (room?: Room) => {
        if (room) {
            setEditingRoom(room);
            setFormData(room);
        } else {
            setEditingRoom(null);
            setFormData({
                room_number: '',
                floor: 1,
                type: 'standard_fan',
                base_price: 3500,
                status: 'vacant',
                facilities: ['bed', 'wardrobe'], // Default facilities
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.room_number) return;

        try {
            const roomData = {
                ...formData,
                // Ensure types are correct
                floor: Number(formData.floor),
                base_price: Number(formData.base_price),
            } as Room;

            if (editingRoom) {
                // Update
                await updateDoc(doc(db, 'rooms', editingRoom.room_number), roomData as any);
            } else {
                // Create (Check if exists first?)
                // For simplicity, we just setDoc which overwrites if exists, but usually we want to prevent overwrite of different ID.
                // Here ID is room_number.
                await setDoc(doc(db, 'rooms', roomData.room_number), roomData);
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving room:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    const handleDelete = async (roomNumber: string) => {
        if (confirm(`คุณแน่ใจหรือไม่ที่จะลบห้อง ${roomNumber}?`)) {
            try {
                await deleteDoc(doc(db, 'rooms', roomNumber));
            } catch (error) {
                console.error("Error deleting room:", error);
                alert("เกิดข้อผิดพลาดในการลบห้อง");
            }
        }
    };

    const handleSort = (key: keyof Room) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const filteredAndSortedRooms = rooms
        .filter((room) => {
            const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null || bValue === null) return 0;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'vacant': return <Badge className="bg-green-500">ว่าง</Badge>;
            case 'occupied': return <Badge className="bg-red-500">มีผู้เช่า</Badge>;
            case 'maintenance': return <Badge className="bg-yellow-500">ซ่อมบำรุง</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const SortIcon = ({ column }: { column: keyof Room }) => {
        if (sortConfig.key !== column) return <MoreHorizontal className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
        return sortConfig.direction === 'asc' ?
            <div className="ml-2 h-4 w-4">▲</div> :
            <div className="ml-2 h-4 w-4">▼</div>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">จัดการห้องพัก</h2>
                    <p className="text-muted-foreground">รายชื่อห้องพักและสถานะทั้งหมด</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> เพิ่มห้องพัก
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหาเลขห้อง..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="สถานะห้อง" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            <SelectItem value="vacant">ว่าง</SelectItem>
                            <SelectItem value="occupied">มีผู้เช่า</SelectItem>
                            <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                            <SelectItem value="reserved">จองแล้ว</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 group"
                                onClick={() => handleSort('room_number')}
                            >
                                <div className="flex items-center">
                                    เลขห้อง <SortIcon column="room_number" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 group"
                                onClick={() => handleSort('floor')}
                            >
                                <div className="flex items-center">
                                    ชั้น <SortIcon column="floor" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 group"
                                onClick={() => handleSort('type')}
                            >
                                <div className="flex items-center">
                                    ประเภท <SortIcon column="type" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 group"
                                onClick={() => handleSort('base_price')}
                            >
                                <div className="flex items-center">
                                    ราคา <SortIcon column="base_price" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 group"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center">
                                    สถานะ <SortIcon column="status" />
                                </div>
                            </TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">กำลังโหลด...</TableCell>
                            </TableRow>
                        ) : filteredAndSortedRooms.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">ไม่พบข้อมูลห้องพัก</TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedRooms.map((room) => (
                                <TableRow key={room.room_number}>
                                    <TableCell className="font-medium">{room.room_number}</TableCell>
                                    <TableCell>{room.floor}</TableCell>
                                    <TableCell>
                                        {room.type === 'standard_air' ? 'แอร์' :
                                            room.type === 'standard_fan' ? 'พัดลม' : 'Suite'}
                                    </TableCell>
                                    <TableCell>฿{room.base_price.toLocaleString()}</TableCell>
                                    <TableCell>{getStatusBadge(room.status)}</TableCell>
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
                                                <DropdownMenuItem onClick={() => handleOpenDialog(room)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> แก้ไข
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(room.room_number)}
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRoom ? 'แก้ไขข้อมูลห้องพัก' : 'เพิ่มห้องพักใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="room_number">เลขห้อง</Label>
                                <Input
                                    id="room_number"
                                    value={formData.room_number}
                                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                    disabled={!!editingRoom} // Disable ID editing
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="floor">ชั้น</Label>
                                <Select
                                    value={String(formData.floor)}
                                    onValueChange={(v) => setFormData({ ...formData, floor: Number(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกชั้น" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">ประเภทห้อง</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard_fan">พัดลม</SelectItem>
                                        <SelectItem value="standard_air">แอร์</SelectItem>
                                        <SelectItem value="suite">Suite</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">ราคา (บาท)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">สถานะ</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vacant">ว่าง</SelectItem>
                                    <SelectItem value="occupied">มีผู้เช่า</SelectItem>
                                    <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                                    <SelectItem value="reserved">จองแล้ว</SelectItem>
                                </SelectContent>
                            </Select>
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
