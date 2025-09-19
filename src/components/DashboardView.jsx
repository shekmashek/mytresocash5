import React, { useMemo, useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { Wallet, TrendingDown, HandCoins, AlertTriangle, PieChart, LineChart, Compass, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { getTodayInTimezone, getEntryAmountForPeriod } from '../utils/budgetCalculations';
import SparklineChart from './SparklineChart';
import ReactECharts from 'echarts-for-react';
import MonthlyBudgetSummary from './MonthlyBudgetSummary';
import ExpertTipWidget from './ExpertTipWidget';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardView = () => {
  const { state, dispatch } = useBudget();
  const { activeProjectId, allActuals, allCashAccounts, settings, categories, allEntries, projects } = state;
  
  const [activeTab, setActiveTab] = useState('overview');

  const isConsolidated = activeProjectId === 'consolidated';

  const activeProjectName = useMemo(() => {
    if (isConsolidated) {
      return 'Consolidé';
    }
    const project = projects.find(p => p.id === activeProjectId);
    return project ? project.name : '';
  }, [activeProjectId, projects, isConsolidated]);

  const relevantActuals = useMemo(() => {
    return isConsolidated
      ? Object.entries(allActuals).flatMap(([projectId, actuals]) => actuals.map(actual => ({ ...actual, projectId })))
      : (allActuals[activeProjectId] || []).map(actual => ({ ...actual, projectId: activeProjectId }));
  }, [activeProjectId, allActuals, isConsolidated]);

  const userCashAccounts = useMemo(() => {
    return isConsolidated
      ? Object.values(allCashAccounts).flat()
      : allCashAccounts[activeProjectId] || [];
  }, [allCashAccounts, activeProjectId, isConsolidated]);

  // --- KPI Calculations ---
  const totalActionableBalance = useMemo(() => {
    return userCashAccounts.reduce((sum, account) => {
      let currentBalance = parseFloat(account.initialBalance) || 0;
      const accountPayments = relevantActuals
        .flatMap(actual => (actual.payments || []).filter(p => p.cashAccount === account.id).map(p => ({ ...p, type: actual.type })));
      
      for (const payment of accountPayments) {
        if (payment.type === 'receivable') currentBalance += payment.paidAmount;
        else if (payment.type === 'payable') currentBalance -= payment.paidAmount;
      }

      const blockedForProvision = relevantActuals
        .filter(actual => actual.isProvision && actual.provisionDetails?.destinationAccountId === account.id && actual.status !== 'paid')
        .reduce((sum, actual) => {
          const paidAmount = (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
          return sum + (actual.amount - paidAmount);
        }, 0);
      
      return sum + (currentBalance - blockedForProvision);
    }, 0);
  }, [userCashAccounts, relevantActuals]);

  const overdueItems = useMemo(() => {
    const today = getTodayInTimezone(settings.timezoneOffset);
    return relevantActuals
      .filter(actual => {
        const dueDate = new Date(actual.date);
        return ['pending', 'partially_paid', 'partially_received'].includes(actual.status) && dueDate < today;
      })
      .map(actual => {
        const totalPaid = (actual.payments || []).reduce((sum, p) => sum + p.paidAmount, 0);
        return { ...actual, remainingAmount: actual.amount - totalPaid };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [relevantActuals, settings.timezoneOffset]);

  const totalOverduePayables = overdueItems.filter(i => i.type === 'payable').reduce((sum, i) => sum + i.remainingAmount, 0);
  const totalOverdueReceivables = overdueItems.filter(i => i.type === 'receivable').reduce((sum, i) => sum + i.remainingAmount, 0);

  // --- Chart Data Calculations ---
  const expenseDistributionData = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const expensesThisMonth = relevantActuals.filter(actual => 
        actual.type === 'payable' && 
        (actual.payments || []).some(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
        })
    );

    const dataByMainCategory = {};
    const mainCategoryMap = new Map();
    categories.expense.forEach(mc => {
        mc.subCategories.forEach(sc => {
            mainCategoryMap.set(sc.name, mc.name);
        });
    });

    expensesThisMonth.forEach(actual => {
        const mainCategoryName = mainCategoryMap.get(actual.category) || 'Autres';
        const paymentAmount = (actual.payments || []).reduce((sum, p) => {
            const paymentDate = new Date(p.paymentDate);
            return (paymentDate >= startOfMonth && paymentDate <= endOfMonth) ? sum + p.paidAmount : sum;
        }, 0);
        dataByMainCategory[mainCategoryName] = (dataByMainCategory[mainCategoryName] || 0) + paymentAmount;
    });

    return Object.entries(dataByMainCategory)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [relevantActuals, categories.expense]);

  const dashboardSparklineData = useMemo(() => {
    const timeUnit = 'month';
    const horizonLength = 12;
    const periodOffset = 0;

    const today = getTodayInTimezone(settings.timezoneOffset);
    const baseDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthlyPeriods = [];
    for (let i = 0; i < horizonLength; i++) {
        const periodIndex = i + periodOffset;
        const periodStart = new Date(baseDate);
        periodStart.setMonth(periodStart.getMonth() + periodIndex);
        
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        
        const label = periodStart.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        
        monthlyPeriods.push({ label, startDate: periodStart, endDate: periodEnd });
    }

    const budgetEntries = isConsolidated ? Object.values(allEntries).flat() : allEntries[activeProjectId] || [];
    const actuals = isConsolidated ? Object.values(allActuals).flat() : allActuals[activeProjectId] || [];

    const groupedData = (() => {
        const groupByType = (type) => {
          const catType = type === 'revenu' ? 'revenue' : 'expense';
          if (!categories || !categories[catType]) return [];
          return categories[catType].map(mainCat => {
            if (!mainCat.subCategories) return null;
            const entriesForMainCat = budgetEntries.filter(entry => mainCat.subCategories.some(sc => sc.name === entry.category));
            return entriesForMainCat.length > 0 ? { ...mainCat, entries: entriesForMainCat } : null;
          }).filter(Boolean);
        };
        return { entree: groupByType('revenu'), sortie: groupByType('depense') };
    })();

    const hasOffBudgetRevenues = budgetEntries.some(e => e.isOffBudget && e.type === 'revenu');
    const hasOffBudgetExpenses = budgetEntries.some(e => e.isOffBudget && e.type === 'depense');

    const calculateOffBudgetTotalsForPeriod = (type, period) => {
      const offBudgetEntries = budgetEntries.filter(e => e.isOffBudget && e.type === type);
      const budget = offBudgetEntries.reduce((sum, entry) => sum + getEntryAmountForMonth(entry, period.startDate.getMonth(), period.startDate.getFullYear()), 0);
      return { budget };
    };

    const calculateMainCategoryTotals = (entries, period) => {
        const budget = entries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
        return { budget };
    };

    const calculateGeneralTotals = (mainCategories, period, type) => {
        const totals = mainCategories.reduce((acc, mainCategory) => {
          const categoryTotals = calculateMainCategoryTotals(mainCategory.entries, period);
          acc.budget += categoryTotals.budget;
          return acc;
        }, { budget: 0 });
        if (type === 'entree' && hasOffBudgetRevenues) {
            totals.budget += calculateOffBudgetTotalsForPeriod('revenu', period).budget;
        } else if (type === 'sortie' && hasOffBudgetExpenses) {
            totals.budget += calculateOffBudgetTotalsForPeriod('depense', period).budget;
        }
        return totals;
    };
    
    const firstPeriodStart = monthlyPeriods[0].startDate;
    const initialBalanceSum = userCashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
    const netFlowBeforeFirstPeriod = actuals
      .flatMap(actual => actual.payments || [])
      .filter(p => new Date(p.paymentDate) < firstPeriodStart)
      .reduce((sum, p) => {
        const actual = actuals.find(a => (a.payments || []).some(payment => payment.id === p.id));
        if (!actual) return sum;
        return actual.type === 'receivable' ? sum + p.paidAmount : sum - p.paidAmount;
      }, 0);
    const startingBalance = initialBalanceSum + netFlowBeforeFirstPeriod;

    const positions = [];
    let lastPeriodFinalPosition = startingBalance;
    
    const todayIndex = monthlyPeriods.findIndex(p => today >= p.startDate && today < p.endDate);

    for (let i = 0; i <= todayIndex; i++) {
        if (!monthlyPeriods[i]) continue;
        const period = monthlyPeriods[i];
        const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
        const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
        const netActual = actuals.reduce((sum, actual) => {
            const paymentInPeriod = (actual.payments || []).filter(p => new Date(p.paymentDate) >= period.startDate && new Date(p.paymentDate) < period.endDate).reduce((pSum, p) => pSum + p.paidAmount, 0);
            return actual.type === 'receivable' ? sum + paymentInPeriod : sum - paymentInPeriod;
        }, 0);
        const finalPosition = lastPeriodFinalPosition + netActual;
        positions.push(finalPosition);
        lastPeriodFinalPosition = finalPosition;
    }
    
    if (todayIndex < monthlyPeriods.length - 1) {
        const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
        const impayes = actuals.filter(a => new Date(a.date) < today && unpaidStatuses.includes(a.status));
        const netImpayes = impayes.reduce((sum, actual) => {
            const totalPaid = (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
            const remaining = actual.amount - totalPaid;
            return actual.type === 'receivable' ? sum + remaining : sum - remaining;
        }, 0);
        lastPeriodFinalPosition += netImpayes;
        
        for (let i = todayIndex + 1; i < monthlyPeriods.length; i++) {
            if (!monthlyPeriods[i]) continue;
            const period = monthlyPeriods[i];
            const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
            const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
            const netPlanned = revenueTotals.budget - expenseTotals.budget;
            const finalPosition = lastPeriodFinalPosition + netPlanned;
            positions.push(finalPosition);
            lastPeriodFinalPosition = finalPosition;
        }
    }

    return {
        balances: positions,
        periods: monthlyPeriods,
    };
  }, [activeProjectId, allEntries, allActuals, allCashAccounts, categories, settings.timezoneOffset, isConsolidated]);

  const chartTitle = useMemo(() => {
    const today = new Date();
    const monthName = today.toLocaleString('fr-FR', { month: 'long' });
    const year = today.getFullYear();
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `Sorties ${capitalizedMonth} ${year}`;
  }, []);

  const getDonutChartOptions = () => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c}€ ({d}%)' },
    legend: { show: false },
    series: [{
        name: 'Sorties',
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}: {d}%', fontSize: 11, color: '#4b5563' },
        labelLine: { show: true, length: 10, length2: 15 },
        emphasis: { label: { show: true, fontSize: '12', fontWeight: 'bold' } },
        data: expenseDistributionData,
    }]
  });

  const handleActionClick = (e, item) => {
    dispatch({ type: 'OPEN_TRANSACTION_ACTION_MENU', payload: { x: e.clientX, y: e.clientY, transaction: item } });
  };
  
  const greetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour Levy";
    if (hour < 18) return "Bon après-midi Levy";
    return "Bonsoir Levy";
  }

  const startTour = () => {
    dispatch({ type: 'START_TOUR' });
  };

  const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="container mx-auto p-6 max-w-full space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{greetingMessage()} !</h1>
          <p className="text-gray-600">Bienvenue sur votre tableau de bord. Voici un aperçu de votre situation.</p>
        </div>
        <button onClick={startTour} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors">
            <Compass className="w-4 h-4" />
            Faire une visite guidée
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start gap-4">
          <div className="bg-green-100 p-3 rounded-full"><Wallet className="w-6 h-6 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Trésorerie Actionnable</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalActionableBalance, settings)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-full"><TrendingDown className="w-6 h-6 text-red-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Dettes en Retard</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverduePayables, settings)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start gap-4">
          <div className="bg-yellow-100 p-3 rounded-full"><HandCoins className="w-6 h-6 text-yellow-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Créances en Retard</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalOverdueReceivables, settings)}</p>
          </div>
        </div>
      </div>

      <ExpertTipWidget />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Vue d'ensemble
          </button>
          <button onClick={() => setActiveTab('budget')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'budget' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Budget Annuel
          </button>
          <button onClick={() => setActiveTab('analysis')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analysis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Analyse des Dépenses
          </button>
        </nav>
      </div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {activeTab === 'overview' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Actions Prioritaires <span className="text-gray-500 font-medium">- {activeProjectName}</span>
                </h2>
                {overdueItems.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ height: '28rem' }}>
                    {overdueItems.map(item => {
                      const project = isConsolidated ? projects.find(p => p.id === item.projectId) : null;
                      return (
                        <button key={item.id} onClick={(e) => handleActionClick(e, item)} className="w-full text-left p-2 rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${item.type === 'payable' ? 'bg-red-100' : 'bg-green-100'}`}>
                                      {item.type === 'payable' ? <ArrowDown className="w-4 h-4 text-red-600" /> : <ArrowUp className="w-4 h-4 text-green-600" />}
                                  </div>
                                  <div className="overflow-hidden">
                                      <p className="font-semibold truncate text-gray-800" title={item.thirdParty}>
                                        {item.thirdParty}
                                        {isConsolidated && project && <span className="text-xs font-normal text-gray-500 ml-1">({project.name})</span>}
                                      </p>
                                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                          <span>{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                                          <span className="text-gray-500">({Math.floor((new Date() - new Date(item.date)) / (1000 * 60 * 60 * 24))}j en retard)</span>
                                      </div>
                                  </div>
                              </div>
                              <p className="text-base font-normal whitespace-nowrap pl-2 text-gray-600">{formatCurrency(item.remainingAmount, settings)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-[28rem] flex items-center justify-center">
                      <div className="text-center text-gray-500 py-10">
                          <p>Aucune action prioritaire. Tout est à jour !</p>
                      </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'budget' && (
              <MonthlyBudgetSummary />
            )}

            {activeTab === 'analysis' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <LineChart className="w-5 h-5 text-blue-600" />
                      Tendance de la Trésorerie (12 mois)
                    </h3>
                    <SparklineChart
                      data={dashboardSparklineData.balances}
                      periods={dashboardSparklineData.periods}
                      currencySettings={settings}
                      showXAxis={true}
                      xAxisLabels={dashboardSparklineData.periods.map(p => p.label.charAt(0))}
                    />
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      {chartTitle}
                    </h3>
                    {expenseDistributionData.length > 0 ? (
                      <ReactECharts option={getDonutChartOptions()} style={{ height: '250px' }} />
                    ) : (
                      <div className="text-center text-gray-500 py-16">
                        <p>Aucune sortie ce mois-ci.</p>
                      </div>
                    )}
                  </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardView;
