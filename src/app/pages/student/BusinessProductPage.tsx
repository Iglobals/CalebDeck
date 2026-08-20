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

  const handleChatWithVendor = async () => {
    if (!product) return;

    // 1. Log the referral tap in Firestore
    try {
      await logReferralTap(
        product.vendorId,
        product.id,
        product.name,
        product.vendorBusinessName,
        user?.uid
      );
    } catch (e) {
      console.error('Failed to log referral tap', e);
      // Don't block the user if logging fails
    }

    // 2. Open WhatsApp to the vendor's own number
    const message = `Hi! I saw your ${product.name} (₦${product.price.toLocaleString()}) on CalebDeck. I'm interested in buying it.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Clean phone number (strip leading 0, assume Nigeria +234 for now if not provided)
    let phone = product.vendorPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '234' + phone.substring(1);
    }

    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO 
        title={`${product.name} by ${product.vendorBusinessName} | CalebDeck Campus Brand`} 
        description={`Get ${product.name} from ${product.vendorBusinessName} on CalebDeck Campus Brand.`} 
      />

      {/* Header */}
      <header className="sticky top-0 bg-background/90 backdrop-blur-md z-40 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
            <Store className="w-3.5 h-3.5" /> Campus Brand
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          
          {/* Product Image */}
          <div className={`aspect-square rounded-[2rem] sm:rounded-[3rem] overflow-hidden flex items-center justify-center p-8 sm:p-12 border-2 shadow-sm ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-gray-50 border-gray-100'}`}>
            <ImageWithFallback 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-contain drop-shadow-xl" 
            />
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                  {product.category}
                </span>
                {!product.inStock && (
                  <span className="text-xs font-black uppercase tracking-widest text-red-500 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                    Out of Stock
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-2">{product.name}</h1>
              <p className="text-2xl font-black text-orange-500 mb-6">₦{product.price.toLocaleString()}</p>
              
              <div className="prose prose-sm dark:prose-invert text-muted-foreground">
                <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
              </div>
            </div>

            <div className="h-px w-full bg-border"></div>

            {/* Vendor Card */}
            <div>
              <p className="text-sm font-bold text-muted-foreground mb-3">Sold By</p>
              <Card className="p-4 flex items-center gap-4 border-border shadow-sm squircle">
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                  <Store className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-lg truncate">{product.vendorBusinessName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-green-500" /> Approved Vendor
                  </p>
                </div>
              </Card>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 shadow-lg shadow-[#25D366]/20 font-bold"
                onClick={handleChatWithVendor}
                disabled={!product.inStock}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {product.inStock ? 'Chat with Vendor to Buy' : 'Currently Unavailable'}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed max-w-xs mx-auto">
                Tapping this will open WhatsApp to message the vendor directly. CalebDeck does not process payments for this item.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
