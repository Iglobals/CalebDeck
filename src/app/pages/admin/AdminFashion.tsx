import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Eye,
  EyeOff,
  Shirt,
  X,
  Loader2
} from 'lucide-react';
import { subscribeToFashionItems, FashionItem, addFashionItem, updateFashionItem, deleteFashionItem, subscribeToFashionCategories, FashionCategory, addFashionCategory, deleteFashionCategory } from '../../../services/fashion';
import { deleteCloudinaryMediaByUrl, deleteMediaFromCloudinary, uploadMediaToCloudinary } from '../../../services/cloudinary';
import { migrateFashionMediaToCloudinary, type FashionMigrationProgress } from '../../../services/migrateFashionMedia';
import { useTheme } from '../../../context/ThemeContext';

interface PendingMediaUpload {
  file: File;
  publicId: string;
}

const getItemMediaUrls = (item: Partial<FashionItem>) => [
  item.imageUrl,
  item.videoUrl,
  item.sizeChartUrl,
  ...(item.mediaUrls || []),
  ...(item.media || []).map(media => media.url),
  ...Object.values(item.colorMedia || {})
].filter((url): url is string => typeof url === 'string' && url.length > 0);

export default function AdminFashion() {
  const [items, setItems] = useState<FashionItem[]>([]);
  const [categories, setCategories] = useState<FashionCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<FashionItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    brandColor: '#F97316',
    price: '',
    category: 'Apparel',
    imageUrl: '',
    description: '',
    inStock: true,
    sizesInput: '',
    colors: [] as string[],
    videoUrl: '',
    mediaUrls: [] as string[],
    colorMedia: {} as Record<string, string>,
    variationName: '',
    variationsInput: '',
    sizeChartUrl: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingMediaUpload>>({});
  const [migrationProgress, setMigrationProgress] = useState<FashionMigrationProgress | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminTheme } = useTheme();

  useEffect(() => {
    const unsubItems = subscribeToFashionItems((data) => {
      setItems(data);
      setLoading(false);
    });
    const unsubCats = subscribeToFashionCategories((data) => {
      setCategories(data);
    });
    return () => { unsubItems(); unsubCats(); };
  }, []);

  const itemCategories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);
  const savedCategoryNames = categories.map(c => c.name);
  const allUniqueCategoryNames = Array.from(new Set([...itemCategories, ...savedCategoryNames])).sort();
  
  const displayCategories = ['All', ...allUniqueCategoryNames];

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await addFashionCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const clearPendingUploads = (urls: string[] = Object.keys(pendingUploads)) => {
    urls.forEach(url => {
      if (pendingUploads[url]) URL.revokeObjectURL(url);
    });
    setPendingUploads(current => {
      const next = { ...current };
      urls.forEach(url => delete next[url]);
      return next;
    });
  };

  const closeItemModal = () => {
    clearPendingUploads();
    setIsAdding(false);
    setEditingItem(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'media' | 'video' | 'sizeChart') => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const selectedFiles = type === 'media' ? files : files.slice(0, 1);
    const selected = selectedFiles.map(file => {
      const url = URL.createObjectURL(file);
      return [url, { file, publicId: `fashion_items/${crypto.randomUUID()}` }] as const;
    });
    const replacedUrl = type === 'main' ? formData.imageUrl : type === 'video' ? formData.videoUrl : type === 'sizeChart' ? formData.sizeChartUrl : '';
    if (replacedUrl) clearPendingUploads([replacedUrl]);

    setPendingUploads(current => ({ ...current, ...Object.fromEntries(selected) }));
    setFormData(previous => {
      const selectedUrls = selected.map(([url]) => url);
      if (type === 'main') return {
        ...previous,
        imageUrl: selectedUrls[0],
        colorMedia: Object.fromEntries(Object.entries(previous.colorMedia).map(([color, mediaUrl]) => [color, mediaUrl === replacedUrl ? selectedUrls[0] : mediaUrl]))
      };
      if (type === 'video') return { ...previous, videoUrl: selectedUrls[0] };
      if (type === 'sizeChart') return { ...previous, sizeChartUrl: selectedUrls[0] };
      return { ...previous, mediaUrls: [...previous.mediaUrls, ...selectedUrls] };
    });
    e.target.value = '';
  };

  const handleRemoveMedia = (url: string, type: 'main'|'video'|'sizeChart'|'media') => {
    clearPendingUploads([url]);
    setFormData(prev => {
      if (type === 'main') return { ...prev, imageUrl: '', colorMedia: Object.fromEntries(Object.entries(prev.colorMedia).filter(([, mediaUrl]) => mediaUrl !== url)) };
      if (type === 'video') return { ...prev, videoUrl: '' };
      if (type === 'sizeChart') return { ...prev, sizeChartUrl: '' };
      if (type === 'media') return {
        ...prev,
        mediaUrls: prev.mediaUrls.filter(mediaUrl => mediaUrl !== url),
        colorMedia: Object.fromEntries(Object.entries(prev.colorMedia).filter(([, mediaUrl]) => mediaUrl !== url))
      };
      return prev;
    });
  };

  const runMigration = async () => {
    const failedItems = migrationProgress?.failedItems || [];
    const retryIds = migrationProgress?.status === 'error' && failedItems.length > 0
      ? failedItems.map(item => item.id)
      : undefined;
    const confirmation = retryIds
      ? `Retry migration for only these ${retryIds.length} failed item(s)? Previously uploaded assets will be reused.`
      : "This will migrate all base64 images in Firestore to Cloudinary. Make sure you don't refresh the page.";

    if (window.confirm(confirmation)) {
      setMigrationBusy(true);
      setMigrationProgress({
        message: retryIds ? `Retrying ${retryIds.length} failed item(s)...` : 'Starting migration...',
        progress: 0,
        completed: 0,
        total: retryIds?.length || 0,
        status: 'running',
        failedItems
      });
      try {
        await migrateFashionMediaToCloudinary(setMigrationProgress, retryIds);
      } catch (err) {
        setMigrationProgress(previous => ({
          message: err instanceof Error ? `Migration failed: ${err.message}` : 'Migration failed unexpectedly. Please try again.',
          progress: previous?.progress || 0,
          completed: previous?.completed || 0,
          total: previous?.total || 0,
          status: 'error',
          failedItems: previous?.failedItems || []
        }));
      } finally {
        setMigrationBusy(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.imageUrl || !formData.brand) return;

    setSaving(true);
    setProcessingImage(true);
    setUploadProgress(0);
    const uploadedAssets: Array<{ publicId: string; type: 'image' | 'video' }> = [];
    try {
      const uploadedUrls = new Map<string, string>();
      const stagedEntries = Object.entries(pendingUploads);
      for (const [index, [previewUrl, pendingUpload]] of stagedEntries.entries()) {
        const result = await uploadMediaToCloudinary(pendingUpload.file, progress => {
          setUploadProgress(Math.round(((index + progress / 100) / stagedEntries.length) * 100));
        }, { publicId: pendingUpload.publicId });
        uploadedUrls.set(previewUrl, result.url);
        uploadedAssets.push({ publicId: result.publicId, type: result.type });
      }

      const resolveUrl = (url: string) => uploadedUrls.get(url) || url;
      const itemData = {
        name: formData.name,
        brand: formData.brand,
        brandColor: formData.brandColor,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        imageUrl: resolveUrl(formData.imageUrl),
        inStock: formData.inStock,
        sizes: formData.sizesInput ? formData.sizesInput.split(',').map(s => s.trim()).filter(s => s !== '') : [],
        colors: formData.colors,
        videoUrl: resolveUrl(formData.videoUrl),
        mediaUrls: formData.mediaUrls.map(resolveUrl),
        colorMedia: Object.fromEntries(Object.entries(formData.colorMedia).map(([color, url]) => [color, resolveUrl(url)])),
        variationName: formData.variationName,
        variations: formData.variationsInput ? formData.variationsInput.split(',').map(s => s.trim()).filter(s => s !== '') : [],
        sizeChartUrl: resolveUrl(formData.sizeChartUrl)
      };

      if (editingItem) {
        await updateFashionItem(editingItem.id, itemData);
      } else {
        await addFashionItem(itemData);
      }

      if (editingItem) {
        const currentUrls = new Set(getItemMediaUrls(itemData));
        const retainedByOtherItems = new Set(
          items
            .filter(item => item.id !== editingItem.id)
            .flatMap(getItemMediaUrls)
        );
        const removedUrls = [...new Set(getItemMediaUrls(editingItem))]
          .filter(url => !currentUrls.has(url) && !retainedByOtherItems.has(url));
        const cleanupResults = await Promise.allSettled(removedUrls.map(deleteCloudinaryMediaByUrl));
        const cleanupFailures = cleanupResults.filter(result => result.status === 'rejected').length;
        if (cleanupFailures) console.error(`Saved fashion item, but failed to remove ${cleanupFailures} replaced Cloudinary asset(s).`);
      }
      
      clearPendingUploads(Object.keys(pendingUploads));
      setIsAdding(false);
      setEditingItem(null);
      setFormData({ name: '', brand: '', brandColor: '#F97316', description: '', price: '', category: categories[0]?.name || 'Apparel', imageUrl: '', inStock: true, sizesInput: '', colors: [], videoUrl: '', mediaUrls: [], colorMedia: {}, variationName: '', variationsInput: '', sizeChartUrl: '' });
      if (uploadedAssets.length) setUploadProgress(100);
    } catch (err) {
      await Promise.allSettled(uploadedAssets.map(asset => deleteMediaFromCloudinary(asset.publicId, asset.type)));
      console.error("Error saving fashion item", err);
      alert(err instanceof Error ? `Failed to save item: ${err.message}` : 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
      setProcessingImage(false);
    }
  };

  const handleEdit = (item: FashionItem) => {
    clearPendingUploads();
    setFormData({
      name: item.name,
      brand: item.brand,
      brandColor: item.brandColor || '#F97316',
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      inStock: item.inStock,
      sizesInput: item.sizes ? item.sizes.join(', ') : '',
      colors: item.colors || [],
      videoUrl: item.videoUrl || '',
      mediaUrls: item.mediaUrls || [],
      colorMedia: item.colorMedia || {},
      variationName: item.variationName || '',
      variationsInput: item.variations ? item.variations.join(', ') : '',
      sizeChartUrl: item.sizeChartUrl || ''
    });
    setEditingItem(item);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fashion item?')) {
      const item = items.find(current => current.id === id);
      try {
        await deleteFashionItem(id);
        if (item) {
          const retainedByOtherItems = new Set(
            items.filter(current => current.id !== id).flatMap(getItemMediaUrls)
          );
          const removableUrls = [...new Set(getItemMediaUrls(item))].filter(url => !retainedByOtherItems.has(url));
          const cleanupResults = await Promise.allSettled(removableUrls.map(deleteCloudinaryMediaByUrl));
          const cleanupFailures = cleanupResults.filter(result => result.status === 'rejected').length;
          if (cleanupFailures) alert(`Item deleted, but ${cleanupFailures} Cloudinary asset(s) could not be removed. Check the console.`);
        }
      } catch (err) {
        console.error('Failed to delete fashion item', err);
        alert(err instanceof Error ? `Failed to delete item: ${err.message}` : 'Failed to delete item. Please try again.');
      }
    }
  };

  const handleToggleStock = async (item: FashionItem) => {
    await updateFashionItem(item.id, { inStock: !item.inStock });
  };

  const isDark = adminTheme === 'dark';

  return (
    <AdminLayout title="Fashion Inventory">
      <div className="space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search fashion items or brands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${
                isDark 
                ? 'border-[#333333] bg-[#222222] text-[#FAF9F6] focus:border-[#7C3AED]' 
                : 'border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED]/50'
              }`}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsManagingCategories(true)}
              className="flex items-center gap-2"
            >
              Manage Categories
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: '', brand: '', brandColor: '#F97316', description: '', price: '', category: categories[0]?.name || 'Apparel', imageUrl: '', inStock: true, sizesInput: '', colors: [], videoUrl: '', mediaUrls: [], colorMedia: {}, variationName: '', variationsInput: '', sizeChartUrl: '' });
                setIsAdding(true);
              }}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            >
              <Plus className="w-5 h-5" /> Add New Item
            </Button>
          </div>
        </div>

        {/* Cloudinary Migration Helper */}
        {migrationProgress?.status !== 'complete' && <div className="bg-muted/20 p-4 rounded-xl border border-border text-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="min-w-0 flex-1">
              <strong>Firestore Migration</strong>
              <p className="text-muted-foreground">Move existing base64 product images to Cloudinary to save Firestore space.</p>
              {migrationProgress && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex justify-between gap-3">
                    <p className={`font-semibold ${migrationProgress.status === 'error' ? 'text-red-600' : migrationProgress.status === 'complete' ? 'text-green-700' : 'text-[#7C3AED]'}`}>
                      {migrationProgress.message}
                    </p>
                    {migrationProgress.total > 0 && <span className="shrink-0 tabular-nums">{migrationProgress.completed}/{migrationProgress.total}</span>}
                  </div>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Firestore media migration progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={migrationProgress.progress}
                  >
                    <div
                      className={`h-full transition-[width] duration-300 ${migrationProgress.status === 'error' ? 'bg-red-500' : migrationProgress.status === 'complete' ? 'bg-green-500' : 'bg-[#7C3AED]'}`}
                      style={{ width: `${migrationProgress.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{migrationProgress.progress}% complete</p>
                  {migrationProgress.failedItems.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold text-red-600">Failed items</p>
                      <ul className="mt-1 max-h-36 space-y-2 overflow-y-auto">
                        {migrationProgress.failedItems.map(item => (
                          <li key={item.id} className="rounded border border-red-200 bg-red-50/70 p-2 dark:border-red-900 dark:bg-red-950/20">
                            <p className="font-medium">{item.name || item.id}</p>
                            <p className="break-words text-xs text-red-700 dark:text-red-300">{item.error}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={runMigration} disabled={migrationBusy}>
              {migrationBusy
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Migrating...</>
                : migrationProgress?.status === 'error' && migrationProgress.failedItems.length > 0
                  ? `Retry failed (${migrationProgress.failedItems.length})`
                  : 'Run Migration'}
            </Button>
          </div>
        </div>}

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {displayCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeCategory === cat
                ? 'bg-[#7C3AED] text-white shadow-md'
                : isDark
                  ? 'bg-[#222222] text-[#9C8F7F] hover:bg-[#333333]'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {loading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className={`h-64 rounded-2xl animate-pulse ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`}></div>
            ))
          ) : filteredItems.map(item => (
            <Card key={item.id} className={`overflow-hidden flex flex-col ${!item.inStock ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className={`relative h-40 flex items-center justify-center p-4 rounded-t-2xl ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl shadow-sm" />
                ) : (
                  <Shirt className="w-12 h-12 text-[#7C3AED]/30" />
                )}
                
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-md rounded-md border border-border flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.brandColor || '#F97316' }}></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.brand}</span>
                </div>

                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => handleToggleStock(item)}
                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur shadow-sm hover:bg-background transition-colors"
                    title={item.inStock ? "Mark Out of Stock" : "Mark In Stock"}
                  >
                    {item.inStock ? <Eye className="w-4 h-4 text-[#10B981]" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-1">{item.category}</span>
                <h3 className="font-bold text-sm mb-2 line-clamp-2 flex-1">{item.name}</h3>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <span className="font-black text-[#F97316]">₦{item.price}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add/Edit Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
            <Card className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden animate-in fade-in zoom-in duration-200 sm:max-h-[calc(100dvh-2rem)]">
              <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                <h2 className="text-lg sm:text-xl font-bold">{editingItem ? 'Edit Fashion Item' : 'Add New Fashion Item'}</h2>
                <button onClick={closeItemModal} disabled={saving} className="p-2 hover:bg-muted rounded-full disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                {Object.keys(pendingUploads).length > 0 && !saving && (
                  <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground" role="status">
                    {Object.keys(pendingUploads).length} file(s) selected. They stay on this device until you save the item.
                  </p>
                )}
                {saving && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2" role="status" aria-live="polite">
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span>{processingImage ? 'Uploading media and saving item...' : 'Saving item...'}</span>
                      {Object.keys(pendingUploads).length > 0 && <span>{uploadProgress}%</span>}
                    </div>
                    {Object.keys(pendingUploads).length > 0 && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Saving item media" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}>
                        <div className="h-full bg-[#7C3AED] transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}
                <fieldset disabled={saving} className="contents">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-2">Main Image (Required)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e) => handleImageUpload(e, 'main')}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingImage}
                    >
                      <><Upload className="w-4 h-4" /> {formData.imageUrl ? (pendingUploads[formData.imageUrl] ? 'Change Selected Image' : 'Change Main Image') : 'Select Main Image'}</>
                    </Button>
                  </div>
                  {formData.imageUrl && (
                    <div className="w-20 h-20 relative rounded-xl bg-muted/50 border-2 border-border overflow-hidden flex items-center justify-center flex-shrink-0 group">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <button type="button" onClick={() => handleRemoveMedia(formData.imageUrl, 'main')} className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>

                {/* Additional Media */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Product Video (Optional)</label>
                    <input type="file" accept="video/*" className="hidden" id="video-upload" onChange={(e) => handleImageUpload(e, 'video')} />
                    <Button type="button" variant="outline" disabled={processingImage} className="w-full flex items-center justify-center gap-2" onClick={() => document.getElementById('video-upload')?.click()}>
                      <Upload className="w-4 h-4" /> {formData.videoUrl ? (pendingUploads[formData.videoUrl] ? 'Change Selected Video' : 'Change Video') : 'Select Video'}
                    </Button>
                    {formData.videoUrl && (
                      <div className="mt-2 text-xs flex justify-between items-center px-2 py-1 bg-muted rounded">
                        <span className="truncate flex-1 text-[#7C3AED] font-medium">Video added</span>
                        <button type="button" onClick={() => handleRemoveMedia(formData.videoUrl, 'video')} className="text-red-500 hover:text-red-600"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Additional Images (Multi)</label>
                    <input type="file" multiple accept="image/*" className="hidden" id="media-upload" onChange={(e) => handleImageUpload(e, 'media')} />
                    <Button type="button" variant="outline" disabled={processingImage} className="w-full flex items-center justify-center gap-2" onClick={() => document.getElementById('media-upload')?.click()}>
                      <Plus className="w-4 h-4" /> Add Images
                    </Button>
                  </div>
                </div>

                {formData.mediaUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {formData.mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 group">
                        <img src={url} alt={`Media ${idx}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveMedia(url, 'media')} className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Item Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Classic Varsity Jacket"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Brand</label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      placeholder="e.g. i-CON Apparel"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Brand Color</label>
                    <input
                      type="color"
                      value={formData.brandColor}
                      onChange={e => setFormData({...formData, brandColor: e.target.value})}
                      className="w-full h-12 p-1 rounded-xl cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Price (₦)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category</label>
                    <select
                      required
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    >
                      <option value="">Select Category</option>
                      {allUniqueCategoryNames.map(catName => (
                        <option key={catName} value={catName}>{catName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Available Sizes</label>
                    <input
                      type="text"
                      value={formData.sizesInput}
                      onChange={e => setFormData({...formData, sizesInput: e.target.value})}
                      placeholder="e.g. S, M, L, XL (Comma separated)"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${
                        isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="flex text-sm font-semibold mb-2 items-center justify-between gap-2">
                      <span>Available Colors</span>
                      <button type="button" onClick={() => setFormData({...formData, colors: [...formData.colors, '#000000']})} className="shrink-0 text-[#7C3AED] hover:text-[#6D28D9] text-xs font-bold flex items-center">
                        <Plus className="w-3 h-3 mr-1"/> Add Color
                      </button>
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {formData.colors.map((color, idx) => (
                        <div key={idx} className="min-w-0 rounded-lg border border-border bg-muted/20 p-2">
                          <div className="mb-2 flex items-center justify-between">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => {
                                const newColors = [...formData.colors];
                                newColors[idx] = e.target.value;
                                setFormData({...formData, colors: newColors});
                              }}
                              aria-label={`Color ${idx + 1}`}
                              className="h-10 w-12 rounded-lg cursor-pointer"
                            />
                            <button 
                              type="button" 
                              aria-label={`Remove color ${idx + 1}`}
                              onClick={() => {
                                const newColors = formData.colors.filter((_, i) => i !== idx);
                                setFormData({...formData, colors: newColors});
                              }} 
                              className="rounded-full bg-red-500 p-1 text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Map color to an existing image */}
                          <select 
                            aria-label={`Image for color ${idx + 1}`}
                            className="w-full min-w-0 rounded border border-border bg-background px-2 py-1.5 text-xs"
                            value={formData.colorMedia[color] || ''}
                            onChange={(e) => setFormData(p => ({ ...p, colorMedia: { ...p.colorMedia, [color]: e.target.value } }))}
                          >
                            <option value="">Media</option>
                            {formData.imageUrl && <option value={formData.imageUrl}>Main</option>}
                            {formData.mediaUrls.map((url, i) => (
                              <option key={url} value={url}>Img {i+1}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {formData.colors.length === 0 && <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No specific colors</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Variation Name</label>
                    <input
                      type="text"
                      value={formData.variationName}
                      onChange={e => setFormData({...formData, variationName: e.target.value})}
                      placeholder="e.g. Design, Material"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Variation Options</label>
                    <input
                      type="text"
                      value={formData.variationsInput}
                      onChange={e => setFormData({...formData, variationsInput: e.target.value})}
                      placeholder="e.g. Cartoon Print A, Solid (Comma separated)"
                      className={`w-full px-4 py-3 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Size Chart Image (Optional)</label>
                  <input type="file" accept="image/*" className="hidden" id="sizechart-upload" onChange={(e) => handleImageUpload(e, 'sizeChart')} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => document.getElementById('sizechart-upload')?.click()}>
                      <Upload className="w-4 h-4" /> {formData.sizeChartUrl ? (pendingUploads[formData.sizeChartUrl] ? 'Change Selected Size Chart' : 'Change Size Chart') : 'Select Size Chart'}
                    </Button>
                    {formData.sizeChartUrl && (
                      <img src={formData.sizeChartUrl} alt="Size Chart" className="h-10 w-10 object-cover rounded border" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none resize-none ${
                      isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'
                    }`}
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={formData.inStock}
                    onChange={e => setFormData({...formData, inStock: e.target.checked})}
                    className="w-5 h-5 rounded accent-[#7C3AED]"
                  />
                  <label htmlFor="inStock" className="font-semibold cursor-pointer">In Stock</label>
                </div>
                </fieldset>

                <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card py-2">
                  <Button type="button" variant="ghost" onClick={closeItemModal} disabled={saving}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving || processingImage || !formData.imageUrl} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white min-w-[120px]">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{Object.keys(pendingUploads).length ? 'Uploading & Saving...' : 'Saving...'}</> : 'Save Item'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Categories Modal */}
        {isManagingCategories && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className={`p-4 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                <h2 className="text-xl font-bold">Manage Categories</h2>
                <button onClick={() => setIsManagingCategories(false)} className="p-2 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className={`flex-1 px-4 py-2 rounded-xl border-2 outline-none ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-[#7C3AED]' : 'border-gray-200 focus:border-[#7C3AED]/50'}`}
                  />
                  <Button variant="primary" onClick={handleAddCategory} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">Add</Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {allUniqueCategoryNames.map(catName => {
                    const dbCat = categories.find(c => c.name === catName);
                    return (
                    <div key={catName} className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-border">
                      <span className="font-semibold">{catName}</span>
                      {dbCat ? (
                        <button onClick={() => deleteFashionCategory(dbCat.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg" title="Delete Category">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground px-2 uppercase tracking-wider font-bold">In Use</span>
                      )}
                    </div>
                  )})}
                  {allUniqueCategoryNames.length === 0 && <p className="text-center text-muted-foreground py-4">No categories yet.</p>}
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
