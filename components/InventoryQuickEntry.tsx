
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { Save, Plus, Trash2, LayoutGrid, CheckCircle, ArrowRightLeft, ChevronDown, Calendar } from 'lucide-react';

interface Props {
  onAddItems: (items: InventoryItem[]) => void;
  availableUnits: string[];
}

interface QuickRow {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  category: string;
  location: string;
  
  // Units
  majorUnit: string;
  hasSubUnits: boolean;
  minorUnit: string;
  factor: number;
  
  // Pricing
  costMajor: number; // Calculated automatically
  priceMajor: number;
  
  // Discounts
  supplierDiscount: number;
  averageDiscount: number;
  
  // Stock
  initialStock: number;
  expiry: string; // Add Expiry
}

// --- Independent Component to fix Focus/Re-render issues ---
const UnitInput = React.memo(({ 
    value, 
    options, 
    onChange, 
    onSelect,
    onFocus, 
    onKeyDown,
    isOpen, 
    disabled,
    placeholder
}: { 
    value: string; 
    options: string[]; 
    onChange: (val: string) => void; 
    onSelect: (val: string) => void;
    onFocus: () => void; 
    onKeyDown: (e: React.KeyboardEvent) => void;
    isOpen: boolean; 
    disabled?: boolean;
    placeholder?: string;
}) => {
    const filteredOptions = options.filter(o => o.includes(value) && o !== value);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Reset highlighted index when options change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [value, isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const item = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (item) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleLocalKeyDown = (e: React.KeyboardEvent) => {
        if (isOpen && !disabled && filteredOptions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation(); // Prevent parent navigation when selecting
                onSelect(filteredOptions[highlightedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                onSelect(value); // Just close
                return;
            }
        }
        
        // Pass through to parent for Table Navigation
        onKeyDown(e);
    };

    return (
        <div className="relative h-full w-full">
            <input 
                type="text" 
                value={value} 
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                onKeyDown={handleLocalKeyDown}
                className={`w-full h-9 px-1 text-center bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all ${disabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                placeholder={placeholder}
                autoComplete="off"
            />
            {/* Dropdown Indicator */}
            {!disabled && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center px-1 pointer-events-none opacity-50">
                    <ChevronDown size={10} />
                </div>
            )}
            
            {/* Dropdown Menu */}
            {isOpen && !disabled && (filteredOptions.length > 0 || (value && !options.includes(value))) && (
                <div ref={dropdownRef} className="absolute top-full left-0 w-full min-w-[120px] bg-[#1e293b] border border-slate-600 rounded shadow-xl z-[100] max-h-40 overflow-y-auto custom-scrollbar">
                    {filteredOptions.map((option, idx) => (
                        <div 
                            key={option}
                            className={`px-3 py-2 cursor-pointer text-right text-xs border-b border-white/5 last:border-0 ${idx === highlightedIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-600 hover:text-white text-gray-200'}`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input blur
                                onSelect(option);
                            }}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                        >
                            {option}
                        </div>
                    ))}
                    {value && !options.includes(value) && (
                        <div className="px-3 py-2 text-blue-400 text-[10px] italic border-t border-slate-600 bg-slate-900/50">
                            إضافة "{value}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export const InventoryQuickEntry: React.FC<Props> = ({ onAddItems, availableUnits }) => {
  const [rows, setRows] = useState<QuickRow[]>([
    { 
        id: 1, 
        code: '', 
        name: '', 
        nameEn: '', 
        category: 'عام', 
        location: '', 
        majorUnit: 'قطعة', 
        hasSubUnits: false, 
        minorUnit: '', 
        factor: 1, 
        costMajor: 0, 
        priceMajor: 0, 
        supplierDiscount: 0, 
        averageDiscount: 0,
        initialStock: 0,
        expiry: ''
    }
  ]);

  const [notification, setNotification] = useState<string | null>(null);
  
  // Track active dropdown for units { rowId, type }
  const [activeUnitDropdown, setActiveUnitDropdown] = useState<{ rowId: number, type: 'major' | 'minor' } | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
      const handleClick = (e: MouseEvent) => {
          // If clicking strictly outside the table, close dropdown
          if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
              setActiveUnitDropdown(null);
          }
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { 
          id: Date.now(), 
          code: '', 
          name: '', 
          nameEn: '', 
          category: 'عام', 
          location: '', 
          majorUnit: 'قطعة', 
          hasSubUnits: false, 
          minorUnit: '', 
          factor: 1, 
          costMajor: 0, 
          priceMajor: 0, 
          supplierDiscount: 0, 
          averageDiscount: 0,
          initialStock: 0,
          expiry: ''
      }
    ]);
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(r => r.id !== id));
    } else {
        setRows([{ 
            id: Date.now(), 
            code: '', 
            name: '', 
            nameEn: '', 
            category: 'عام', 
            location: '', 
            majorUnit: 'قطعة', 
            hasSubUnits: false, 
            minorUnit: '', 
            factor: 1, 
            costMajor: 0, 
            priceMajor: 0, 
            supplierDiscount: 0, 
            averageDiscount: 0,
            initialStock: 0,
            expiry: ''
        }]);
    }
  };

  const updateRow = useCallback((id: number, field: keyof QuickRow, value: any) => {
    setRows(prev => prev.map(r => {
        if (r.id === id) {
            const updates: any = { [field]: value };
            
            // Auto-sync Average Discount with Supplier Discount
            if (field === 'supplierDiscount') {
                updates.averageDiscount = value;
            }

            // Auto-Calculate Cost: Price * (1 - Discount%)
            let price = r.priceMajor;
            let discount = r.supplierDiscount;

            if (field === 'priceMajor') price = parseFloat(value) || 0;
            if (field === 'supplierDiscount') discount = parseFloat(value) || 0;

            if (field === 'priceMajor' || field === 'supplierDiscount') {
                updates.costMajor = parseFloat((price * (1 - (discount / 100))).toFixed(2));
            }
            
            return { ...r, ...updates };
        }
        return r;
    }));
  }, []);

  const handleExpiryBlur = (id: number, val: string) => {
      const clean = val.replace(/\D/g, '');
      if (clean.length === 4) {
          const mm = clean.substring(0, 2);
          const yy = clean.substring(2, 4);
          if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
              updateRow(id, 'expiry', `${mm}/20${yy}`);
          }
      } else if (clean.length === 6) {
          const mm = clean.substring(0, 2);
          const yyyy = clean.substring(2, 6);
          if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
              updateRow(id, 'expiry', `${mm}/${yyyy}`);
          }
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colName: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        
        // Logical flow of columns
        const columns = [
            'code', 'name', 'nameEn', 'category', 'location', 
            'majorUnit', 'hasSubUnits', 'minorUnit', 'factor', 
            'priceMajor', 'supplierDiscount', 'averageDiscount', 'initialStock', 'expiry' 
        ];
        
        const currentIdx = columns.indexOf(colName);
        let nextIdx = currentIdx + 1;
        const currentRow = rows[rowIndex];
        
        // If hasSubUnits is false, skip minorUnit and factor
        if (colName === 'hasSubUnits' && !currentRow.hasSubUnits) {
            nextIdx = columns.indexOf('priceMajor'); 
        }

        // Close dropdown if open
        setActiveUnitDropdown(null);

        if (nextIdx < columns.length) {
            const nextCol = columns[nextIdx];
            // Handle focusing specific input types
            const selector = `tr[data-id="${currentRow.id}"] .${nextCol}-input`;
            // Special handling for unit inputs which are now wrapped
            const container = tableRef.current?.querySelector(selector);
            let inputToFocus = container;
            if (container && (nextCol === 'majorUnit' || nextCol === 'minorUnit')) {
                 inputToFocus = container.querySelector('input');
            }
            
            (inputToFocus as HTMLElement)?.focus();
            if(inputToFocus instanceof HTMLInputElement) inputToFocus.select();
        } else {
            // New Row
            if (rowIndex < rows.length - 1) {
                const nextRowId = rows[rowIndex + 1].id;
                const cell = tableRef.current?.querySelector(`tr[data-id="${nextRowId}"] .code-input`) as HTMLElement;
                cell?.focus();
            } else {
                addRow();
                setTimeout(() => {
                    const lastRow = tableRef.current?.rows[tableRef.current.rows.length - 1];
                    (lastRow?.querySelector('.code-input') as HTMLElement)?.focus();
                }, 50);
            }
        }
    }
  };

  const handleSave = () => {
      const validItems: InventoryItem[] = [];
      const errors: string[] = [];

      rows.forEach((row, idx) => {
          if (!row.name || !row.code) {
              // If row is empty (ignore if it's not the only row)
              if (rows.length > 1 && !row.name && !row.code) return; 
              errors.push(`صف رقم ${idx + 1}: يجب إدخال الاسم والباركود`);
              return;
          }

          const priceMinor = row.hasSubUnits && row.factor > 0 ? (row.priceMajor / row.factor) : row.priceMajor;

          validItems.push({
              id: Date.now().toString() + idx,
              code: row.code,
              name: row.name,
              nameEn: row.nameEn,
              category: row.category,
              location: row.location,
              hasSubUnits: row.hasSubUnits,
              majorUnit: row.majorUnit,
              minorUnit: row.minorUnit,
              factor: row.factor,
              priceMajor: row.priceMajor,
              priceMinor: priceMinor,
              costMajor: row.costMajor, 
              supplierDiscount: row.supplierDiscount,
              averageDiscount: row.averageDiscount,
              systemStock: row.initialStock,
              actualStock: row.initialStock,
              stocktakeExpiry: row.expiry || undefined, // ADDED EXPIRY
              lastUpdated: new Date().toISOString().split('T')[0]
          });
      });

      if (errors.length > 0) {
          alert("تنبيه:\n" + errors.join("\n"));
          if (validItems.length === 0) return;
      }

      if (validItems.length > 0) {
          onAddItems(validItems);
          setNotification(`تم حفظ ${validItems.length} صنف بنجاح`);
          setRows([{ 
              id: Date.now(), 
              code: '', name: '', nameEn: '', category: 'عام', location: '', 
              majorUnit: 'قطعة', hasSubUnits: false, minorUnit: '', factor: 1, 
              costMajor: 0, priceMajor: 0, supplierDiscount: 0, averageDiscount: 0,
              initialStock: 0, expiry: ''
          }]);
          setTimeout(() => setNotification(null), 3000);
      }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 font-sans animate-in fade-in zoom-in-95 duration-300 flex flex-col">
        
        {notification && (
            <div className="fixed bottom-5 left-5 bg-emerald-600 text-white px-6 py-3 rounded shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-5">
                <CheckCircle size={20} /> {notification}
            </div>
        )}

        <div className="flex justify-between items-center mb-4 bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-2.5 rounded-lg text-blue-400 border border-blue-500/20">
                    <LayoutGrid size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">تسجيل سريع (جدول)</h1>
                    <p className="text-[10px] text-slate-400 font-bold">يتم حساب التكلفة تلقائياً بناءً على السعر والخصم</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={addRow} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                    <Plus size={14} /> إضافة سطر
                </button>
                <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-900/20 flex items-center gap-2">
                    <Save size={14} /> حفظ الكل
                </button>
            </div>
        </div>

        <div className="flex-1 bg-[#1e293b] rounded-xl border border-white/5 shadow-2xl overflow-hidden flex flex-col relative">
            <div className="overflow-auto custom-scrollbar flex-1 bg-[#0b111d] pb-40"> {/* Extra padding for dropdowns */}
                <table className="w-full text-right border-collapse min-w-[1800px]" ref={tableRef}>
                    <thead className="sticky top-0 z-20 bg-[#161e2e] border-b border-slate-700 text-slate-400 text-[10px] font-bold uppercase shadow-md">
                        <tr>
                            <th className="p-2 w-10 text-center border-l border-slate-700">#</th>
                            <th className="p-2 w-32 border-l border-slate-700">الباركود *</th>
                            <th className="p-2 border-l border-slate-700 min-w-[200px]">اسم الصنف (عربي) *</th>
                            <th className="p-2 border-l border-slate-700 w-40">اسم الصنف (En)</th>
                            <th className="p-2 border-l border-slate-700 w-24">التصنيف</th>
                            <th className="p-2 border-l border-slate-700 w-24">الموقع</th>
                            
                            <th className="p-2 border-l border-slate-700 w-32 text-center bg-blue-900/10">الوحدة الكبرى</th>
                            <th className="p-2 border-l border-slate-700 w-12 text-center bg-blue-900/10" title="هل يوجد وحدات فرعية؟">تجزئة؟</th>
                            <th className="p-2 border-l border-slate-700 w-32 text-center bg-blue-900/10">الوحدة الصغرى</th>
                            <th className="p-2 border-l border-slate-700 w-20 text-center bg-blue-900/10">المعامل</th>
                            
                            <th className="p-2 border-l border-slate-700 w-24 text-center text-emerald-400 bg-slate-800/50">سعر البيع</th>
                            <th className="p-2 border-l border-slate-700 w-20 text-center text-orange-400">خصم المورد %</th>
                            <th className="p-2 border-l border-slate-700 w-24 text-center text-blue-300 bg-slate-900">التكلفة (آلي)</th>
                            <th className="p-2 border-l border-slate-700 w-20 text-center text-orange-300">متوسط الخصم %</th>
                            
                            <th className="p-2 border-l border-slate-700 w-24 text-center text-white">رصيد افتتاحي</th>
                            <th className="p-2 border-l border-slate-700 w-28 text-center text-amber-400">الصلاحية (شهر/سنة)</th>
                            <th className="p-2 w-10 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {rows.map((row, idx) => (
                            <tr key={row.id} data-id={row.id} className="group hover:bg-slate-800/30 transition-colors">
                                <td className="p-2 text-center text-slate-600 border-l border-slate-800 text-xs bg-[#0f172a]">{idx + 1}</td>
                                
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="text" 
                                        value={row.code} 
                                        onChange={e => updateRow(row.id, 'code', e.target.value)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'code')}
                                        className="code-input w-full h-9 px-2 bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                        placeholder="Scan..."
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="text" 
                                        dir="rtl"
                                        lang="ar"
                                        value={row.name} 
                                        onChange={e => updateRow(row.id, 'name', e.target.value)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'name')}
                                        className="name-input w-full h-9 px-2 bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-bold placeholder:text-slate-700 text-right"
                                        placeholder="اسم عربي..."
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="text" 
                                        dir="ltr"
                                        lang="en"
                                        value={row.nameEn} 
                                        onChange={e => updateRow(row.id, 'nameEn', e.target.value)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'nameEn')}
                                        className="nameEn-input w-full h-9 px-2 bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all text-left placeholder:text-slate-700"
                                        placeholder="English Name..."
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="text" 
                                        value={row.category} 
                                        onChange={e => updateRow(row.id, 'category', e.target.value)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'category')}
                                        className="category-input w-full h-9 px-2 bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="text" 
                                        value={row.location} 
                                        onChange={e => updateRow(row.id, 'location', e.target.value)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'location')}
                                        className="location-input w-full h-9 px-2 bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </td>

                                {/* Major Unit Dropdown */}
                                <td className="p-0 border-l border-slate-800 bg-blue-900/5 majorUnit-input">
                                    <UnitInput 
                                        value={row.majorUnit} 
                                        options={availableUnits}
                                        isOpen={activeUnitDropdown?.rowId === row.id && activeUnitDropdown?.type === 'major'}
                                        onChange={(val) => updateRow(row.id, 'majorUnit', val)}
                                        onSelect={(val) => {
                                            updateRow(row.id, 'majorUnit', val);
                                            setActiveUnitDropdown(null);
                                        }}
                                        onFocus={() => setActiveUnitDropdown({ rowId: row.id, type: 'major' })}
                                        onKeyDown={(e) => handleKeyDown(e, idx, 'majorUnit')}
                                        placeholder="وحدة كبرى"
                                    />
                                </td>

                                <td className="p-0 border-l border-slate-800 text-center bg-blue-900/5">
                                    <input 
                                        type="checkbox" 
                                        checked={row.hasSubUnits} 
                                        onChange={e => updateRow(row.id, 'hasSubUnits', e.target.checked)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'hasSubUnits')}
                                        className="hasSubUnits-input w-4 h-4 mt-2 accent-blue-500 cursor-pointer"
                                    />
                                </td>

                                {/* Minor Unit Dropdown */}
                                <td className="p-0 border-l border-slate-800 bg-blue-900/5 minorUnit-input">
                                    <UnitInput 
                                        value={row.minorUnit} 
                                        options={availableUnits}
                                        disabled={!row.hasSubUnits}
                                        isOpen={activeUnitDropdown?.rowId === row.id && activeUnitDropdown?.type === 'minor'}
                                        onChange={(val) => updateRow(row.id, 'minorUnit', val)}
                                        onSelect={(val) => {
                                            updateRow(row.id, 'minorUnit', val);
                                            setActiveUnitDropdown(null);
                                        }}
                                        onFocus={() => setActiveUnitDropdown({ rowId: row.id, type: 'minor' })}
                                        onKeyDown={(e) => handleKeyDown(e, idx, 'minorUnit')}
                                        placeholder="وحدة صغرى"
                                    />
                                </td>

                                <td className="p-0 border-l border-slate-800 bg-blue-900/5">
                                    <input 
                                        type="number" 
                                        disabled={!row.hasSubUnits}
                                        value={row.factor} 
                                        onChange={e => updateRow(row.id, 'factor', parseFloat(e.target.value))} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'factor')}
                                        className={`factor-input w-full h-9 px-1 text-center bg-transparent text-white text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono ${!row.hasSubUnits ? 'opacity-20 cursor-not-allowed' : ''}`}
                                    />
                                </td>

                                <td className="p-0 border-l border-slate-800 bg-[#0f172a]/30">
                                    <input 
                                        type="number" 
                                        value={row.priceMajor} 
                                        onChange={e => updateRow(row.id, 'priceMajor', parseFloat(e.target.value))} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'priceMajor')}
                                        className="priceMajor-input w-full h-9 px-1 text-center bg-transparent text-emerald-400 font-bold text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="number" 
                                        value={row.supplierDiscount} 
                                        onChange={e => updateRow(row.id, 'supplierDiscount', parseFloat(e.target.value))} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'supplierDiscount')}
                                        className="supplierDiscount-input w-full h-9 px-1 text-center bg-transparent text-orange-400 text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800 bg-[#0f172a]/50">
                                    <div className="w-full h-9 px-1 flex items-center justify-center text-blue-300 font-bold text-xs font-mono cursor-not-allowed select-none">
                                        {row.costMajor.toFixed(2)}
                                    </div>
                                </td>
                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="number" 
                                        value={row.averageDiscount} 
                                        onChange={e => updateRow(row.id, 'averageDiscount', parseFloat(e.target.value))} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'averageDiscount')}
                                        className="averageDiscount-input w-full h-9 px-1 text-center bg-transparent text-orange-300 text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </td>

                                <td className="p-0 border-l border-slate-800">
                                    <input 
                                        type="number" 
                                        value={row.initialStock} 
                                        onChange={e => updateRow(row.id, 'initialStock', parseFloat(e.target.value))} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'initialStock')}
                                        className="initialStock-input w-full h-9 px-1 text-center bg-transparent text-white font-bold text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </td>
                                <td className="p-0 border-l border-slate-800 relative">
                                    <input 
                                        type="text" 
                                        value={row.expiry} 
                                        onChange={e => updateRow(row.id, 'expiry', e.target.value)} 
                                        onKeyDown={e => handleKeyDown(e, idx, 'expiry')}
                                        onBlur={e => handleExpiryBlur(row.id, e.target.value)}
                                        className="expiry-input w-full h-9 px-1 text-center bg-transparent text-amber-400 font-bold text-xs outline-none focus:bg-[#1e293b] focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                        placeholder="MM/YY"
                                    />
                                    {row.expiry && <Calendar size={10} className="absolute left-1 top-3 text-slate-500 pointer-events-none" />}
                                </td>
                                <td className="p-0 text-center">
                                    <button 
                                        onClick={() => removeRow(row.id)}
                                        className="text-slate-600 hover:text-red-500 p-2 rounded transition-colors"
                                        tabIndex={-1}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div className="mt-2 text-[10px] text-slate-500 font-bold flex justify-between items-center">
            <span>اضغط Enter للانتقال للخلية التالية. سيتم إنشاء صف جديد تلقائياً عند نهاية السطر.</span>
            <span className="flex items-center gap-1"><ArrowRightLeft size={10} /> Shift+Tab للرجوع للخلف</span>
        </div>
    </div>
  );
};
