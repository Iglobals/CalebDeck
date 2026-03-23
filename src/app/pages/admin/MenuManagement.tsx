import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    UtensilsCrossed,
    Search,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Upload,
    X,
    CheckCircle,
    Pencil,
    Wrench,
    Package,
    Database
} from 'lucide-react';
import { updateMenuItem, addMenuItem, deleteMenuItem, migrateMainToBase, MenuItem, ComboDefinition, ComboItem, subscribeToCombos, addCombo, updateCombo, deleteCombo } from '../../../services/db';
import { seedInitialCombos } from '../../../services/combo-data';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useTheme } from '../../../context/ThemeContext';

const CATEGORIES = [
    { value: 'base', label: 'Base (Rice / Pasta / Noodles)' },
    { value: 'protein', label: 'Protein & Sides' },
    { value: 'swallow', label: 'Swallow (Eba / Semo)' },
    { value: 'soup', label: 'Soup' },
    { value: 'snack', label: 'Snacks & Pastries' },
    { value: 'drink', label: 'Beverages' },
];

export default function MenuManagement() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeCafeteria, setActiveCafeteria] = useState<string>('old');
    const [activeSection, setActiveSection] = useState<string>('none');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [newItem, setNewItem] = useState({
        name: '', price: '', category: 'base', cafeteriaId: 'old', sectionId: 'none', unit: 'plate', isAvailable: true, image: ''
    });
    const [editForm, setEditForm] = useState({
        name: '', price: '', category: 'base', cafeteriaId: 'old', sectionId: 'none', unit: 'plate', image: ''
    });
    const [imagePreview, setImagePreview] = useState<string>('');
    const [editImagePreview, setEditImagePreview] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const { adminTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'menu' | 'combos'>('menu');
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeedCombos = async () => {
        try {
            setIsSeeding(true);
            const count = await seedInitialCombos();
            if (count > 0) {
                showToast(`Seeded ${count} default combos!`);
            } else {
                showToast('Combo collection is not empty.');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to seed combos. Check console.');
        } finally {
            setIsSeeding(false);
        }
    };

    // ─── Combo State ───
    const [combos, setCombos] = useState<ComboDefinition[]>([]);
    const [comboFilter, setComboFilter] = useState<string>('all');
    const [isAddingCombo, setIsAddingCombo] = useState(false);
    const [editingCombo, setEditingCombo] = useState<ComboDefinition | null>(null);
    const [newCombo, setNewCombo] = useState({
        name: '', tagline: '', basePrice: '', cafeteria: 'new' as 'new' | 'old',
        section: 'all' as 'all' | 'front' | 'back' | 'none', imageName: '', image: '',
        items: [{ name: '', quantity: 1 }] as { name: string; quantity: number }[]
    });
    const [editComboForm, setEditComboForm] = useState({
        name: '', tagline: '', basePrice: '', cafeteria: 'new' as 'new' | 'old',
        section: 'all' as 'all' | 'front' | 'back' | 'none', imageName: '', image: '',
        items: [{ name: '', quantity: 1 }] as { name: string; quantity: number }[]
    });
    const [comboImagePreview, setComboImagePreview] = useState('');
    const [editComboImagePreview, setEditComboImagePreview] = useState('');
    const comboFileInputRef = useRef<HTMLInputElement>(null);
    const editComboFileInputRef = useRef<HTMLInputElement>(null);

    // Combo subscriptions
    useEffect(() => {
        const unsub = subscribeToCombos((data) => setCombos(data));
        return () => unsub();
    }, []);

    const filteredCombos = useMemo(() => {
        if (comboFilter === 'all') return combos;
        return combos.filter(c => c.cafeteria === comboFilter);
    }, [combos, comboFilter]);

    const handleComboImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'add' | 'edit') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Please select an image smaller than 5MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const rawDataUrl = ev.target?.result as string;
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                const MAX_DIM = 600;
                if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
                else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); if (!ctx) return;
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.6);
                if (target === 'add') { setComboImagePreview(compressed); setNewCombo(prev => ({ ...prev, image: compressed })); }
                else { setEditComboImagePreview(compressed); setEditComboForm(prev => ({ ...prev, image: compressed })); }
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleAddCombo = async () => {
        if (!newCombo.name || !newCombo.basePrice) return;
        const validItems = newCombo.items.filter(i => i.name.trim());
        if (validItems.length === 0) { showToast('Add at least one item'); return; }
        setSaving(true);
        try {
            await addCombo({
                name: newCombo.name,
                tagline: newCombo.tagline,
                basePrice: Number(newCombo.basePrice),
                cafeteria: newCombo.cafeteria,
                section: newCombo.cafeteria === 'old' ? 'none' : newCombo.section,
                imageName: newCombo.imageName || 'combo_basic',
                image: newCombo.image,
                items: validItems,
            });
            showToast(`"${newCombo.name}" combo added`);
            setIsAddingCombo(false);
            setNewCombo({ name: '', tagline: '', basePrice: '', cafeteria: 'new', section: 'all', imageName: '', image: '', items: [{ name: '', quantity: 1 }] });
            setComboImagePreview('');
        } catch (err) { console.error(err); showToast('Failed to add combo'); }
        finally { setSaving(false); }
    };

    const openEditComboModal = (combo: ComboDefinition) => {
        setEditingCombo(combo);
        setEditComboForm({
            name: combo.name, tagline: combo.tagline, basePrice: String(combo.basePrice),
            cafeteria: combo.cafeteria, section: combo.section, imageName: combo.imageName || '',
            image: combo.image || '',
            items: combo.items.length > 0 ? combo.items.map(i => ({ ...i })) : [{ name: '', quantity: 1 }]
        });
        setEditComboImagePreview(combo.image || '');
    };

    const handleSaveComboEdit = async () => {
        if (!editingCombo || !editComboForm.name || !editComboForm.basePrice) return;
        const validItems = editComboForm.items.filter(i => i.name.trim());
        if (validItems.length === 0) { showToast('Add at least one item'); return; }
        setSaving(true);
        try {
            await updateCombo(editingCombo.id, {
                name: editComboForm.name,
                tagline: editComboForm.tagline,
                basePrice: Number(editComboForm.basePrice),
                cafeteria: editComboForm.cafeteria,
                section: editComboForm.cafeteria === 'old' ? 'none' : editComboForm.section,
                imageName: editComboForm.imageName || 'combo_basic',
                image: editComboForm.image,
                items: validItems,
            });
            showToast(`"${editComboForm.name}" updated`);
            setEditingCombo(null);
        } catch (err) { console.error(err); showToast('Failed to save changes'); }
        finally { setSaving(false); }
    };

    const handleDeleteCombo = async (id: string) => {
        const combo = combos.find(c => c.id === id);
        if (!confirm(`Delete "${combo?.name}" combo? This cannot be undone.`)) return;
        try { await deleteCombo(id); showToast(`"${combo?.name}" deleted`); }
        catch (err) { console.error(err); }
    };

    useEffect(() => {
        const q = query(collection(db, 'menu_items'), orderBy('category', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isDark = adminTheme === 'dark';

    const handleCafeteriaChange = (caf: string) => {
        setActiveCafeteria(caf);
        // Old Cafe has no front/back sections
        setActiveSection(caf === 'old' ? 'none' : 'front');
    };

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3500);
    };

    const handleToggleAvailability = async (item: MenuItem) => {
        const newStatus = !item.isAvailable;
        await updateMenuItem(item.id, { isAvailable: newStatus });
        showToast(`${item.name} ${newStatus ? 'marked available' : 'marked unavailable'}`);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'add' | 'edit') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Ensure initial file is not excessively huge (e.g. 10MB+)
        if (file.size > 5 * 1024 * 1024) {
            alert('Please select an image smaller than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const rawDataUrl = ev.target?.result as string;

            // Compress Image Logic
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 600;

                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(img, 0, 0, width, height);
                // Export highly compressed WebP/JPEG to bypass Firebase doc limit safely
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

                if (target === 'add') {
                    setImagePreview(compressedBase64);
                    setNewItem(prev => ({ ...prev, image: compressedBase64 }));
                } else {
                    setEditImagePreview(compressedBase64);
                    setEditForm(prev => ({ ...prev, image: compressedBase64 }));
                }
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price) return;
        setSaving(true);
        try {
            await addMenuItem({
                ...newItem,
                price: Number(newItem.price),
                sectionId: (newItem.cafeteriaId === 'old' ? 'none' : newItem.sectionId) as 'front' | 'back' | 'none'
            });
            const cafLabel = newItem.cafeteriaId === 'old' ? 'Old Caf' : 'New Caf';
            const secLabel = newItem.cafeteriaId === 'old' ? '' : ` → ${newItem.sectionId === 'front' ? 'Front' : 'Back'}`;
            showToast(`"${newItem.name}" added to ${cafLabel}${secLabel}`);
            setActiveCafeteria(newItem.cafeteriaId);
            setActiveSection(newItem.sectionId);
            setActiveCategory('all');
            setIsAddingItem(false);
            setNewItem({ name: '', price: '', category: 'base', cafeteriaId: 'old', sectionId: 'none', unit: 'plate', isAvailable: true, image: '' });
            setImagePreview('');
        } catch (error) {
            console.error(error);
            showToast("Failed to add item. Check your connection or image size.");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (item: MenuItem) => {
        setEditingItem(item);
        setEditForm({
            name: item.name,
            price: String(item.price || ''),
            category: item.category,
            cafeteriaId: item.cafeteriaId || 'old',
            sectionId: item.sectionId || (item.cafeteriaId === 'old' ? 'none' : 'front'),
            unit: item.unit || 'plate',
            image: item.image || '',
        });
        setEditImagePreview(item.image || '');
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !editForm.name || !editForm.price) return;
        setSaving(true);
        try {
            await updateMenuItem(editingItem.id, {
                name: editForm.name,
                price: Number(editForm.price),
                category: editForm.category,
                cafeteriaId: editForm.cafeteriaId,
                sectionId: (editForm.cafeteriaId === 'old' ? 'none' : editForm.sectionId) as 'front' | 'back' | 'none',
                unit: editForm.unit,
                image: editForm.image,
            });
            showToast(`"${editForm.name}" updated`);
            setEditingItem(null);
        } catch (error) {
            console.error(error);
            showToast("Failed to save changes. Check your connection or image size.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!confirm(`Delete "${item?.name}"? This cannot be undone.`)) return;
        try {
            await deleteMenuItem(id);
            showToast(`"${item?.name}" deleted`);
        } catch (error) {
            console.error(error);
        }
    };

    const runMigration = async () => {
        const count = await migrateMainToBase();
        if (count > 0) {
            showToast(`Fixed ${count} items: "main" → "base"`);
        } else {
            showToast('No items with "main" category found');
        }
    };

    const hasMigrateableItems = items.some(i => i.category === 'main');

    const visibleCategories = useMemo(() => {
        const catsInView = new Set(
            items
                .filter(i => i.cafeteriaId === activeCafeteria && i.sectionId === activeSection)
                .map(i => i.category)
        );
        return ['all', ...Array.from(catsInView)];
    }, [items, activeCafeteria, activeSection]);

    const searchSuggestions = useMemo(() => {
        if (!searchQuery || searchQuery.length < 2) return [];
        const q = searchQuery.toLowerCase();
        return items
            .filter(i => i.name.toLowerCase().includes(q))
            .slice(0, 6)
            .map(i => ({
                id: i.id, name: i.name,
                cafeteriaId: i.cafeteriaId || 'old',
                sectionId: i.sectionId || (i.cafeteriaId === 'old' ? 'none' : 'front'),
                category: i.category,
            }));
    }, [searchQuery, items]);

    const handleSuggestionClick = (suggestion: typeof searchSuggestions[0]) => {
        setSearchQuery(suggestion.name);
        setActiveCafeteria(suggestion.cafeteriaId);
        setActiveSection(suggestion.sectionId as string);
        setActiveCategory('all');
        setSearchFocused(false);
    };

    const filteredItems = items.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
        const matchesCafeteria = i.cafeteriaId === activeCafeteria;
        const matchesSection = i.sectionId === activeSection;
        return matchesSearch && matchesCategory && matchesCafeteria && matchesSection;
    });

    const inputClass = `w-full border-2 rounded-2xl px-5 py-4 font-bold outline-none transition-all focus:border-[#7C3AED] ${isDark
        ? 'bg-[#1A1A1A] border-[#333333] text-white placeholder:text-gray-600'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`;

    const renderFormFields = (form: typeof newItem | typeof editForm, setForm: any, preview: string, inputTarget: 'add' | 'edit', inputRef: React.RefObject<HTMLInputElement | null>) => (
        <div className="overflow-y-auto flex-1 p-7 space-y-5">
            <div className="space-y-1.5">
                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Item Name</label>
                <input type="text" className={inputClass} placeholder="e.g. Jollof Rice"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Price (₦)</label>
                <input type="number" className={inputClass} placeholder="e.g. 1000"
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Category</label>
                <select className={inputClass} value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter(c => {
                        // Old Cafe: no swallow, soup, or snack
                        if (form.cafeteriaId === 'old') {
                            return !['swallow', 'soup', 'snack'].includes(c.value);
                        }
                        // New Cafe Front: no swallow or soup
                        if (form.cafeteriaId === 'new' && form.sectionId === 'front') {
                            return !['swallow', 'soup'].includes(c.value);
                        }
                        return true;
                    }).map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>
            <div className={`grid ${form.cafeteriaId === 'old' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Cafeteria</label>
                    <select className={inputClass} value={form.cafeteriaId}
                        onChange={e => {
                            const newCaf = e.target.value;
                            setForm({ ...form, cafeteriaId: newCaf, sectionId: newCaf === 'old' ? 'none' : 'front' });
                        }}>
                        <option value="old">Old Cafeteria</option>
                        <option value="new">New Cafeteria</option>
                    </select>
                </div>
                {form.cafeteriaId !== 'old' && (
                    <div className="space-y-1.5">
                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Section</label>
                        <select className={inputClass} value={form.sectionId}
                            onChange={e => setForm({ ...form, sectionId: e.target.value })}>
                            <option value="front">Front Section</option>
                            <option value="back">Back Section</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="space-y-1.5">
                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Food Image (optional)</label>
                <div
                    onClick={() => inputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#7C3AED] ${isDark ? 'border-[#333333] hover:bg-[#7C3AED]/5' : 'border-gray-200 hover:bg-purple-50/50'}`}>
                    {preview ? (
                        <>
                            <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-70" />
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <Upload className="w-5 h-5 text-white" />
                                <span className="text-white text-[10px] font-bold">Change image</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                            <p className={`text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Click to upload image</p>
                            <p className={`text-[10px] mt-1 ${isDark ? 'text-[#666]' : 'text-gray-300'}`}>PNG, JPG · max 2MB</p>
                        </>
                    )}
                </div>
                <input ref={inputRef as any} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, inputTarget)} />
            </div>
        </div>
    );

    return (
        <AdminLayout title="Menu Management">
            {/* Toast */}
            {toast.visible && (
                <div className="fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl bg-[#7C3AED] text-white"
                    style={{ animation: 'slideInDown 0.3s ease-out' }}>
                    <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}

            {/* Tab Switcher */}
            <div className={`flex gap-2 mb-8 p-1.5 rounded-2xl border-2 w-fit ${isDark ? 'border-[#333333] bg-[#1A1A1A]' : 'border-gray-200 bg-gray-100'}`}>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'menu'
                        ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                        : `${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500 hover:text-gray-900 hover:bg-white'}`
                        }`}
                >
                    <UtensilsCrossed className="w-4 h-4" />
                    Menu Items
                </button>
                <button
                    onClick={() => setActiveTab('combos')}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'combos'
                        ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                        : `${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500 hover:text-gray-900 hover:bg-white'}`
                        }`}
                >
                    <Package className="w-4 h-4" />
                    Combo Packs
                </button>
            </div>

            {activeTab === 'menu' && (
                <>
                    {/* Migration Banner */}
                    {hasMigrateableItems && (
                        <div className={`mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl border-2 ${isDark ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                            <div className="flex items-center gap-3">
                                <Wrench className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                <p className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                    Some items have an old "main" category. Fix them to "base" so they show up correctly.
                                </p>
                            </div>
                            <button onClick={runMigration}
                                className="px-5 py-2 rounded-xl bg-yellow-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-yellow-600 transition-colors whitespace-nowrap">
                                Fix Now
                            </button>
                        </div>
                    )}

                    {/* Top Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="relative flex-1" ref={searchRef}>
                            <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                            <input type="text" placeholder="Search menu items..."
                                className={`w-full pl-12 pr-6 py-4 rounded-xl border-2 transition-all outline-none text-sm ${isDark
                                    ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                    : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)} />
                            {searchFocused && searchSuggestions.length > 0 && (
                                <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border-2 overflow-hidden shadow-2xl z-50 ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                                    {searchSuggestions.map(s => (
                                        <button key={s.id} onClick={() => handleSuggestionClick(s)}
                                            className={`w-full text-left px-5 py-3 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}>
                                            <span className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{s.name}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                                {s.cafeteriaId === 'old' ? 'Old' : 'New'}{s.cafeteriaId !== 'old' ? ` · ${s.sectionId}` : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button variant="primary"
                            onClick={() => { setNewItem(prev => ({ ...prev, cafeteriaId: activeCafeteria, sectionId: activeSection })); setIsAddingItem(true); }}
                            className="px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-[#7C3AED]/20">
                            <Plus className="w-4 h-4 mr-2" strokeWidth={3} />
                            Add Item
                        </Button>
                    </div>

                    {/* Cafeteria & Section Filters */}
                    <div className={`flex flex-col md:flex-row gap-6 mb-8 p-6 rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                        <div className="flex-1 space-y-2 w-full">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Cafeteria</p>
                            <div className="flex gap-2">
                                {['old', 'new'].map(caf => (
                                    <button key={caf} onClick={() => handleCafeteriaChange(caf)}
                                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${activeCafeteria === caf
                                            ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                            : `${isDark ? 'border-[#333333] text-[#9C8F7F] hover:border-[#444444]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}`}>
                                        {caf === 'old' ? 'Old Caf' : 'New Caf'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {activeCafeteria !== 'old' && (
                            <div className="flex-1 space-y-2 w-full">
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Section</p>
                                <div className="flex gap-2">
                                    {['front', 'back'].map(sec => (
                                        <button key={sec} onClick={() => setActiveSection(sec)}
                                            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${activeSection === sec
                                                ? 'bg-[#FCD34D] border-[#FCD34D] text-black'
                                                : `${isDark ? 'border-[#333333] text-[#9C8F7F] hover:border-[#444444]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}`}>
                                            {sec.charAt(0).toUpperCase() + sec.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Category Pills */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {visibleCategories.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeCategory === cat
                                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                                    : `border-2 ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#9C8F7F]' : 'bg-white border-gray-100 text-gray-500'}`}`}>
                                {cat === 'all' ? 'All Items' : cat}
                            </button>
                        ))}
                    </div>

                    {/* Label */}
                    <p className={`text-xs font-bold mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                        Showing {filteredItems.length} items in <span className="text-[#7C3AED] font-black">{activeCafeteria === 'old' ? 'Old Caf' : `New Caf → ${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}`}</span>
                        {activeCategory !== 'all' && <> · <span className="capitalize">{activeCategory}</span></>}
                    </p>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredItems.length === 0 && (
                            <div className={`col-span-full p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
                                <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="font-bold text-sm">No items in {activeCafeteria === 'old' ? 'Old Caf' : `New Caf → ${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}`}</p>
                                <p className="text-xs mt-1 opacity-60">Add items with the button above</p>
                            </div>
                        )}
                        {filteredItems.map((item) => (
                            <Card key={item.id} className={`group relative p-0 overflow-hidden border transition-all hover:shadow-xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                                <div className="h-44 relative overflow-hidden bg-[#2A2A2A]">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-10">
                                            <UtensilsCrossed className="w-12 h-12" />
                                        </div>
                                    )}
                                    {!item.isAvailable && (
                                        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                                            <EyeOff className="w-7 h-7 text-white/80" />
                                            <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Unavailable</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={item.isAvailable ? 'green' : 'gray'} className="text-[9px] font-black uppercase tracking-widest py-1 px-3 backdrop-blur-md">
                                            {item.isAvailable ? 'Available' : 'Hidden'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h4 className={`font-black text-base tracking-tight leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</h4>
                                            <span className="font-black text-[#10B981] text-base whitespace-nowrap">₦{item.price?.toLocaleString()}</span>
                                        </div>
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                            {item.category} · {item.cafeteriaId === 'old' ? 'Old' : 'New'} Caf{item.cafeteriaId !== 'old' ? ` · ${item.sectionId || 'front'}` : ''}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-dashed border-gray-500/10">
                                        <Button variant="ghost"
                                            className={`flex-1 flex gap-2 items-center justify-center py-2.5 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] ${isDark ? 'bg-[#2A2A2A] text-[#FAF9F6] hover:bg-[#333333]' : 'bg-gray-50 hover:bg-gray-100'}`}
                                            onClick={() => handleToggleAvailability(item)}>
                                            {item.isAvailable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            <span className="hidden sm:inline">{item.isAvailable ? 'Unavailable' : 'Available'}</span>
                                        </Button>
                                        <Button variant="ghost"
                                            className={`px-3 py-2.5 rounded-xl transition-all ${isDark ? 'bg-[#2A2A2A] hover:bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-gray-50 hover:bg-purple-50 text-[#7C3AED]'}`}
                                            onClick={() => openEditModal(item)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost"
                                            className={`px-3 py-2.5 rounded-xl transition-all ${isDark ? 'bg-[#2A2A2A] hover:bg-red-500/20' : 'bg-gray-50 hover:bg-red-50'}`}
                                            onClick={() => handleDeleteItem(item.id)}>
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Add Item Modal */}
                    {isAddingItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsAddingItem(false)}></div>
                            <div className={`relative w-full max-w-xl rounded-3xl shadow-3xl overflow-hidden flex flex-col ${isDark ? 'bg-[#141414]' : 'bg-white'}`}
                                style={{ maxHeight: '90vh' }}>
                                <div className="p-7 bg-[#7C3AED] text-white flex items-center justify-between flex-shrink-0">
                                    <div>
                                        <h2 className="text-xl font-black">Add Menu Item</h2>
                                        <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">
                                            Adding to {newItem.cafeteriaId === 'old' ? 'Old Caf' : `New Caf → ${newItem.sectionId === 'front' ? 'Front' : 'Back'}`}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsAddingItem(false)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                {renderFormFields(newItem, setNewItem, imagePreview, 'add', fileInputRef)}
                                <div className={`flex-shrink-0 p-7 flex gap-3 border-t ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                    <Button variant="ghost" className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}
                                        onClick={() => setIsAddingItem(false)}>Cancel</Button>
                                    <Button variant="primary" className="flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] text-white"
                                        onClick={handleAddItem} disabled={saving}>
                                        {saving ? 'Saving...' : 'Add to Menu'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Item Modal */}
                    {editingItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setEditingItem(null)}></div>
                            <div className={`relative w-full max-w-xl rounded-3xl shadow-3xl overflow-hidden flex flex-col ${isDark ? 'bg-[#141414]' : 'bg-white'}`}
                                style={{ maxHeight: '90vh' }}>
                                <div className="p-7 bg-[#10B981] text-white flex items-center justify-between flex-shrink-0">
                                    <div>
                                        <h2 className="text-xl font-black">Edit: {editingItem.name}</h2>
                                        <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">
                                            Changes reflect in real-time on PlateBuilder
                                        </p>
                                    </div>
                                    <button onClick={() => setEditingItem(null)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                {renderFormFields(editForm, setEditForm, editImagePreview, 'edit', editFileInputRef)}
                                <div className={`flex-shrink-0 p-7 flex gap-3 border-t ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                    <Button variant="ghost" className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}
                                        onClick={() => setEditingItem(null)}>Cancel</Button>
                                    <Button variant="primary" className="flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-[#10B981] text-white"
                                        onClick={handleSaveEdit} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                </>
            )}

            {/* ─── COMBO PACKS TAB ─── */}
            {activeTab === 'combos' && (
                <>
                    {/* Combo Top Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex gap-2 flex-1">
                            {['all', 'new', 'old'].map(f => (
                                <button key={f} onClick={() => setComboFilter(f)}
                                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${comboFilter === f
                                        ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                                        : `${isDark ? 'border-[#333333] text-[#9C8F7F] hover:border-[#444444]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}`}>
                                    {f === 'all' ? 'All Combos' : f === 'new' ? 'New Caf' : 'Old Caf'}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary"
                                onClick={handleSeedCombos} disabled={isSeeding}
                                className={`px-4 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] border-2 transition-all ${isDark ? 'border-[#333333] text-[#9C8F7F] hover:bg-[#333333]' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                <Database className="w-4 h-4 mr-2" strokeWidth={3} />
                                {isSeeding ? 'Seeding...' : 'Seed Defaults'}
                            </Button>
                            <Button variant="primary"
                                onClick={() => setIsAddingCombo(true)}
                                className="px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-[#7C3AED]/20">
                                <Plus className="w-4 h-4 mr-2" strokeWidth={3} />
                                Add Combo
                            </Button>
                        </div>
                    </div>

                    <p className={`text-xs font-bold mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                        Showing {filteredCombos.length} combo packs
                    </p>

                    {/* Combo Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredCombos.length === 0 && (
                            <div className={`col-span-full p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="font-bold text-sm">No combo packs found</p>
                                <p className="text-xs mt-1 opacity-60">Add combo packs with the button above</p>
                            </div>
                        )}
                        {filteredCombos.map(combo => (
                            <Card key={combo.id} className={`group relative p-0 overflow-hidden border transition-all hover:shadow-xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                                <div className="h-44 relative overflow-hidden bg-[#2A2A2A]">
                                    {(combo.image || combo.imageName) ? (
                                        <img src={combo.image || `/assets/combos/${combo.imageName}.png`} alt={combo.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-10">
                                            <Package className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant="purple" className="text-[9px] font-black uppercase tracking-widest py-1 px-3 backdrop-blur-md">
                                            ₦{combo.basePrice?.toLocaleString()}
                                        </Badge>
                                    </div>
                                    <div className="absolute top-3 left-3">
                                        <Badge variant={combo.cafeteria === 'new' ? 'emerald' : 'gray'} className="text-[9px] font-black uppercase tracking-widest py-1 px-3 backdrop-blur-md">
                                            {combo.cafeteria === 'new' ? 'New' : 'Old'} Caf{combo.section !== 'none' && combo.section !== 'all' ? ` · ${combo.section}` : ''}{combo.section === 'all' ? ' · All' : ''}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h4 className={`font-black text-base tracking-tight leading-tight mb-1 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{combo.name}</h4>
                                    <p className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'} mb-3`}>{combo.tagline}</p>
                                    <ul className={`space-y-1 mb-4 text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                        {combo.items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-1.5">
                                                <span className="text-[#7C3AED] mt-0.5">•</span>
                                                {item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex gap-2 pt-4 border-t border-dashed border-gray-500/10">
                                        <Button variant="ghost"
                                            className={`flex-1 flex gap-2 items-center justify-center py-2.5 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] ${isDark ? 'bg-[#2A2A2A] hover:bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-gray-50 hover:bg-purple-50 text-[#7C3AED]'}`}
                                            onClick={() => openEditComboModal(combo)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                            <span>Edit</span>
                                        </Button>
                                        <Button variant="ghost"
                                            className={`px-4 py-2.5 rounded-xl transition-all ${isDark ? 'bg-[#2A2A2A] hover:bg-red-500/20' : 'bg-gray-50 hover:bg-red-50'}`}
                                            onClick={() => handleDeleteCombo(combo.id)}>
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Add Combo Modal */}
                    {isAddingCombo && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsAddingCombo(false)}></div>
                            <div className={`relative w-full max-w-xl rounded-3xl shadow-3xl overflow-hidden flex flex-col ${isDark ? 'bg-[#141414]' : 'bg-white'}`}
                                style={{ maxHeight: '90vh' }}>
                                <div className="p-7 bg-[#7C3AED] text-white flex items-center justify-between flex-shrink-0">
                                    <div>
                                        <h2 className="text-xl font-black">Add Combo Pack</h2>
                                        <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Create a new combo meal deal</p>
                                    </div>
                                    <button onClick={() => setIsAddingCombo(false)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 p-7 space-y-5">
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Combo Name</label>
                                        <input type="text" className={inputClass} placeholder="e.g. Royal Deck Bistro"
                                            value={newCombo.name} onChange={e => setNewCombo({ ...newCombo, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Tagline</label>
                                        <input type="text" className={inputClass} placeholder="e.g. Eat like royalty"
                                            value={newCombo.tagline} onChange={e => setNewCombo({ ...newCombo, tagline: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Price (₦)</label>
                                        <input type="number" className={inputClass} placeholder="e.g. 3000"
                                            value={newCombo.basePrice} onChange={e => setNewCombo({ ...newCombo, basePrice: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Cafeteria</label>
                                            <select className={inputClass} value={newCombo.cafeteria}
                                                onChange={e => setNewCombo({ ...newCombo, cafeteria: e.target.value as 'new' | 'old', section: e.target.value === 'old' ? 'none' : 'all' })}>
                                                <option value="new">New Cafeteria</option>
                                                <option value="old">Old Cafeteria</option>
                                            </select>
                                        </div>
                                        {newCombo.cafeteria !== 'old' && (
                                            <div className="space-y-1.5">
                                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Section</label>
                                                <select className={inputClass} value={newCombo.section}
                                                    onChange={e => setNewCombo({ ...newCombo, section: e.target.value as 'all' | 'front' | 'back' })}>
                                                    <option value="all">All Sections</option>
                                                    <option value="front">Front Section</option>
                                                    <option value="back">Back Section</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    {/* Image */}
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Combo Image</label>
                                        <div onClick={() => comboFileInputRef.current?.click()}
                                            className={`relative border-2 border-dashed rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#7C3AED] ${isDark ? 'border-[#333333] hover:bg-[#7C3AED]/5' : 'border-gray-200 hover:bg-purple-50/50'}`}>
                                            {comboImagePreview ? (
                                                <><img src={comboImagePreview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-70" />
                                                    <div className="relative z-10 flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-white" /><span className="text-white text-[10px] font-bold">Change image</span></div></>
                                            ) : (
                                                <><Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                                    <p className={`text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Click to upload</p></>
                                            )}
                                        </div>
                                        <input ref={comboFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleComboImageUpload(e, 'add')} />
                                    </div>
                                    {/* Items */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Items Included</label>
                                            <button onClick={() => setNewCombo(prev => ({ ...prev, items: [...prev.items, { name: '', quantity: 1 }] }))}
                                                className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:underline flex items-center gap-1">
                                                <Plus className="w-3 h-3" /> Add Item
                                            </button>
                                        </div>
                                        {newCombo.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input type="text" className={`${inputClass} flex-1`} placeholder="e.g. Rice (Jollof/Fried/Mixed) - 2 Portions"
                                                    value={item.name} onChange={e => {
                                                        const items = [...newCombo.items];
                                                        items[idx] = { ...items[idx], name: e.target.value };
                                                        setNewCombo({ ...newCombo, items });
                                                    }} />
                                                <input type="number" className={`${inputClass} w-16 text-center`} placeholder="Qty" min={1}
                                                    value={item.quantity} onChange={e => {
                                                        const items = [...newCombo.items];
                                                        items[idx] = { ...items[idx], quantity: Math.max(1, Number(e.target.value)) };
                                                        setNewCombo({ ...newCombo, items });
                                                    }} />
                                                {newCombo.items.length > 1 && (
                                                    <button onClick={() => setNewCombo(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <p className={`text-[10px] ${isDark ? 'text-[#666]' : 'text-gray-400'}`}>
                                            Use / for options: "Rice (Jollof/Fried/Mixed) - 2 Portions"
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex-shrink-0 p-7 flex gap-3 border-t ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                    <Button variant="ghost" className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}
                                        onClick={() => setIsAddingCombo(false)}>Cancel</Button>
                                    <Button variant="primary" className="flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] text-white"
                                        onClick={handleAddCombo} disabled={saving}>
                                        {saving ? 'Saving...' : 'Add Combo'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Combo Modal */}
                    {editingCombo && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setEditingCombo(null)}></div>
                            <div className={`relative w-full max-w-xl rounded-3xl shadow-3xl overflow-hidden flex flex-col ${isDark ? 'bg-[#141414]' : 'bg-white'}`}
                                style={{ maxHeight: '90vh' }}>
                                <div className="p-7 bg-[#10B981] text-white flex items-center justify-between flex-shrink-0">
                                    <div>
                                        <h2 className="text-xl font-black">Edit: {editingCombo.name}</h2>
                                        <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Changes reflect in real-time</p>
                                    </div>
                                    <button onClick={() => setEditingCombo(null)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 p-7 space-y-5">
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Combo Name</label>
                                        <input type="text" className={inputClass} value={editComboForm.name}
                                            onChange={e => setEditComboForm({ ...editComboForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Tagline</label>
                                        <input type="text" className={inputClass} value={editComboForm.tagline}
                                            onChange={e => setEditComboForm({ ...editComboForm, tagline: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Price (₦)</label>
                                        <input type="number" className={inputClass} value={editComboForm.basePrice}
                                            onChange={e => setEditComboForm({ ...editComboForm, basePrice: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Cafeteria</label>
                                            <select className={inputClass} value={editComboForm.cafeteria}
                                                onChange={e => setEditComboForm({ ...editComboForm, cafeteria: e.target.value as 'new' | 'old', section: e.target.value === 'old' ? 'none' : editComboForm.section })}>
                                                <option value="new">New Cafeteria</option>
                                                <option value="old">Old Cafeteria</option>
                                            </select>
                                        </div>
                                        {editComboForm.cafeteria !== 'old' && (
                                            <div className="space-y-1.5">
                                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Section</label>
                                                <select className={inputClass} value={editComboForm.section}
                                                    onChange={e => setEditComboForm({ ...editComboForm, section: e.target.value as 'all' | 'front' | 'back' })}>
                                                    <option value="all">All Sections</option>
                                                    <option value="front">Front Section</option>
                                                    <option value="back">Back Section</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    {/* Image */}
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Combo Image</label>
                                        <div onClick={() => editComboFileInputRef.current?.click()}
                                            className={`relative border-2 border-dashed rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#7C3AED] ${isDark ? 'border-[#333333] hover:bg-[#7C3AED]/5' : 'border-gray-200 hover:bg-purple-50/50'}`}>
                                            {editComboImagePreview ? (
                                                <><img src={editComboImagePreview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-70" />
                                                    <div className="relative z-10 flex flex-col items-center gap-1"><Upload className="w-5 h-5 text-white" /><span className="text-white text-[10px] font-bold">Change image</span></div></>
                                            ) : (
                                                <><Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                                    <p className={`text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Click to upload</p></>
                                            )}
                                        </div>
                                        <input ref={editComboFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleComboImageUpload(e, 'edit')} />
                                    </div>
                                    {/* Items */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Items Included</label>
                                            <button onClick={() => setEditComboForm(prev => ({ ...prev, items: [...prev.items, { name: '', quantity: 1 }] }))}
                                                className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest hover:underline flex items-center gap-1">
                                                <Plus className="w-3 h-3" /> Add Item
                                            </button>
                                        </div>
                                        {editComboForm.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input type="text" className={`${inputClass} flex-1`} placeholder="Item name"
                                                    value={item.name} onChange={e => {
                                                        const items = [...editComboForm.items];
                                                        items[idx] = { ...items[idx], name: e.target.value };
                                                        setEditComboForm({ ...editComboForm, items });
                                                    }} />
                                                <input type="number" className={`${inputClass} w-16 text-center`} min={1}
                                                    value={item.quantity} onChange={e => {
                                                        const items = [...editComboForm.items];
                                                        items[idx] = { ...items[idx], quantity: Math.max(1, Number(e.target.value)) };
                                                        setEditComboForm({ ...editComboForm, items });
                                                    }} />
                                                {editComboForm.items.length > 1 && (
                                                    <button onClick={() => setEditComboForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <p className={`text-[10px] ${isDark ? 'text-[#666]' : 'text-gray-400'}`}>
                                            Use / for options: "Rice (Jollof/Fried/Mixed) - 2 Portions"
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex-shrink-0 p-7 flex gap-3 border-t ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                    <Button variant="ghost" className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}
                                        onClick={() => setEditingCombo(null)}>Cancel</Button>
                                    <Button variant="primary" className="flex-1 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-[#10B981] text-white"
                                        onClick={handleSaveComboEdit} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <style>{`
                @keyframes slideInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </AdminLayout>
    );
}
