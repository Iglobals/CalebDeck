import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

interface AppUser extends User {
    role?: 'ADMIN' | 'RIDER' | 'STUDENT';
    assignedHostelIds?: string[];
    fullName?: string;
    phone?: string;
    department?: string;
    walletBalance?: number;
    displayNameFromProfile?: string;
    hostel?: string;
    calebNetNumber?: string;
    deliveryNotes?: string;
    newsletterOptIn?: boolean;
    productsUsed?: string[];
    avatar?: string;
    createdAt?: any;
    icaSub?: boolean;
    firstOrderDiscountClaimed?: boolean;
}

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for auth errors in URL
        const params = new URLSearchParams(window.location.search);
        const authError = params.get('auth_error');
        if (authError) {
            toast.error(authError);
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }

        const checkCustomToken = async () => {
            // First check URL (for cross-origin local dev flow)
            const tokenFromUrl = params.get('ica_token');
            const tokenFromCookie = Cookies.get('ica_custom_token');
            
            const token = tokenFromUrl || tokenFromCookie;
            
            if (token) {
                if (tokenFromCookie) Cookies.remove('ica_custom_token');
                if (tokenFromUrl) {
                    // Clean URL
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                }
                
                try {
                    await signInWithCustomToken(auth, token);
                    toast.success("Successfully signed in securely");
                } catch (error) {
                    console.error("Error signing in with custom token:", error);
                    toast.error("Session expired or invalid. Please try logging in again.");
                }
            }
        };

        checkCustomToken();

        let unsubscribeSnapshot: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = undefined;
            }

            if (firebaseUser) {
                unsubscribeSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        // Spread copies own properties but NOT the Firebase User
                        // prototype — so getIdToken (and every other method) would
                        // vanish. Re-delegate any method the app calls.
                        setUser({
                            ...firebaseUser,
                            getIdToken: (...args) => firebaseUser.getIdToken(...args),
                            role: userData.role,
                            assignedHostelIds: userData.assignedHostelIds,
                            fullName: userData.fullName,
                            phone: userData.phone,
                            department: userData.department,
                            walletBalance: userData.walletBalance,
                            displayNameFromProfile: userData.displayName,
                            hostel: userData.hostel,
                            calebNetNumber: userData.calebNetNumber,
                            deliveryNotes: userData.deliveryNotes,
                            newsletterOptIn: userData.newsletterOptIn !== false,
                            productsUsed: userData.productsUsed || [],
                            avatar: userData.avatar,
                            createdAt: userData.createdAt,
                            icaSub: !!userData.icaSub,
                            firstOrderDiscountClaimed: !!userData.firstOrderDiscountClaimed,
                        });
                    } else {
                        setUser(firebaseUser);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setUser(firebaseUser);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const logout = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error('Error during secure logout:', error);
        } finally {
            await signOut(auth);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {loading ? (
                <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-5">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                        <img src="/calebdeck-logo.jpeg" alt="CalebDeck" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
                        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
