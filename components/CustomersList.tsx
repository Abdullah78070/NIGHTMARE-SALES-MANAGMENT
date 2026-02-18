
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Search, UserPlus, Download, Edit3, Trash2, Phone, 
  ArrowUpDown, CalendarDays, Building2, User
} from 'lucide-react';
import { Customer } from '../types';

interface Props {
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
  onAdd?: () => void;
  onDelete?: (id: number) => void;
  initialSelectedId?: number;
  onSelect?: (id: number) => void;
}

export const CustomersList: React.FC<Props> = ({ customers, onEdit, onAdd, onDelete, initialSelectedId, onSelect }) => {
  // --- State Management ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number>(initialSelectedId || (customers.length > 0 ? customers[0].id : 0));
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Update internal state if props change (e.g. returning from edit)
  useEffect(() => {
      if (initialSelectedId) {
          setSelectedId(initialSelectedId);
          setTimeout(() => scrollIntoView(initialSelectedId), 100);
      }
  }, [initialSelectedId]);

  // Filter Logic
  const filteredCustomers = customers.filter(c => 
    c.name.includes(searchTerm) || c.code.includes(searchTerm) || c.phone.includes(searchTerm)
  );

  // --- Keyboard Navigation Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if there are items
      if (filteredCustomers.length === 0) return;

      const currentIndex = filteredCustomers.findIndex(c => c.id === selectedId);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % filteredCustomers.length;
        const nextId = filteredCustomers[nextIndex].id;
        setSelectedId(nextId);
        if (onSelect) onSelect(nextId);
        scrollIntoView(nextId);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + filteredCustomers.length) % filteredCustomers.length;
        const prevId = filteredCustomers[prevIndex].id;
        setSelectedId(prevId);
        if (onSelect) onSelect(prevId);
        scrollIntoView(prevId);
      } else if (e.key === 'Enter') {
        // Trigger Edit on Enter
        e.preventDefault();
        if (onEdit) {
            const customer = filteredCustomers.find(c => c.id === selectedId);
            if (customer) onEdit(customer);
        }
      } else if (e.key === 'Delete') {
          e.preventDefault();
          if (onDelete && selectedId) {
              const customer = filteredCustomers.find(c => c.id === selectedId);
              if (customer && window.confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
                  onDelete(selectedId);
              }
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, filteredCustomers, onEdit, onDelete, onSelect]);

  const scrollIntoView = (id: number) => {
    const element = document.getElementById(`customer-row-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const getDayLabel = (cycle: string, day: string) => {
    if (cycle === 'weekly') {
      const days: Record<string, string> = { Saturday: 'السبت', Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة' };
      return days[day] || day;
    }
    return `يوم ${day}`;
  };

  const handleRowClick = (id: number) => {
      setSelectedId(id);
      if (onSelect) onSelect(id);
  };

  const handleDeleteClick = (e: React.MouseEvent, customer: Customer) => {
      e.stopPropagation();
      if (window.confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
          if (onDelete) onDelete(customer.id);
      }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-xs animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-xl mb-4 shrink-0">
         <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-lg text-blue-400 border border-blue-500/20 shadow-lg">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-base font-black text-white">قائمة العملاء</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">دليل شامل لكافة العملاء</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md mr-auto">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="بحث سريع (الاسم، الكود، الهاتف)..." 
                className="w-full bg-[#0f172a] border border-slate-700 p-2.5 pr-10 rounded-lg outline-none focus:border-blue-500 font-bold text-sm text-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-3 text-slate-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-black transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              <UserPlus size={16} />
              <span>إضافة عميل</span>
            </button>
            <button className="p-2.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all">
              <Download size={18} />
            </button>
          </div>
      </div>

      {/* Customer List Table - Continuous Scrolling */}
      <div className="bg-[#1e293b] rounded-xl shadow-2xl border border-white/5 flex flex-col flex-1 overflow-hidden relative">
        <div className="bg-[#0f172a] p-2 text-center text-blue-400 font-bold border-b border-white/5 flex justify-center items-center gap-2 text-[10px] shrink-0">
          <ArrowUpDown size={12} />
          تصفح القائمة بالكامل (استخدم الأسهم ↕ للتنقل السريع - Enter للتعديل - Delete للحذف)
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={tableContainerRef}>
          <table className="w-full text-right border-collapse">
            <thead className="bg-[#161e2e] text-slate-400 font-bold border-b border-white/5 sticky top-0 z-20 shadow-md">
              <tr>
                <th className="p-4 text-center w-24">كود</th>
                <th className="p-4">اسم العميل</th>
                <th className="p-4">رقم الهاتف</th>
                <th className="p-4 text-center">دورية السداد</th>
                <th className="p-4 text-center">موعد التحصيل</th>
                <th className="p-4 text-left">الرصيد الحالي</th>
                <th className="p-4 text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCustomers.map((c) => (
                <tr 
                  key={c.id} 
                  id={`customer-row-${c.id}`}
                  onClick={() => handleRowClick(c.id)}
                  onDoubleClick={() => onEdit && onEdit(c)}
                  className={`cursor-pointer transition-all group ${
                    selectedId === c.id 
                    ? 'bg-blue-600/10 border-l-4 border-l-blue-500' 
                    : 'hover:bg-white/5 border-l-4 border-l-transparent'
                  }`}
                >
                  <td className="p-4 text-center">
                      <span className={`font-mono font-bold tracking-tighter ${selectedId === c.id ? 'text-blue-400' : 'text-slate-500'}`}>
                          {c.code}
                      </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border overflow-hidden ${
                          selectedId === c.id 
                          ? 'bg-blue-600 text-white border-blue-500' 
                          : 'bg-[#0f172a] text-slate-400 border-slate-700'
                      }`}>
                        {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${selectedId === c.id ? 'text-white' : 'text-slate-200'}`}>{c.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            {c.type === 'company' ? <Building2 size={10} className="text-slate-500"/> : <User size={10} className="text-slate-500"/>}
                            <p className={`text-[10px] font-bold ${selectedId === c.id ? 'text-blue-300' : 'text-slate-500'}`}>
                                {c.type === 'company' ? 'شركة / مؤسسة' : 'عميل فردي'}
                            </p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className={selectedId === c.id ? 'text-blue-400' : 'text-slate-600'} />
                      <span className="text-slate-300">{c.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        selectedId === c.id 
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {c.paymentCycle === 'monthly' ? 'شهري' : 'أسبوعي'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                     <div className={`flex items-center justify-center gap-2 font-bold text-xs ${selectedId === c.id ? 'text-white' : 'text-amber-500'}`}>
                       <CalendarDays size={14} className="opacity-70" />
                       {getDayLabel(c.paymentCycle, c.collectionDay)}
                     </div>
                  </td>
                  <td className="p-4 text-left font-black">
                    <span className={`text-sm ${
                        c.balance > 5000 
                        ? 'text-red-400' 
                        : c.balance < 0 
                            ? 'text-green-400' 
                            : 'text-slate-300'
                    }`}>
                      {c.balance.toLocaleString()} <span className="text-[10px] opacity-70">EGP</span>
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        title="تعديل" 
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(c); }}
                        className="p-2 rounded hover:bg-blue-600 hover:text-white bg-slate-800 text-blue-400 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        title="حذف" 
                        onClick={(e) => handleDeleteClick(e, c)}
                        className="p-2 rounded hover:bg-red-600 hover:text-white bg-slate-800 text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-500">لا توجد نتائج مطابقة للبحث</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer showing total count */}
        <div className="bg-[#0f172a] p-3 border-t border-white/5 text-center font-bold text-slate-400 text-xs shrink-0 flex justify-between px-6">
           <span>إجمالي عدد العملاء: <span className="text-white">{filteredCustomers.length}</span></span>
           <div className="flex gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> نشط</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> مديونية</span>
           </div>
        </div>
      </div>
    </div>
  );
};
