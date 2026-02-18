
import React, { useState, useEffect, useRef } from 'react';
import { Customer, CashPayment } from '../types';
import { 
  Printer, 
  Save, 
  Search, 
  ChevronDown, 
  Wallet, 
  Calendar, 
  CreditCard,
  Building2,
  FileText,
  User,
  History,
  CheckCircle,
  ArrowUpRight,
  XCircle
} from 'lucide-react';

interface Props {
  customers: Customer[]; // Can be extended to vendors/employees
  onSave?: (payment: CashPayment) => void;
  initialPayment?: CashPayment | null;
  onCancel?: () => void;
  nextIdProp: string;
}

export const AccountingPayment: React.FC<Props> = ({ customers, onSave, initialPayment, onCancel, nextIdProp }) => {
  const [dailyTotal, setDailyTotal] = useState(0);
  const [nextId, setNextId] = useState(nextIdProp);

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    receiver: '',
    description: '',
    method: 'نقدي',
    costCenter: ''
  });

  // Load Initial Data if Editing
  useEffect(() => {
      if (initialPayment) {
          setFormData({
              amount: initialPayment.amount.toString(),
              receiver: initialPayment.receiver,
              description: initialPayment.description,
              method: initialPayment.method,
              costCenter: initialPayment.costCenter || ''
          });
          setNextId(initialPayment.id);
      } else {
          setNextId(nextIdProp);
      }
  }, [initialPayment, nextIdProp]);

  // Search/Dropdown State
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [notification, setNotification] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter possible receivers
  const filteredReceivers = customers.filter(c => 
    c.name.includes(searchTerm) || c.phone.includes(searchTerm)
  );

  // Handle Search Input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setFormData(prev => ({ ...prev, receiver: e.target.value }));
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  const selectReceiver = (name: string) => {
    setSearchTerm(name);
    setFormData(prev => ({ ...prev, receiver: name }));
    setShowDropdown(false);
  };

  // Keyboard Navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredReceivers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredReceivers[highlightedIndex]) {
        selectReceiver(filteredReceivers[highlightedIndex].name);
      } else {
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.receiver || !formData.description) {
      setNotification('يرجى ملء جميع الحقول المطلوبة');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const paymentData: CashPayment = {
      id: nextId,
      date: initialPayment ? initialPayment.date : new Date().toLocaleDateString('en-GB'),
      timestamp: initialPayment ? initialPayment.timestamp : Date.now(),
      amount: parseFloat(formData.amount),
      receiver: formData.receiver,
      description: formData.description,
      method: formData.method as any,
      costCenter: formData.costCenter
    };

    if (onSave) onSave(paymentData);

    setNotification(initialPayment ? 'تم تعديل السند بنجاح' : 'تم حفظ سند الصرف بنجاح');
    
    if (!initialPayment) {
        // Reset Form
        setFormData({
            amount: '',
            receiver: '',
            description: '',
            method: 'نقدي',
            costCenter: ''
        });
        setSearchTerm('');
        // Calculate optimistic next ID
        const num = parseInt(nextId.split('-')[1]) + 1;
        setNextId(`PAY-${num}`);
    }

    setTimeout(() => {
        setNotification(null);
        if (initialPayment && onCancel) onCancel();
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-6 font-sans animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 ${notification.includes('نجاح') ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.includes('نجاح') ? <CheckCircle size={20} /> : <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
          <span className="font-bold text-sm">{notification}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        
        {/* Header (Orange/Red Theme for Payments) */}
        <div className="flex flex-wrap justify-between items-center mb-6 bg-[#1e293b] p-5 rounded-2xl shadow-lg border-b border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-orange-500"></div>
            <div className="flex items-center gap-4">
                <div className="bg-orange-600/20 p-3 rounded-xl border border-orange-500/20">
                    <Wallet size={28} className="text-orange-400" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">{initialPayment ? 'تعديل سند دفع' : 'سند دفع نقدية'}</h1>
                    <p className="text-slate-400 text-xs font-bold">إدارة المصروفات والمدفوعات المالية</p>
                </div>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
                <div className="flex items-center gap-2 text-orange-400 font-bold text-sm bg-orange-900/20 px-3 py-1 rounded-lg border border-orange-500/20">
                    <Calendar size={14} />
                    {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-slate-500 text-[10px] font-mono text-center bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                    رقم السند: <span className="text-white font-bold tracking-wider">{nextId}</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-xl relative">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 block">المبلغ المدفوع</label>
                                <div className="relative group">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white font-black text-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-600"
                                    />
                                    <span className="absolute left-4 top-3.5 text-slate-500 font-bold text-xs group-focus-within:text-orange-500 transition-colors">EGP</span>
                                </div>
                            </div>
                            
                            {/* Receiver Search */}
                            <div className="space-y-1.5 relative" ref={dropdownRef}>
                                <label className="text-xs font-bold text-slate-400 block">اسم المدفوع له</label>
                                <div className="relative group">
                                    <input 
                                        ref={searchInputRef}
                                        type="text" 
                                        required
                                        value={searchTerm || formData.receiver}
                                        onChange={handleSearchChange}
                                        onFocus={() => setShowDropdown(true)}
                                        onKeyDown={handleSearchKeyDown}
                                        placeholder="ابحث أو اختر اسماً..."
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-600 font-bold text-sm"
                                        autoComplete="off"
                                    />
                                    <ChevronDown className="absolute left-3 top-3.5 text-slate-500 pointer-events-none transition-transform group-focus-within:rotate-180" size={16} />
                                </div>
                                
                                {/* Dropdown */}
                                {showDropdown && (
                                    <div className="absolute w-full mt-1 bg-[#0f172a] border border-slate-600 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {filteredReceivers.length > 0 ? (
                                            filteredReceivers.map((item, idx) => (
                                                <div 
                                                    key={item.id}
                                                    onClick={() => selectReceiver(item.name)}
                                                    className={`px-4 py-3 cursor-pointer text-sm font-medium border-b border-slate-800 last:border-0 flex justify-between items-center transition-colors
                                                        ${idx === highlightedIndex ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'}
                                                    `}
                                                >
                                                    <span>{item.name}</span>
                                                    <span className={`text-[10px] ${idx === highlightedIndex ? 'text-orange-200' : 'text-slate-500'}`}>{item.phone}</span>
                                                </div>
                                            ))
                                        ) : (
                                            searchTerm && (
                                                <div 
                                                    className="px-4 py-3 cursor-pointer text-sm text-orange-400 hover:bg-slate-800 font-bold border-t border-slate-700"
                                                    onClick={() => { selectReceiver(searchTerm); setShowDropdown(false); }}
                                                >
                                                    + إضافة "{searchTerm}" كمستفيد جديد
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 block">وذلك عن (البيان)</label>
                            <div className="relative">
                                <textarea 
                                    rows={2}
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-600 text-sm font-medium resize-none"
                                    placeholder="شرح تفصيلي للعملية (سداد فاتورة، مصروفات، إلخ)..."
                                ></textarea>
                                <FileText className="absolute left-3 top-3 text-slate-600 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Payment Method */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 block">طريقة الدفع</label>
                                <div className="relative group">
                                    <select 
                                        value={formData.method}
                                        onChange={e => setFormData({...formData, method: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none cursor-pointer font-bold text-sm"
                                    >
                                        <option value="نقدي">نقدي (Cash)</option>
                                        <option value="شيك">شيك (Check)</option>
                                        <option value="تحويل بنكي">تحويل بنكي (Transfer)</option>
                                    </select>
                                    <CreditCard className="absolute left-3 top-3.5 text-slate-500 pointer-events-none group-focus-within:text-orange-500 transition-colors" size={16} />
                                </div>
                            </div>

                            {/* Cost Center */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 block">مركز التكلفة (اختياري)</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={formData.costCenter}
                                        onChange={e => setFormData({...formData, costCenter: e.target.value})}
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-600 text-sm"
                                        placeholder="مثال: المصروفات العمومية"
                                    />
                                    <Building2 className="absolute left-3 top-3.5 text-slate-500 pointer-events-none group-focus-within:text-orange-500 transition-colors" size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button 
                                type="submit" 
                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-900/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {initialPayment ? 'حفظ التعديلات' : 'حفظ السند'}
                            </button>
                            {initialPayment && (
                                <button 
                                    type="button" 
                                    onClick={onCancel}
                                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl transition-all border border-red-500 flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} />
                                    إلغاء
                                </button>
                            )}
                            {!initialPayment && (
                                <button 
                                    type="button" 
                                    onClick={() => window.print()}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-all border border-slate-600 flex items-center justify-center"
                                >
                                    <Printer size={18} />
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-orange-900 via-red-900 to-orange-900 p-6 rounded-2xl text-white shadow-xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
                    <h3 className="font-bold text-xs mb-2 text-orange-200 uppercase tracking-wider flex items-center gap-2">
                        <History size={14} />
                        سند صرف جديد
                    </h3>
                    <p className="text-xs text-orange-300 leading-relaxed">
                        يتم استخدام سند الصرف لإخراج مبالغ نقدية من الخزينة لسداد موردين، مصروفات تشغيلية، أو رواتب.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
