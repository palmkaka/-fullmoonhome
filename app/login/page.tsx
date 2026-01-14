'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { useUserStore } from '@/lib/store/user-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setUser = useUserStore((state) => state.setUser);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Fetch User Role from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data() as any; // Cast to any for now, or import DbUser type

                // Update Store
                setUser(user, userData);

                // 3. Redirect based on Role
                if (userData.role === 'admin') {
                    router.push('/admin/dashboard');
                } else if (userData.role === 'tenant') {
                    router.push('/tenant/dashboard'); // We haven't created this yet, but good to have
                } else {
                    setError('Unknown role. Please contact support.');
                }
            } else {
                setError('User profile not found in database.');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.code === 'auth/invalid-credential') {
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            } else {
                setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">เข้าสู่ระบบ</CardTitle>
                    <CardDescription className="text-center">
                        ระบบจัดการหอพัก Full Moon Home
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@hostel.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">รหัสผ่าน</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
