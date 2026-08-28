import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ArrowLeft, MessageCircle, Store, ShieldCheck } from 'lucide-react';
import { BusinessProduct, subscribeToActiveBusinessProducts, logReferralTap } from '../../../services/business';
import SEO from '../../components/SEO';

export default function BusinessProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const isDark = studentTheme === 'dark';

  const [product, setProduct] = useState<BusinessProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Use active products query so we don't show products from expired vendors
    const unsub = subscribeToActiveBusinessProducts((activeProducts) => {
      const found = activeProducts.find(p => p.id === id);
      setProduct(found || null);
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const handleChatWithVendor = () => {
    if (!product) return;

    // 1. Log the referral tap in Firestore (Fire and forget, do NOT await)
    // Awaiting here causes iOS PWAs to lose the user gesture token, blocking the WhatsApp redirect.
    logReferralTap(
      product.vendorId,
      product.id,
      product.name,
      product.vendorBusinessName,
      user?.uid
    ).catch(e => {
      console.error('Failed to log referral tap', e);
    });

    // 2. Open WhatsApp to the vendor's own number
    const message = `Hi! I saw your ${product.name} (₦${product.price.toLocaleString()}) on CalebDeck. I'm interested in buying it.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Clean phone number (strip leading 0, assume Nigeria +234 for now if not provided)
    let phone = product.vendorPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '234' + phone.substring(1);
    }

    // Use window.location.href instead of window.open for iOS PWAs to reliably trigger the deep link
    window.location.href = `https://wa.me/${phone}?text=${encodedMessage}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-black mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-8">This item may have been removed or the vendor's listing is inactive.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Return to CalebDeck</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full overflow-hidden bg-[#F5F5F5] dark:bg-[#121212] text-foreground selection:bg-primary/30">
      <SEO 
        title={`${product.name} by ${product.vendorBusinessName} | CalebDeck Campus Brand`} 
        description={`Get ${product.name} from ${product.vendorBusinessName} on CalebDeck Campus Brand.`} 
      />

      {/* Top Card: Hero Image Section */}
      <div 
        className="absolute top-0 left-0 right-0 h-[46dvh] md:h-[100dvh] md:w-1/2 transition-colors rounded-b-[32px] md:rounded-b-none shadow-md z-0 overflow-hidden bg-muted/20"
      >
        <header 
          className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-6 flex items-center justify-between"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-black shadow-sm">
            <Store className="w-3.5 h-3.5" /> Campus Brand
          </div>
          
          <div className="w-10 h-10" /> {/* Spacer */}
        </header>

        <div className="absolute inset-0 flex items-center justify-center pt-16 pb-12 px-12 md:relative md:h-[100vh]">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain drop-shadow-2xl transition-all duration-300"
          />
        </div>
      </div>

      {/* Bottom Card: Info Panel */}
      <div className="absolute top-[48dvh] bottom-0 left-0 right-0 md:top-0 md:h-[100dvh] md:left-[50%] md:w-1/2 bg-card border-t border-border/60 rounded-t-[32px] md:rounded-none shadow-[0_-10px_30px_rgba(0,0,0,0.08)] md:shadow-none flex flex-col z-10 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-40 space-y-6">
          <div className="flex justify-between items-start gap-4 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-[85%]">{product.name}</h1>
          </div>

          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Price:</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">₦{product.price.toLocaleString()}</p>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground px-3 py-1.5 bg-muted rounded-full">
              {product.category}
            </span>
          </div>

          <div className="mb-8">
            <p className="font-semibold mb-2">Description</p>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {product.description || 'No description provided.'}
            </p>
          </div>

          <div className="mb-8">
            <p className="text-sm font-bold text-muted-foreground mb-3">Sold By</p>
            <Card className="p-4 flex items-center gap-4 border-border shadow-sm squircle">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                <Store className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg truncate">{product.vendorBusinessName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Approved Vendor
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div 
        className="absolute bottom-0 left-0 right-0 md:left-[50%] z-40 pointer-events-none"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="px-6 mb-4 sm:mb-6 pointer-events-auto space-y-2 flex flex-col items-center">
          <div className="text-[10px] text-muted-foreground bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-full px-4 py-1.5 shadow-sm text-center">
            CalebDeck does not process payments for this item.
          </div>
          <div className="w-full flex items-center gap-2 bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-white/40 dark:border-white/10 p-2 rounded-[2rem] shadow-xl">
            <Button 
              onClick={handleChatWithVendor}
              disabled={!product.inStock}
              variant="primary"
              className="flex-1 h-14 rounded-full text-white bg-[#25D366] hover:bg-[#128C7E] border-none font-bold shadow-sm transition-transform hover:scale-[1.02]"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {product.inStock ? 'Chat with Vendor to Buy' : 'Currently Unavailable'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
