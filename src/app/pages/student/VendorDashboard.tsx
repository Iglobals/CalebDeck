import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { 
  LogOut, 
  Store, 
  CalendarDays, 
  TrendingUp, 
  Package,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  BusinessVendor, 
  BusinessProduct, 
  subscribeToBusinessProducts, 
  subscribeToVendorReferrals 
} from '../../../services/business';
import { Logo } from '../../components/design-system/Logo';

export default function VendorDashboard() {
  const { studentTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = studentTheme === 'dark';

  const [vendor, setVendor] = useState<BusinessVendor | null>(null);
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    // Check session storage for vendor auth
    const storedVendor = sessionStorage.getItem('calebdeck_vendor');
    if (!storedVendor) {
      navigate('/business');
      return;
    }
    
    try {
      const parsedVendor = JSON.parse(storedVendor);
      // Convert string timestamps back if needed, or handle directly
      setVendor(parsedVendor);
    } catch (e) {
      sessionStorage.removeItem('calebdeck_vendor');
      navigate('/business');
    }
  }, [navigate]);

  useEffect(() => {
    if (!vendor?.id) return;

    // Subscribe to products for this vendor only
    const unsubProducts = subscribeToBusinessProducts((allProducts) => {
      setProducts(allProducts.filter(p => p.vendorId === vendor.id));
    });

    // Subscribe to referrals to get the count
    const unsubReferrals = subscribeToVendorReferrals(vendor.id, (refs) => {
      // Filter for this month
      const now = new Date();
      const thisMonth = refs.filter(r => {
        if (!r.timestamp) return false;
        const refDate = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp._seconds * 1000);
        return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
      });
      setReferralCount(thisMonth.length);
    });

    return () => {
      unsubProducts();
      unsubReferrals();
    };
  }, [vendor?.id]);

  const handleLogout = () => {
    sessionStorage.removeItem('calebdeck_vendor');
    navigate('/business');
  };

  if (!vendor) return <div className="min-h-screen bg-background"></div>;

  // Determine subscription status
  const now = new Date();
  const endDate = vendor.subscriptionEndDate?.seconds 
    ? new Date(vendor.subscriptionEndDate.seconds * 1000) 
    : (vendor.subscriptionEndDate?._seconds ? new Date(vendor.subscriptionEndDate._seconds * 1000) : new Date(vendor.subscriptionEndDate));
  
  const isActive = endDate > now;
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-20">
      
      {/* Top Bar */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="h-4 w-px bg-border"></div>
            <span className="font-bold text-sm text-orange-500">Vendor Portal</span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-red-500 text-sm">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black mb-2">{vendor.businessName}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Store className="w-4 h-4" /> Vendor ID: <span className="font-mono text-foreground">{vendor.vendorId}</span>
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Subscription Card */}
          <Card className={`p-6 border-2 shadow-sm ${isActive ? (isDark ? 'border-[#333333]' : 'border-gray-200') : 'border-red-500/50 bg-red-500/5'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-wider">
                <CalendarDays className="w-4 h-4" /> Subscription
              </div>
              <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                {isActive ? 'Active' : 'Expired'}
              </div>
            </div>
            
            <h2 className="text-2xl font-black mb-1">{vendor.subscriptionPlan}</h2>
            
            {isActive ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {daysRemaining} days remaining
              </p>
            ) : (
              <p className="text-sm text-red-500 font-bold flex items-center gap-1.5 mt-4">
                <AlertCircle className="w-4 h-4" />
                Plan expired. Products hidden.
              </p>
            )}
          </Card>

          {/* Referrals Card */}
          <Card className={`p-6 border-2 shadow-sm ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-wider mb-4">
              <TrendingUp className="w-4 h-4 text-orange-500" /> Referrals
            </div>
            
            <div className="flex items-end gap-3 mb-1">
              <h2 className="text-4xl font-black text-orange-500">{referralCount}</h2>
              <span className="text-sm text-muted-foreground mb-1 font-bold">taps</span>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              People tapped "Chat with Vendor" to reach you this month.
            </p>
          </Card>

          {/* Products Count */}
          <Card className={`p-6 border-2 shadow-sm ${isDark ? 'border-[#333333]' : 'border-gray-200'} sm:col-span-2 lg:col-span-1`}>
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-wider mb-4">
              <Package className="w-4 h-4" /> Active Listings
            </div>
            
            <div className="flex items-end gap-3 mb-1">
              <h2 className="text-4xl font-black">{products.length}</h2>
              <span className="text-sm text-muted-foreground mb-1 font-bold">products</span>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Managed by CalebDeck Admin.
            </p>
          </Card>

        </div>

        {/* Products List */}
        <div>
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            Your Products <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">{products.length}</span>
          </h3>

          {!isActive && products.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Your subscription has expired. These products are currently hidden from the Campus Brand section until you renew.</p>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-[2rem] border-2 border-dashed border-border">
              <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No products listed yet</h3>
              <p className="text-muted-foreground mt-2">Contact support via WhatsApp to add your products to CalebDeck.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map(product => (
                <Card key={product.id} className={`overflow-hidden flex flex-col border-border shadow-sm group ${!product.inStock || !isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className={`relative h-48 flex items-center justify-center p-4 ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                    <ImageWithFallback src={product.imageUrl} alt={product.name} className="w-full h-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-500" />
                    
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                        <span className="px-3 py-1 bg-background rounded-full text-xs font-black uppercase tracking-wider shadow-sm border border-border">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col bg-card border-t border-border/50">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{product.category}</span>
                    <h4 className="font-bold text-sm mb-2 line-clamp-2">{product.name}</h4>
                    <p className="text-orange-500 font-black mt-auto">₦{product.price.toLocaleString()}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
