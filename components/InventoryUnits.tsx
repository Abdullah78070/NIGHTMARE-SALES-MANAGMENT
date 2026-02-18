import React, { useState } from 'react';
import { Package, Trash2, Plus, Search } from 'lucide-react';

interface Props {
  units: string[];
  onAdd: (unit: string) => void;
  onRemove: (unit: string) => void;
}

export const InventoryUnits: React.FC<Props> = ({ units, onAdd, onRemove }) => {
  const [newUnit, setNewUnit] = useState('');
  const [filter, setFilter] = useState('');

  const handleAdd = () => {
    if (newUnit.trim()) {
      onAdd(newUnit.trim());
      setNewUnit('');
    }
  };

  const filteredUnits = units.filter(u => u.includes(filter));

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)] animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl w-full max-w-md rounded-2xl overflow-hidden p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black flex items-center gap-2 text-white">
            <Package className="text-blue-500" size={24} />
            إدارة وحدات القياس
          </h1>
          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-bold">
            {units.length} وحدة
          </span>
        </div>

        {/* Add Unit Form */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">اسم الوحدة الجديدة</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="bg-slate-950/60 border border-slate-700 flex-1 p-2.5 rounded-xl text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600" 
                placeholder="مثلاً: كرتونة، لتر، متر..." 
                autoFocus
              />
              <button 
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                إضافة
              </button>
            </div>
          </div>
        </div>

        {/* Units List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-300">الوحدات المسجلة</h2>
            <div className="relative">
                <input 
                    type="text" 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="بحث..." 
                    className="bg-transparent border-none text-xs text-blue-400 focus:outline-none w-24 text-left placeholder:text-slate-600" 
                />
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 min-h-[100px] custom-scrollbar">
            {filteredUnits.length > 0 ? (
                filteredUnits.map((unit) => (
                    <div key={unit} className="bg-slate-800/40 border border-white/5 flex items-center justify-between p-3 rounded-xl group hover:bg-slate-800/80 hover:translate-x-[-5px] transition-all">
                        <span className="text-sm font-medium text-gray-200">{unit}</span>
                        <button 
                            onClick={() => onRemove(unit)}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 text-slate-600 text-xs">لا توجد وحدات مطابقة</div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500">سيتم تفعيل هذه الوحدات تلقائياً في شاشة إضافة الأصناف</p>
        </div>
      </div>
    </div>
  );
};