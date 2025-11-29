import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Property, MonthlyData } from '../types';
import { calculateSimulation, formatCurrency, calculateSaleProjection } from '../utils/calculations';
import SettingsPanel from './SettingsPanel';
import UpfrontExpenses from './UpfrontExpenses';
import MonthlyExpenses from './MonthlyExpenses';
import MobileNav from './MobileNav';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { Landmark, TrendingDown, TrendingUp, Wallet, SlidersHorizontal, LayoutDashboard, Repeat, BedDouble, Ruler, Calculator, FileDown, LoaderCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

type MainView = 'dashboard' | 'upfront' | 'recurring';
type MobileOverlay = 'none' | 'settings';
type ChartRange = 'monthly' | 'yearly' | '5y' | '10y' | '25y';

const createNewProperty = (name: string): Omit<Property, 'id'> => {
    return {
        name: name,
        createdAt: serverTimestamp(),
        settings: {
            propertyValue: 1250000,
            downPaymentPercent: 20,
            loanAmount: 1000000,
            loanTenorMonths: 300,
            address: 'Business Bay',
            areaSqm: 91,
            bedrooms: 2,
            landDepartmentFeePercent: 4,
            insurancePercent: 0.5,
            fixedRatePercent: 4.5,
            fixedRateMonths: 60,
            floatingRatePercent: 5.5,
        },
        oneTimeExpenses: [
            { id: '1', name: '中介费', amount: 25000, category: 'pre' },
            { id: '2', name: '首次评估费用', amount: 2625, category: 'pre' },
            { id: '3', name: '第二次评估费用', amount: 3100, category: 'pre' },
            { id: '4', name: '房产保险', amount: 630, category: 'pre' },
            { id: '5', name: '银行手续费', amount: 3150, category: 'pre' },
            { id: '6', name: 'FOL', amount: 1050, category: 'pre' },
            { id: '7', name: '服务费税费', amount: 1250, category: 'pre' },
            { id: '8', name: '过户中心手续费', amount: 4200, category: 'pre' },
            { id: '9', name: '产证费', amount: 580, category: 'pre' },
            { id: '10', name: '房屋粉刷维修', amount: 1560, category: 'post' },
            { id: '11', name: '空调维修', amount: 3699, category: 'post' },
            { id: '12', name: '保洁', amount: 400, category: 'post' },
        ],
        monthlyInputs: {
            1: { dewa: 2130, ac: 2423.38, serviceFees: 1146, loanPayment: 5552.65 },
            2: { dewa: 542.33, ac: 587.06, serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 5880 },
            3: { loanPayment: 5552.65, rentalIncome: 13000 },
            4: { loanPayment: 5552.65, rentalIncome: 13000 },
            5: { serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 13000 },
            6: { loanPayment: 5552.65, rentalIncome: 13000 },
            7: { loanPayment: 5552.65, rentalIncome: 13000 },
            8: { serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 13000 },
            9: { loanPayment: 5552.65, rentalIncome: 13000 },
            10: { loanPayment: 5552.65, rentalIncome: 13000 },
            11: { serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 13000 },
            12: { loanPayment: 5552.65, rentalIncome: 13000 },
            13: { loanPayment: 5552.65 },
            14: { loanPayment: 5552.65 },
        }
    };
};

const propertiesCollection = collection(db, 'properties');

const Dashboard: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay>('none');
  const [chartRange, setChartRange] = useState<ChartRange>('yearly');

  useEffect(() => {
    const q = query(propertiesCollection, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const propsData: Property[] = [];
        querySnapshot.forEach((doc) => {
            propsData.push({ ...doc.data(), id: doc.id } as Property);
        });
        setProperties(propsData);

        if (loading) {
            if(propsData.length > 0 && activePropertyId === null) {
                setActivePropertyId(propsData[0].id);
            }
            setLoading(false);
        }

        // If active property is deleted elsewhere, deselect it
        if (activePropertyId && !propsData.some(p => p.id === activePropertyId)) {
            setActivePropertyId(propsData.length > 0 ? propsData[0].id : null);
        }
    }, (error) => {
        console.error("Error fetching properties:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [loading, activePropertyId]);


  const activeProperty = useMemo(() => properties.find(p => p.id === activePropertyId), [properties, activePropertyId]);
  
  const [estimatedSalePrice, setEstimatedSalePrice] = useState(activeProperty?.settings.propertyValue || 0);
  const [monthsHeld, setMonthsHeld] = useState(60);

  useEffect(() => {
    if (activeProperty) {
        setEstimatedSalePrice(activeProperty.settings.propertyValue);
        setMonthsHeld(60);
    }
  }, [activeProperty]);

  const handleUpdateProperty = useCallback(async (updatedProperty: Property) => {
      if (!updatedProperty.id) return;
      const propDoc = doc(db, 'properties', updatedProperty.id);
      const { id, ...dataToUpdate } = updatedProperty;
      await updateDoc(propDoc, dataToUpdate);
  }, []);
  
  const handleRenameProperty = useCallback(async (id: string, newName: string) => {
      const propDoc = doc(db, 'properties', id);
      await updateDoc(propDoc, { name: newName });
  }, []);

  const handleAddProperty = useCallback(async () => {
    const newPropertyName = `新房产 ${properties.length + 1}`;
    const newPropertyData = createNewProperty(newPropertyName);
    const docRef = await addDoc(propertiesCollection, newPropertyData);
    setActivePropertyId(docRef.id);
  }, [properties.length]);

  const handleDeleteProperty = useCallback(async (id: string) => {
    if (!window.confirm('您确定要删除此房产吗？此操作无法撤销。')) return;
    
    // Optimistically update UI for smoother experience
    if (activePropertyId === id) {
        const currentIndex = properties.findIndex(p => p.id === id);
        let newActiveId: string | null = null;
        if (properties.length > 1) {
            newActiveId = currentIndex > 0 ? properties[currentIndex - 1].id : properties[1].id;
        }
        setActivePropertyId(newActiveId);
    }

    await deleteDoc(doc(db, 'properties', id));
  }, [properties, activePropertyId]);


  const { totals, chartData, totalExpenseForCard, totalDownPayment, detailedPortfolioResults } = useMemo(() => {
    if (!properties.length) return { 
        totals: { recurring: 0, upfront: 0, income: 0, net: 0, propertyValue: 0, totalLoanPayments: 0 }, 
        chartData: [],
        totalExpenseForCard: 0,
        totalDownPayment: 0,
        detailedPortfolioResults: []
    };
    
    const portfolioTotals = {
        recurring: 0,
        upfront: 0,
        income: 0,
        net: 0,
        propertyValue: 0,
        totalLoanPayments: 0,
    };
    
    let maxTenor = 0;
    properties.forEach(prop => {
        if (prop.settings.loanTenorMonths > maxTenor) maxTenor = prop.settings.loanTenorMonths;
    });

    const detailedPortfolioResults: MonthlyData[] = Array.from({ length: maxTenor }, (_, i) => ({
        monthIndex: i, dewa: 0, ac: 0, serviceFees: 0, otherMaintenance: 0,
        rentalIncome: 0, loanPayment: 0, oneTimeExpenses: 0
    }));

    let totalDownPayment = 0;

    properties.forEach(prop => {
        const { totals: propTotals, results } = calculateSimulation(prop.settings, prop.oneTimeExpenses, prop.monthlyInputs);
        portfolioTotals.recurring += propTotals.recurring;
        portfolioTotals.upfront += propTotals.upfront;
        portfolioTotals.income += propTotals.income;
        portfolioTotals.net += propTotals.net;
        portfolioTotals.propertyValue += prop.settings.propertyValue;
        portfolioTotals.totalLoanPayments += propTotals.totalLoanPayments;

        totalDownPayment += prop.settings.propertyValue * (prop.settings.downPaymentPercent / 100);

        results.forEach((m, idx) => {
            if (detailedPortfolioResults[idx]) {
                detailedPortfolioResults[idx].dewa += m.dewa;
                detailedPortfolioResults[idx].ac += m.ac;
                detailedPortfolioResults[idx].serviceFees += m.serviceFees;
                detailedPortfolioResults[idx].otherMaintenance += m.otherMaintenance;
                detailedPortfolioResults[idx].rentalIncome += m.rentalIncome;
                detailedPortfolioResults[idx].loanPayment = (detailedPortfolioResults[idx].loanPayment || 0) + (m.loanPayment || 0);
                detailedPortfolioResults[idx].oneTimeExpenses += m.oneTimeExpenses;
            }
        });
    });

    const combinedMonthlyResultsForChart = detailedPortfolioResults.map(m => ({
        income: m.rentalIncome,
        expense: (m.loanPayment || 0) + m.dewa + m.ac + m.serviceFees + m.otherMaintenance + m.oneTimeExpenses,
    }));

    let aggregatedData = [];
    const periodMonths = {'monthly': 1, 'yearly': 12, '5y': 60, '10y': 120, '25y': 300}[chartRange];

    for (let i = 0; i < maxTenor; i += periodMonths) {
        let periodIncome = 0;
        let periodExpense = 0;
        
        for (let j = i; j < i + periodMonths && j < maxTenor; j++) {
            if (combinedMonthlyResultsForChart[j]) {
                periodIncome += combinedMonthlyResultsForChart[j].income;
                periodExpense += combinedMonthlyResultsForChart[j].expense;
            }
        }
        
        let name = '';
        if (chartRange === 'monthly') name = `M${i+1}`;
        else if (chartRange === 'yearly') name = `Y${(i/12)+1}`;
        else name = `Y${Math.floor(i / 12) + 1}`;

        aggregatedData.push({ name, income: periodIncome, expense: periodExpense });
    }
    
    if (chartRange === 'monthly') {
        aggregatedData = aggregatedData.slice(0, 60);
    }
    
    const calculatedTotalExpense = portfolioTotals.recurring + portfolioTotals.upfront - totalDownPayment;

    return { totals: portfolioTotals, chartData: aggregatedData, totalExpenseForCard: calculatedTotalExpense, totalDownPayment, detailedPortfolioResults };
  }, [properties, chartRange]);

  const saleProjection = useMemo(() => {
    if (!activeProperty) {
        return { remainingPrincipal: 0, earlyRepaymentPenalty: 0, totalProfit: 0, annualizedROI: 0 };
    }
    return calculateSaleProjection(
        activeProperty.settings,
        activeProperty.oneTimeExpenses,
        activeProperty.monthlyInputs,
        estimatedSalePrice,
        monthsHeld
    );
  }, [activeProperty, estimatedSalePrice, monthsHeld]);
  
  const handleExport = useCallback(() => {
    if (!detailedPortfolioResults || detailedPortfolioResults.length === 0) {
      alert('没有可导出的数据。');
      return;
    }

    const headers = [
      '月份', '日期', '租金收入', '每月还款', '水电费(DEWA)', '空调费', 
      '物业费', '其他维护', '一次性费用', '月度净现金流', '累计净现金流'
    ];
    let csvContent = headers.join(',') + '\n';

    let cumulativeNet = 0;
    const fixedStartDate = new Date(2025, 7, 1); // August is month 7 (0-indexed)

    detailedPortfolioResults.forEach((month, index) => {
      const income = month.rentalIncome || 0;
      const expense = (month.loanPayment || 0) + (month.dewa || 0) + (month.ac || 0) + (month.serviceFees || 0) + (month.otherMaintenance || 0) + (month.oneTimeExpenses || 0);
      const monthlyNet = income - expense;
      cumulativeNet += monthlyNet;

      const date = new Date(fixedStartDate);
      date.setMonth(date.getMonth() + index);
      const dateLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const rowData = [
        index + 1,
        dateLabel,
        month.rentalIncome || 0,
        month.loanPayment || 0,
        month.dewa || 0,
        month.ac || 0,
        month.serviceFees || 0,
        month.otherMaintenance || 0,
        month.oneTimeExpenses || 0,
        monthlyNet,
        cumulativeNet
      ];
      
      const row = rowData.join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '房产收益数据导出.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}, [detailedPortfolioResults]);


  const renderHeader = () => (
    <div className="p-4 md:p-6 flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold text-brand-slate">投资组合概览</h1>
            <p className="text-sm text-slate-500">
                当前房产: <span className="font-semibold text-brand-blue">{activeProperty?.name || '无'}</span>
            </p>
        </div>
        <div className="md:hidden">
            <button onClick={() => setMobileOverlay('settings')} className="p-2 text-slate-500 hover:text-brand-blue">
                <SlidersHorizontal className="w-5 h-5" />
            </button>
        </div>
    </div>
  );

  const renderPropertyInfo = () => {
    if (!activeProperty) return null;
    return (
        <div className="px-4 md:px-6 mb-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h2 className="text-lg font-bold text-brand-slate">{activeProperty.name}</h2>
                    <p className="text-sm text-slate-500">{activeProperty.settings.address}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4 sm:ml-4">
                    <div className="flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-slate-400" />
                        <span>{activeProperty.settings.areaSqm} 平米</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-slate-400" />
                        <span>{activeProperty.settings.bedrooms} 卧室</span>
                    </div>
                </div>
            </div>
        </div>
    );
  };
  
  const renderSaleProjectionCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
        <h3 className="text-lg font-bold text-brand-slate flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-brand-gold" />
            售出收益预估
        </h3>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">预估售出房价 (AED)</label>
                    <input 
                        type="number"
                        className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                        value={estimatedSalePrice}
                        onChange={(e) => setEstimatedSalePrice(parseFloat(e.target.value) || 0)}
                    />
                </div>
                <div>
                    <label className="label text-xs font-semibold text-slate-500 uppercase">持有月数</label>
                    <input 
                        type="number"
                        className="w-full pl-3 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-gold focus:outline-none"
                        value={monthsHeld}
                        onChange={(e) => setMonthsHeld(parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>
            <div className="border-t border-slate-100 my-2"></div>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">贷款剩余本金 (估算)</span>
                    <span className="font-medium text-slate-700">{formatCurrency(saleProjection.remainingPrincipal)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">提前还款罚金 (估算)</span>
                    <span className="font-medium text-slate-700">{formatCurrency(saleProjection.earlyRepaymentPenalty)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">净收益</span>
                    <span className={`font-bold ${saleProjection.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(saleProjection.totalProfit)}
                    </span>
                </div>
                 <div className="border-t border-slate-100 my-2"></div>
                <div className="flex justify-between items-center bg-brand-gold-light p-3 rounded-lg">
                    <span className="font-bold text-brand-gold-dark">年化收益率 (ROI)</span>
                    <span className={`text-xl font-extrabold ${saleProjection.annualizedROI >= 0 ? 'text-brand-gold-dark' : 'text-red-600'}`}>
                        {saleProjection.annualizedROI.toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-slate-500 flex flex-col items-center gap-4">
                    <LoaderCircle className="w-8 h-8 animate-spin text-brand-blue" />
                    <p className="font-semibold">正在从云端加载数据...</p>
                </div>
            </div>
        );
    }
    
    if (properties.length === 0) {
        return (
             <div className="flex-1 flex items-center justify-center p-4">
                 <div className="text-center">
                     <h3 className="font-bold text-lg text-brand-slate mb-2">欢迎使用!</h3>
                     <p className="text-slate-500 mb-4">您还没有任何房产，请在侧边栏添加您的第一处房产。</p>
                     <button 
                        onClick={handleAddProperty}
                        className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-lg hover:bg-brand-blue-dark transition-colors shadow-sm"
                     >
                         添加第一处房产
                     </button>
                 </div>
            </div>
        );
    }

    return (
         <div className="flex-1 flex flex-col">
            {mainView === 'dashboard' && (
                <div className="flex-1 flex flex-col">
                    {renderPropertyInfo()}
                    <header className="px-4 md:px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-red-100 to-white p-4 rounded-xl border border-red-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">总支出</span>
                                <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="mt-2">
                                <div className="text-xl md:text-2xl font-extrabold text-brand-slate">{formatCurrency(totalExpenseForCard)}</div>
                                <div className="text-xs text-slate-500 mt-1 hidden sm:block">已排除首付: {formatCurrency(totalDownPayment)}</div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-100 to-white p-4 rounded-xl border border-green-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">总收入</span>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="mt-2">
                                <div className="text-xl md:text-2xl font-extrabold text-green-600">{formatCurrency(totals.income)}</div>
                                <div className="text-xs text-slate-500 mt-1 hidden sm:block">所有房产总计</div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-brand-gold-light to-white p-4 rounded-xl border border-brand-gold shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-brand-gold-dark uppercase tracking-wider">净收益/亏损</span>
                                <Wallet className="w-5 h-5 text-brand-gold-dark" />
                            </div>
                            <div className="mt-2">
                                <div className={`text-xl md:text-2xl font-extrabold ${totals.net >= 0 ? 'text-brand-slate' : 'text-red-600'}`}>
                                    {formatCurrency(totals.net)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 hidden sm:block">期间总计</div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-brand-blue-light to-white p-4 rounded-xl border border-brand-blue shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-brand-blue-dark uppercase tracking-wider">投资组合价值</span>
                                <Landmark className="w-5 h-5 text-brand-blue-dark" />
                            </div>
                            <div className="mt-2">
                                <div className="text-xl md:text-2xl font-extrabold text-brand-slate">{formatCurrency(totals.propertyValue)}</div>
                                <div className="text-xs text-slate-500 mt-1 hidden sm:block">已付还款总额: {formatCurrency(totals.totalLoanPayments)}</div>
                            </div>
                        </div>
                    </header>
                    <div className="flex-1 p-4 md:p-6 md:pt-4 grid grid-cols-1 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-[300px] md:min-h-[250px]">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                <div className="flex items-center gap-4">
                                  <h3 className="text-lg font-bold text-brand-slate">投资组合现金流</h3>
                                  <button onClick={handleExport} className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue-dark bg-brand-blue-light px-3 py-1.5 rounded-md hover:bg-brand-blue/30 transition-colors">
                                    <FileDown className="w-4 h-4" />
                                    导出Excel
                                  </button>
                                </div>
                                <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mt-2 sm:mt-0">
                                    {(['monthly', 'yearly', '5y', '10y', '25y'] as ChartRange[]).map(r => (
                                        <button key={r} onClick={() => setChartRange(r)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${chartRange === r ? 'bg-white text-brand-blue-dark shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                                            {r.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{fontSize: "12px"}} />
                                        <Bar yAxisId="left" dataKey="income" name="收入" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                        <Bar yAxisId="left" dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                        <Brush dataKey="name" height={25} stroke="#0EA5E9" fill="#E0F2FE" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {renderSaleProjectionCard()}
                    </div>
                </div>
            )}
            
            {mainView === 'upfront' && activeProperty && (
                <div className="flex-1 p-4 md:p-6">
                    <UpfrontExpenses 
                        expenses={activeProperty.oneTimeExpenses} 
                        setExpenses={(newExpenses) => handleUpdateProperty({...activeProperty, oneTimeExpenses: newExpenses})}
                        downPaymentAmount={activeProperty.settings.propertyValue * (activeProperty.settings.downPaymentPercent / 100)}
                        landDepartmentFeeAmount={activeProperty.settings.propertyValue * (activeProperty.settings.landDepartmentFeePercent / 100)}
                    />
                </div>
            )}

            {mainView === 'recurring' && activeProperty && (
                <div className="flex-1 p-4 md:p-6">
                    <MonthlyExpenses 
                        monthlyInputs={activeProperty.monthlyInputs} 
                        setMonthlyInputs={(newInputs) => {
                             const updatedMonthlyInputs = typeof newInputs === 'function' ? newInputs(activeProperty.monthlyInputs) : newInputs;
                             handleUpdateProperty({ ...activeProperty, monthlyInputs: updatedMonthlyInputs });
                        }} 
                        totalMonths={activeProperty.settings.loanTenorMonths}
                    />
                </div>
            )}
        </div>
    );
  };


  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800 bg-brand-bg">
      <aside className="hidden md:block w-full md:w-80 lg:w-96 flex-shrink-0 bg-white md:h-screen md:sticky top-0 z-20">
        <SettingsPanel 
            properties={properties} 
            activePropertyId={activePropertyId} 
            activeProperty={activeProperty} 
            onPropertyChange={handleUpdateProperty} 
            onSelectProperty={setActivePropertyId}
            onRenameProperty={handleRenameProperty}
            onAddProperty={handleAddProperty}
            onDeleteProperty={handleDeleteProperty}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-auto pb-20 md:pb-0">
        {renderHeader()}
        {renderContent()}
      </main>

      {mobileOverlay === 'settings' && (
          <div className="md:hidden fixed inset-0 bg-white z-50">
             <SettingsPanel 
                properties={properties} 
                activePropertyId={activePropertyId} 
                activeProperty={activeProperty} 
                onPropertyChange={handleUpdateProperty} 
                onSelectProperty={setActivePropertyId}
                onRenameProperty={handleRenameProperty}
                onAddProperty={handleAddProperty}
                onDeleteProperty={handleDeleteProperty}
                onClose={() => setMobileOverlay('none')}
            />
          </div>
      )}

      <MobileNav mainView={mainView} setMainView={setMainView} />
    </div>
  );
};

export default Dashboard;
