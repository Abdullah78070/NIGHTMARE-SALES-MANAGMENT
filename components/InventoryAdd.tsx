
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, Check } from 'lucide-react';
import { InventoryItem } from '../types';

interface Props {
    onAdd?: (item: InventoryItem) => void;
    availableUnits: string[];
    inventory: InventoryItem[];
}

export const InventoryAdd: React.FC<Props> = ({ onAdd, availableUnits, inventory }) => {
  // --- State ---
  const [formData, setFormData] = useState({
    code: '',
    itemName: '', // Arabic Name
    nameEn: '',   // English Name
    location: '',
    hasSubUnits: false,
    majorUnit: '',
    minorUnit: '',
    factor: 1,
    salePriceMajor: '',
    salePriceMinor: '', // Added separate price field (optional in UI, calculated or specific)
    discount: '', // Cost discount
    category: 'عام'
  });

  const [activeDropdown, setActiveDropdown] = useState<'major' | 'minor' | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // --- Refs for Navigation ---
  const refs = {
    code: useRef<HTMLInputElement>(null),
    itemName: useRef<HTMLInputElement>(null),
    nameEn: useRef<HTMLInputElement>(null),
    category: useRef<HTMLInputElement>(null),
    location: useRef<HTMLInputElement>(null),
    hasSubUnits: useRef<HTMLInputElement>(null),
    majorUnit: useRef<HTMLInputElement>(null),
    minorUnit: useRef<HTMLInputElement>(null),
    factor: useRef<HTMLInputElement>(null),
    salePriceMajor: useRef<HTMLInputElement>(null),
    discount: useRef<HTMLInputElement>(null),
    saveBtn: useRef<HTMLButtonElement>(null),
  };

  // --- Calculations ---
  const calculations = useMemo(() => {
    const price = parseFloat(formData.salePriceMajor) || 0;
    const disc = parseFloat(formData.discount) || 0;
    const fact = parseFloat(formData.factor.toString()) || 1;
    
    // Cost Calculations
    const costMajor = price - (price * (disc / 100));
    const costMinor = formData.hasSubUnits && fact > 0 ? (costMajor / fact) : costMajor;

    return { costMajor, costMinor };
  }, [formData.salePriceMajor, formData.discount, formData.factor, formData.hasSubUnits]);

  // --- Handlers ---
  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getFilteredUnits = (inputVal: string) => {
      return availableUnits.filter(u => u.includes(inputVal));
  }

  // --- Fix: Handle Blur Smartly ---
  // This prevents the dropdown from closing if the user just tabbed to the other unit input
  const handleInputBlur = () => {
    setTimeout(() => {
        const active = document.activeElement;
        // If focus moved to either unit input, don't close.
        // The onFocus of the new input will handle setting the correct activeDropdown.
        if (active === refs.majorUnit.current || active === refs.minorUnit.current) {
            return;
        }
        setActiveDropdown(null);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentField: keyof typeof refs) => {
    // Handle Dropdown Navigation (Major/Minor Units)
    if (activeDropdown) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const filtered = getFilteredUnits(activeDropdown === 'major' ? formData.majorUnit : formData.minorUnit);
            setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
             e.preventDefault();
             setHighlightedIndex(prev => Math.max(prev - 1, 0));
             return;
        }
        if (e.key === 'Enter') {
             e.preventDefault();
             const filtered = getFilteredUnits(activeDropdown === 'major' ? formData.majorUnit : formData.minorUnit);
             if (filtered[highlightedIndex]) {
                 handleChange(activeDropdown === 'major' ? 'majorUnit' : 'minorUnit', filtered[highlightedIndex]);
                 setActiveDropdown(null);
                 setHighlightedIndex(0);
                 
                 // Move focus logic
                 if (activeDropdown === 'major' && formData.hasSubUnits) {
                     refs.minorUnit.current?.focus();
                 } else if (activeDropdown === 'major' && !formData.hasSubUnits) {
                     refs.salePriceMajor.current?.focus();
                 } else if (activeDropdown === 'minor') {
                     refs.factor.current?.focus();
                 }

             } else if (activeDropdown === 'major' && formData.majorUnit) {
                 // Selecting what was typed if not in list
                  setActiveDropdown(null);
                  if (formData.hasSubUnits) refs.minorUnit.current?.focus();
                  else refs.salePriceMajor.current?.focus();

             } else if (activeDropdown === 'minor' && formData.minorUnit) {
                  setActiveDropdown(null);
                  refs.factor.current?.focus();
             }
             return; // Stop further Enter processing
        }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Define navigation flow
      const flow: (keyof typeof refs)[] = [
        'code',
        'itemName',
        'nameEn',
        'category',
        'location',
        'hasSubUnits', 
        'majorUnit'
      ];

      if (formData.hasSubUnits) {
        flow.push('minorUnit', 'factor');
      }

      flow.push('salePriceMajor', 'discount', 'saveBtn');

      const currentIndex = flow.indexOf(currentField);
      if (currentIndex !== -1 && currentIndex < flow.length - 1) {
        const nextField = flow[currentIndex + 1];
        refs[nextField].current?.focus();
      }
    }
    
    // F2 Shortcut
    if (e.key === 'F2') {
        e.preventDefault();
        handleSave();
    }
  };

  // Handle global F2
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [formData]);

  const handleSave = () => {
    if (!formData.itemName) {
        alert('يرجى إدخال اسم الصنف (عربي) أولاً');
        refs.itemName.current?.focus();
        return;
    }

    // Check for Duplicates
    const cleanCode = formData.code.trim();
    const cleanName = formData.itemName.trim();

    const duplicateCode = inventory.find(i => i.code === cleanCode);
    if (duplicateCode) {
        alert(`تنبيه: الباركود "${cleanCode}" مسجل مسبقاً للصنف "${duplicateCode.name}". لا يمكن التكرار.`);
        refs.code.current?.focus();
        return;
    }

    const duplicateName = inventory.find(i => i.name === cleanName);
    if (duplicateName) {
        alert(`تنبيه: اسم الصنف "${cleanName}" مسجل مسبقاً. لا يمكن تكرار الأسماء.`);
        refs.itemName.current?.focus();
        return;
    }

    const supplierDiscountVal = Number(formData.discount) || 0;

    const newItem: InventoryItem = {
        id: Date.now().toString(),
        code: formData.code || Date.now().toString().slice(-6),
        name: formData.itemName,
        nameEn: formData.nameEn,
        location: formData.location,
        category: formData.category,
        hasSubUnits: formData.hasSubUnits,
        majorUnit: formData.majorUnit || 'وحدة',
        minorUnit: formData.minorUnit,
        factor: Number(formData.factor) || 1,
        priceMajor: Number(formData.salePriceMajor) || 0,
        priceMinor: formData.hasSubUnits ? (Number(formData.salePriceMajor) / (Number(formData.factor)||1)) : Number(formData.salePriceMajor),
        costMajor: calculations.costMajor,
        supplierDiscount: supplierDiscountVal, 
        averageDiscount: supplierDiscountVal, // Initialize Average Discount same as Supplier Discount
        systemStock: 0,
        actualStock: 0,
        lastUpdated: new Date().toISOString().split('T')[0]
    };

    if (onAdd) onAdd(newItem);

    alert(`تم حفظ الصنف: ${formData.itemName}`);
    
    // Reset form
    setFormData({
        code: '',
        itemName: '',
        nameEn: '',
        location: '',
        hasSubUnits: false,
        majorUnit: '',
        minorUnit: '',
        factor: 1,
        salePriceMajor: '',
        salePriceMinor: '',
        discount: '',
        category: 'عام'
    });
    refs.itemName.current?.focus();
  };

  // --- Dropdown Helper ---
  const renderDropdown = (type: 'major' | 'minor') => {
    if (activeDropdown !== type) return null;
    
    const inputVal = type === 'major' ? formData.majorUnit : formData.minorUnit;
    const filtered = getFilteredUnits(inputVal);
    
    return (
      <div className="absolute top-full left-0 right-0 bg-[#1e293b] border border-slate-600 rounded-lg mt-1 max-h-40 overflow-y-auto z-50 shadow-xl custom-scrollbar">
        {filtered.map((u, idx) => (
          <div 
            key={u}
            className={`px-3 py-2 cursor-pointer text-sm transition-colors ${idx === highlightedIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/50 text-gray-300'}`}
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                handleChange(type === 'major' ? 'majorUnit' : 'minorUnit', u);
                setActiveDropdown(null);
                
                // Focus Logic for Mouse Click
                if (type === 'major' && formData.hasSubUnits) refs.minorUnit.current?.focus();
                else if (type === 'major') refs.salePriceMajor.current?.focus();
                else if (type === 'minor') refs.factor.current?.focus();
            }}
          >
            {u}
          </div>
        ))}
        {inputVal && !filtered.includes(inputVal) && (
            <div 
                className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer text-sm text-blue-400 italic"
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleChange(type === 'major' ? 'majorUnit' : 'minorUnit', inputVal);
                    setActiveDropdown(null);
                    
                    if (type === 'major' && formData.hasSubUnits) refs.minorUnit.current?.focus();
                    else if (type === 'major') refs.salePriceMajor.current?.focus();
                    else if (type === 'minor') refs.factor.current?.focus();
                }}
            >
                + إضافة "{inputVal}"
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)] animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-5xl bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
            
            {/* Sidebar (Left in RTL) */}
            <div className="w-full md:w-80 bg-[#0f172a]/90 p-6 border-l border-white/5 order-2 md:order-1 flex flex-col">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    التكلفة والبيانات
                </h2>
                
                <div className="space-y-4 flex-grow">
                    <div className="bg-[#1e293b]/50 rounded-xl p-4 border border-white/5 space-y-4">
                        <div>
                            <span className="text-xs text-slate-400 block mb-1">تكلفة الوحدة الرئيسية (مبدئية)</span>
                            <div className="text-2xl font-bold text-white font-mono tracking-tight">
                                {calculations.costMajor.toFixed(2)} <span className="text-sm text-slate-500 font-sans">ج.م</span>
                            </div>
                        </div>
                        
                        {formData.hasSubUnits && (
                            <div className="pt-3 border-t border-white/10 animate-in slide-in-from-top-2">
                                <span className="text-xs text-slate-400 block mb-1">تكلفة القطعة الداخلية</span>
                                <div className="text-xl font-bold text-emerald-400 font-mono tracking-tight">
                                    {calculations.costMinor.toFixed(2)} <span className="text-sm text-emerald-500/70 font-sans">ج.م</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-xs text-slate-400 leading-relaxed italic bg-[#1e293b]/30 p-3 rounded-lg border border-white/5">
                        {formData.itemName ? (
                            <>
                                الصنف متوفر في الموقع <span className="text-white font-bold">[{formData.location || 'غير محدد'}]</span>. 
                                {formData.hasSubUnits ? (
                                    <> يتم شراء الـ <span className="text-blue-400">{formData.majorUnit || 'الوحدة'}</span> بـ <span className="text-white font-mono">{calculations.costMajor.toFixed(2)}</span> وتجزئتها لـ <span className="text-white font-mono">{formData.factor}</span> <span className="text-emerald-400">{formData.minorUnit || 'قطعة'}</span>.</>
                                ) : (
                                    <> يباع كـ <span className="text-blue-400">{formData.majorUnit || 'وحدة'}</span> واحدة بدون تجزئة.</>
                                )}
                            </>
                        ) : 'يرجى إدخال اسم الصنف والسعر...'}
                    </div>
                </div>

                <button 
                    ref={refs.saveBtn}
                    onClick={handleSave}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold transition-all active:scale-95 mt-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 group focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                >
                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                    حفظ الصنف (F2)
                </button>
            </div>

            {/* Main Form (Right in RTL) */}
            <div className="flex-1 p-6 md:p-8 order-1 md:order-2 bg-gradient-to-br from-[#1e293b]/50 to-transparent">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-xl font-black text-white tracking-wide">تكويد صنف جديد</h1>
                    <label className="flex items-center gap-3 bg-[#0f172a] px-4 py-2 rounded-lg border border-white/10 cursor-pointer hover:border-blue-500/50 transition-colors group">
                        <div className="relative flex items-center">
                            <input 
                                ref={refs.hasSubUnits}
                                type="checkbox" 
                                checked={formData.hasSubUnits}
                                onChange={e => setFormData({...formData, hasSubUnits: e.target.checked})}
                                onKeyDown={(e) => handleKeyDown(e, 'hasSubUnits')}
                                className="peer appearance-none w-5 h-5 border-2 border-slate-500 rounded bg-slate-800 checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer"
                            />
                            <Check size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                        </div>
                        <span className="text-xs font-bold text-gray-300 group-hover:text-white select-none">يحتوي على تجزئة؟</span>
                    </label>
                </div>

                <div className="grid grid-cols-12 gap-5">
                    
                    {/* Barcode */}
                    <div className="col-span-12 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">الباركود (تلقائي/يدوي)</label>
                        <input 
                            ref={refs.code}
                            type="text" 
                            value={formData.code}
                            onChange={e => handleChange('code', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'code')}
                            className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600 font-mono" 
                            placeholder="scan or type..." 
                            autoFocus
                        />
                    </div>

                    {/* Arabic Name */}
                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">اسم الصنف (عربي)</label>
                        <input 
                            ref={refs.itemName}
                            type="text" 
                            value={formData.itemName}
                            onChange={e => handleChange('itemName', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'itemName')}
                            className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600" 
                            placeholder="اسم المنتج بالعربي..." 
                        />
                    </div>

                     {/* English Name */}
                     <div className="col-span-12 md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">اسم الصنف (إنجليزي)</label>
                        <input 
                            ref={refs.nameEn}
                            type="text" 
                            value={formData.nameEn}
                            onChange={e => handleChange('nameEn', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'nameEn')}
                            className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600" 
                            placeholder="Product Name..." 
                        />
                    </div>

                    {/* Category */}
                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">التصنيف</label>
                        <input 
                            ref={refs.category}
                            type="text" 
                            value={formData.category}
                            onChange={e => handleChange('category', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'category')}
                            className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600" 
                            placeholder="عام، إلكترونيات، مواد غذائية..." 
                        />
                    </div>

                    {/* Location */}
                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400">الموقع (الرف)</label>
                        <input 
                            ref={refs.location}
                            type="text" 
                            value={formData.location}
                            onChange={e => handleChange('location', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'location')}
                            className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600" 
                            placeholder="مثلاً: A1-5" 
                        />
                    </div>

                    {/* Major Unit */}
                    <div className="col-span-12 md:col-span-6 space-y-1.5 relative group">
                        <label className="text-[11px] font-bold text-slate-400 group-focus-within:text-blue-400 transition-colors">الوحدة الرئيسية (شراء)</label>
                        <input 
                            ref={refs.majorUnit}
                            type="text" 
                            value={formData.majorUnit}
                            onChange={e => handleChange('majorUnit', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, 'majorUnit')}
                            onFocus={() => { setActiveDropdown('major'); setHighlightedIndex(0); }}
                            onBlur={handleInputBlur}
                            className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600" 
                            placeholder="كرتونة، كيلو..." 
                        />
                        {renderDropdown('major')}
                    </div>

                    {/* Sub Units Section */}
                    {formData.hasSubUnits && (
                        <div className="col-span-12 grid grid-cols-12 gap-5 animate-in slide-in-from-top-4 fade-in">
                            <div className="col-span-12 md:col-span-8 space-y-1.5 relative group">
                                <label className="text-[11px] font-bold text-slate-400 group-focus-within:text-emerald-400 transition-colors">الوحدة الفرعية (تجزئة)</label>
                                <input 
                                    ref={refs.minorUnit}
                                    type="text" 
                                    value={formData.minorUnit}
                                    onChange={e => handleChange('minorUnit', e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, 'minorUnit')}
                                    onFocus={() => { setActiveDropdown('minor'); setHighlightedIndex(0); }}
                                    onBlur={handleInputBlur}
                                    className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600" 
                                    placeholder="قطعة، جرام..." 
                                />
                                {renderDropdown('minor')}
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400">العدد داخل الوحدة</label>
                                <input 
                                    ref={refs.factor}
                                    type="number" 
                                    value={formData.factor}
                                    onChange={e => handleChange('factor', e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, 'factor')}
                                    min="1"
                                    className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-center font-bold font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all" 
                                />
                            </div>
                        </div>
                    )}

                    {/* Pricing */}
                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-blue-400">سعر البيع (للوحدة الكبرى)</label>
                        <div className="relative">
                            <input 
                                ref={refs.salePriceMajor}
                                type="number" 
                                value={formData.salePriceMajor}
                                onChange={e => handleChange('salePriceMajor', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'salePriceMajor')}
                                step="0.1"
                                className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-lg font-bold text-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-700 font-mono" 
                                placeholder="0.00" 
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">ج.م</span>
                        </div>
                    </div>

                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-orange-400">خصم المورد (%)</label>
                        <div className="relative">
                            <input 
                                ref={refs.discount}
                                type="number" 
                                value={formData.discount}
                                onChange={e => handleChange('discount', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, 'discount')}
                                step="0.1"
                                className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-lg px-4 py-2.5 text-lg font-bold text-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-700 font-mono" 
                                placeholder="0" 
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
