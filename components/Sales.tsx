
import React, { useState } from 'react';
import { InventoryItem, CartItem, SalesInvoice, Customer, SalesRow } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, ChevronDown, User, Search } from 'lucide-react';

interface SalesProps {
  inventory: InventoryItem[];
  customers: Customer[];
  nextId: number;
  onSave?: (invoice: SalesInvoice) => void;
}

export const Sales: React.FC<SalesProps> = ({ inventory, customers, nextId, onSave }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('الكل');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['الكل', ...Array.from(new Set(inventory.map(i => i.category)))];

  const filteredInventory = inventory.filter(i => {
      const matchCat = activeCategory === 'الكل' || i.category === activeCategory;
      const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.code.includes(searchTerm);
      return matchCat && matchSearch;
  });

  const addToCart = (item: InventoryItem) => {
    if (item.actualStock <= 0) {
        alert("الكمية نفذت من المخزن");
        return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedUnit === 'major'); 
      if (existing) {
        if (existing.quantity >= item.actualStock) {
            alert("لا توجد كمية كافية في المخزن");
            return prev;
        }
        return prev.map(i => i.id === item.id && i.selectedUnit === 'major' ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedUnit: 'major' }];
    });
  };

  const updateQty = (id: string, selectedUnit: 'major' | 'minor', delta: number) => {
    setCart(prev => prev.map(cartItem => {
      if (cartItem.id === id && cartItem.selectedUnit === selectedUnit) {
        const itemInInventory = inventory.find(i => i.id === id);
        
        if (delta > 0 && itemInInventory) {
            // Check Stock Limit
            // Simplify logic: Treat cart qty as absolute for now relative to stock
            // In complex scenario, handle unit conversion
            if (cartItem.quantity + delta > itemInInventory.actualStock) {
                alert("تم الوصول للحد الأقصى للرصيد المتاح");
                return cartItem; 
            }
        }

        const newQty = Math.max(0, cartItem.quantity + delta);
        return { ...cartItem, quantity: newQty };
      }
      return cartItem;
    }).filter(i => i.quantity > 0));
  };

  const toggleUnit = (id: string, currentUnit: 'major' | 'minor') => {
      setCart(prev => prev.map(item => {
          if (item.id === id && item.selectedUnit === currentUnit) {
              const newUnit = currentUnit === 'major' ? 'minor' : 'major';
              return { ...item, selectedUnit: newUnit };
          }
          return item;
      }));
  }

  // Calculate price based on the selected unit and the factor
  const getPrice = (item: CartItem) => {
      if (item.selectedUnit === 'major') {
          return item.priceMajor;
      } else {
          // Safety check for division by zero
          const factor = item.factor && item.factor > 0 ? item.factor : 1;
          // Prefer explicit minor price if set, otherwise calculate from major
          return item.priceMinor > 0 ? item.priceMinor : (item.priceMajor / factor);
      }
  };

  const total = cart.reduce((sum, item) => sum + (getPrice(item) * item.quantity), 0);
  const tax = total * 0; // Tax Logic if needed
  const grandTotal = total + tax;

  const handleCheckout = (paymentType: 'نقدي' | 'آجل') => {
      if (cart.length === 0) {
          alert('السلة فارغة');
          return;
      }

      if (paymentType === 'آجل' && !selectedCustomer) {
          alert('يجب اختيار عميل للبيع الآجل');
          return;
      }

      // Transform Cart to SalesRows
      const rows: SalesRow[] = cart.map(item => ({
          id: Date.now() + Math.random(),
          itemId: item.id,
          code: item.code,
          name: item.name,
          unit: item.selectedUnit === 'major' ? item.majorUnit : (item.minorUnit || item.majorUnit),
          qty: item.quantity,
          price: getPrice(item),
          discount: 0,
          location: item.location
      }));

      const invoice: SalesInvoice = {
          id: nextId.toString(),
          date: new Date().toLocaleDateString('en-GB'),
          customerName: selectedCustomer || 'عميل نقدي',
          amount: grandTotal,
          status: 'مكتمل',
          paymentType: paymentType,
          rows: rows,
          discountValue: 0,
          discountType: 'value',
          extraValue: 0
      };

      if (onSave) {
          onSave(invoice);
          setCart([]);
          setSelectedCustomer('');
          alert('تم حفظ الفاتورة بنجاح!');
      }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      
      {/* Products Grid */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Search & Categories */}
        <div className="bg-[#1e293b] p-3 rounded-xl border border-white/5 flex flex-col gap-3 shadow-lg">
            <div className="relative">
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="بحث سريع عن صنف..."
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg py-2 pl-4 pr-10 text-white focus:border-blue-500 outline-none"
                />
                <Search className="absolute right-3 top-2.5 text-slate-500" size={18} />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map(cat => (
                <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-lg whitespace-nowrap text-xs font-bold transition-all border ${
                    activeCategory === cat 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-700'
                }`}
                >
                {cat}
                </button>
            ))}
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {filteredInventory.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.actualStock <= 0}
                className={`bg-slate-900 border border-white/5 p-4 rounded-xl flex flex-col items-start gap-2 transition-all text-right group relative overflow-hidden
                    ${item.actualStock <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-blue-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-blue-900/10 active:scale-95'}
                `}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">{item.code}</span>
                <h3 className="font-bold text-gray-200 line-clamp-2 text-sm h-10 leading-relaxed">{item.name}</h3>
                <div className="mt-auto pt-2 w-full flex justify-between items-end">
                  <div className="flex flex-col">
                      <span className={`text-[10px] font-bold ${item.actualStock <= 0 ? 'text-red-500' : 'text-slate-500'}`}>
                          {item.actualStock <= 0 ? 'نفذت الكمية' : `مخزون: ${item.actualStock}`}
                      </span>
                      {item.hasSubUnits && <span className="text-[9px] text-gray-600">{item.majorUnit} = {item.factor} {item.minorUnit}</span>}
                  </div>
                  <span className="font-black text-lg text-emerald-400">{item.priceMajor.toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-slate-900 border border-white/5 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden">
        
        {/* Cart Header & Customer */}
        <div className="p-4 border-b border-white/5 bg-[#161e2e] space-y-3">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                    <ShoppingCart className="text-blue-500" size={20} />
                    سلة المبيعات <span className="text-xs text-slate-500 font-mono">#{nextId}</span>
                </h2>
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">{cart.length}</span>
            </div>
            
            <div className="relative">
                <select 
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-blue-500 appearance-none cursor-pointer font-bold"
                >
                    <option value="">عميل نقدي (افتراضي)</option>
                    {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <User size={14} className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
            </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0b111d]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3 opacity-50">
              <ShoppingCart size={48} strokeWidth={1.5} />
              <p className="text-sm font-bold">السلة فارغة، أضف أصناف</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.id}-${item.selectedUnit}`} className="bg-[#161e2e] p-3 rounded-lg border border-white/5 flex justify-between items-center group hover:border-white/10 transition-colors shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white mb-1 truncate">{item.name}</div>
                  <div className="flex items-center gap-2">
                      <div className="text-xs text-blue-400 font-mono font-bold">
                          {getPrice(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                      </div>
                      
                      {/* Unit Toggle Button */}
                      {item.hasSubUnits && (
                          <button 
                            onClick={() => toggleUnit(item.id, item.selectedUnit)}
                            className="bg-slate-800 text-[9px] px-2 py-0.5 rounded text-emerald-400 hover:text-white flex items-center gap-1 border border-white/10 transition-colors ml-2"
                            title="تغيير الوحدة (كبير/صغير)"
                          >
                              {item.selectedUnit === 'major' ? item.majorUnit : item.minorUnit}
                              <ChevronDown size={10} />
                          </button>
                      )}
                      {!item.hasSubUnits && (
                          <span className="text-[10px] text-gray-500 ml-2">{item.majorUnit}</span>
                      )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-[#0f172a] rounded-lg p-1 border border-white/5">
                   <button onClick={() => updateQty(item.id, item.selectedUnit, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-emerald-500/20 rounded text-emerald-500 transition"><Plus size={12} /></button>
                   <span className="font-bold text-white w-6 text-center text-sm">{item.quantity}</span>
                   <button onClick={() => updateQty(item.id, item.selectedUnit, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-red-500/20 rounded text-red-500 transition"><Minus size={12} /></button>
                </div>
                
                <div className="mr-3 font-bold text-white w-16 text-left font-mono text-sm">
                    {(getPrice(item) * item.quantity).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totals & Actions */}
        <div className="p-5 bg-[#161e2e] border-t border-white/5 space-y-4 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400 text-xs">
              <span>المجموع</span>
              <span className="font-mono">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-white pt-2 border-t border-white/10">
              <span>الإجمالي النهائي</span>
              <span className="text-emerald-400 font-mono tracking-wide">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500">EGP</span></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => handleCheckout('آجل')}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              <CreditCard size={18} />
              بيع آجل (شبكة)
            </button>
            <button 
                onClick={() => handleCheckout('نقدي')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
            >
              <Banknote size={18} />
              دفع نقدي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
