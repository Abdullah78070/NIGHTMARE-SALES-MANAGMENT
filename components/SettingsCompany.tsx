
import React, { useRef, useState } from 'react';
import { CompanyInfo, PrintSettings } from '../types';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Upload, 
  Printer, 
  Save, 
  CheckCircle, 
  Image as ImageIcon,
  Trash2,
  LayoutTemplate,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface Props {
  companyInfo: CompanyInfo;
  onSave: (info: CompanyInfo) => void;
}

export const SettingsCompany: React.FC<Props> = ({ companyInfo, onSave }) => {
  const [formData, setFormData] = useState<CompanyInfo>(companyInfo);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default print settings if undefined
  const printSettings = formData.printSettings || {
    showCode: true,
    showLocation: false,
    showUnit: true,
    showNotes: true,
    showFooterSignatures: true
  };

  const handleChange = (field: keyof CompanyInfo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handlePrintSettingChange = (key: keyof PrintSettings) => {
    setFormData(prev => ({
      ...prev,
      printSettings: {
        ...prev.printSettings,
        [key]: !prev.printSettings?.[key] ?? true
      } as PrintSettings
    }));
    setIsSaved(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
        setIsSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
      setFormData(prev => ({ ...prev, logo: null }));
      setIsSaved(false);
  }

  const handleSave = () => {
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-2 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/20 text-blue-500">
                <Building2 size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white">إعدادات الشركة والطباعة</h2>
                <p className="text-slate-400 text-sm font-medium">تخصيص بيانات المؤسسة وشكل الفواتير المطبوعة</p>
            </div>
        </div>
        
        <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${isSaved ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
        >
            {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}
            <span>{isSaved ? 'تم الحفظ بنجاح' : 'حفظ التغييرات'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Right Column: Company Info */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1e293b] rounded-2xl border border-white/5 shadow-lg overflow-hidden">
                <div className="bg-[#0f172a] px-6 py-4 border-b border-white/5 flex items-center gap-2">
                    <Building2 size={18} className="text-blue-400" />
                    <h3 className="font-bold text-white">البيانات الأساسية</h3>
                </div>
                
                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                            اسم الشركة / المؤسسة <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => handleChange('name', e.target.value)} 
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-bold text-lg"
                            placeholder="مثال: شركة النور للتجارة"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                <MapPin size={14} /> العنوان
                            </label>
                            <input 
                                type="text" 
                                value={formData.address} 
                                onChange={e => handleChange('address', e.target.value)} 
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                                placeholder="المدينة - الشارع - رقم المبنى"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                <Phone size={14} /> الهاتف
                            </label>
                            <input 
                                type="text" 
                                value={formData.phone} 
                                onChange={e => handleChange('phone', e.target.value)} 
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all font-mono dir-ltr text-right"
                                placeholder="01xxxxxxxxx"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Settings Section */}
            <div className="bg-[#1e293b] rounded-2xl border border-white/5 shadow-lg overflow-hidden">
                <div className="bg-[#0f172a] px-6 py-4 border-b border-white/5 flex items-center gap-2">
                    <Printer size={18} className="text-orange-400" />
                    <h3 className="font-bold text-white">تخصيص الطباعة</h3>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Toggle Item */}
                        <div 
                            onClick={() => handlePrintSettingChange('showCode')}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${printSettings.showCode ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#0f172a] border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${printSettings.showCode ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    <LayoutTemplate size={18} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${printSettings.showCode ? 'text-white' : 'text-slate-400'}`}>إظهار عمود الباركود</h4>
                                    <p className="text-[10px] text-slate-500">طباعة كود الصنف في جداول الفواتير</p>
                                </div>
                            </div>
                            {printSettings.showCode ? <ToggleRight size={28} className="text-blue-500" /> : <ToggleLeft size={28} className="text-slate-600" />}
                        </div>

                        <div 
                            onClick={() => handlePrintSettingChange('showLocation')}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${printSettings.showLocation ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#0f172a] border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${printSettings.showLocation ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${printSettings.showLocation ? 'text-white' : 'text-slate-400'}`}>إظهار الموقع / الرف</h4>
                                    <p className="text-[10px] text-slate-500">مفيد لعمال المخازن لتحضير الطلبيات</p>
                                </div>
                            </div>
                            {printSettings.showLocation ? <ToggleRight size={28} className="text-blue-500" /> : <ToggleLeft size={28} className="text-slate-600" />}
                        </div>

                        <div 
                            onClick={() => handlePrintSettingChange('showUnit')}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${printSettings.showUnit ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#0f172a] border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${printSettings.showUnit ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    <CheckCircle size={18} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${printSettings.showUnit ? 'text-white' : 'text-slate-400'}`}>إظهار عمود الوحدة</h4>
                                    <p className="text-[10px] text-slate-500">عرض (قطعة، كرتونة، إلخ)</p>
                                </div>
                            </div>
                            {printSettings.showUnit ? <ToggleRight size={28} className="text-blue-500" /> : <ToggleLeft size={28} className="text-slate-600" />}
                        </div>

                        <div 
                            onClick={() => handlePrintSettingChange('showNotes')}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${printSettings.showNotes ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#0f172a] border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${printSettings.showNotes ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    <LayoutTemplate size={18} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${printSettings.showNotes ? 'text-white' : 'text-slate-400'}`}>مساحة الملاحظات</h4>
                                    <p className="text-[10px] text-slate-500">تخصيص مكان لكتابة ملاحظات يدوية أسفل الفاتورة</p>
                                </div>
                            </div>
                            {printSettings.showNotes ? <ToggleRight size={28} className="text-blue-500" /> : <ToggleLeft size={28} className="text-slate-600" />}
                        </div>

                        <div 
                            onClick={() => handlePrintSettingChange('showFooterSignatures')}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${printSettings.showFooterSignatures ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#0f172a] border-slate-700 hover:border-slate-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${printSettings.showFooterSignatures ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    <CheckCircle size={18} />
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${printSettings.showFooterSignatures ? 'text-white' : 'text-slate-400'}`}>التوقيعات والاعتماد</h4>
                                    <p className="text-[10px] text-slate-500">إظهار خانات التوقيع (المستلم، البائع، أمين المخزن)</p>
                                </div>
                            </div>
                            {printSettings.showFooterSignatures ? <ToggleRight size={28} className="text-blue-500" /> : <ToggleLeft size={28} className="text-slate-600" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Left Column: Logo */}
        <div className="lg:col-span-1">
            <div className="bg-[#1e293b] rounded-2xl border border-white/5 shadow-lg overflow-hidden sticky top-6">
                <div className="bg-[#0f172a] px-6 py-4 border-b border-white/5 flex items-center gap-2">
                    <ImageIcon size={18} className="text-purple-400" />
                    <h3 className="font-bold text-white">شعار الشركة (Logo)</h3>
                </div>
                
                <div className="p-6 flex flex-col items-center">
                    <div 
                        className="w-full aspect-square max-w-[250px] bg-[#0f172a] rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center relative group cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {formData.logo ? (
                            <>
                                <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white" size={32} />
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <Upload className="text-slate-500 mx-auto mb-2 group-hover:text-blue-500 transition-colors" size={40} />
                                <p className="text-xs text-slate-400 font-bold">اضغط لرفع الشعار</p>
                                <p className="text-[10px] text-slate-600 mt-1">PNG, JPG (Max 2MB)</p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleLogoUpload}
                        />
                    </div>

                    <div className="flex gap-2 w-full mt-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                            <Upload size={14} /> تغيير
                        </button>
                        {formData.logo && (
                            <button 
                                onClick={handleRemoveLogo}
                                className="bg-red-900/50 hover:bg-red-800 text-red-200 py-2 px-4 rounded-lg text-xs font-bold transition border border-red-900/50"
                                title="حذف الشعار"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    <div className="mt-6 bg-blue-900/10 p-3 rounded-lg border border-blue-500/10 w-full text-center">
                        <p className="text-[10px] text-blue-300 leading-relaxed">
                            سيظهر هذا الشعار تلقائياً في ترويسة جميع الفواتير والتقارير المطبوعة.
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
