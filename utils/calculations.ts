import { PropertySettings, MonthlyData, OneTimeExpense } from '../types';

export const calculateSimulation = (
  settings: PropertySettings,
  expenses: OneTimeExpense[],
  monthlyInputs: Record<number, Partial<MonthlyData>>
): { results: MonthlyData[]; totals: { upfront: number; recurring: number; income: number; net: number; totalLoanPayments: number } } => {
  
  const results: MonthlyData[] = [];

  const landDepartmentFeeAmount = settings.propertyValue * (settings.landDepartmentFeePercent / 100);
  const oneTimeCostsFromExpenseArray = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalOneTimeCosts = landDepartmentFeeAmount + oneTimeCostsFromExpenseArray;
  
  for (let i = 0; i < settings.loanTenorMonths; i++) {
    const inputs = monthlyInputs[i] || {};
    
    const dewa = inputs.dewa || 0;
    const ac = inputs.ac || 0;
    const serviceFees = inputs.serviceFees || 0;
    const other = inputs.otherMaintenance || 0;
    const rental = inputs.rentalIncome || 0;
    const loanPayment = inputs.loanPayment || 0;

    results.push({
      monthIndex: i,
      dewa,
      ac,
      serviceFees,
      otherMaintenance: other,
      rentalIncome: rental,
      loanPayment: loanPayment,
      oneTimeExpenses: i === 0 ? totalOneTimeCosts : 0,
    });
  }

  const downPayment = settings.propertyValue * (settings.downPaymentPercent / 100);
  
  // Sum up upfront costs (for totals card, includes everything)
  const totalUpfront = expenses.reduce((sum, item) => sum + item.amount, 0) + downPayment + landDepartmentFeeAmount;
  
  let totalRecurring = 0;
  let totalIncome = 0;
  let totalLoanPayments = 0;

  results.forEach(m => {
    // Note: totalRecurring does NOT include oneTimeExpenses. They are part of totalUpfront.
    const monthlyExpenses = m.dewa + m.ac + m.serviceFees + m.otherMaintenance + (m.loanPayment || 0);
    totalRecurring += monthlyExpenses;
    totalIncome += m.rentalIncome;
    totalLoanPayments += (m.loanPayment || 0);
  });

  return {
    results,
    totals: {
      upfront: totalUpfront,
      recurring: totalRecurring,
      income: totalIncome,
      net: totalIncome - (totalRecurring + totalUpfront), // Net value over period
      totalLoanPayments: totalLoanPayments
    }
  };
};

export const calculateSaleProjection = (
  settings: PropertySettings,
  expenses: OneTimeExpense[],
  monthlyInputs: Record<number, Partial<MonthlyData>>,
  estimatedSalePrice: number,
  monthsHeld: number
) => {
  if (monthsHeld <= 0 || !settings || !expenses) {
    return {
      remainingPrincipal: 0,
      earlyRepaymentPenalty: 0,
      totalProfit: 0,
      annualizedROI: 0,
    };
  }

  // 1. Calculate Total Upfront Investment
  const downPayment = settings.propertyValue * (settings.downPaymentPercent / 100);
  const landDepartmentFeeAmount = settings.propertyValue * (settings.landDepartmentFeePercent / 100);
  const totalUpfrontCosts = expenses.reduce((sum, item) => sum + item.amount, 0) + downPayment + landDepartmentFeeAmount;

  // 2. Calculate Cumulative Operating Income/Loss over the period held
  let cumulativeOperatingIncome = 0;
  for (let i = 0; i < monthsHeld; i++) {
    const month = monthlyInputs[i] || {};
    const income = month.rentalIncome || 0;
    const expense = (month.dewa || 0) + (month.ac || 0) + (month.serviceFees || 0) + (month.otherMaintenance || 0) + (month.loanPayment || 0);
    cumulativeOperatingIncome += (income - expense);
  }

  // 3. Estimate Remaining Loan Principal (Linear Approximation)
  const remainingPrincipal = Math.max(0, settings.loanAmount * (1 - monthsHeld / settings.loanTenorMonths));

  // 4. Calculate Early Repayment Penalty (1% of remaining, capped at 10,000 AED)
  const earlyRepaymentPenalty = Math.min(remainingPrincipal * 0.01, 10000);

  // 5. Calculate Total Profit
  const capitalGain = estimatedSalePrice - settings.propertyValue;
  const totalProfit = capitalGain + cumulativeOperatingIncome - earlyRepaymentPenalty;

  // 6. Calculate Annualized ROI (Simple ROI, not compounded)
  const yearsHeld = monthsHeld / 12;
  const totalInvestment = totalUpfrontCosts;
  const annualizedROI = yearsHeld > 0 && totalInvestment > 0 ? (totalProfit / totalInvestment) / yearsHeld * 100 : 0;

  return {
    remainingPrincipal,
    earlyRepaymentPenalty,
    totalProfit,
    annualizedROI,
  };
};


export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(val);
};