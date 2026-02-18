import React, { useState, useEffect } from 'react';
import { User, ViewType } from '../types';
import { NAV_ITEMS } from '../constants';
import { 
  Users, 
  UserPlus, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Save, 
  KeyRound, 
  Trash2, 
  Edit,
  Lock,
  Unlock,
  Eye,
  ToggleLeft,
  ToggleRight,
  User as UserIcon
} from 'lucide-react';

interface Props {
  users: User[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export const SettingsUsers: React.FC<Props> = ({ users, onSaveUser, onDeleteUser }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<User>({
    id: '',
    username: '',
    fullName: '',
    pin: '',
    role: 'user',
    permissions: [],
    isActive: true
  });

  // Reset form when switching to "New User" or selecting a user
  useEffect(() => {
    if (selectedUser) {
      setFormData(selectedUser);
      setIsEditing(true);
    } else {
      setFormData({
        id: '',
        username: '',
        fullName: '',
        pin: '',
        role: 'user',
        permissions: ['dashboard', 'sales_new'], // Default permissions
        isActive: true
      });
      setIsEditing(false);
    }
  }, [selectedUser]);

  const handleTogglePermission = (viewId: ViewType) => {
    setFormData(prev => {
      const hasPerm = prev.permissions.includes(viewId);
      let newPerms = [...prev.permissions];
      
      if (hasPerm) {
        newPerms = newPerms.filter(p => p !== viewId);
      } else {
        newPerms.push(viewId);
      }
      
      return { ...prev, permissions: newPerms };
    });
  };

  const toggleGroupPermissions = (subItems: { id: string }[], enable: boolean) => {
      setFormData(prev => {
          let newPerms = new Set(prev.permissions);
          subItems.forEach(item => {
              if (enable) newPerms.add(item.id as ViewType);
              else newPerms.delete(item.id as ViewType);
          });
          return { ...prev, permissions: Array.from(newPerms) };
      });
  };

  const handleSave = () => {
    if (!formData.username || !formData.pin) {
      alert('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const userToSave = {
      ...formData,
      id: formData.id || Date.now().toString()
    };

    onSaveUser(userToSave);
    setSelectedUser(null); // Go back to "New" mode or clear selection
    alert('تم حفظ بيانات المستخدم بنجاح');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] animate-in fade-in zoom-in-95 duration-300 p-2 md:p-6 pb-20">
      
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar: User List */}
        <div className="w-full lg:w-1/4 flex flex-col gap-4">
          <div className="bg-[#1e293b] p-4 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-blue-500" />
                المستخدمين
              </h2>
              <button 
                onClick={() => setSelectedUser(null)}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg shadow-blue-900/20"
                title="مستخدم جديد"
              >
                <UserPlus size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {users.map(user => (
                <div 
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                    selectedUser?.id === user.id 
                    ? 'bg-blue-600/10 border-blue-500' 
                    : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-bold ${selectedUser?.id === user.id ? 'text-white' : 'text-slate-200'}`}>
                        {user.username}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        {user.role === 'admin' ? <Shield size={10} className="text-purple-400" /> : <UserIcon size={10} />}
                        {user.role === 'admin' ? 'مدير نظام' : 'مستخدم'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content: User Form & Permissions */}
        <div className="flex-1 space-y-6">
          
          {/* User Details Card */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                {isEditing ? <Edit className="text-blue-500" /> : <UserPlus className="text-emerald-500" />}
                {isEditing ? `تعديل المستخدم: ${formData.username}` : 'تسجيل مستخدم جديد'}
              </h1>
              
              <div className="flex gap-2">
                {isEditing && (
                  <button 
                    onClick={() => { if(window.confirm('حذف المستخدم؟')) onDeleteUser(formData.id); }}
                    className="bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-2 rounded-xl text-xs font-bold border border-red-900 transition flex items-center gap-2"
                  >
                    <Trash2 size={16} /> حذف
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition flex items-center gap-2"
                >
                  <Save size={18} /> حفظ البيانات
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">اسم المستخدم (للدخول)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-bold"
                    placeholder="Username"
                  />
                  <UserIcon className="absolute left-3 top-3.5 text-slate-500" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">الاسم بالكامل (للطباعة)</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">كلمة المرور / PIN</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.pin}
                    onChange={e => setFormData({...formData, pin: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-mono tracking-widest"
                    placeholder="****"
                  />
                  <KeyRound className="absolute left-3 top-3.5 text-slate-500" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">نوع الصلاحية</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold"
                >
                  <option value="user">مستخدم (صلاحيات محددة)</option>
                  <option value="admin">مدير نظام (تحكم كامل)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-3 bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                <span className="text-sm font-bold text-slate-300">حالة الحساب:</span>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${formData.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                >
                  {formData.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {formData.isActive ? 'نشط (يمكنه الدخول)' : 'معطل (ممنوع من الدخول)'}
                </button>
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className={`bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-xl transition-opacity ${formData.role === 'admin' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Lock size={18} className="text-amber-500" />
                        صلاحيات الشاشات
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">حدد الشاشات التي يُسمح للمستخدم بالوصول إليها</p>
                </div>
                {formData.role === 'admin' && (
                    <div className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold">
                        المدير يمتلك جميع الصلاحيات تلقائياً
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {NAV_ITEMS.map((section: any) => (
                <div key={section.id} className="bg-[#0f172a] rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                  {/* Section Header */}
                  <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <section.icon size={16} className="text-blue-400" />
                      {section.label}
                    </div>
                    {/* Select All for Section */}
                    {section.subItems && (
                        <div className="flex gap-1">
                            <button 
                                onClick={() => toggleGroupPermissions(section.subItems || [], true)}
                                className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-600 hover:text-white transition"
                            >
                                الكل
                            </button>
                            <button 
                                onClick={() => toggleGroupPermissions(section.subItems || [], false)}
                                className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded hover:bg-slate-600 hover:text-white transition"
                            >
                                إلغاء
                            </button>
                        </div>
                    )}
                  </div>

                  {/* Sub Items */}
                  <div className="p-2 space-y-1">
                    {section.subItems ? (
                      section.subItems.map((sub: any) => {
                        const isAllowed = formData.permissions.includes(sub.id as ViewType);
                        return (
                          <div 
                            key={sub.id} 
                            onClick={() => handleTogglePermission(sub.id as ViewType)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                              isAllowed 
                              ? 'bg-blue-500/10 border border-blue-500/30' 
                              : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <span className={`text-xs font-medium ${isAllowed ? 'text-blue-200' : 'text-slate-400'}`}>
                              {sub.label}
                            </span>
                            {isAllowed ? <ToggleRight className="text-blue-500" size={24} /> : <ToggleLeft className="text-slate-600" size={24} />}
                          </div>
                        );
                      })
                    ) : (
                      // If top level item acts as a view itself (like Dashboard)
                      <div 
                        onClick={() => handleTogglePermission(section.id as ViewType)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          formData.permissions.includes(section.id as ViewType) 
                          ? 'bg-blue-500/10 border border-blue-500/30' 
                          : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className={`text-xs font-medium ${formData.permissions.includes(section.id as ViewType) ? 'text-blue-200' : 'text-slate-400'}`}>
                          عرض الشاشة
                        </span>
                        {formData.permissions.includes(section.id as ViewType) ? <ToggleRight className="text-blue-500" size={24} /> : <ToggleLeft className="text-slate-600" size={24} />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};