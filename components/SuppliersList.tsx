
import React, { useState, useEffect, useRef } from 'react';
import { 
  Factory, Search, PlusCircle, Download, Edit3, Trash2, Phone, 
  ArrowUpDown, Building, User, FileText
} from 'lucide-react';
import { Supplier } from '../types';

interface Props {
  suppliers: Supplier[];
  onEdit?: (supplier: Supplier) => void;
  onAdd?: () => void;
  onDelete?: (id: number) => void;
  initialSelectedId?: number;
}

export const SuppliersList: React.FC<Props> = ({ suppliers, onEdit, onAdd, onDelete, initialSelectedId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number>(initialSelectedId || (suppliers.length > 0 ? suppliers[0].id : 0));
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
      if (initialSelectedId) {
          setSelectedId(initialSelectedId);
          setTimeout(() => scrollIntoView(initialSelectedId), 100);
      }
  }, [initialSelectedId]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.includes(searchTerm) || s.code.includes(searchTerm) || s.phone.includes(searchTerm)
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredSuppliers.length === 0) return;

      const currentIndex = filteredSuppliers.findIndex(s => s.id === selectedId);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % filteredSuppliers.length;
        const nextId = filteredSuppliers[nextIndex].id;
        setSelectedId(nextId);
        scrollIntoView(nextId);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + filteredSuppliers.length) % filteredSuppliers.length;
        const prevId = filteredSuppliers[prevIndex].id;
        setSelectedId(prevId);
        scrollIntoView(prevId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (onEdit) {
            const supplier = filteredSuppliers.find(s => s.id === selectedId);
            if (supplier) onEdit(supplier);
        }
      } else if (e.key === 'Delete') {
          e.preventDefault();
          if (onDelete && selectedId) {
              const supplier = filteredSuppliers.find(s => s.id === selectedId);
              if (supplier && window.confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
                  onDelete(selectedId);
              }
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, filteredSuppliers, onEdit, onDelete]);

  const scrollIntoView = (id: number) => {
    const element = document.getElementById(`supplier-row-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleRowClick = (id: number) => {
      setSelectedId(id);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-xs animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1e293b] p-4 rounded-xl border border-white/5 shadow-xl mb-4 shrink-0">
         <div className="flex items-center gap-3">
            <div className="bg-amber-600/20 p-2.5 rounded-lg text-amber-400 border border-amber-500/20 shadow-lg">
              <Factory size={24} />
            </div>
            <div>
              <h1 className="text-base font-black text-white">قائمة الموردين</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">الشركات والجهات الموردة</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md mr-auto">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="بحث سريع (الاسم، الكود، الهاتف)..." 
                className="w-full bg-[#0f172a] border border-slate-700 p-2.5 pr-10 rounded-lg outline-none focus:border-amber-500 font-bold text-sm text-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-3 text-slate-500" size={18} />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg font-black transition-all shadow-lg shadow-amber-900/20 active:scale-95"
            >
              <PlusCircle size={16} />
              <span>إضافة مورد</span>
            </button>
            <button className="p-2.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all">
              <Download size={18} />
            </button>
          </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl shadow-2xl border border-white/5 flex flex-col flex-1 overflow-hidden relative">
        <div className="bg-[#0f172a] p-2 text-center text-amber-400 font-bold border-b border-white/5 flex justify-center items-center gap-2 text-[10px] shrink-0">
          <ArrowUpDown size={12} />
          تصفح القائمة بالكامل (استخدم الأسهم ↕ للتنقل السريع - Enter للتعديل)
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={tableContainerRef}>
          <table className="w-full text-right border-collapse">
            <thead className="bg-[#161e2e] text-slate-400 font-bold border-b border-white/5 sticky top-0 z-20 shadow-md">
              <tr>
                <th className="p-4 text-center w-24">كود</th>
                <th className="p-4">اسم المورد</th>
                <th className="p-4">رقم الهاتف</th>
                <th className="p-4 text-center">الرقم الضريبي</th>
                <th className="p-4 text-left">الرصيد (دائن)</th>
                <th className="p-4 text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSuppliers.map((s) => (
                <tr 
                  key={s.id} 
                  id={`supplier-row-${s.id}`}
                  onClick={() => handleRowClick(s.id)}
                  onDoubleClick={() => onEdit && onEdit(s)}
                  className={`cursor-pointer transition-all group ${
                    selectedId === s.id 
                    ? 'bg-amber-600/10 border-l-4 border-l-amber-500' 
                    : 'hover:bg-white/5 border-l-4 border-l-transparent'
                  }`}
                >
                  <td className="p-4 text-center">
                      <span className={`font-mono font-bold tracking-tighter ${selectedId === s.id ? 'text-amber-400' : 'text-slate-500'}`}>
                          {s.code}
                      </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border overflow-hidden ${
                          selectedId === s.id 
                          ? 'bg-amber-600 text-white border-amber-500' 
                          : 'bg-[#0f172a] text-slate-400 border-slate-700'
                      }`}>
                        {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${selectedId === s.id ? 'text-white' : 'text-slate-200'}`}>{s.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            {s.type === 'company' ? <Building size={10} className="text-slate-500"/> : <User size={10} className="text-slate-500"/>}
                            <p className={`text-[10px] font-bold ${selectedId === s.id ? 'text-amber-300' : 'text-slate-500'}`}>
                                {s.type === 'company' ? 'شركة / مصنع' : 'فردي'}
                            </p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className={selectedId === s.id ? 'text-amber-400' : 'text-slate-600'} />
                      <span className="text-slate-300">{s.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-slate-400 font-mono text-xs">{s.taxNumber || '-'}</span>
                  </td>
                  <td className="p-4 text-left font-black">
                    <span className={`text-sm ${
                        s.balance > 0 
                        ? 'text-red-400' 
                        : 'text-slate-300'
                    }`}>
                      {s.balance.toLocaleString()} <span className="text-[10px] opacity-70">EGP</span>
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        title="تعديل" 
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(s); }}
                        className="p-2 rounded hover:bg-blue-600 hover:text-white bg-slate-800 text-blue-400 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        title="حذف" 
                        onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(s.id); }}
                        className="p-2 rounded hover:bg-red-600 hover:text-white bg-slate-800 text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                  <tr>
                      <td colSpan={6} className="text-center py-20 text-slate-500">لا توجد نتائج مطابقة للبحث</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="bg-[#0f172a] p-3 border-t border-white/5 text-center font-bold text-slate-400 text-xs shrink-0 flex justify-between px-6">
           <span>إجمالي عدد الموردين: <span className="text-white">{filteredSuppliers.length}</span></span>
        </div>
      </div>
    </div>
  );
};
