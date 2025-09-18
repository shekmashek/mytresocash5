import React, { useState, useMemo, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, Archive, ChevronLeft, ChevronRight, AreaChart } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import CashflowDetailDrawer from './CashflowDetailDrawer';
import BudgetModal from './BudgetModal';
import { formatCurrency } from '../utils/formatting';
import { useBudget } from '../context/BudgetContext';
import { generateScenarioActuals, resolveScenarioEntries } from '../utils/scenarioCalculations';
import { getEntryAmountForPeriod, getTodayInTimezone, getStartOfWeek } from '../utils/budgetCalculations';
import { useTranslation } from '../utils/i18n';

function renderBudgetLine(params, api) {
  const flowType = api.value(2);
  const xValue = api.value(0);
  const yValue = api.value(1);

  if (!yValue) {
    return;
  }

  const point = api.coord([xValue, yValue]);
  if (!point) return;

  const totalBandWidth = api.size([1, 0])[0];
  
  const barWidth = (totalBandWidth / 2) * 0.8;
  const halfBarWidth = barWidth / 2;
  
  const bandCenterOffset = totalBandWidth / 4;
  
  const horizontalOffset = flowType === 'outflow' ? bandCenterOffset : -bandCenterOffset;

  const center_x = point[0] + horizontalOffset;

  return {
    type: 'line',
    shape: {
      x1: center_x - halfBarWidth,
      y1: point[1],
      x2: center_x + halfBarWidth,
      y2: point[1]
    },
    style: api.style({
      stroke: api.visual('color'),
      lineWidth: 3
    })
  };
}

