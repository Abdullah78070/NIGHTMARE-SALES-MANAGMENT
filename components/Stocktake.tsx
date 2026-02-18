
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InventoryItem, StocktakeSession } from '../types';
import { 
  Save, 
  Printer, 
  Search, 
  Calendar, 
  Barcode, 
  ArrowRight,
  PackageCheck,
  History,
  X,
  Lock,
  ArrowLeft
} from 'lucide-react';

interface StocktakeProps {
  items: InventoryItem[];
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onSaveSession?: (session: StocktakeSession) => void;
  initialSession?: StocktakeSession | null; // For viewing history
  onCancel?: () => void; // To go back to list
  nextId: number; // Sequential ID
}

export const Stocktake: React.FC<StocktakeProps> = ({ items, onUpdateItem, onSaveSession, initialSession, onCancel, nextId }) => {
  
  // --- State ---
  const [sessionId, setSessionId] = useState(initialSession ? initialSession.id : nextId.toString());
  const [sessionDate, setSessionDate] = useState(initialSession ? initialSession.date : new Date().toLocaleDateString('en-GB'));
  const [isViewMode, setIsViewMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const [auditedItems, setAuditedItems] = useState<any[]>([]);

  // Inputs State
  const [qtyInput, setQtyInput] = useState<string>('');
  const [expiryInput, setExpiryInput] = useState<string>('');
  const [focusIndex, setFocusIndex] = useState(-1);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Init Effect ---
  useEffect(() => {
      if (initialSession) {
          setSessionId(initialSession.id);
          setSessionDate(initialSession.date);
          setAuditedItems(initialSession.items); // Load historical items
          setIsViewMode(true);
      } else {
          setSessionId(nextId.toString());
          setSessionDate(new Date().toLocaleDateString('en-GB'));
          setAuditedItems([]);
          setIsViewMode(false);
      }
  }, [initialSession, nextId]);

  // --- Search Logic (Only relevant in Edit Mode) ---
  const filteredSearch = useMemo(() => {
    if (!searchQuery || isViewMode) return [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8); // Limit results
  }, [items, searchQuery, isViewMode]);

  // --- Selection Handler ---
  const handleSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
    
    const valToShow = item.actualStock.toString();
    setQtyInput(valToShow); 
    setExpiryInput(item.stocktakeExpiry || '');
    
    setTimeout(() => {
        if (qtyRef.current) {
            qtyRef.current.focus();
            qtyRef.current.select(); 
        }
    }, 50);
  };

  // --- Smart Expiry Formatter ---
  const handleExpiryInput = (val: string) => {
    const clean = val.replace(/[^\d]/g, '');
    setExpiryInput(val); 
  };

  const formatExpiryFinal = (val: string): string => {
      const clean = val.replace(/[^\d]/g, '');
      if (clean.length === 4) { // 1225 -> 12/2025
          const mm = clean.substring(0, 2);
          const yy = clean.substring(2, 4);
          if(parseInt(mm) > 0 && parseInt(mm) <= 12) return `${mm}/20${yy}`;
      }
      if (clean.length === 6) { // 122025 -> 12/2025
          const mm = clean.substring(0, 2);
          const yyyy = clean.substring(2, 6);
          if(parseInt(mm) > 0 && parseInt(mm) <= 12) return `${mm}/${yyyy}`;
      }
      return val; 
  };

  // --- Commit Handler (Add to List) ---
  const handleCommit = () => {
    if (!selectedItem || isViewMode) return;

    const finalQty = parseFloat(qtyInput); 
    const finalExpiry = formatExpiryFinal(expiryInput);

    if (isNaN(finalQty)) {
        alert('الكمية غير صحيحة');
        return;
    }

    // Update the *Main Inventory State* via callback immediately 
    // (In a real draft system, we might wait to save, but current architecture updates live)
    onUpdateItem(selectedItem.id, {
        actualStock: finalQty,
        stocktakeExpiry: finalExpiry
    });

    // Add to local list for display
    setAuditedItems(prev => {
        // Remove existing entry for this item if any, then add new
        const filtered = prev.filter(i => i.id !== selectedItem.id);
        return [{
            id: selectedItem.id,
            code: selectedItem.code,
            name: selectedItem.name,
            systemStock: selectedItem.systemStock, // Snapshot
            actualStock: finalQty,
            cost: selectedItem.costMajor,
            expiry: finalExpiry
        }, ...filtered];
    });

    // Reset for next
    setSelectedItem(null);
    setSearchQuery('');
    setQtyInput('');
    setExpiryInput('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // --- Remove from Audit List ---
  const handleRemoveFromAudit = (id: string) => {
      if (isViewMode) return;
      setAuditedItems(prev => prev.filter(i => i.id !== id));
      // Optionally reset actual stock to 0 or system stock? 
      // Current behavior: just remove from list, actual stock remains changed in inventory state until fixed again.
  };

  // --- Stats ---
  const stats = useMemo(() => {
      let matched = 0, shortage = 0, surplus = 0;
      let plusValue = 0, minusValue = 0;

      auditedItems.forEach(i => {
          const diff = i.actualStock - i.systemStock;
          const val = Math.abs(diff * (i.cost || 0));

          if (diff === 0) matched++;
          else if (diff < 0) {
              shortage++;
              minusValue += val;
          }
          else {
              surplus++;
              plusValue += val;
          }
      });
      return { matched, shortage, surplus, total: auditedItems.length, plusValue, minusValue, netValue: plusValue - minusValue };
  }, [auditedItems]);

  // --- Save Logic (Finalize Stocktake) ---
  const handleSave = () => {
      if (isViewMode) return;
      if (auditedItems.length === 0) {
          alert('لا توجد أصناف تم جردها للحفظ.');
          return;
      }

      if (window.confirm(`هل تريد حفظ محضر الجرد رقم ${sessionId}؟\n\nسيتم ترحيل الفروقات واعتماد الأرصدة الحالية.`)) {
          
          const newSession: StocktakeSession = {
              id: sessionId,
              date: sessionDate,
              timestamp: Date.now(),
              totalItems: stats.total,
              stats: stats,
              items: auditedItems
          };

          if (onSaveSession) {
              onSaveSession(newSession);
          }

          // Apply system stock update logic
          auditedItems.forEach(item => {
              onUpdateItem(item.id, {
                  systemStock: item.actualStock, 
                  lastUpdated: new Date().toISOString().split('T')[0]
              });
          });

          alert('تم حفظ الجرد بنجاح.');
      }
  };

  // --- Keyboard Navigation ---
  const handleKeyDown = (e: React.KeyboardEvent, section: 'search' | 'qty' | 'expiry') => {
    if (section === 'search') {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusIndex(prev => Math.min(prev + 1, filteredSearch.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusIndex >= 0 && filteredSearch[focusIndex]) {
                handleSelect(filteredSearch[focusIndex]);
            } else if (filteredSearch.length > 0) {
                handleSelect(filteredSearch[0]); 
            }
        }
    } else if (section === 'qty') {
        if (e.key === 'Enter') {
            e.preventDefault();
            expiryRef.current?.focus();
        }
    } else if (section === 'expiry') {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCommit();
        }
    }
  };

  // Helper for Expiry Badge
  const getExpiryBadge = (dateStr?: string) => {
      if (!dateStr || !dateStr.includes('/')) return <span className="text-slate-500">-</span>;
      const [mm, yyyy] = dateStr.split('/');
      const exp = new Date(parseInt(yyyy), parseInt(mm) - 1);
      const now = new Date();
      const diffMonths = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());

      if (diffMonths < 0) return <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold border border-red-500/30">منتهي</span>;
      if (diffMonths <= 3) return <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-500/30">قريب</span>;
      return <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold border border-blue-500/30">سليم</span>;
  };

  return (
    <>
    {/* --- SCREEN VIEW --- */}
    <div className="min-h-[calc(100vh-140px)] space-y-6 animate-in fade-in zoom-in-95 duration-300 font-sans print:hidden">
      
      {/* Top Bar with Back Button */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#1e293b] p-4 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
            {onCancel && (
                <button onClick={onCancel} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition text-slate-300">
                    <ArrowLeft size={20} />
                </button>
            )}
            <div className={`p-3 rounded-xl shadow-lg ${isViewMode ? 'bg-slate-600 shadow-slate-900/20' : 'bg-indigo-600 shadow-indigo-900/20'}`}>
                {isViewMode ? <Lock size={24} className="text-white" /> : <PackageCheck size={24} className="text-white" />}
            </div>
            <div>
                <h1 className="text-xl font-black text-white">{isViewMode ? 'عرض محضر جرد (أرشيف)' : 'محضر جرد جديد'}</h1>
                <p className="text-xs text-slate-400 font-medium">{isViewMode ? 'سجل للقراءة فقط' : 'إدخال الكميات (تحديد تلقائي) واعتماد الفروقات'}</p>
            </div>
        </div>

        <div className="flex items-center gap-4 bg-[#0f172a] px-4 py-2 rounded-xl border border-white/5">
            <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">رقم المحضر</span>
                <span className="font-mono font-black text-white text-lg tracking-widest">{sessionId}</span>
            </div>
            <div className="w-px h-8 bg-white/10 mx-2"></div>
            <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">التاريخ</span>
                <span className="font-mono font-bold text-white text-sm">{sessionDate}</span>
            </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2" onClick={() => window.print()}>
                <Printer size={16} />
                <span>طباعة التقرير</span>
            </button>
            {!isViewMode && (
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2" onClick={handleSave}>
                    <Save size={16} />
                    <span>حفظ الجرد</span>
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
            
            {/* Input Area (Only if NOT View Mode) */}
            {!isViewMode && (
                <div className="bg-[#1e293b] border border-indigo-500/30 rounded-2xl shadow-2xl p-5 relative overflow-visible">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                            <Search size={16} />
                            إدخال بيانات الصنف للجرد
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5 relative">
                            <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">بحث (اسم / باركود)</label>
                            <div className="relative group">
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                        setFocusIndex(-1);
                                        if(e.target.value === '') setSelectedItem(null);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, 'search')}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="ابدأ الكتابة أو امسح الباركود..."
                                    className="w-full bg-[#0f172a] border border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-600 font-bold"
                                    autoComplete="off"
                                />
                                <Barcode className="absolute right-3 top-3.5 text-slate-500" size={16} />
                            </div>

                            {showDropdown && filteredSearch.length > 0 && (
                                <div ref={dropdownRef} className="absolute z-50 top-full right-0 w-full mt-2 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-black/50">
                                    {filteredSearch.map((item, idx) => (
                                        <div 
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            className={`p-3 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center transition-colors ${idx === focusIndex ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                                        >
                                            <div>
                                                <div className="font-bold text-xs">{item.name}</div>
                                                <div className={`text-[10px] font-mono mt-0.5 ${idx === focusIndex ? 'text-indigo-200' : 'text-slate-500'}`}>{item.code}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] block opacity-70">الدفتر</span>
                                                <span className="font-mono font-bold text-sm">{item.systemStock}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">العدد الفعلي</label>
                            <input 
                                ref={qtyRef}
                                type="number" 
                                value={qtyInput}
                                onChange={(e) => setQtyInput(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, 'qty')}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-xl py-3 text-center text-lg font-black text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                                placeholder="0"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">الصلاحية (شهر/سنة)</label>
                            <div className="relative">
                                <input 
                                    ref={expiryRef}
                                    type="text" 
                                    value={expiryInput}
                                    onChange={(e) => handleExpiryInput(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, 'expiry')}
                                    className="w-full bg-[#0f172a] border border-slate-600 rounded-xl py-3 text-center text-sm font-mono font-bold text-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-700"
                                    placeholder="مثال: 1225"
                                    maxLength={7}
                                />
                                <Calendar className="absolute right-3 top-3.5 text-slate-600 pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <button 
                                onClick={handleCommit}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ArrowRight size={16} className="rotate-180" />
                                <span>إضافة</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table List */}
            <div className="bg-[#1e293b] rounded-2xl border border-white/5 shadow-xl overflow-hidden min-h-[300px]">
                <div className="bg-[#0f172a] p-3 px-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-slate-300 text-xs flex items-center gap-2">
                        <History size={14} />
                        الأصناف المدرجة في المحضر
                    </h3>
                    <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">
                        {auditedItems.length} صنف
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-[#161e2e] text-slate-400 text-[10px] font-bold uppercase border-b border-white/5">
                            <tr>
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">الصنف / الباركود</th>
                                <th className="p-4 w-24 text-center">الدفتر</th>
                                <th className="p-4 w-24 text-center bg-indigo-500/5 text-indigo-300">الفعلي</th>
                                <th className="p-4 w-24 text-center">الفارق</th>
                                <th className="p-4 w-32 text-center">الصلاحية</th>
                                {!isViewMode && <th className="p-4 w-12"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                            {auditedItems.map((item, index) => {
                                const diff = item.actualStock - item.systemStock;
                                return (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-center text-slate-600">{index + 1}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-white mb-0.5">{item.name}</div>
                                            <div className="text-[9px] font-mono text-slate-500">{item.code}</div>
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-400 font-bold">{item.systemStock}</td>
                                        <td className="p-4 text-center font-mono text-white font-black bg-indigo-500/5 text-sm">{item.actualStock}</td>
                                        <td className="p-4 text-center">
                                            <span className={`font-mono font-bold px-2 py-1 rounded text-[11px] ${diff === 0 ? 'text-slate-500' : diff < 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-mono font-bold text-slate-300">{item.expiry || '-'}</span>
                                                {getExpiryBadge(item.expiry)}
                                            </div>
                                        </td>
                                        {!isViewMode && (
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => handleRemoveFromAudit(item.id)}
                                                    className="text-slate-600 hover:text-red-400 p-1.5 rounded hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="حذف من الجرد"
                                                >
                                                    <X size={14} /> 
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {auditedItems.length === 0 && (
                                <tr>
                                    <td colSpan={isViewMode ? 6 : 7} className="p-12 text-center text-slate-500 italic">
                                        لا توجد أصناف في هذا المحضر.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-4">
            
            {/* Stats Card */}
            <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 shadow-xl">
                <h3 className="font-bold text-white mb-4 border-b border-white/5 pb-2 text-sm">إحصائيات الجرد</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-[11px] font-bold text-emerald-400">أصناف مطابقة</span>
                        <span className="font-black font-mono text-lg text-emerald-400">{stats.matched}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <span className="text-[11px] font-bold text-red-400">أصناف بها عجز</span>
                        <span className="font-black font-mono text-lg text-red-400">{stats.shortage}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <span className="text-[11px] font-bold text-blue-400">أصناف بها زيادة</span>
                        <span className="font-black font-mono text-lg text-blue-400">{stats.surplus}</span>
                    </div>
                </div>
            </div>

            {/* Session Info (Read Only) */}
            <div className="bg-[#1e293b] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">صافي قيمة الفروقات</div>
                <div className={`font-mono font-black text-lg tracking-widest ${stats.netValue < 0 ? 'text-red-400' : stats.netValue > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {stats.netValue.toLocaleString()} EGP
                </div>
            </div>

        </div>
      </div>
    </div>

    {/* --- PRINT LAYOUT (REPORT) --- */}
    <div className="hidden print:block bg-white text-black p-8 max-w-[210mm] mx-auto min-h-screen">
        {/* Print Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div className="text-right">
                <h1 className="text-2xl font-bold mb-1">تقرير فروقات الجرد</h1>
                <p className="text-sm">Stocktake Discrepancy Report</p>
                <div className="mt-2 text-xs font-mono">تاريخ التقرير: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold">اسم الشركة / المؤسسة</h2> 
                <div className="border border-black px-3 py-1 mt-2 inline-block font-bold">
                    رقم المحضر: {sessionId}
                </div>
            </div>
        </div>

        {/* Print Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 border border-black p-4 text-center text-sm">
            <div>
                <div className="font-bold mb-1">إجمالي الأصناف</div>
                <div className="font-mono text-lg">{stats.total}</div>
            </div>
            <div>
                <div className="font-bold mb-1">المطابق</div>
                <div className="font-mono text-lg">{stats.matched}</div>
            </div>
            <div>
                <div className="font-bold mb-1">العجز (Shortage)</div>
                <div className="font-mono text-lg text-red-700">{stats.shortage}</div>
            </div>
            <div>
                <div className="font-bold mb-1">الزيادة (Surplus)</div>
                <div className="font-mono text-lg text-blue-700">{stats.surplus}</div>
            </div>
        </div>

        {/* Print Table */}
        <table className="w-full text-right border-collapse border border-black text-xs mb-8">
            <thead>
                <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-center w-10">#</th>
                    <th className="border border-black p-2 w-32">كود الصنف</th>
                    <th className="border border-black p-2">اسم الصنف</th>
                    <th className="border border-black p-2 text-center w-20">الدفتر</th>
                    <th className="border border-black p-2 text-center w-20">الفعلي</th>
                    <th className="border border-black p-2 text-center w-20">الفرق</th>
                    <th className="border border-black p-2 text-center w-24">الصلاحية</th>
                </tr>
            </thead>
            <tbody>
                {auditedItems.map((item, index) => {
                    const diff = item.actualStock - item.systemStock;
                    return (
                        <tr key={item.id}>
                            <td className="border border-black p-2 text-center">{index + 1}</td>
                            <td className="border border-black p-2 font-mono">{item.code}</td>
                            <td className="border border-black p-2">{item.name}</td>
                            <td className="border border-black p-2 text-center">{item.systemStock}</td>
                            <td className="border border-black p-2 text-center font-bold">{item.actualStock}</td>
                            <td className={`border border-black p-2 text-center font-bold ${diff < 0 ? 'text-red-700' : diff > 0 ? 'text-blue-700' : ''}`}>
                                {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="border border-black p-2 text-center font-mono">{item.expiry || '-'}</td>
                        </tr>
                    );
                })}
                {auditedItems.length === 0 && (
                    <tr>
                        <td colSpan={7} className="border border-black p-8 text-center italic">لا توجد بيانات للعرض</td>
                    </tr>
                )}
            </tbody>
        </table>

        {/* Print Footer / Signatures */}
        <div className="flex justify-between mt-12 px-12 text-center">
            <div>
                <p className="font-bold mb-10">مسؤول المخزن</p>
                <div className="w-32 border-b border-black"></div>
            </div>
            <div>
                <p className="font-bold mb-10">لجنة الجرد</p>
                <div className="w-32 border-b border-black"></div>
            </div>
            <div>
                <p className="font-bold mb-10">المدير المسؤول</p>
                <div className="w-32 border-b border-black"></div>
            </div>
        </div>
    </div>
    </>
  );
};
