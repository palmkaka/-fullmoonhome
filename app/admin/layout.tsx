'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/lib/store/user-store';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Users,
    BedDouble,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, dbUser, setUser, logout, isLoading, setLoading } = useUserStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Auth Check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // If we already have user data in store, skip fetch
                if (user && dbUser) {
                    setLoading(false);
                    return;
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as any;
                        setUser(firebaseUser, userData);

                        if (userData.role !== 'admin') {
                            router.push('/login'); // Or unauthorized page
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!user || dbUser?.role !== 'admin') {
        return null; // Will redirect in useEffect
    }

    const navItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', href: '/admin/rooms', icon: BedDouble },
        { name: 'Tenants', href: '/admin/tenants', icon: Users },
        { name: 'Invoices', href: '/admin/invoices', icon: FileText },
        { name: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b">
                        <h1 className="text-xl font-bold text-primary">Full Moon Hostel</h1>
                        <p className="text-sm text-gray-500">Admin Panel</p>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-gray-700 hover:bg-gray-100"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                                auth.signOut();
                                logout();
                                router.push('/login');
                            }}
                        >
                            <LogOut className="mr-2 h-5 w-5" />
                            ออกจากระบบ
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white shadow-sm lg:hidden flex items-center justify-between p-4">
                    <h1 className="font-bold">Dashboard</h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
