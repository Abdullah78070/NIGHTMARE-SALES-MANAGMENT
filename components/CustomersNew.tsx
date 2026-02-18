
import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, 
  Save, 
  XCircle, 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  CreditCard, 
  Clock, 
  IdCard,
  Briefcase,
  Camera,
  CheckCircle,
  CalendarDays,
  CalendarCheck,
  DollarSign,
  AlertCircle,
  Edit
} from 'lucide-react';
import { Customer } from '../types';

interface Props {
  initialCustomer?: Customer | null;
  onSave?: (customer: Customer) => void;
  onCancel?: () => void;
  nextCode?: string; // Prop for sequential code
}

export const CustomersNew: React.FC<Props> = ({ initialCustomer, onSave, onCancel, nextCode }) => {
  const [formData, setFormData] = useState({
    code: nextCode || 'CUS-1001',
    name: '',
    type: 'individual' as 'individual' | 'company',
    phone: '',
    email: '',
    address: '',
    creditLimit: 0,
    paymentDays: 30,
    paymentCycle: 'monthly' as 'monthly' | 'daily' | 'weekly' | 'quarterly',
    collectionDay: '1', 
    notes: '',
    photo: null as string | null
  });

  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form if editing
  useEffect(() => {
    if (initialCustomer) {
      setFormData({
        code: initialCustomer.code,
        name: initialCustomer.name,
        type: initialCustomer.type,
        phone: initialCustomer.phone || '',
        email: initialCustomer.email || '',
        address: initialCustomer.address || '',
        creditLimit: initialCustomer.creditLimit || 0,
        paymentDays: initialCustomer.paymentDays || 30,
        paymentCycle: initialCustomer.paymentCycle || 'monthly',
        collectionDay: initialCustomer.collectionDay || '1',
        notes: initialCustomer.notes || '',
        photo: initialCustomer.photo || null
      });
    } else if (nextCode) {
        setFormData(prev => ({ ...prev, code: nextCode }));
    }
  }, [initialCustomer, nextCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("يرجى إدخال اسم العميل");
      return;
    }

    if (onSave) {
      const customerToSave: Customer = {
        id: initialCustomer ? initialCustomer.id : Date.now(), // Preserve ID if editing
        ...formData,
        balance: initialCustomer ? initialCustomer.balance : 0 // Preserve balance
      };
      onSave(customerToSave);
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (onCancel) onCancel(); // Go back after save
    }, 1500);
  };

  const weekDays = [
    { id: 'Saturday', name: 'السبت' },
    { id: 'Sunday', name: 'الأحد' },
    { id: 'Monday', name: 'الاثنين' },
    { id: 'Tuesday', name: 'الثلاثاء' },
    { id: 'Wednesday', name: 'الأربعاء' },
    { id: 'Thursday', name: 'الخميس' },
    { id: 'Friday', name: 'الجمعة' },
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] p-2 md:p-6 font-sans text-xs select-none animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/20">
              {initialCustomer ? <Edit className="text-blue-400" size={28} /> : <UserPlus className="text-blue-400" size={28} />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-1">
                {initialCustomer ? `تعديل بيانات العميل: ${initialCustomer.name}` : 'بطاقة تعريف عميل جديد'}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {initialCustomer ? 'تحديث البيانات والسياسات المالية للعميل' : 'إضافة عميل جديد إلى قاعدة البيانات وتحديد السياسات المالية'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-bold transition-all border border-white/5"
            >
              <XCircle size={16} />
              <span>إلغاء</span>
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              <Save size={16} />
              <span>{initialCustomer ? 'حفظ التعديلات' : 'حفظ البيانات'}</span>
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <CheckCircle size={20} />
            <span className="font-bold text-sm">تم حفظ بيانات العميل بنجاح!</span>
          </div>
        )}

        <form className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Right Column: Photo & Type */}
          <div className="space-y-6">
            <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 shadow-lg flex flex-col items-center relative overflow-hidden">
              <div 
                className="w-32 h-32 bg-[#0f172a] rounded-full border-4 border-[#1e293b] shadow-2xl flex items-center justify-center relative mb-6 group cursor-pointer overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.photo ? (
                    <img src={formData.photo} alt="صورة العميل" className="w-full h-full object-cover" />
                ) : (
                    <User size={60} className="text-slate-600 group-hover:text-slate-500 transition-colors" />
                )}
                
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                </div>
                
                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute bottom-1 right-1 bg-blue-600 p-2.5 rounded-full text-white shadow-lg hover:bg-blue-500 transition-colors border-4 border-[#1e293b] z-10">
                  <Camera size={14} />
                </button>
              </div>
              
              <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*" 
                 onChange={handlePhotoUpload}
              />

              <div className="text-center w-full">
                <div className="bg-[#0f172a] py-2 px-4 rounded-lg border border-white/5 mb-2 inline-block">
                    <p className="font-mono text-lg font-bold text-blue-400 tracking-wider">{formData.code}</p>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">كود العميل</p>
              </div>
            </div>

            <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
              <h3 className="font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-500" />
                تصنيف العميل
              </h3>
              <div className="space-y-3">
                {['individual', 'company'].map(type => (
                  <label key={type} className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${formData.type === type ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-[#0f172a] hover:border-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.type === type ? 'border-blue-500' : 'border-slate-600'}`}>
                          {formData.type === type && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <span className={`font-bold text-sm ${formData.type === type ? 'text-white' : 'text-slate-400'}`}>
                        {type === 'individual' ? 'عميل فردي' : 'شركة / مؤسسة'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Left Columns: Main Info */}
          <div className="md:col-span-2 space-y-6">
            
            {/* القسم الأول: البيانات الأساسية */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="font-bold text-white border-b border-white/5 pb-4 mb-6 flex items-center gap-2 text-base">
                <IdCard size={18} className="text-blue-500" />
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    اسم العميل بالكامل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 text-white font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600"
                      placeholder="أدخل الاسم رباعي..."
                      required
                    />
                    <User className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    رقم الهاتف المحمول
                  </label>
                  <div className="relative group">
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 text-white font-mono font-bold outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                      placeholder="01xxxxxxxxx"
                    />
                    <Phone className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    البريد الإلكتروني
                  </label>
                  <div className="relative group">
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 text-white font-bold outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                      placeholder="example@mail.com"
                    />
                    <Mail className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    العنوان التفصيلي
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 text-white font-bold outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                      placeholder="المدينة، الشارع، رقم المبنى..."
                    />
                    <MapPin className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الثاني: البيانات المالية */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="font-bold text-white border-b border-white/5 pb-4 mb-6 flex items-center gap-2 text-base">
                <CreditCard size={18} className="text-emerald-500" />
                السياسة الائتمانية ومواعيد السداد
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    حد الائتمان (المديونية)
                  </label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <DollarSign className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    دورية السداد المتفق عليها
                  </label>
                  <div className="relative group">
                    <select 
                      name="paymentCycle"
                      value={formData.paymentCycle}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 font-bold text-white outline-none appearance-none cursor-pointer focus:border-blue-500"
                    >
                      <option value="daily">يومي</option>
                      <option value="weekly">أسبوعي</option>
                      <option value="monthly">شهري</option>
                      <option value="quarterly">ربع سنوي</option>
                    </select>
                    <CalendarDays className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-blue-500 pointer-events-none transition-colors" size={18} />
                  </div>
                </div>

                {/* الحقل الجديد: موعد التحصيل الثابت */}
                {(formData.paymentCycle === 'weekly' || formData.paymentCycle === 'monthly') && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-1 bg-[#0f172a]/50 p-4 rounded-xl border border-amber-500/20">
                    <label className="text-amber-400 text-[11px] font-bold flex items-center gap-1.5">
                      <CalendarCheck size={14} />
                      {formData.paymentCycle === 'weekly' ? 'يوم التحصيل الأسبوعي الثابت' : 'يوم التحصيل الشهري (تاريخ اليوم)'}
                    </label>
                    
                    <div className="relative group mt-2">
                      {formData.paymentCycle === 'weekly' ? (
                        <select 
                          name="collectionDay"
                          value={formData.collectionDay}
                          onChange={handleChange}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 font-bold text-amber-400 outline-none appearance-none cursor-pointer focus:border-amber-500"
                        >
                          {weekDays.map(day => (
                            <option key={day.id} value={day.id}>{day.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="number" 
                          name="collectionDay"
                          min="1"
                          max="31"
                          value={formData.collectionDay}
                          onChange={handleChange}
                          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 font-black text-amber-400 outline-none focus:border-amber-500"
                          placeholder="يوم 1 مثلاً..."
                        />
                      )}
                      <CalendarDays className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-amber-500 pointer-events-none transition-colors" size={18} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-2 flex items-center gap-1">
                        <AlertCircle size={10} />
                        سيقوم النظام بجدولة المطالبات المالية تلقائياً بناءً على هذا اليوم.
                    </p>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <label className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                    فترة السماح القصوى (يوم)
                  </label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      name="paymentDays"
                      value={formData.paymentDays}
                      onChange={handleChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 pr-10 font-black text-white outline-none focus:border-blue-500 transition-colors"
                    />
                    <Clock className="absolute right-3.5 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الثالث: ملاحظات */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg">
               <div className="flex gap-2 mb-3 items-center">
                <AlertCircle size={16} className="text-amber-500" />
                <span className="font-bold text-slate-300">ملاحظات إضافية</span>
               </div>
               <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-xs font-medium text-slate-300 min-h-[100px] outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 resize-none"
                placeholder="أدخل أي ملاحظات خاصة بالتعامل مع هذا العميل..."
               ></textarea>
            </div>

          </div>
        </form>
      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; margin: 0; 
        }
      `}</style>
    </div>
  );
};
