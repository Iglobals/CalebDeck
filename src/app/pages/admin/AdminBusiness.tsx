import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { 
  Search, Plus, Trash2, Pencil, Upload, 
  X, Loader2, Store, CalendarDays, TrendingUp,
  AlertCircle, Key, Copy, MessageCircle, Package, EyeOff
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { removeBackgroundML } from '../../../utils/imageUtils';
import { 
  BusinessVendor, BusinessProduct, BusinessReferral,
  subscribeToBusinessVendors, subscribeToBusinessProducts, subscribeToAllReferrals,
  addBusinessVendor, updateBusinessVendor, deleteBusinessVendor,
  addBusinessProduct, updateBusinessProduct, deleteBusinessProduct,
  generateAccessCode 
} from '../../../services/business';
import { Timestamp } from 'firebase/firestore';

export default function AdminBusiness() {
  const { adminTheme } = useTheme();
  const isDark = adminTheme === 'dark';

  const [activeTab, setActiveTab] = useState<'vendors' | 'products'>('vendors');
  
  const [vendors, setVendors] = useState<BusinessVendor[]>([]);
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [referrals, setReferrals] = useState<BusinessReferral[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<BusinessVendor | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BusinessProduct | null>(null);
  
  // Forms
  const [vendorForm, setVendorForm] = useState({
    businessName: '', description: '', category: '', contactName: '', contactPhone: '', contactEmail: '',
    subscriptionPlan: 'Monthly Plan (₦2,999/month)', startDate: '', endDate: '', imageUrl: ''
  });
  
  const [productForm, setProductForm] = useState({
    vendorId: '', name: '', description: '', price: '', category: '', inStock: true, imageUrl: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const thisMonthReferrals = referrals.filter(r => {
    if (!r.timestamp) return false;
    const refDate = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp._seconds * 1000);
    const now = new Date();
    return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
  });

  // Pre-compute vendor cross-reference maps to avoid O(N×M) in the render loop
  const refsByVendor = useMemo(() => {
    const map = new Map<string, number>();
    thisMonthReferrals.forEach(r => map.set(r.vendorId, (map.get(r.vendorId) || 0) + 1));
    return map;
  }, [thisMonthReferrals]);

  const prodsByVendor = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => map.set(p.vendorId, (map.get(p.vendorId) || 0) + 1));
    return map;
  }, [products]);

  useEffect(() => {
    const unsubVendors = subscribeToBusinessVendors((v) => { setVendors(v); setLoading(false); });
    const unsubProducts = subscribeToBusinessProducts(setProducts);
    const unsubReferrals = subscribeToAllReferrals(setReferrals);
    
    return () => { unsubVendors(); unsubProducts(); unsubReferrals(); };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vendor' | 'product') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Please select an image smaller than 2MB'); return; }
    
    setProcessingImage(true);
    try {
      const dataUrl = await removeBackgroundML(file);
      if (type === 'vendor') setVendorForm(prev => ({ ...prev, imageUrl: dataUrl }));
      else setProductForm(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch (err) {
      console.error('Background removal failed, using original:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'vendor') setVendorForm(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
        else setProductForm(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = {
        businessName: vendorForm.businessName,
        description: vendorForm.description,
        category: vendorForm.category,
        contactName: vendorForm.contactName,
        contactPhone: vendorForm.contactPhone,
        contactEmail: vendorForm.contactEmail,
        subscriptionPlan: vendorForm.subscriptionPlan,
        subscriptionStartDate: vendorForm.startDate ? Timestamp.fromDate(new Date(vendorForm.startDate)) : Timestamp.now(),
        subscriptionEndDate: vendorForm.endDate ? Timestamp.fromDate(new Date(vendorForm.endDate)) : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        imageUrl: vendorForm.imageUrl
      };

      if (editingVendor) {
        await updateBusinessVendor(editingVendor.id, data);
      } else {
        // Generate a unique activation token (NOT an access code — code comes after payment)
        const activationToken = crypto.randomUUID();
        await addBusinessVendor({ 
          ...data, 
          accessCode: '', 
          accessCodePlain: '',
          activationToken,
          status: 'PENDING_PAYMENT'
        } as any);
        // Show the activation link for admin to send to vendor
        setGeneratedCode(`${window.location.origin}/business/activate/${activationToken}`);
      }
      
      if (editingVendor) setIsVendorModalOpen(false); // keep open if new to show activation link
      setEditingVendor(null);
    } catch (err) {
      console.error("Error saving vendor", err);
      alert("Failed to save vendor.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async (vendorId: string) => {
    if (window.confirm('Are you sure? This will log the vendor out everywhere immediately.')) {
      const newCode = generateAccessCode();
      await updateBusinessVendor(vendorId, { accessCode: newCode, accessCodePlain: newCode } as any);
      setGeneratedCode(newCode);
    }
  };

  const handleManualActivate = async (vendorId: string) => {
    if (!window.confirm('Force-activate this vendor WITHOUT payment? This will be flagged as MANUAL_OVERRIDE in the audit trail.')) return;
    const code = generateAccessCode();
    const now = new Date();
    const vendorDoc = vendors.find(v => v.id === vendorId);
    const plan = vendorDoc?.subscriptionPlan || 'Monthly Plan (₦2,999/month)';
    const isYearly = plan.toLowerCase().includes('year');
    const endDate = new Date(now.getTime() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000);

    await updateBusinessVendor(vendorId, {
      status: 'ACTIVE',
      accessCode: code,
      accessCodePlain: code,
      subscriptionStartDate: Timestamp.fromDate(now),
      subscriptionEndDate: Timestamp.fromDate(endDate),
      activatedAt: Timestamp.now(),
      activationMethod: 'MANUAL_OVERRIDE'
    } as any);
    setGeneratedCode(code);
    setIsVendorModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.vendorId) { alert("Select a vendor"); return; }
    
    setSaving(true);
    try {
      const vendor = vendors.find(v => v.id === productForm.vendorId);
      
      const data = {
        vendorId: productForm.vendorId,
        vendorBusinessName: vendor?.businessName || '',
        vendorPhone: vendor?.contactPhone || '',
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        category: productForm.category || vendor?.category || 'General',
        imageUrl: productForm.imageUrl,
        inStock: productForm.inStock
      };

      if (editingProduct) {
        await updateBusinessProduct(editingProduct.id, data);
      } else {
        await addBusinessProduct(data);
      }
      
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error("Error saving product", err);
      alert("Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const openVendorModal = (v?: BusinessVendor) => {
    if (v) {
      const start = v.subscriptionStartDate?.toDate ? v.subscriptionStartDate.toDate() : new Date(v.subscriptionStartDate._seconds * 1000);
      const end = v.subscriptionEndDate?.toDate ? v.subscriptionEndDate.toDate() : new Date(v.subscriptionEndDate._seconds * 1000);
      
      setVendorForm({
        businessName: v.businessName, description: v.description, category: v.category, contactName: v.contactName,
        contactPhone: v.contactPhone, contactEmail: v.contactEmail || '', subscriptionPlan: v.subscriptionPlan,
        startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0], imageUrl: v.imageUrl || ''
      });
      setEditingVendor(v);
    } else {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setVendorForm({
        businessName: '', description: '', category: '', contactName: '', contactPhone: '', contactEmail: '',
        subscriptionPlan: 'Monthly Plan (₦2,999/month)', startDate: now.toISOString().split('T')[0], endDate: nextMonth.toISOString().split('T')[0], imageUrl: ''
      });
      setEditingVendor(null);
    }
    setGeneratedCode('');
    setIsVendorModalOpen(true);
  };

  const openProductModal = (p?: BusinessProduct) => {
    if (p) {
      setProductForm({
        vendorId: p.vendorId, name: p.name, description: p.description, price: p.price.toString(),
        category: p.category, inStock: p.inStock, imageUrl: p.imageUrl || ''
      });
      setEditingProduct(p);
    } else {
      setProductForm({ vendorId: '', name: '', description: '', price: '', category: '', inStock: true, imageUrl: '' });
      setEditingProduct(null);
    }
    setIsProductModalOpen(true);
  };

  const getVendorStatus = (v: BusinessVendor) => {
    if ((v as any).status === 'PENDING_PAYMENT') return 'pending';
    const end = v.subscriptionEndDate?.toDate ? v.subscriptionEndDate.toDate() : (v.subscriptionEndDate?._seconds ? new Date(v.subscriptionEndDate._seconds * 1000) : new Date(v.subscriptionEndDate));
    return end > new Date() ? 'active' : 'expired';
  };

  const sendRenewalReminder = (v: BusinessVendor) => {
    const end = v.subscriptionEndDate?.toDate ? v.subscriptionEndDate.toDate() : new Date(v.subscriptionEndDate._seconds * 1000);
    const dateStr = end.toLocaleDateString();
    const msg = `Hi ${v.contactName},\n\nYour CalebDeck Business subscription for *${v.businessName}* is set to expire on ${dateStr}. Please let us know if you'd like to renew to keep your products live on campus!`;
    window.open(`https://wa.me/${v.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <AdminLayout title="Business Vendors">
      <div className="space-y-6">
        
        {/* Top Metric */}
        <div className="grid sm:grid-cols-3 gap-6">
          <Card className={`p-6 border-2 shadow-sm ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-wider mb-4">
              <TrendingUp className="w-4 h-4 text-orange-500" /> Platform Referrals
            </div>
            <div className="flex items-end gap-3 mb-1">
              <h2 className="text-4xl font-black text-orange-500">{thisMonthReferrals.length}</h2>
              <span className="text-sm text-muted-foreground mb-1 font-bold">taps this month</span>
            </div>
          </Card>
          
          <Card className={`p-6 border-2 shadow-sm ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-wider mb-4">
              <Store className="w-4 h-4 text-blue-500" /> Active Vendors
            </div>
            <div className="flex items-end gap-3 mb-1">
              <h2 className="text-4xl font-black">{vendors.filter(v => getVendorStatus(v) === 'active').length}</h2>
              <span className="text-sm text-muted-foreground mb-1 font-bold">/ {vendors.length} total</span>
            </div>
          </Card>

          <Card className={`p-6 border-2 shadow-sm ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-wider mb-4">
              <Package className="w-4 h-4 text-green-500" /> Active Products
            </div>
            <div className="flex items-end gap-3 mb-1">
              <h2 className="text-4xl font-black">{products.length}</h2>
              <span className="text-sm text-muted-foreground mb-1 font-bold">in catalog</span>
            </div>
          </Card>
        </div>

        {/* Header Actions & Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'vendors' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Vendors
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'products' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Products
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border-2 outline-none text-sm ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-orange-500' : 'border-gray-200 bg-white focus:border-orange-500/50'}`}
              />
            </div>
            
            <Button 
              variant="primary" 
              onClick={() => activeTab === 'vendors' ? openVendorModal() : openProductModal()}
              className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" /> 
              {activeTab === 'vendors' ? 'Onboard Vendor' : 'Add Product'}
            </Button>
          </div>
        </div>

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.filter(v => v.businessName.toLowerCase().includes(searchQuery.toLowerCase())).map(vendor => {
              const status = getVendorStatus(vendor);
              const refs = refsByVendor.get(vendor.id) || 0;
              const prodCount = prodsByVendor.get(vendor.id) || 0;
              
              return (
                <Card key={vendor.id} className={`p-5 flex flex-col border-2 shadow-sm ${status === 'expired' ? (isDark ? 'border-red-900/50 bg-red-900/10' : 'border-red-200 bg-red-50') : (isDark ? 'border-[#333333]' : 'border-gray-200')}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {vendor.imageUrl ? <img src={vendor.imageUrl} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-muted-foreground/50" />}
                      </div>
                      <div>
                        <h3 className="font-black text-lg truncate">{vendor.businessName}</h3>
                        <p className="text-xs font-mono text-muted-foreground">{vendor.vendorId}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${status === 'active' ? 'bg-green-500/10 text-green-600' : status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                      {status === 'pending' ? 'Awaiting Payment' : status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="bg-background rounded-lg p-2 border border-border text-center">
                      <p className="text-muted-foreground text-[10px] font-bold uppercase">Products</p>
                      <p className="font-black">{prodCount}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2 border border-border text-center">
                      <p className="text-muted-foreground text-[10px] font-bold uppercase">Referrals</p>
                      <p className="font-black text-orange-500">{refs}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-border flex justify-between gap-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => sendRenewalReminder(vendor)} className="text-muted-foreground hover:text-green-500 p-2">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      {status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => handleManualActivate(vendor.id)} className="text-yellow-600 hover:bg-yellow-500/10 p-2" title="Force activate without payment">
                          <Key className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openVendorModal(vendor)} className="text-blue-500 p-2">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if(window.confirm('Delete vendor?')) deleteBusinessVendor(vendor.id) }} className="text-red-500 p-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.vendorBusinessName.toLowerCase().includes(searchQuery.toLowerCase())).map(product => {
              const vendor = vendors.find(v => v.id === product.vendorId);
              const vStatus = vendor ? getVendorStatus(vendor) : 'expired';
              const hidden = vStatus === 'expired';

              return (
                <Card key={product.id} className={`overflow-hidden flex flex-col border-border shadow-sm group ${(!product.inStock || hidden) ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className={`relative h-40 flex items-center justify-center p-4 ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                    <ImageWithFallback src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                    {hidden && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden (Vendor Expired)
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col bg-card border-t border-border/50">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">{product.vendorBusinessName}</span>
                    <h4 className="font-bold text-sm mb-2 line-clamp-2 flex-1">{product.name}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-orange-500 font-black">₦{product.price}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openProductModal(product)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if(window.confirm('Delete product?')) deleteBusinessProduct(product.id) }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>

      {/* Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
              <h2 className="text-xl font-bold">{editingVendor ? 'Edit Vendor' : 'Onboard New Vendor'}</h2>
              <button onClick={() => { setIsVendorModalOpen(false); setGeneratedCode(''); }} className="p-2 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {generatedCode ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black">{generatedCode.startsWith('http') ? 'Vendor Activation Link' : 'Access Code Generated'}</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    {generatedCode.startsWith('http')
                      ? 'Send this link to the vendor. Their access code will be generated after they pay.'
                      : 'Copy this code and send it to the vendor. You will not be able to see it again.'}
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <code className="text-2xl font-mono tracking-widest bg-muted px-6 py-4 rounded-xl border border-border">
                      {generatedCode}
                    </code>
                    <Button variant="secondary" onClick={() => navigator.clipboard.writeText(generatedCode)} className="h-16 w-16">
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <Button variant="primary" onClick={() => { setIsVendorModalOpen(false); setGeneratedCode(''); }} className="mt-8">
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSaveVendor} className="space-y-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2">Vendor Logo</label>
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'vendor')} />
                      <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={processingImage}>
                        {processingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} 
                        {vendorForm.imageUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                    </div>
                    {vendorForm.imageUrl && (
                      <div className="w-20 h-20 rounded-xl bg-muted border-2 border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src={vendorForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Business Name</label>
                      <input required value={vendorForm.businessName} onChange={e => setVendorForm({...vendorForm, businessName: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Category Tag</label>
                      <input required value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})} placeholder="e.g. Perfume" className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Contact Name</label>
                      <input required value={vendorForm.contactName} onChange={e => setVendorForm({...vendorForm, contactName: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">WhatsApp No.</label>
                      <input type="tel" value={vendorForm.contactPhone} onChange={e => setVendorForm({...vendorForm, contactPhone: e.target.value})} placeholder="Optional WhatsApp" className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border-2 border-orange-500/20 bg-orange-500/5">
                    <div className="col-span-3 font-bold text-sm text-orange-500">Subscription Setup</div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold mb-2">Plan Name</label>
                      <input required value={vendorForm.subscriptionPlan} onChange={e => setVendorForm({...vendorForm, subscriptionPlan: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold mb-2">Start Date</label>
                      <input required type="date" value={vendorForm.startDate} onChange={e => setVendorForm({...vendorForm, startDate: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold mb-2">End Date (Expiry)</label>
                      <input required type="date" value={vendorForm.endDate} onChange={e => setVendorForm({...vendorForm, endDate: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    {editingVendor ? (
                      <Button type="button" variant="outline" onClick={() => handleRegenerateCode(editingVendor.id)} className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                        <Key className="w-4 h-4 mr-2" /> Reset Access Code
                      </Button>
                    ) : <div></div>}
                    <div className="flex gap-3">
                      <Button type="button" variant="ghost" onClick={() => setIsVendorModalOpen(false)}>Cancel</Button>
                      <Button type="submit" variant="primary" disabled={saving} className="bg-orange-500 text-white min-w-[120px]">
                        {saving ? 'Saving...' : (editingVendor ? 'Save Changes' : 'Onboard Vendor')}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
              <h2 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add Business Product'}</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {!editingProduct && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Select Vendor</label>
                  <select required value={productForm.vendorId} onChange={e => setProductForm({...productForm, vendorId: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`}>
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.businessName} ({v.vendorId})</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2">Product Image</label>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'product')} />
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={processingImage}>
                    {processingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} 
                    {productForm.imageUrl ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                {productForm.imageUrl && (
                  <div className="w-20 h-20 rounded-xl bg-muted border-2 border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={productForm.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Product Name</label>
                  <input required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Display Price (₦)</label>
                  <input required type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea rows={3} required value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className={`w-full px-4 py-3 rounded-xl border-2 outline-none resize-none ${isDark ? 'border-[#333333] bg-[#2A2A2A]' : 'border-gray-200'}`}></textarea>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="inStock" checked={productForm.inStock} onChange={e => setProductForm({...productForm, inStock: e.target.checked})} className="w-5 h-5 rounded accent-orange-500" />
                <label htmlFor="inStock" className="font-semibold cursor-pointer">In Stock</label>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving || processingImage || !productForm.imageUrl} className="bg-orange-500 text-white min-w-[120px]">
                  {saving ? 'Saving...' : 'Save Product'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </AdminLayout>
  );
}
