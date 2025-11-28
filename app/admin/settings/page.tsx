'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { HostelSettings } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<HostelSettings>({
        name: 'Full Moon Hostel',
        address: '',
        water_unit_price: 18,
        electric_unit_price: 8,
        water_calculation_method: 'unit',
        water_price_per_person: 100,
        late_fee_per_day: 50,
        bank_account_info: {
            bank_name: '',
            account_number: '',
            account_name: '',
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'hostel_settings', 'config');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as HostelSettings);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'hostel_settings', 'config'), settings);
            alert("บันทึกการตั้งค่าเรียบร้อยแล้ว");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">ตั้งค่าระบบ</h2>
                <p className="text-muted-foreground">จัดการข้อมูลหอพักและราคาค่าสาธารณูปโภค</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* General Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>ข้อมูลทั่วไป</CardTitle>
                        <CardDescription>ชื่อและที่อยู่ของหอพัก</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อหอพัก</Label>
                            <Input
                                value={settings.name}
                                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ที่อยู่</Label>
                            <Input
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทรศัพท์</Label>
                            <Input
                                value={settings.phone_number || ''}
                                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
                                placeholder="08x-xxx-xxxx"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Utilities */}
                <Card>
                    <CardHeader>
                        <CardTitle>ค่าสาธารณูปโภค</CardTitle>
                        <CardDescription>กำหนดราคาค่าน้ำ ค่าไฟ และวิธีการคำนวณ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 border p-4 rounded-lg">
                                <h3 className="font-medium flex items-center gap-2">💧 ค่าน้ำประปา</h3>

                                <div className="space-y-2">
                                    <Label>วิธีการคำนวณ</Label>
                                    <Select
                                        value={settings.water_calculation_method || 'unit'}
                                        onValueChange={(v: 'unit' | 'person') => setSettings({ ...settings, water_calculation_method: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unit">คิดตามมิเตอร์ (บาท/หน่วย)</SelectItem>
                                            <SelectItem value="person">เหมาจ่ายรายหัว (บาท/คน)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {settings.water_calculation_method === 'unit' ? (
                                    <div className="space-y-2">
                                        <Label>ราคาต่อหน่วย (บาท)</Label>
                                        <Input
                                            type="number"
                                            value={settings.water_unit_price}
                                            onChange={(e) => setSettings({ ...settings, water_unit_price: Number(e.target.value) })}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>ราคาเหมาจ่ายต่อคน (บาท)</Label>
                                        <Input
                                            type="number"
                                            value={settings.water_price_per_person || 100}
                                            onChange={(e) => setSettings({ ...settings, water_price_per_person: Number(e.target.value) })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 border p-4 rounded-lg">
                                <h3 className="font-medium flex items-center gap-2">⚡ ค่าไฟฟ้า</h3>
                                <div className="space-y-2">
                                    <Label>ราคาต่อหน่วย (บาท)</Label>
                                    <Input
                                        type="number"
                                        value={settings.electric_unit_price}
                                        onChange={(e) => setSettings({ ...settings, electric_unit_price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bank Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>ข้อมูลบัญชีธนาคาร</CardTitle>
                        <CardDescription>สำหรับแสดงในใบแจ้งหนี้เพื่อให้ผู้เช่าโอนเงิน</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>ชื่อธนาคาร</Label>
                                <Input
                                    value={settings.bank_account_info.bank_name}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        bank_account_info: { ...settings.bank_account_info, bank_name: e.target.value }
                                    })}
                                    placeholder="เช่น กสิกรไทย"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>เลขที่บัญชี</Label>
                                <Input
                                    value={settings.bank_account_info.account_number}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        bank_account_info: { ...settings.bank_account_info, account_number: e.target.value }
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ชื่อบัญชี</Label>
                                <Input
                                    value={settings.bank_account_info.account_name}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        bank_account_info: { ...settings.bank_account_info, account_name: e.target.value }
                                    })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="w-full md:w-auto">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> บันทึกการตั้งค่า
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
