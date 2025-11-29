import React, { useEffect, useState } from 'react';
import { Property, PropertySettings } from '../types';
import { Calculator, Percent, ShieldCheck, Banknote, X, Plus, Home, Edit, Trash2 } from 'lucide-react';

interface PropertyManagerProps {
    properties: Property[];
    activePropertyId: string | null;
    onSelect: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
}

const PropertyManager: React.FC<PropertyManagerProps> = ({ properties, activePropertyId, onSelect, onRename, onAdd, onDelete }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');

    const handleStartEdit = (prop: Property) => {
        setEditingId(prop.id);
        setTempName(prop.name);
    };

    const handleSaveEdit = () => {
        if (editingId && tempName.trim()) {
            onRename(editingId, tempName.trim());
        }
        setEditingId(null);
    };
    
    return (
        <div className="mb-6 p-4 bg-brand-blue-light rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-brand-blue-dark">我的房产</h3>
              <button onClick={onAdd} className="flex items-center gap-1 text-xs font-semibold bg-white text-brand-blue-dark px-2 py-1 rounded-md shadow-sm hover:bg-slate-50 transition-colors">
                  <Plus className="w-3 h-3"/>
                  添加
              </button>
            </div>
            <div className="space-y-2">
                {properties.map(prop => (
                    <div
                        key={prop.id}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${activePropertyId === prop.id ? 'bg-white shadow-sm' : 'hover:bg-brand-blue-dark/10'}`}
                        onClick={() => onSelect(prop.id)}
                    >
                        <div className="flex items-center gap-2">
                             <Home className={`w-4 h-4 ${activePropertyId === prop.id ? 'text-brand-blue' : 'text-slate-500'}`} />
                             {editingId === prop.id ? (
                                 <input 
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                    className="text-sm font-semibold bg-transparent border-b border-brand-blue focus:outline-none"
                                    autoFocus
                                 />
                             ) : (
                                <span className="text-sm font-semibold text-slate-800">{prop.name}</span>
                             )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleStartEdit(prop); }} className="p-1 hover:text-brand-blue-dark"><Edit className="w-3 h-3"/></button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(prop.id); }} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    </div>
                ))}
                 {properties.length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-4">点击“添加”来创建您的第一处房产。</p>
                )}
            </div>
        </div>
    );
};


interface Props {
  activeProperty: Property | undefined;
  properties: Property[];
  activePropertyId: string | null;
  onPropertyChange: (updatedProperty: Property) => void;
  onSelectProperty: (id: string) => void;
  onRenameProperty: (id: string, newName: string) => void;
  onAddProperty: () => void;
  onDeleteProperty: (id: string) => void;
  onClose?: () => void;
}

const SettingsPanel: React.FC<Props> = ({ 
    activeProperty, 
    properties, 
    activePropertyId, 
    onPropertyChange, 
    onSelectProperty, 
    onRenameProperty, 
    onAddProperty, 
    onDeleteProperty, 
    onClose 
}) => {

  const { settings } = activeProperty || {};

  const handleChange = (field: keyof PropertySettings, value: string) => {
    if (!activeProperty || !settings) return;
    if (field === 'address') {
        onPropertyChange({ ...activeProperty, settings: { ...settings, [field]: value }});
    } else {
        const num = parseFloat(value) || 0;
        onPropertyChange({ ...activeProperty, settings: { ...settings, [field]: num }});
    }
  };

  useEffect(() => {
    if (!activeProperty || !settings) return;
    const calculatedLoan = settings.propertyValue * (1 - settings.downPaymentPercent / 100);
    if (Math.abs(calculatedLoan - settings.loanAmount) > 1) {
        onPropertyChange({ ...activeProperty, settings: { ...settings, loanAmount: calculatedLoan }});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.propertyValue, settings?.downPaymentPercent]);

  return (
    <div className="bg-white p-6 h-full overflow-y-auto custom-scrollbar md:rounded-none md:shadow-none md:border-none">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-extrabold text-brand-slate flex items-center gap-2">
          迪拜房产收益计算器
        </h2>
        {onClose && (
            <button onClick={onClose} className="md:hidden p-1 text-slate-500 hover:text-slate-800">
                <X className="w-6 h-6" />
            </button>
        )}
      </div>

      <PropertyManager 
        properties={properties}
        activePropertyId={activePropertyId}
        onSelect={onSelectProperty}
        onRename={onRenameProperty}
        onAdd={onAddProperty}
        onDelete={onDeleteProperty}
      />
      
      {!activeProperty || !settings ? (
        <div className="text-center py-10">
            <p className="text-slate-500">请选择或添加一处房产以查看详情。</p>
        </div>
      ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-t border-slate-100 pt-4">
                <Calculator className="w-4 h-4 text-brand-gold" />
                房产详情
            </h3>
            <div className="form-control">
              <label className="label text-xs font-semibold text-slate-500 uppercase">地址</label>
              <input 
                  type="text" 
                  className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">面积 (平米)</label>
                    <input 
                        type="number" 
                        className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                        value={settings.areaSqm}
                        onChange={(e) => handleChange('areaSqm', e.target.value)}
                    />
                </div>
                 <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">卧室数量</label>
                    <input 
                        type="number" 
                        className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                        value={settings.bedrooms}
                        onChange={(e) => handleChange('bedrooms', e.target.value)}
                    />
                </div>
            </div>
            <div className="form-control">
              <label className="label text-xs font-semibold text-slate-500 uppercase">房产总价 (AED)</label>
              <input 
                  type="number" 
                  className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                  value={settings.propertyValue}
                  onChange={(e) => handleChange('propertyValue', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs font-semibold text-slate-500 uppercase">首付比例 %</label>
                <div className="relative flex items-center">
                  <input 
                    type="number" 
                    className="w-full pl-3 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                    value={settings.downPaymentPercent}
                    onChange={(e) => handleChange('downPaymentPercent', e.target.value)}
                  />
                  <Percent className="w-3 h-3 absolute right-3 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="label text-xs font-semibold text-slate-500 uppercase">金额</label>
                <div className="py-2 px-3 bg-slate-100 text-slate-600 rounded-md text-sm truncate">
                   {Math.round(settings.propertyValue * settings.downPaymentPercent / 100).toLocaleString()}
                </div>
              </div>
            </div>
            <div>
                <label className="label text-xs font-semibold text-slate-500 uppercase">土地局注册费 (%)</label>
                <div className="relative flex items-center">
                    <input 
                    type="number" 
                    className="w-full pl-3 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                    value={settings.landDepartmentFeePercent}
                    onChange={(e) => handleChange('landDepartmentFeePercent', e.target.value)}
                    />
                    <Percent className="w-3 h-3 absolute right-3 text-gray-400" />
                </div>
            </div>
            <div className="border-t border-slate-100 my-4"></div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-brand-blue" />
                贷款设置
            </h3>
            <div>
                <label className="label text-xs font-semibold text-slate-500 uppercase">贷款金额 (AED)</label>
                <input 
                  type="number" 
                  className="w-full pl-3 pr-3 py-2 border rounded-md bg-slate-100 text-slate-500"
                  value={Math.round(settings.loanAmount)}
                  readOnly
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">贷款期限 (月)</label>
                    <input 
                        type="number" 
                        className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                        value={settings.loanTenorMonths}
                        onChange={(e) => handleChange('loanTenorMonths', e.target.value)}
                    />
                </div>
                 <div className="flex items-end pb-2 text-xs text-gray-400">
                    {(settings.loanTenorMonths / 12).toFixed(1)} 年
                </div>
            </div>
            <div className="border-t border-slate-100 my-4"></div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                利率与保险 (参考)
            </h3>
            <p className="text-xs text-slate-400 -mt-2 mb-2">
                注意：当前计算不使用利率。请在“周期性费用”中手动输入每月还款额。
            </p>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">固定利率</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number" 
                            className="w-full pl-3 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                            value={settings.fixedRatePercent}
                            onChange={(e) => handleChange('fixedRatePercent', e.target.value)}
                        />
                        <Percent className="w-3 h-3 absolute right-3 text-gray-400" />
                    </div>
                </div>
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">固定时长 (月)</label>
                    <input 
                        type="number" 
                        className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                        value={settings.fixedRateMonths}
                        onChange={(e) => handleChange('fixedRateMonths', e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">后续浮动利率</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number" 
                            className="w-full pl-3 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                            value={settings.floatingRatePercent}
                            onChange={(e) => handleChange('floatingRatePercent', e.target.value)}
                        />
                        <Percent className="w-3 h-3 absolute right-3 text-gray-400" />
                    </div>
                </div>
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">保险比例</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number" 
                            className="w-full pl-3 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                            value={settings.insurancePercent}
                            onChange={(e) => handleChange('insurancePercent', e.target.value)}
                        />
                        <Percent className="w-3 h-3 absolute right-3 text-gray-400" />
                    </div>
                </div>
            </div>
             <p className="text-xs text-slate-400 mt-4">每月还款金额请在“周期性费用”选项卡中手动输入。</p>
          </div>
      )}
    </div>
  );
};

export default SettingsPanel;