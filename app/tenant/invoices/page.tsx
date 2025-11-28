'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserStore } from '@/lib/store/user-store';
import { Invoice, Tenant, HostelSettings } from '@/types/schema';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

import { compressImage } from '@/lib/utils/image-compression';

export default function TenantInvoicesPage() {
    const { dbUser } = useUserStore();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<HostelSettings | null>(null);

    // Upload Slip State
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!dbUser) return;

        // Fetch Settings for Bank Info
        const settingsUnsub = onSnapshot(doc(db, 'hostel_settings', 'config'), (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as HostelSettings);
            }
        });

        // Fetch Invoices
        const q = query(
            collection(db, 'invoices'),
            where('tenant_id', '==', dbUser.uid)
        );

        const invoicesUnsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                ...(doc.data() as Invoice),
                invoice_id: doc.id
            }));
            // Client-side sort by due_date desc
            data.sort((a, b) => b.due_date.seconds - a.due_date.seconds);
            setInvoices(data);
            setLoading(false);
        });

        return () => {
            settingsUnsub();
            invoicesUnsub();
        };
    }, [dbUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadSlip = async () => {
    } catch (error: any) {
        console.error("Error uploading slip:", error);
        alert(`เกิดข้อผิดพลาดในการอัปโหลดสลิป: ${error.message}`);
    } finally {
        setUploading(false);
    }
};

const getStatusBadge = (status: string, hasSlip: boolean) => {
    if (status === 'paid') return <Badge className="bg-green-500">ชำระแล้ว</Badge>;
    if (status === 'overdue') return <Badge className="bg-red-500">เกินกำหนด</Badge>;
    if (status === 'pending') {
        if (hasSlip) return <Badge className="bg-blue-500">รอตรวจสอบ</Badge>;
        return <Badge className="bg-yellow-500 text-black">รอชำระ</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
};

if (loading) return <div className="text-center py-10">กำลังโหลด...</div>;

return (
    <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">บิลค่าเช่าและประวัติการชำระเงิน</h2>
            <p className="text-muted-foreground">ตรวจสอบยอดค้างชำระและแจ้งโอนเงิน</p>
        </div>

        {/* Bank Info Card */}
        {settings && (
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-base text-primary">ช่องทางการชำระเงิน</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">ธนาคาร:</span>
                            <span className="font-medium ml-2">{settings.bank_account_info.bank_name}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">เลขบัญชี:</span>
                            <span className="font-medium ml-2 text-lg">{settings.bank_account_info.account_number}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">ชื่อบัญชี:</span>
                            <span className="font-medium ml-2">{settings.bank_account_info.account_name}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="space-y-4">
            {invoices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">ไม่พบรายการบิล</div>
            ) : (
                invoices.map((invoice) => (
                    <Card key={invoice.invoice_id} className={invoice.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''}>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">
                                            รอบเดือน {invoice.month}/{invoice.year}
                                        </h3>
                                        {getStatusBadge(invoice.status, !!invoice.payment_proof_url)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        เลขที่บิล: {invoice.invoice_id} | ครบกำหนด: {invoice.due_date.toDate().toLocaleDateString('th-TH')}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <p className="text-sm text-muted-foreground">ยอดรวมทั้งสิ้น</p>
                                    <p className="text-2xl font-bold text-primary">฿{invoice.total_amount.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="text-sm space-y-1">
                                    {invoice.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span className="text-muted-foreground">{item.name}</span>
                                            <span>฿{item.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-end justify-end">
                                    {invoice.status === 'pending' && !invoice.payment_proof_url && (
                                        <Button onClick={() => {
                                            setSelectedInvoice(invoice);
                                            setIsUploadOpen(true);
                                            setSelectedFile(null);
                                        }}>
                                            <Upload className="mr-2 h-4 w-4" /> แจ้งโอนเงิน
                                        </Button>
                                    )}
                                    {invoice.payment_proof_url && (
                                        <Button variant="outline" onClick={() => window.open(invoice.payment_proof_url!, '_blank')}>
                                            <FileText className="mr-2 h-4 w-4" /> ดูสลิปที่แนบ
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>

        {/* Upload Slip Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>แจ้งโอนเงิน</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>ยอดโอน</Label>
                        <Input value={`฿${selectedInvoice?.total_amount.toLocaleString()}`} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>แนบหลักฐานการโอนเงิน (รูปภาพ)</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <p className="text-xs text-muted-foreground">
                            รองรับไฟล์รูปภาพ .jpg, .png
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading}>ยกเลิก</Button>
                    <Button onClick={handleUploadSlip} disabled={!selectedFile || uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {uploading ? 'กำลังอัปโหลด...' : 'ยืนยัน'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
);
}

