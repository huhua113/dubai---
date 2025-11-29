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
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';

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
            0: { dewa: 2130, ac: 2423.38, serviceFees: 1146, loanPayment: 5552.65 },
            1: { dewa: 542.33, ac: 587.06, serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 5880 },
            2: { loanPayment: 5552.65, rentalIncome: 13000 },
            3: { loanPayment: 5552.65, rentalIncome: 13000 },
            4: { serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 13000 },
            5: { loanPayment: 5552.65, rentalIncome: 13000 },
            6: { loanPayment: 5552.65, rentalIncome: 13000 },
            7: { serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 13000 },
            8: { loanPayment: 5552.65, rentalIncome: 13000 },
            9: { loanPayment: 5552.65, rentalIncome: 13000 },
            10: { serviceFees: 4915.71, loanPayment: 5552.65, rentalIncome: 13000 },
            11: { loanPayment: 5552.65, rentalIncome: 13000 },
            12: { loanPayment: 5552.65 },
            13: { loanPayment: 5552.65 },
        }
    };
};

const propertiesCollection = collection(db, 'properties');

const Dashboard: React.FC = () => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay>('none');
  const [chartRange, setChartRange] = useState<ChartRange>('yearly');

  useEffect(() => {
    const fetchAndInitialize = async () => {
        try {
            const q = query(propertiesCollection, orderBy("createdAt", "asc"), limit(1));
            let querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const defaultPropertyData = createNewProperty("我的房产");
                await addDoc(propertiesCollection, defaultPropertyData);
                // Refetch after adding the default property
                querySnapshot = await getDocs(q);
            }

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setProperty({ ...doc.data(), id: doc.id } as Property);
            }
        } catch (error) {
            console.error("从 Firestore 获取房产数据时出错:", error);
            // Re-throw to be caught by the outer Promise.race().catch()
            throw error;
        }
    };
    
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('数据加载超时。请检查您的网络连接和Firebase配置。')), 10000)
    );

    setLoading(true);
    Promise.race([fetchAndInitialize(), timeoutPromise])
        .catch(error => {
            console.error(error);
        })
        .finally(() => {
            setLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const activeProperty = property;
  
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
      setProperty(updatedProperty);
  }, []);

  const { totals, chartData, totalExpenseForCard, totalDownPayment, detailedPortfolioResults } = useMemo(() => {
    if (!property) return { 
        totals: { recurring: 0, upfront: 0, income: 0, net: 0, propertyValue: 0, totalLoanPayments: 0 }, 
        chartData: [],
        totalExpenseForCard: 0,
        totalDownPayment: 0,
        detailedPortfolioResults: []
    };
    
    const { totals: propTotals, results } = calculateSimulation(property.settings, property.oneTimeExpenses, property.monthlyInputs);
    
    const totalDownPayment = property.settings.propertyValue * (property.settings.downPaymentPercent / 100);

    const maxTenor = property.settings.loanTenorMonths;

    const combinedMonthlyResultsForChart = results.map(m => ({
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
    
    const calculatedTotalExpense = propTotals.recurring + propTotals.upfront - totalDownPayment;

    const finalTotals = {
      ...propTotals,
      propertyValue: property.settings.propertyValue
    };

    return { totals: finalTotals, chartData: aggregatedData, totalExpenseForCard: calculatedTotalExpense, totalDownPayment, detailedPortfolioResults: results };
  }, [property, chartRange]);

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

  const navItems = [
    { id: 'dashboard', label: '概览', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'upfront', label: '一次性费用', icon: <Wallet className="w-5 h-5" /> },
    { id: 'recurring', label: '周期性费用', icon: <Repeat className="w-5 h-5" /> },
  ];

  const renderHeader = () => (
    <div className="p-4 md:p-6 flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold text-brand-slate">房产收益概览</h1>
            <p className="text-sm text-slate-500">
                分析您的房产投资回报
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
            <div className="flex-1 flex items-center justify-center p-4 bg-brand-bg">
                <div className="text-center text-slate-600 flex flex-col items-center gap-4 p-10 bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200">
                    <LoaderCircle className="w-10 h-10 animate-spin text-brand-blue" />
                    <h3 className="font-bold text-lg text-brand-slate mt-2">正在加载您的房产数据</h3>
                    <p className="text-sm text-slate-500">请稍候，我们正在从云端获取最新数据...</p>
                </div>
            </div>
        );
    }
    
    if (!activeProperty) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h3 className="font-bold text-lg text-brand-slate mb-2">无法加载房产数据</h3>
            <p className="text-slate-500">请刷新页面或检查您的网络连接与Firebase配置。</p>
          </div>
        </div>
      )
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
                                <span className="text-xs font-bold text-brand-blue-dark uppercase tracking-wider">房产价值</span>
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
                                  <h3 className="text-lg font-bold text-brand-slate">现金流</h3>
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
                                        {chartData.length > 12 && <Brush dataKey="name" height={25} stroke="#0EA5E9" fill="#E0F2FE" />}
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
            activeProperty={activeProperty} 
            onPropertyChange={handleUpdateProperty} 
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-auto pb-20 md:pb-0">
        {renderHeader()}
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center border-b border-t border-slate-200 px-6 bg-white/50 sticky top-0 z-10">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setMainView(item.id as MainView)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative 
                  ${mainView === item.id 
                    ? 'text-brand-blue-dark' 
                    : 'text-slate-500 hover:text-brand-blue'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {mainView === item.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-gold rounded-t-full"></div>}
              </button>
            ))}
        </div>

        {renderContent()}
      </main>

      {mobileOverlay === 'settings' && (
          <div className="md:hidden fixed inset-0 bg-white z-50">
             <SettingsPanel 
                activeProperty={activeProperty} 
                onPropertyChange={handleUpdateProperty} 
                onClose={() => setMobileOverlay('none')}
            />
          </div>
      )}

      <MobileNav mainView={mainView} setMainView={setMainView} />
    </div>
  );
};

export default Dashboard;