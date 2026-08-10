import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { getActiveHostels, Hostel } from '../../../services/db';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { ArrowLeft, User, Phone, MapPin, Settings, LogOut, Bell, Shield, Calendar, CreditCard, ChevronRight, CheckCircle2, History } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import SEO from '../../components/SEO';

interface UserProfile {
  fullName: string;
  phone: string;
  hostel: string;
  calebNetNumber: string;
  deliveryNotes: string;
  newsletterOptIn: boolean;
  productsUsed: string[];
  createdAt?: any;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { studentTheme } = useTheme();

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    phone: '',
    hostel: '',
    calebNetNumber: '',
    deliveryNotes: '',
    newsletterOptIn: true,
    productsUsed: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user === null) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        const activeHostels = await getActiveHostels();
        setHostels(activeHostels);

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            fullName: data.fullName || user.displayName || '',
            phone: data.phone || data.phoneNumber || '',
            hostel: data.hostel || '',
            calebNetNumber: data.calebNetNumber || '',
            deliveryNotes: data.deliveryNotes || '',
            newsletterOptIn: data.newsletterOptIn !== false,
            productsUsed: data.productsUsed || [],
            createdAt: data.createdAt
          });
        }
      } catch (err) {
        toast.error('Could not load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setProfile(prev => ({ ...prev, [name]: checked }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: profile.fullName,
        phone: profile.phone,
        hostel: profile.hostel,
        calebNetNumber: profile.calebNetNumber,
        deliveryNotes: profile.deliveryNotes,
        newsletterOptIn: profile.newsletterOptIn
      });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to save profile updates');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      toast.error('Error signing out');
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return 'Unknown';
    try {
      const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
      return date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    );
  }

  const initial = profile.fullName ? profile.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="i-CON Profile - CalebDeck"
        description="Manage your CalebDeck defaults and i-CON profile settings."
        canonical="https://calebdeck.com/profile"
        robots="noindex,follow"
      />

      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border shadow-sm transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
          <h1 className="text-xl font-bold tracking-tight">i-CON Profile</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Profile Card (Glassmorphism) */}
        <div className="relative overflow-hidden rounded-[2rem] p-8 mb-10 shadow-2xl bg-card border border-border max-w-2xl mx-auto">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-4xl font-black shadow-lg backdrop-blur-sm shrink-0">
              {initial}
            </div>
            
            <div className="text-center md:text-left flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
                <Shield className="w-3.5 h-3.5" />
                Verified i-CON
              </div>
              <h2 className="text-3xl font-black truncate">{profile.fullName || 'Student'}</h2>
              <p className="opacity-90 truncate mt-1">{user?.email}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-sm opacity-80 font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(profile.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_300px] gap-8">
          
          {/* Settings Form */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Preferences</h2>
            </div>
            
            <Card className="p-6 md:p-8 border-border">
              <form onSubmit={handleSave} className="space-y-6">
                
                <Input
                  label="Full Name"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="bg-background"
                />

                <div className="grid sm:grid-cols-2 gap-6">
                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="e.g. 08012345678"
                    className="bg-background"
                  />
                  
                  <Input
                    label="CalebNet Default Number"
                    name="calebNetNumber"
                    type="tel"
                    value={profile.calebNetNumber}
                    onChange={handleChange}
                    placeholder="e.g. 08012345678"
                    className="bg-background"
                  />
                </div>

                <Select
                  label="Default Hostel"
                  name="hostel"
                  value={profile.hostel}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select your default hostel' },
                    ...hostels.map(h => ({ value: h.id, label: h.name }))
                  ]}
                  className="bg-background"
                />

                <Textarea
                  label="Saved Delivery Notes (Optional)"
                  name="deliveryNotes"
                  value={profile.deliveryNotes}
                  onChange={handleChange}
                  placeholder="e.g. Call me when you get to the gate"
                  rows={2}
                  className="bg-background"
                />

                <div className="pt-4 border-t border-border">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        name="newsletterOptIn"
                        checked={profile.newsletterOptIn}
                        onChange={handleChange}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded border-2 border-muted-foreground peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm">Newsletter & Announcements</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Receive occasional updates on new CalebDeck features, promotions, and platform changes.</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-border flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">Appearance</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Toggle between light and dark mode.</p>
                    </div>
                    <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} variant="inline" />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-4">
                  <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto py-3 px-8 text-sm">
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                  
                  <div className="pt-4 border-t border-border mt-2">
                    <button 
                      type="button" 
                      onClick={handleLogout} 
                      className="w-full text-left text-sm font-bold text-red-500 hover:text-red-600 transition-colors py-2 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </form>
            </Card>
          </div>

          {/* Sidebar / Quick Links */}
          <div className="space-y-6">
            
            {/* Quick Links */}
            <Card className="p-1 border-border overflow-hidden">
              <Link to="/my-orders" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="font-bold">Order History</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
              
              <Link to="/calebnet" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="font-bold">CalebNet Wallet</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </Card>

            {/* Connected Products */}
            <Card className="p-5 border-border">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">Connected Products</h3>
              
              {profile.productsUsed.length > 0 ? (
                <div className="space-y-3">
                  {profile.productsUsed.map((product, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                      <span className="font-bold">{product}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You haven't used any iGLOBALS products yet.</p>
              )}
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}

