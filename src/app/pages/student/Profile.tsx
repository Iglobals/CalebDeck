import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { getActiveHostels, subscribeToHostels, Hostel, FashionDeliveryConfig } from '../../../services/db';
import { requestNotificationPermissionAndSaveToken } from '../../../services/messaging';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { ArrowLeft, User, Phone, MapPin, Settings, LogOut, Bell, Shield, Calendar, CreditCard, ChevronRight, CheckCircle2, History, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import { AnnouncementHistory } from '../../components/student/AnnouncementBanner';
import SEO from '../../components/SEO';

interface UserProfile {
  fullName: string;
  phone: string;
  hostel: string;
  calebNetNumber: string;
  deliveryNotes: string;
  fashionDeliveryEnabled: boolean;
  fashionDeliveryState: string;
  fashionDeliveryCity: string;
  fashionDeliveryAreaId: string;
  fashionDeliveryAddress: string;
  fashionDeliveryAddressDetails: string;
  newsletterOptIn: boolean;
  productsUsed: string[];
  avatar?: string;
  createdAt?: any;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { studentTheme, toggleStudentTheme } = useTheme();

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [profile, setProfile] = useState<UserProfile>(() => ({
    fullName: user?.displayNameFromProfile || user?.fullName || user?.displayName || '',
    phone: user?.phone || user?.phoneNumber || '',
    hostel: user?.hostel || '',
    calebNetNumber: user?.calebNetNumber || '',
    deliveryNotes: user?.deliveryNotes || '',
    fashionDeliveryEnabled: user?.fashionDeliveryEnabled === true,
    fashionDeliveryState: user?.fashionDeliveryState || 'Lagos',
    fashionDeliveryCity: user?.fashionDeliveryCity || '',
    fashionDeliveryAreaId: user?.fashionDeliveryAreaId || '',
    fashionDeliveryAddress: user?.fashionDeliveryAddress || '',
    fashionDeliveryAddressDetails: user?.fashionDeliveryAddressDetails || '',
    newsletterOptIn: user?.newsletterOptIn !== false,
    productsUsed: user?.productsUsed || [],
    avatar: user?.avatar || '',
    createdAt: user?.createdAt
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [fashionDeliveryConfig, setFashionDeliveryConfig] = useState<FashionDeliveryConfig | null>(null);

  // OS detection for PWA install instructions
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    setIsAndroid(/android/i.test(navigator.userAgent));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const memojis = ['😎', '🤓', '🤠', '😇', '👾', '👻', '🤖', '👑', '🚀', '🌟', '🦄', '🦁', '🐶', '🦊', '🐼', '🐯'];

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        toast.success('App installation started');
      }
      setInstallPrompt(null);
    });
  };

  const handleEnableNotifications = async () => {
    if (!user) return;
    try {
      if ('Notification' in window && Notification.permission === 'default') {
         const permission = await Notification.requestPermission();
         if (permission === 'granted') {
           await requestNotificationPermissionAndSaveToken(user.uid, 'users');
           setNotificationsEnabled(true);
           toast.success("Push notifications enabled!");
         } else {
           setNotificationsEnabled(false);
           toast.error("Notification permission denied");
         }
      } else if ('Notification' in window && Notification.permission === 'granted') {
         await requestNotificationPermissionAndSaveToken(user.uid, 'users');
         setNotificationsEnabled(true);
         toast.success("Push notifications updated!");
      }
    } catch (e) {
      setNotificationsEnabled(false);
      toast.error("Could not enable notifications");
    }
  };

  useEffect(() => {
    if (user === null) {
      navigate('/');
      return;
    }

    const unsubHostels = subscribeToHostels(setHostels);

    const loadData = async () => {
      try {
        const activeHostels = await getActiveHostels();
        setHostels(activeHostels);
        const deliveryResponse = await fetch('/api/fashion-delivery');
        if (deliveryResponse.ok) {
          const deliveryData = await deliveryResponse.json();
          if (deliveryData?.config) setFashionDeliveryConfig(deliveryData.config);
        }
      } catch (err) {
        toast.error('Could not load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => unsubHostels();
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
        fashionDeliveryEnabled: profile.fashionDeliveryEnabled,
        fashionDeliveryState: profile.fashionDeliveryState,
        fashionDeliveryCity: profile.fashionDeliveryCity,
        fashionDeliveryAreaId: profile.fashionDeliveryAreaId,
        fashionDeliveryAddress: profile.fashionDeliveryAddress,
        fashionDeliveryAddressDetails: profile.fashionDeliveryAddressDetails,
        newsletterOptIn: profile.newsletterOptIn,
        avatar: profile.avatar || ''
      });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to save profile updates');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (emoji: string) => {
    setProfile(prev => ({ ...prev, avatar: emoji }));
    setShowAvatarPicker(false);
    if (!user) return;
    
    // Auto-save the avatar for immediate feedback
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        avatar: emoji
      });
      toast.success('Memoji updated successfully');
    } catch (err) {
      toast.error('Failed to update Memoji');
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
      <div className="min-h-screen bg-background transition-colors duration-300">
        <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border shadow-sm p-4 flex justify-center">
          <div className="w-32 h-6 bg-muted rounded-full animate-pulse"></div>
        </header>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-[2rem] p-8 mb-10 bg-card border border-border w-full flex flex-col md:flex-row items-center gap-6 animate-pulse">
            <div className="w-24 h-24 rounded-full bg-muted shrink-0"></div>
            <div className="flex-1 space-y-3 w-full max-w-sm">
              <div className="w-24 h-6 bg-muted rounded-full"></div>
              <div className="w-48 h-8 bg-muted rounded"></div>
              <div className="w-32 h-4 bg-muted rounded"></div>
            </div>
          </div>
          <div className="grid lg:grid-cols-[1fr_340px] md:grid-cols-[1fr_280px] gap-8 items-start">
            <div className="space-y-6">
              <div className="w-48 h-8 bg-muted rounded animate-pulse"></div>
              <div className="p-6 md:p-8 border border-border rounded-2xl bg-card space-y-6 animate-pulse">
                <div className="w-full h-12 bg-muted rounded-xl"></div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="w-full h-12 bg-muted rounded-xl"></div>
                  <div className="w-full h-12 bg-muted rounded-xl"></div>
                </div>
                <div className="w-full h-12 bg-muted rounded-xl"></div>
                <div className="w-full h-24 bg-muted rounded-xl"></div>
              </div>
            </div>
            <div className="space-y-6 hidden md:block animate-pulse">
               <div className="w-full h-48 bg-muted rounded-2xl"></div>
               <div className="w-full h-64 bg-muted rounded-2xl"></div>
            </div>
          </div>
        </main>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Profile Card (Glassmorphism) */}
        <div className="relative overflow-hidden rounded-[2rem] p-8 mb-10 shadow-2xl bg-card border border-border w-full">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <button onClick={() => setShowAvatarPicker(true)} type="button" className="w-24 h-24 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-4xl font-black shadow-lg backdrop-blur-sm shrink-0 hover:scale-105 transition-transform overflow-hidden relative group">
                <span className="z-10">{profile.avatar || initial}</span>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white uppercase tracking-widest">Edit</span>
                </div>
              </button>
            
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

        <div className="grid lg:grid-cols-[1fr_340px] md:grid-cols-[1fr_280px] gap-8 items-start">
          
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

                <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="fashionDeliveryEnabled"
                      checked={profile.fashionDeliveryEnabled}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block font-bold">Save Lagos delivery details</span>
                      <span className="mt-1 block text-sm text-muted-foreground">Use these details to speed up Fashion orders delivered outside campus.</span>
                    </span>
                  </label>

                  {profile.fashionDeliveryEnabled && (
                    <div className="mt-5 space-y-4 border-t border-border pt-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="State" name="fashionDeliveryState" value={profile.fashionDeliveryState} onChange={handleChange} className="bg-background" />
                        <Input label="City" name="fashionDeliveryCity" value={profile.fashionDeliveryCity} onChange={handleChange} placeholder="e.g. Lagos Island" className="bg-background" />
                      </div>
                      <Select
                        label="Delivery area"
                        name="fashionDeliveryAreaId"
                        value={profile.fashionDeliveryAreaId}
                        onChange={handleChange}
                        options={[
                          { value: '', label: fashionDeliveryConfig?.zones.length ? 'Select your delivery area' : 'Delivery areas are being prepared' },
                          ...(fashionDeliveryConfig?.zones || []).filter(zone => zone.enabled).flatMap(zone => zone.areas.filter(area => area.enabled).map(area => ({ value: area.id, label: `${area.name} · ${area.pricingMode === 'FIXED' ? `₦${Number(area.fixedFee).toLocaleString()}` : `₦${Number(area.minFee).toLocaleString()}–₦${Number(area.maxFee).toLocaleString()}`}` })))
                        ]}
                        className="bg-background"
                      />
                      <Textarea label="Delivery address" name="fashionDeliveryAddress" value={profile.fashionDeliveryAddress} onChange={handleChange} placeholder="House number, street, estate or landmark" rows={2} className="bg-background" />
                      <Textarea label="Address details (Optional)" name="fashionDeliveryAddressDetails" value={profile.fashionDeliveryAddressDetails} onChange={handleChange} placeholder="Gate instructions or a nearby landmark" rows={2} className="bg-background" />
                    </div>
                  )}
                </div>

                <Textarea
                  label="Saved Delivery Notes (Optional)"
                  name="deliveryNotes"
                  value={profile.deliveryNotes}
                  onChange={handleChange}
                  placeholder="e.g. Call me when you get to the gate"
                  rows={2}
                  className="bg-background"
                />

                <div className="pt-4 border-t border-border space-y-3">
                  <div>
                    <p className="font-bold text-sm">Service updates</p>
                    <p className="text-sm text-muted-foreground mt-0.5 mb-3">Important in-app announcements remain available here after you dismiss the banner.</p>
                    <AnnouncementHistory />
                  </div>
                </div>

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

                <div className="pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">Push Notifications</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Enable notifications for order updates.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationsEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleEnableNotifications();
                          } else {
                            toast.info("You must disable notifications from your browser settings.");
                            setNotificationsEnabled(true); // reset to true since we can't revoke OS permission via JS
                          }
                        }}
                      />
                      <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {installPrompt && !isStandalone && (
                  <div className="pt-4 border-t border-border mt-4 bg-[#7C3AED]/10 -mx-6 md:-mx-8 px-6 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-[#7C3AED]">Install CalebDeck App</p>
                        <p className="text-sm text-muted-foreground mt-0.5">Add CalebDeck to your home screen for quick access.</p>
                      </div>
                      <Button type="button" variant="primary" onClick={handleInstallClick} className="bg-[#7C3AED] text-white">Install</Button>
                    </div>
                  </div>
                )}

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
              
              <Link to="/wallet" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="font-bold">i-CON Wallet</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </Card>

            {/* PWA Install Instructions */}
            {!isStandalone && !installPrompt && (isIOS || isAndroid) && (
              <Card className="p-5 border-[#7C3AED]/30 bg-[#7C3AED]/5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#7C3AED]/10 rounded-full blur-xl"></div>
                <h3 className="font-bold text-sm text-[#7C3AED] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#7C3AED]/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  Install App
                </h3>
                
                {isIOS && (
                  <div className="space-y-2 text-sm text-muted-foreground font-medium">
                    <p>To install CalebDeck on your iPhone or iPad:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Tap the <strong>Share</strong> button at the bottom of Safari</li>
                      <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                    </ol>
                  </div>
                )}
                
                {isAndroid && (
                  <div className="space-y-2 text-sm text-muted-foreground font-medium">
                    <p>To install CalebDeck on your Android device:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Tap the <strong>Menu</strong> (3 dots) in your browser</li>
                      <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
                    </ol>
                  </div>
                )}
              </Card>
            )}

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

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAvatarPicker(false)}></div>
          <div className="relative bg-card border border-border shadow-2xl rounded-3xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-center">Choose your Memoji</h3>
            <div className="grid grid-cols-4 gap-4">
              {memojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAvatarSelect(emoji)}
                  className={`text-4xl w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 mx-auto ${profile.avatar === emoji ? 'bg-primary/20 border-2 border-primary' : 'bg-muted hover:bg-muted/80'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAvatarPicker(false)}
              className="mt-8 w-full py-3 bg-muted hover:bg-muted/80 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