const CashflowView = ({ isFocusMode = false }) => {
  const { state, dispatch } = useBudget();
  const { activeProjectId, projects, allEntries, allActuals, allCashAccounts, settings, scenarios, scenarioEntries, timeUnit, horizonLength, periodOffset, activeQuickSelect } = state;
  const { t } = useTranslation();
  const isConsolidated = activeProjectId === 'consolidated';

  const [isScenarioBudgetModalOpen, setIsScenarioBudgetModalOpen] = useState(false);
  const [editingScenarioEntry, setEditingScenarioEntry] = useState(null);
  const [activeScenarioIdForModal, setActiveScenarioIdForModal] = useState(null);
  const [drawerData, setDrawerData] = useState({ isOpen: false, transactions: [], title: '' });
  const [selectedScenarios, setSelectedScenarios] = useState({});

  const handlePeriodChange = (direction) => {
    dispatch({ type: 'SET_PERIOD_OFFSET', payload: periodOffset + direction });
  };

  const handleQuickPeriodSelect = (quickSelectType) => {
    const today = getTodayInTimezone(settings.timezoneOffset);
    let payload;

    switch (quickSelectType) {
      case 'today':
        payload = { timeUnit: 'day', horizonLength: 1, periodOffset: 0, activeQuickSelect: 'today' };
        break;
      case 'week': {
        const dayOfWeek = today.getDay(); // Sunday=0, Monday=1, ...
        const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        payload = { timeUnit: 'day', horizonLength: 7, periodOffset: offsetToMonday, activeQuickSelect: 'week' };
        break;
      }
      case 'month': {
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const startOfWeekOfFirstDay = getStartOfWeek(firstDayOfMonth);
        const startOfWeekOfLastDay = getStartOfWeek(lastDayOfMonth);
        
        const horizon = Math.round((startOfWeekOfLastDay - startOfWeekOfFirstDay) / (1000 * 60 * 60 * 24 * 7)) + 1;
        
        const startOfCurrentWeek = getStartOfWeek(today);
        const offsetInTime = startOfWeekOfFirstDay - startOfCurrentWeek;
        const offsetInWeeks = Math.round(offsetInTime / (1000 * 60 * 60 * 24 * 7));

        payload = { timeUnit: 'week', horizonLength: horizon, periodOffset: offsetInWeeks, activeQuickSelect: 'month' };
        break;
      }
      case 'quarter': {
        const currentQuarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        const firstDayOfQuarter = new Date(today.getFullYear(), currentQuarterStartMonth, 1);
        const currentFortnightStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() <= 15 ? 1 : 16);
        const targetFortnightStart = new Date(firstDayOfQuarter.getFullYear(), firstDayOfQuarter.getMonth(), 1);
        const monthsDiff = (currentFortnightStart.getFullYear() - targetFortnightStart.getFullYear()) * 12 + (currentFortnightStart.getMonth() - targetFortnightStart.getMonth());
        let fortnightOffset = -monthsDiff * 2;
        if (currentFortnightStart.getDate() > 15) {
            fortnightOffset -= 1;
        }
        payload = { timeUnit: 'fortnightly', horizonLength: 6, periodOffset: fortnightOffset, activeQuickSelect: 'quarter' };
        break;
      }
      case 'year': {
        const currentMonth = today.getMonth(); // 0-11
        const offsetToJanuary = -currentMonth;
        payload = { timeUnit: 'month', horizonLength: 12, periodOffset: offsetToJanuary, activeQuickSelect: 'year' };
        break;
      }
      case 'short_term': {
        payload = { timeUnit: 'annually', horizonLength: 3, periodOffset: -2, activeQuickSelect: 'short_term' };
        break;
      }
      case 'medium_term': {
        payload = { timeUnit: 'annually', horizonLength: 5, periodOffset: 0, activeQuickSelect: 'medium_term' };
        break;
      }
      case 'long_term': {
        payload = { timeUnit: 'annually', horizonLength: 10, periodOffset: 0, activeQuickSelect: 'long_term' };
        break;
      }
      default:
        return;
    }
    dispatch({ type: 'SET_QUICK_PERIOD', payload });
  };
  
  const timeUnitLabels = {
    day: t('sidebar.day'),
    week: t('sidebar.week'),
    fortnightly: t('sidebar.fortnightly'),
    month: t('sidebar.month'),
    bimonthly: t('sidebar.bimonthly'),
    quarterly: t('sidebar.quarterly'),
    semiannually: t('sidebar.semiannually'),
    annually: t('sidebar.annually'),
  };
  
  const periodLabel = useMemo(() => {
    if (periodOffset === 0) return 'Actuel';
    const label = timeUnitLabels[timeUnit] || 'Période';
    const plural = Math.abs(periodOffset) > 1 ? 's' : '';
    return `${periodOffset > 0 ? '+' : ''}${periodOffset} ${label}${plural}`;
  }, [periodOffset, timeUnit, timeUnitLabels, t]);

  const handleScenarioSelectionChange = (scenarioId) => {
    setSelectedScenarios(prev => ({ ...prev, [scenarioId]: !prev[scenarioId] }));
  };
  
  const projectScenarios = useMemo(() => {
    if (isConsolidated) {
      return scenarios.map(s => {
        const project = projects.find(p => p.id === s.projectId);
        return { ...s, name: `${s.name} (${project?.name || 'N/A'})` };
      });
    }
    return scenarios.filter(s => s.projectId === activeProjectId && !s.isArchived);
  }, [scenarios, activeProjectId, isConsolidated, projects]);

  useEffect(() => {
    const initialSelection = {};
    projectScenarios.forEach(s => {
      initialSelection[s.id] = selectedScenarios[s.id] === undefined ? true : selectedScenarios[s.id];
    });
    setSelectedScenarios(initialSelection);
  }, [projectScenarios]);

  const baseActuals = useMemo(() => {
    if (isConsolidated) return Object.values(allActuals).flat();
    const project = projects.find(p => p.id === activeProjectId) || projects[0];
    return project ? (allActuals[project.id] || []) : [];
  }, [activeProjectId, projects, allActuals, isConsolidated]);

  const userCashAccounts = useMemo(() => { if (isConsolidated) { return Object.values(allCashAccounts).flat(); } return allCashAccounts[activeProjectId] || []; }, [allCashAccounts, activeProjectId, isConsolidated]);

  const periods = useMemo(() => {
    const today = getTodayInTimezone(settings.timezoneOffset);
    let baseDate;
    switch (timeUnit) {
        case 'day': baseDate = new Date(today); baseDate.setHours(0,0,0,0); break;
        case 'week': baseDate = getStartOfWeek(today); break;
        case 'fortnightly': const day = today.getDate(); baseDate = new Date(today.getFullYear(), today.getMonth(), day <= 15 ? 1 : 16); break;
        case 'month': baseDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
        case 'bimonthly': const bimonthStartMonth = Math.floor(today.getMonth() / 2) * 2; baseDate = new Date(today.getFullYear(), bimonthStartMonth, 1); break;
        case 'quarterly': const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3; baseDate = new Date(today.getFullYear(), quarterStartMonth, 1); break;
        case 'semiannually': const semiAnnualStartMonth = Math.floor(today.getMonth() / 6) * 6; baseDate = new Date(today.getFullYear(), semiAnnualStartMonth, 1); break;
        case 'annually': baseDate = new Date(today.getFullYear(), 0, 1); break;
        default: baseDate = getStartOfWeek(today);
    }

    const periodList = [];
    for (let i = 0; i < horizonLength; i++) {
        const periodIndex = i + periodOffset;
        const periodStart = new Date(baseDate);
        switch (timeUnit) {
            case 'day': periodStart.setDate(periodStart.getDate() + periodIndex); break;
            case 'week': periodStart.setDate(periodStart.getDate() + periodIndex * 7); break;
            case 'fortnightly': {
                const d = new Date(baseDate);
                let numFortnights = periodIndex;
                let currentMonth = d.getMonth();
                let isFirstHalf = d.getDate() === 1;
                const monthsToAdd = Math.floor(((isFirstHalf ? 0 : 1) + numFortnights) / 2);
                d.setMonth(currentMonth + monthsToAdd);
                const newIsFirstHalf = (((isFirstHalf ? 0 : 1) + numFortnights) % 2 + 2) % 2 === 0;
                d.setDate(newIsFirstHalf ? 1 : 16);
                periodStart.setTime(d.getTime());
                break;
            }
            case 'month': periodStart.setMonth(periodStart.getMonth() + periodIndex); break;
            case 'bimonthly': periodStart.setMonth(periodStart.getMonth() + periodIndex * 2); break;
            case 'quarterly': periodStart.setMonth(periodStart.getMonth() + periodIndex * 3); break;
            case 'semiannually': periodStart.setMonth(periodStart.getMonth() + periodIndex * 6); break;
            case 'annually': periodStart.setFullYear(periodStart.getFullYear() + periodIndex); break;
        }
        periodList.push(periodStart);
    }

    return periodList.map((periodStart) => {
        const periodEnd = new Date(periodStart);
        switch (timeUnit) {
            case 'day': periodEnd.setDate(periodEnd.getDate() + 1); break;
            case 'week': periodEnd.setDate(periodEnd.getDate() + 7); break;
            case 'fortnightly': if (periodStart.getDate() === 1) { periodEnd.setDate(16); } else { periodEnd.setMonth(periodEnd.getMonth() + 1); periodEnd.setDate(1); } break;
            case 'month': periodEnd.setMonth(periodEnd.getMonth() + 1); break;
            case 'bimonthly': periodEnd.setMonth(periodEnd.getMonth() + 2); break;
            case 'quarterly': periodEnd.setMonth(periodEnd.getMonth() + 3); break;
            case 'semiannually': periodEnd.setMonth(periodEnd.getMonth() + 6); break;
            case 'annually': periodEnd.setFullYear(periodEnd.getFullYear() + 1); break;
        }
        const year = periodStart.toLocaleDateString('fr-FR', { year: '2-digit' });
        const monthsShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        let label = '';
        switch (timeUnit) {
            case 'day':
                if (activeQuickSelect === 'week') {
                    const dayLabel = periodStart.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
                    label = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
                } else {
                    label = periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                }
                break;
            case 'week': label = `S ${periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`; break;
            case 'fortnightly': const fortnightNum = periodStart.getDate() === 1 ? '1' : '2'; label = `${fortnightNum}Q-${monthsShort[periodStart.getMonth()]}'${year}`; break;
            case 'month': label = `${periodStart.toLocaleString('fr-FR', { month: 'short' })} '${year}`; break;
            case 'bimonthly': const startMonthB = monthsShort[periodStart.getMonth()]; const endMonthB = monthsShort[(periodStart.getMonth() + 1) % 12]; label = `${startMonthB}-${endMonthB}`; break;
            case 'quarterly': const quarter = Math.floor(periodStart.getMonth() / 3) + 1; label = `T${quarter} '${year}`; break;
            case 'semiannually': const semester = Math.floor(periodStart.getMonth() / 6) + 1; label = `S${semester} '${year}`; break;
            case 'annually': label = periodStart.getFullYear(); break;
        }
        return { label, startDate: periodStart, endDate: periodEnd };
    });
  }, [timeUnit, horizonLength, periodOffset, activeQuickSelect, settings.timezoneOffset]);

  const cashflowData = useMemo(() => {
    const calculateCashflowData = (actualsForCalc, budgetEntriesForCalc) => {
        const chartPeriods = periods;
        if (chartPeriods.length === 0) return { labels: [], periods: [], inflows: [], outflows: [], budgetedInflows: [], budgetedOutflows: [], actualBalance: [], projectedBalance: [], todayIndex: -1 };
        
        const today = getTodayInTimezone(settings.timezoneOffset);
        let todayIndex = -1;
        for (let i = 0; i < chartPeriods.length; i++) {
            if (today >= chartPeriods[i].startDate && today < chartPeriods[i].endDate) {
                todayIndex = i;
                break;
            }
        }
        if (todayIndex === -1 && chartPeriods.length > 0 && today < chartPeriods[0].startDate) {
            todayIndex = -1;
        } else if (todayIndex === -1 && chartPeriods.length > 0 && today >= chartPeriods[chartPeriods.length - 1].endDate) {
            todayIndex = chartPeriods.length - 1;
        }
        
        const periodFlows = chartPeriods.map((period, i) => {
            const { startDate: periodStart, endDate: periodEnd } = period;
            let realizedInflow = 0;
            let realizedOutflow = 0;

            actualsForCalc.forEach(actual => {
                (actual.payments || []).forEach(payment => {
                    const paymentDate = new Date(payment.paymentDate);
                    if (paymentDate >= periodStart && paymentDate < periodEnd) {
                        if (actual.type === 'receivable') realizedInflow += payment.paidAmount;
                        else if (actual.type === 'payable') realizedOutflow += payment.paidAmount;
                    }
                });
            });

            const budgetedInflow = budgetEntriesForCalc.filter(e => e.type === 'revenu').reduce((sum, e) => sum + getEntryAmountForPeriod(e, periodStart, periodEnd), 0);
            const budgetedOutflow = budgetEntriesForCalc.filter(e => e.type === 'depense').reduce((sum, e) => sum + getEntryAmountForPeriod(e, periodStart, periodEnd), 0);

            const isFuture = i > todayIndex;

            return {
                inflow: isFuture ? budgetedInflow : realizedInflow,
                outflow: isFuture ? budgetedOutflow : realizedOutflow,
                isFuture: isFuture,
                netRealizedFlow: realizedInflow - realizedOutflow,
                budgetedInflow,
                budgetedOutflow,
            };
        });
        
        const chartStartDate = chartPeriods[0].startDate;
        const initialBalancesSum = userCashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
        
        const allActualsFlat = Object.values(allActuals).flat();
        const pastPayments = allActualsFlat.flatMap(actual => actual.payments || []).filter(p => new Date(p.paymentDate) < chartStartDate);
        const netFlowOfPastPayments = pastPayments.reduce((sum, p) => {
            const actual = allActualsFlat.find(a => (a.payments || []).some(payment => payment.id === p.id));
            if (!actual) return sum;
            return actual.type === 'receivable' ? sum + p.paidAmount : sum - p.paidAmount;
        }, 0);
        const calculatedStartingBalance = initialBalancesSum + netFlowOfPastPayments;
        
        const balanceData = [];
        let currentBalance = calculatedStartingBalance;

        for (let i = 0; i <= todayIndex; i++) {
            if (periodFlows[i]) {
                currentBalance += periodFlows[i].netRealizedFlow;
            }
            balanceData.push(currentBalance);
        }

        if (todayIndex > -1 && todayIndex < chartPeriods.length - 1) {
            let futureBalance = balanceData[todayIndex];
            
            const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
            const impayes = actualsForCalc.filter(a => new Date(a.date) < today && unpaidStatuses.includes(a.status));
            
            const netImpayes = impayes.reduce((sum, actual) => {
                const totalPaid = (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
                const remaining = actual.amount - totalPaid;
                return actual.type === 'receivable' ? sum + remaining : sum - remaining;
            }, 0);

            futureBalance += netImpayes;

            for (let i = todayIndex + 1; i < chartPeriods.length; i++) {
                const netPlannedFlow = periodFlows[i].budgetedInflow - periodFlows[i].budgetedOutflow;
                futureBalance += netPlannedFlow;
                balanceData.push(futureBalance);
            }
        }

        const actualBalance = balanceData.map((val, i) => i <= todayIndex ? val : null);
        const projectedBalance = balanceData.map((val, i) => i >= todayIndex ? val : null);

        return {
            labels: chartPeriods.map(p => p.label),
            periods: chartPeriods,
            inflows: periodFlows.map(f => ({ value: f.inflow, isFuture: f.isFuture })),
            outflows: periodFlows.map(f => ({ value: f.outflow, isFuture: f.isFuture })),
            budgetedInflows: periodFlows.map(f => f.budgetedInflow),
            budgetedOutflows: periodFlows.map(f => f.budgetedOutflow),
            actualBalance,
            projectedBalance,
            todayIndex,
        };
    };

    const baseBudgetEntries = isConsolidated ? Object.values(allEntries).flat() : allEntries[activeProjectId] || [];
    const baseFlow = calculateCashflowData(baseActuals, baseBudgetEntries);
    
    return { base: baseFlow };
  }, [baseActuals, projectScenarios, selectedScenarios, state.scenarioEntries, activeProjectId, allEntries, allActuals, isConsolidated, periods, userCashAccounts, allCashAccounts, settings.timezoneOffset]);
  
  const getCashflowChartOptions = () => {
    const { base } = cashflowData;

    if (!base || !base.labels || base.labels.length === 0) {
        return {
            title: { text: 'Aucune donnée à afficher', left: 'center', top: 'center' },
            series: []
        };
    }

    const { labels, inflows, outflows, budgetedInflows, budgetedOutflows, actualBalance, projectedBalance, todayIndex } = base;

    const labelFormatter = (params) => {
        if (params.value === null || params.value === undefined) return '';
        return formatCurrency(params.value, { ...settings, displayUnit: 'thousands', decimalPlaces: 0 });
    };

    const negativeLabelFormatter = (params) => {
        if (params.value === null || params.value === undefined) return '';
        return formatCurrency(Math.abs(params.value), { ...settings, displayUnit: 'thousands', decimalPlaces: 0 });
    };

    const seriesData = [
        {
            name: 'Entrées',
            type: 'bar',
            stack: 'flows',
            barMaxWidth: 50,
            data: inflows.map(item => item.value),
            itemStyle: {
                color: (params) => inflows[params.dataIndex].isFuture ? '#86efac' : '#22c55e'
            },
            label: {
                show: true,
                position: 'top',
                formatter: (params) => params.value > 0 ? labelFormatter(params) : '',
                color: (params) => inflows[params.dataIndex].isFuture ? '#16a34a' : '#166534',
                fontSize: 10,
            }
        },
        {
            name: 'Sorties',
            type: 'bar',
            stack: 'flows',
            barMaxWidth: 50,
            data: outflows.map(item => -item.value),
            itemStyle: {
                color: (params) => outflows[params.dataIndex].isFuture ? '#fca5a5' : '#ef4444'
            },
            label: {
                show: true,
                position: 'bottom',
                formatter: (params) => params.value < 0 ? negativeLabelFormatter(params) : '',
                color: (params) => outflows[params.dataIndex].isFuture ? '#dc2626' : '#991b1b',
                fontSize: 10,
            }
        },
        {
            name: 'Solde Réel',
            type: 'line',
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: { color: '#3b82f6' }, // primary-500
            lineStyle: { width: 3, type: 'solid' },
            data: actualBalance,
            label: {
                show: true,
                position: 'top',
                formatter: labelFormatter,
                color: '#1d4ed8',
                fontSize: 10,
                distance: 5,
            }
        },
        {
            name: 'Solde Prévisionnel',
            type: 'line',
            symbol: 'none',
            itemStyle: { color: '#3b82f6' },
            lineStyle: { width: 3, type: 'dashed' },
            data: projectedBalance,
            label: {
                show: true,
                position: 'top',
                formatter: labelFormatter,
                color: '#2563eb',
                fontSize: 10,
                distance: 5,
            }
        },
        {
            name: 'Budget Entrées',
            type: 'custom',
            renderItem: renderBudgetLine,
            itemStyle: { borderWidth: 2 },
            data: budgetedInflows.map((val, i) => [i, val, 'inflow']),
            encode: { x: 0, y: 1 },
            color: '#10b981', // emerald-500
            z: 10,
        },
        {
            name: 'Budget Sorties',
            type: 'custom',
            renderItem: renderBudgetLine,
            itemStyle: { borderWidth: 2 },
            data: budgetedOutflows.map((val, i) => [i, -val, 'outflow']),
            encode: { x: 0, y: 1 },
            color: '#f43f5e', // rose-500
            z: 10,
        }
    ];

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const periodIndex = params[0].dataIndex;
                const periodLabel = params[0].name;
                let tooltip = `<strong>${periodLabel}</strong><br/>`;
                
                const inflowParam = params.find(p => p.seriesName === 'Entrées');
                const outflowParam = params.find(p => p.seriesName === 'Sorties');
                
                const inflow = inflowParam ? inflowParam.value : 0;
                const outflow = outflowParam ? Math.abs(outflowParam.value) : 0;
                
                const isFuture = periodIndex > todayIndex;
                
                tooltip += `<b>Flux ${isFuture ? 'Prévisionnels' : 'Réels'}:</b><br/>`;
                tooltip += `${inflowParam?.marker || ''} Entrées: ${formatCurrency(inflow, settings)}<br/>`;
                tooltip += `${outflowParam?.marker || ''} Sorties: ${formatCurrency(outflow, settings)}<br/>`;
                tooltip += `<b>Flux Net: ${formatCurrency(inflow - outflow, settings)}</b><br/>`;
                
                tooltip += `<hr class="my-1 border-gray-300">`;

                const balanceParam = params.find(p => p.seriesName.includes('Solde') && p.value != null);
                if (balanceParam) {
                    const seriesName = periodIndex <= todayIndex ? 'Solde Réel' : 'Solde Prévisionnel';
                    tooltip += `${balanceParam.marker} ${seriesName}: <strong>${formatCurrency(balanceParam.value, settings)}</strong><br/>`;
                }
                return tooltip;
            }
        },
        legend: {
            data: ['Entrées', 'Sorties', 'Solde Réel', 'Solde Prévisionnel'],
            top: 'bottom',
            type: 'scroll',
            selected: {
                'Budget Entrées': false,
                'Budget Sorties': false,
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                data: labels,
                axisTick: { alignWithLabel: true }
            }
        ],
        yAxis: [
            {
                type: 'value',
                axisLabel: { formatter: (value) => formatCurrency(value, settings) }
            }
        ],
        series: seriesData
    };
  };

  const handleChartClick = (params) => {
    if (params.seriesName !== 'Entrées' && params.seriesName !== 'Sorties') return;
    const periodIndex = params.dataIndex;
    const periodStart = cashflowData.base.periods[periodIndex];
    const periodEnd = new Date(periodStart);
    // ... (rest of the implementation from existing CashflowView)
  };
  const onEvents = { 'click': handleChartClick };

  return (
    <div className={isFocusMode ? "h-full flex flex-col" : "container mx-auto p-6 max-w-full flex flex-col h-full"}>
      {!isFocusMode && (
        <>
            <div className="mb-8 flex justify-between items-start flex-shrink-0">
                <div className="flex items-center gap-4">
                    <AreaChart className="w-8 h-8 text-green-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Flux de Trésorerie</h1>
                    </div>
                </div>
            </div>
            
            <div className="mb-6 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handlePeriodChange(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button>
                        <span className="text-sm font-semibold text-gray-700 w-24 text-center" title="Décalage par rapport à la période actuelle">{periodLabel}</span>
                        <button onClick={() => handlePeriodChange(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border">
                        <button onClick={() => handleQuickPeriodSelect('today')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'today' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>Jour</button>
                        <button onClick={() => handleQuickPeriodSelect('week')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'week' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>Semaine</button>
                        <button onClick={() => handleQuickPeriodSelect('month')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'month' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>Mois</button>
                        <button onClick={() => handleQuickPeriodSelect('quarter')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'quarter' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>Trim.</button>
                        <button onClick={() => handleQuickPeriodSelect('year')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'year' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>Année</button>
                        <button onClick={() => handleQuickPeriodSelect('short_term')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'short_term' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>CT (3a)</button>
                        <button onClick={() => handleQuickPeriodSelect('medium_term')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'medium_term' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>MT (5a)</button>
                        <button onClick={() => handleQuickPeriodSelect('long_term')} className={`px-3 py-1 text-sm rounded-md transition-colors ${activeQuickSelect === 'long_term' ? 'bg-white border border-gray-300 shadow-sm text-gray-900 font-semibold' : 'font-medium text-gray-500 hover:bg-gray-200'}`}>LT (10a)</button>
                    </div>
                </div>
            </div>
        </>
      )}
      
      <div className={isFocusMode ? "flex-grow min-h-0 bg-white rounded-lg shadow flex flex-col" : "bg-white rounded-lg shadow flex flex-col flex-grow min-h-0"}>
        <div className="px-6 pt-4 pb-2 flex justify-between items-center border-b flex-shrink-0">
            <h3 className="font-semibold text-gray-600">Flux (Entrées/Sorties)</h3>
            <h3 className="font-semibold text-blue-600">Solde</h3>
        </div>
        <div className="flex-grow p-4 min-h-0">
            <ReactECharts 
                option={getCashflowChartOptions()} 
                style={{ height: '100%', width: '100%' }} 
                onEvents={onEvents}
                notMerge={true}
                lazyUpdate={true}
            />
        </div>
      </div>
      
      <CashflowDetailDrawer isOpen={drawerData.isOpen} onClose={() => setDrawerData({ isOpen: false, transactions: [], title: '' })} transactions={drawerData.transactions} title={drawerData.title} />
      
      {isScenarioBudgetModalOpen && (
        <BudgetModal
          isOpen={isScenarioBudgetModalOpen}
          onClose={() => { setIsScenarioBudgetModalOpen(false); setActiveScenarioIdForModal(null); }}
          onSave={handleSaveScenarioEntry}
          editingData={editingScenarioEntry}
        />
      )}
    </div>
  );
};

export default CashflowView;
