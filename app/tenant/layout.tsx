'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/lib/store/user-store';
import { Button } from '@/components/ui/button';
import {
    Home,
    Bed,
    FileText,
    Wrench,
    LogOut,
    Menu,
    X,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, dbUser, setUser, logout, isLoading, setLoading } = useUserStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Auth Check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                if (user && dbUser) {
                    setLoading(false);
                    return;
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as any;
                        setUser(firebaseUser, userData);

                        if (userData.role !== 'tenant') {
                            router.push('/login');
                        }
                    } else {
                        router.push('/login');
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    router.push('/login');
                }
            } else {
                logout();
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router, setUser, logout, setLoading, user, dbUser]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user || dbUser?.role !== 'tenant') {
        return null;
    }

    const navItems = [
        { name: 'หน้าแรก', href: '/tenant/dashboard', icon: Home },
        { name: 'ข้อมูลห้องพัก', href: '/tenant/room', icon: Bed },
        { name: 'บิลค่าเช่า', href: '/tenant/invoices', icon: FileText },
        { name: 'แจ้งซ่อม', href: '/tenant/maintenance', icon: Wrench },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navbar */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/tenant/dashboard" className="flex-shrink-0 flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                    F
                                </div>
                                <span className="font-bold text-xl text-gray-900">Full Moon</span>
                            </Link>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-gray-600 hover:bg-gray-100"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                            <div className="h-6 w-px bg-gray-200 mx-2" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                    auth.signOut();
                                    logout();
                                    router.push('/login');
                                }}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                ออกจากระบบ
                            </Button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex items-center md:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                            <div className="pt-4 border-t mt-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-red-600"
                                    onClick={() => {
                                        auth.signOut();
                                        logout();
                                        router.push('/login');
                                    }}
                                >
                                    <LogOut className="h-5 w-5 mr-2" />
                                    ออกจากระบบ
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    );
}
