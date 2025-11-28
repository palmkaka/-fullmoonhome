'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Invoice, Room, Tenant, HostelSettings } from '@/types/schema';
import { Loader2 } from 'lucide-react';

export default function PrintInvoicePage({ params }: { params: { id: string } }) {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [settings, setSettings] = useState<HostelSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Invoice
                const invoiceSnap = await getDoc(doc(db, 'invoices', params.id));
                if (!invoiceSnap.exists()) {
                    alert("ไม่พบข้อมูลใบแจ้งหนี้");
                    return;
                }
                const invoiceData = invoiceSnap.data() as Invoice;
                setInvoice(invoiceData);

                // 2. Fetch Related Data
                const [tenantSnap, roomSnap, settingsSnap] = await Promise.all([
                    getDoc(doc(db, 'tenants', invoiceData.tenant_id)),
                    getDoc(doc(db, 'rooms', invoiceData.room_id)),
                    getDoc(doc(db, 'hostel_settings', 'config'))
                ]);

                if (tenantSnap.exists()) setTenant(tenantSnap.data() as Tenant);
                if (roomSnap.exists()) setRoom(roomSnap.data() as Room);
                if (settingsSnap.exists()) setSettings(settingsSnap.data() as HostelSettings);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

    useEffect(() => {
        if (!loading && invoice && settings) {
            // Auto-print when ready
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, invoice, settings]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    if (!invoice) return <div className="p-8 text-red-500">Error: Invoice not found</div>;
    if (!settings) return <div className="p-8 text-red-500">Error: Hostel Settings not found (Please run seed script or check database)</div>;

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0">
            <div className="max-w-3xl mx-auto border p-8 print:border-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{settings.name}</h1>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{settings.address}</p>
                        <p className="text-sm text-gray-600 mt-1">โทร: {tenant?.phone_number || '-'}</p>
                        {/* Note: Ideally hostel phone, but using tenant phone as placeholder or maybe hardcoded admin phone if available */}
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-800">ใบแจ้งหนี้ / Invoice</h2>
                        <p className="text-sm text-gray-600 mt-2">เลขที่: {invoice.invoice_id}</p>
                        <p className="text-sm text-gray-600">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                        <p className="text-sm text-gray-600">รอบเดือน: {invoice.month}/{invoice.year}</p>
                    </div>
                </div>

                {/* Tenant Info */}
                <div className="border-t border-b py-4 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-bold text-gray-500">ผู้เช่า / Tenant</p>
                            <p className="font-medium">{tenant?.full_name || '-'}</p>
                            <p className="text-sm text-gray-600">{tenant?.phone_number}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-500">ห้องพัก / Room</p>
                            <p className="font-medium text-lg">{invoice.room_id}</p>
                            <p className="text-sm text-gray-600">ประเภท: {room?.type === 'standard_air' ? 'แอร์' : 'พัดลม'}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="text-left py-2">รายการ / Description</th>
                            <th className="text-right py-2">จำนวนเงิน / Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-3">{item.name}</td>
                                <td className="py-3 text-right">฿{item.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold text-lg">
                            <td className="py-4 text-right">รวมทั้งสิ้น / Total</td>
                            <td className="py-4 text-right">฿{invoice.total_amount.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Payment Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-8 print:bg-transparent print:border">
                    <h3 className="font-bold mb-2">ช่องทางการชำระเงิน</h3>
                    <p className="text-sm">{settings.bank_account_info.bank_name}</p>
                    <p className="text-sm">ชื่อบัญชี: {settings.bank_account_info.account_name}</p>
                    <p className="text-sm font-medium">เลขที่บัญชี: {settings.bank_account_info.account_number}</p>
                    <div className="mt-4 text-xs text-gray-500">
                        * กรุณาชำระเงินภายในวันที่ {invoice.due_date.toDate().toLocaleDateString('th-TH')}
                        <br />
                        * ส่งสลิปการโอนเงินได้ที่ Line หรือระบบจัดการหอพัก
                    </div>
                </div>

                {/* Signature (Optional) */}
                <div className="mt-16 grid grid-cols-2 gap-8 text-center">
                    <div>
                        <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
                        <p className="text-sm">ผู้รับเงิน / Receiver</p>
                    </div>
                    <div>
                        <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
                        <p className="text-sm">ผู้จ่ายเงิน / Payer</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
