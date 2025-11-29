import React, { useState } from 'react';
import { OneTimeExpense } from '../types';
import { Plus, Trash2, Paintbrush, Armchair, Wrench, Refrigerator, Wallet, Shield, FileText } from 'lucide-react';

interface Props {
  expenses: OneTimeExpense[];
  setExpenses: (ex: OneTimeExpense[]) => void;
  downPaymentAmount: number;
  landDepartmentFeeAmount: number;
}

const POST_PURCHASE_SUGGESTIONS = [
  { name: '粉刷', icon: <Paintbrush className="w-4 h-4" /> },
  { name: '家具', icon: <Armchair className="w-4 h-4" /> },
  { name: '空调维修', icon: <Wrench className="w-4 h-4" /> },
  { name: '家电维修', icon: <Refrigerator className="w-4 h-4" /> },
];

const UpfrontExpenses: React.FC<Props> = ({ expenses, setExpenses, downPaymentAmount, landDepartmentFeeAmount }) => {
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'pre' | 'post'>('pre');

  const handleAdd = () => {
    if (!newExpenseName || !newExpenseAmount) return;
    const newId = Math.random().toString(36).substr(2, 9);
    setExpenses([
      ...expenses,
      {
        id: newId,
        name: newExpenseName,
        amount: parseFloat(newExpenseAmount),
        category: activeTab,
      },
    ]);
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  const handleRemove = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const filteredExpenses = expenses.filter((e) => e.category === activeTab);
  
  const prePurchaseTotal = expenses.filter(e => e.category === 'pre').reduce((sum, item) => sum + item.amount, 0) + downPaymentAmount + landDepartmentFeeAmount;
  const postPurchaseTotal = expenses.filter(e => e.category === 'post').reduce((sum, item) => sum + item.amount, 0);
  const total = activeTab === 'pre' ? prePurchaseTotal : postPurchaseTotal;


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
         <h2 className="text-lg font-bold text-brand-slate">一次性费用</h2>
         <p className="text-xs text-slate-500">添加土地局注册费(DLD)、中介费、家具等费用</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button 
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'pre' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('pre')}
        >
            购房前
        </button>
        <button 
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'post' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('post')}
        >
            购房后
        </button>
      </div>

      {/* Quick Add for Post-Purchase */}
      {activeTab === 'post' && (
        <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">快速添加</p>
            <div className="flex flex-wrap gap-2">
                {POST_PURCHASE_SUGGESTIONS.map(s => (
                    <button 
                        key={s.name}
                        onClick={() => setNewExpenseName(s.name)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                    >
                        {s.icon}
                        {s.name}
                    </button>
                ))}
            </div>
        </div>
      )}
      
      {/* Add Expense Form */}
       <div className="p-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row gap-2">
            <input 
                type="text" 
                placeholder="名称 (例如 粉刷)" 
                className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-blue"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
            />
            <input 
                type="number" 
                placeholder="金额" 
                className="sm:w-28 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-blue"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button 
                onClick={handleAdd}
                className="p-2 bg-brand-slate text-white rounded-md hover:bg-slate-700 transition-colors flex-shrink-0"
                aria-label="Add Expense"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </div>


      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                <tr>
                    <th className="px-2 sm:px-4 py-2">项目</th>
                    <th className="px-2 sm:px-4 py-2 text-right">成本 (AED)</th>
                    <th className="px-2 sm:px-4 py-2 w-8"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {activeTab === 'pre' && (
                  <>
                    <tr className="bg-slate-50/70">
                        <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400"/>房产首付</td>
                        <td className="px-2 sm:px-4 py-3 text-right text-slate-700">{downPaymentAmount.toLocaleString()}</td>
                        <td></td>
                    </tr>
                    <tr className="bg-slate-50/70">
                        <td className="px-2 sm:px-4 py-3 font-medium text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/>土地局注册费</td>
                        <td className="px-2 sm:px-4 py-3 text-right text-slate-700">{landDepartmentFeeAmount.toLocaleString()}</td>
                        <td></td>
                    </tr>
                  </>
                )}
                {filteredExpenses.map((ex) => (
                    <tr key={ex.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-2 sm:px-4 py-3 font-medium text-slate-700">{ex.name}</td>
                        <td className="px-2 sm:px-4 py-3 text-right text-slate-700">{ex.amount.toLocaleString()}</td>
                        <td className="px-2 sm:px-4 py-3 text-right">
                            <button onClick={() => handleRemove(ex.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        {filteredExpenses.length === 0 && activeTab === 'post' && (
            <div className="text-center py-8 text-slate-400 text-sm">
                尚未添加任何费用.
            </div>
        )}
      </div>

      {/* Footer Total */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700">{activeTab === 'pre' ? '购房前费用合计' : '购房后费用合计'}:</span>
            <span className="font-bold text-lg text-brand-gold">{total.toLocaleString()} AED</span>
        </div>
      </div>
    </div>
  );
};

export default UpfrontExpenses;