import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Card } from '../../components/design-system/Card';
import { Search, Loader2, CreditCard, Calendar, User, Phone, Shield, ArrowRight } from 'lucide-react';
import SEO from '../../components/SEO';
import { Badge } from '../../components/design-system/Badge';

interface UserDirectoryItem {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    walletBalance: number;
    productsUsed: string[];
    createdAt: any;
    role: string;
}

export default function AdminDirectory() {
    const [users, setUsers] = useState<UserDirectoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: UserDirectoryItem[] = [];
            snapshot.forEach((doc) => {
                const raw = doc.data();
                data.push({
                    id: doc.id,
                    fullName: raw.fullName || raw.displayName || raw.displayNameFromProfile || 'Unknown',
                    email: raw.email || '',
                    phone: raw.phone || raw.phoneNumber || raw.calebNetNumber || '',
                    walletBalance: Number(raw.walletBalance || 0),
                    productsUsed: Array.isArray(raw.productsUsed) ? raw.productsUsed : [],
                    createdAt: raw.createdAt,
                    role: raw.role || 'STUDENT'
                });
            });
            setUsers(data);
            setLoading(false);
        }, (error) => {
            console.error('Failed to fetch user directory:', error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(
            u => 
                u.fullName.toLowerCase().includes(q) || 
                u.email.toLowerCase().includes(q) ||
                u.phone.includes(q)
        );
    }, [searchQuery, users]);

    const money = (val: number) => `₦${val.toLocaleString()}`;

    const formatDate = (ts: any) => {
        if (!ts) return 'Unknown';
        try {
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return 'Unknown';
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60dvh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SEO title="i-CON Directory | Admin" robots="noindex,follow" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/20">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2 text-primary">
                        <Shield className="w-6 h-6" /> i-CON Ecosystem Directory
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Global view of all signed-in users across CalebDeck Mart, CalebNet, and other services.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-xl shadow-sm border border-border">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total i-CONs</p>
                        <p className="text-lg font-black leading-none">{users.length.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border-2 border-border bg-card py-2 pl-9 pr-4 text-sm outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4 font-black">i-CON Name</th>
                                <th className="px-6 py-4 font-black">Contact</th>
                                <th className="px-6 py-4 font-black text-right">Wallet Balance</th>
                                <th className="px-6 py-4 font-black">Ecosystem Usage</th>
                                <th className="px-6 py-4 font-black text-right">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        No i-CONs found matching "{searchQuery}"
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">
                                                    {user.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold">{user.fullName}</p>
                                                    {user.role !== 'STUDENT' && (
                                                        <Badge variant="purple" className="text-[9px] px-1.5 py-0 mt-0.5">{user.role}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {user.email && (
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                )}
                                                {user.phone && (
                                                    <p className="text-xs font-mono">{user.phone}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                {money(user.walletBalance)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {user.productsUsed.length > 0 ? (
                                                    user.productsUsed.map((p, i) => (
                                                        <span key={i} className="bg-muted text-[10px] px-2 py-0.5 rounded border border-border">
                                                            {p}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">None yet</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                                            {formatDate(user.createdAt)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
