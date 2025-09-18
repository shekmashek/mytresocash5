import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Layers, Eye, EyeOff, Archive, ChevronLeft, ChevronRight, List } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useBudget } from '../context/BudgetContext';
import BudgetModal from './BudgetModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../utils/formatting';
import { getEntryAmountForPeriod, getTodayInTimezone, getStartOfWeek } from '../utils/budgetCalculations';
import { resolveScenarioEntries } from '../utils/scenarioCalculations';
import { useTranslation } from '../utils/i18n';
import ScenarioEntriesDrawer from './ScenarioEntriesDrawer';

const colorMap = {
  '#8b5cf6': { bg: 'bg-violet-50', text: 'text-violet-800', button: 'bg-violet-200 hover:bg-violet-300', line: '#8b5cf6' },
  '#f97316': { bg: 'bg-orange-50', text: 'text-orange-800', button: 'bg-orange-200 hover:bg-orange-300', line: '#f97316' },
  '#d946ef': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', button: 'bg-fuchsia-200 hover:bg-fuchsia-300', line: '#d946ef' },
};
const defaultColors = colorMap['#8b5cf6'];

const ScenarioView = ({ isFocusMode = false }) => {
  const { state, dispatch } = useBudget();
  const { activeProjectId, projects, scenarios, allEntries, allActuals, allCashAccounts, scenarioEntries, settings, timeUnit, horizonLength, periodOffset, activeQuickSelect } = state;
  const { t } = useTranslation();

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const isConsolidated = activeProjectId === 'consolidated';

  const projectScenarios = useMemo(() => {
    if (isConsolidated) {
      const activeProjectIds = projects.filter(p => !p.isArchived).map(p => p.id);
      return scenarios
        .filter(s => activeProjectIds.includes(s.projectId) && !s.isArchived)
        .map(s => {
            const project = projects.find(p => p.id === s.projectId);
            return { ...s, displayName: `${s.name} (${project?.name || 'N/A'})` };
        });
    }
    return scenarios
      .filter(s => s.projectId === activeProjectId && !s.isArchived)
      .map(s => ({ ...s, displayName: s.name }));
  }, [scenarios, activeProjectId, isConsolidated, projects]);

  const handlePeriodChange = (direction) => dispatch({ type: 'SET_PERIOD_OFFSET', payload: periodOffset + direction });
  const handleQuickPeriodSelect = (quickSelectType) => {
    const today = getTodayInTimezone(settings.timezoneOffset);
    let payload;
    switch (quickSelectType) {
      case 'today': payload = { timeUnit: 'day', horizonLength: 1, periodOffset: 0, activeQuickSelect: 'today' }; break;
      case 'week': { const dayOfWeek = today.getDay(); const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; payload = { timeUnit: 'day', horizonLength: 7, periodOffset: offsetToMonday, activeQuickSelect: 'week' }; break; }
      case 'month': { const year = today.getFullYear(); const month = today.getMonth(); const firstDayOfMonth = new Date(year, month, 1); const lastDayOfMonth = new Date(year, month + 1, 0); const startOfWeekOfFirstDay = getStartOfWeek(firstDayOfMonth); const startOfWeekOfLastDay = getStartOfWeek(lastDayOfMonth); const horizon = Math.round((startOfWeekOfLastDay - startOfWeekOfFirstDay) / (1000 * 60 * 60 * 24 * 7)) + 1; const startOfCurrentWeek = getStartOfWeek(today); const offsetInTime = startOfWeekOfFirstDay - startOfCurrentWeek; const offsetInWeeks = Math.round(offsetInTime / (1000 * 60 * 60 * 24 * 7)); payload = { timeUnit: 'week', horizonLength: horizon, periodOffset: offsetInWeeks, activeQuickSelect: 'month' }; break; }
      case 'quarter': { const currentQuarterStartMonth = Math.floor(today.getMonth() / 3) * 3; const firstDayOfQuarter = new Date(today.getFullYear(), currentQuarterStartMonth, 1); const currentFortnightStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() <= 15 ? 1 : 16); const targetFortnightStart = new Date(firstDayOfQuarter.getFullYear(), firstDayOfQuarter.getMonth(), 1); const monthsDiff = (currentFortnightStart.getFullYear() - targetFortnightStart.getFullYear()) * 12 + (currentFortnightStart.getMonth() - targetFortnightStart.getMonth()); let fortnightOffset = -monthsDiff * 2; if (currentFortnightStart.getDate() > 15) { fortnightOffset -= 1; } payload = { timeUnit: 'fortnightly', horizonLength: 6, periodOffset: fortnightOffset, activeQuickSelect: 'quarter' }; break; }
      case 'year': { const currentMonth = today.getMonth(); const offsetToJanuary = -currentMonth; payload = { timeUnit: 'month', horizonLength: 12, periodOffset: offsetToJanuary, activeQuickSelect: 'year' }; break; }
      case 'short_term': { payload = { timeUnit: 'annually', horizonLength: 3, periodOffset: 0, activeQuickSelect: 'short_term' }; break; }
      case 'medium_term': { payload = { timeUnit: 'annually', horizonLength: 5, periodOffset: 0, activeQuickSelect: 'medium_term' }; break; }
      case 'long_term': { payload = { timeUnit: 'annually', horizonLength: 10, periodOffset: 0, activeQuickSelect: 'long_term' }; break; }
      default: return;
    }
    dispatch({ type: 'SET_QUICK_PERIOD', payload });
  };
  const timeUnitLabels = { day: t('sidebar.day'), week: t('sidebar.week'), fortnightly: t('sidebar.fortnightly'), month: t('sidebar.month'), bimonthly: t('sidebar.bimonthly'), quarterly: t('sidebar.quarterly'), semiannually: t('sidebar.semiannually'), annually: t('sidebar.annually'), };
  const periodLabel = useMemo(() => { if (periodOffset === 0) return 'Actuel'; const label = timeUnitLabels[timeUnit] || 'Période'; const plural = Math.abs(periodOffset) > 1 ? 's' : ''; return `${periodOffset > 0 ? '+' : ''}${periodOffset} ${label}${plural}`; }, [periodOffset, timeUnit, timeUnitLabels, t]);

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
            case 'fortnightly': { const d = new Date(baseDate); let numFortnights = periodIndex; let currentMonth = d.getMonth(); let isFirstHalf = d.getDate() === 1; const monthsToAdd = Math.floor(((isFirstHalf ? 0 : 1) + numFortnights) / 2); d.setMonth(currentMonth + monthsToAdd); const newIsFirstHalf = (((isFirstHalf ? 0 : 1) + numFortnights) % 2 + 2) % 2 === 0; d.setDate(newIsFirstHalf ? 1 : 16); periodStart.setTime(d.getTime()); break; }
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
            case 'day': if (activeQuickSelect === 'week') { const dayLabel = periodStart.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }); label = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1); } else { label = periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); } break;
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

  const chartData = useMemo(() => {
    const baseBudgetEntries = isConsolidated ? Object.values(allEntries).flat() : allEntries[activeProjectId] || [];
    const baseActuals = isConsolidated ? Object.values(allActuals).flat() : allActuals[activeProjectId] || [];
    const userCashAccounts = isConsolidated ? Object.values(allCashAccounts).flat() : allCashAccounts[activeProjectId] || [];

    const calculateBalanceSeries = (budgetEntriesForCalc, actualsForCalc) => {
        if (periods.length === 0) return { actualBalance: [], projectedBalance: [] };
        
        const periodFlows = periods.map(period => {
            const { startDate: periodStart, endDate: periodEnd } = period;
            const netRealizedFlow = actualsForCalc.reduce((sum, actual) => {
                const paymentInPeriod = (actual.payments || []).filter(p => new Date(p.paymentDate) >= periodStart && new Date(p.paymentDate) < periodEnd).reduce((pSum, p) => pSum + p.paidAmount, 0);
                return actual.type === 'receivable' ? sum + paymentInPeriod : sum - paymentInPeriod;
            }, 0);

            const netBudgetedFlow = budgetEntriesForCalc.reduce((sum, e) => {
                const amount = getEntryAmountForPeriod(e, periodStart, periodEnd);
                return e.type === 'revenu' ? sum + amount : sum - amount;
            }, 0);

            return { netRealizedFlow, netBudgetedFlow };
        });

        const chartStartDate = periods[0].startDate;
        const initialBalancesSum = userCashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
        const allActualsFlat = Object.values(allActuals).flat();
        const netFlowOfPastPayments = allActualsFlat.flatMap(actual => actual.payments || []).filter(p => new Date(p.paymentDate) < chartStartDate).reduce((sum, p) => {
            const actual = allActualsFlat.find(a => (a.payments || []).some(payment => payment.id === p.id));
            return actual?.type === 'receivable' ? sum + p.paidAmount : sum - p.paidAmount;
        }, 0);
        const calculatedStartingBalance = initialBalancesSum + netFlowOfPastPayments;
        
        const today = getTodayInTimezone(settings.timezoneOffset);
        let todayIndex = periods.findIndex(p => today >= p.startDate && today < p.endDate);
        if (todayIndex === -1) {
            if (periods.length > 0 && today < periods[0].startDate) todayIndex = -1;
            else if (periods.length > 0 && today >= periods[periods.length - 1].endDate) todayIndex = periods.length - 1;
        }
        
        const balanceData = [];
        let currentBalance = calculatedStartingBalance;
        for (let i = 0; i <= todayIndex; i++) {
            if (periodFlows[i]) currentBalance += periodFlows[i].netRealizedFlow;
            balanceData.push(currentBalance);
        }

        if (todayIndex > -1 && todayIndex < periods.length - 1) {
            let futureBalance = balanceData[todayIndex];
            const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
            const netImpayes = actualsForCalc.filter(a => new Date(a.date) < today && unpaidStatuses.includes(a.status)).reduce((sum, actual) => {
                const remaining = actual.amount - (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
                return actual.type === 'receivable' ? sum + remaining : sum - remaining;
            }, 0);
            futureBalance += netImpayes;
            for (let i = todayIndex + 1; i < periods.length; i++) {
                if (periodFlows[i]) futureBalance += periodFlows[i].netBudgetedFlow;
                balanceData.push(futureBalance);
            }
        }
        
        return {
            actualBalance: balanceData.map((val, i) => i <= todayIndex ? val : null),
            projectedBalance: balanceData.map((val, i) => i >= todayIndex ? val : null),
        };
    };

    const baseSeries = calculateBalanceSeries(baseBudgetEntries, baseActuals);
    
    const scenarioSeries = projectScenarios.filter(s => s.isVisible).map(scenario => {
        const scenarioFullEntries = resolveScenarioEntries(baseBudgetEntries, scenarioEntries[scenario.id] || []);
        const scenarioBalances = calculateBalanceSeries(scenarioFullEntries, baseActuals);
        return {
            id: scenario.id,
            name: scenario.displayName,
            color: (colorMap[scenario.color] || defaultColors).line,
            data: scenarioBalances.projectedBalance,
        };
    });

    return {
        labels: periods.map(p => p.label),
        base: baseSeries,
        scenarios: scenarioSeries,
    };
  }, [periods, activeProjectId, allEntries, allActuals, allCashAccounts, scenarios, scenarioEntries, isConsolidated, settings.timezoneOffset, projectScenarios]);

  const getChartOptions = () => {
    if (!chartData.labels || chartData.labels.length === 0) {
      return { title: { text: 'Aucune donnée à afficher', left: 'center', top: 'center' }, series: [] };
    }

    const labelFormatter = (params) => {
        if (params.value === null || params.value === undefined) return '';
        return formatCurrency(params.value, { ...settings, displayUnit: 'thousands', decimalPlaces: 0 });
    };

    const series = [
      { name: 'Solde Réel (Base)', type: 'line', data: chartData.base.actualBalance, symbol: 'circle', symbolSize: 8, itemStyle: { color: '#3b82f6' }, lineStyle: { width: 3, type: 'solid' }, z: 10,
        label: { show: true, position: 'top', formatter: labelFormatter, color: '#1e3a8a', fontSize: 10, distance: 5 }
      },
      { name: 'Solde Prévisionnel (Base)', type: 'line', data: chartData.base.projectedBalance, symbol: 'none', itemStyle: { color: '#3b82f6' }, lineStyle: { width: 3, type: 'dashed' }, z: 10,
        label: { show: true, position: 'top', formatter: labelFormatter, color: '#1d4ed8', fontSize: 10, distance: 5 }
      },
      ...chartData.scenarios.map(sc => ({
        name: `Scénario: ${sc.name}`, type: 'line', data: sc.data, symbol: 'none', itemStyle: { color: sc.color }, lineStyle: { width: 3, type: 'dashed' },
        label: { show: true, position: 'top', formatter: labelFormatter, color: sc.color, fontSize: 10, distance: 5 }
      }))
    ];
    return {
      tooltip: { trigger: 'axis', formatter: (params) => params.map(p => `${p.marker} ${p.seriesName}: <strong>${formatCurrency(p.value, settings)}</strong>`).join('<br/>') },
      legend: { data: series.map(s => s.name), top: 'bottom', type: 'scroll' },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: chartData.labels, axisTick: { alignWithLabel: true } },
      yAxis: { type: 'value', axisLabel: { formatter: (value) => formatCurrency(value, settings) } },
      series: series
    };
  };

  const handleOpenScenarioModal = (scenario = null) => dispatch({ type: 'OPEN_SCENARIO_MODAL', payload: scenario });
  const handleDeleteScenario = (scenarioId) => dispatch({ type: 'OPEN_CONFIRMATION_MODAL', payload: { title: 'Supprimer ce scénario ?', message: 'Cette action est irréversible.', onConfirm: () => dispatch({ type: 'DELETE_SCENARIO', payload: scenarioId }) } });
  const handleArchiveScenario = (scenarioId) => {
    const scenarioToArchive = scenarios.find(s => s.id === scenarioId);
    if (!scenarioToArchive) return;
    dispatch({ type: 'OPEN_CONFIRMATION_MODAL', payload: { title: `Archiver le scénario "${scenarioToArchive.name}" ?`, message: "L'archivage d'un scénario le masquera de la liste, mais toutes ses données seront conservées. Vous pourrez le restaurer à tout moment.", onConfirm: () => dispatch({ type: 'ARCHIVE_SCENARIO', payload: scenarioId }), confirmText: 'Archiver', cancelText: 'Annuler', confirmColor: 'primary' } });
  };
  const handleAddEntryToScenario = (scenarioId) => { setActiveScenarioId(scenarioId); setEditingEntry(null); setIsBudgetModalOpen(true); };
  const handleSaveScenarioEntry = (entryData) => { dispatch({ type: 'SAVE_SCENARIO_ENTRY', payload: { scenarioId: activeScenarioId, entryData, editingEntry } }); setIsBudgetModalOpen(false); setActiveScenarioId(null); };
  const handleToggleVisibility = (scenarioId) => dispatch({ type: 'TOGGLE_SCENARIO_VISIBILITY', payload: scenarioId });

  const handleOpenDrawer = (scenario) => {
    setSelectedScenario(scenario);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedScenario(null);
  };

  const handleAddEntryInDrawer = () => {
    if (!selectedScenario) return;
    setActiveScenarioId(selectedScenario.id);
    setEditingEntry(null);
    setIsBudgetModalOpen(true);
  };

  const handleEditEntryInDrawer = (entry) => {
    if (!selectedScenario) return;
    setActiveScenarioId(selectedScenario.id);
    setEditingEntry(entry);
    setIsBudgetModalOpen(true);
  };

  const handleDeleteEntryInDrawer = (entryId) => {
    if (!selectedScenario) return;
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: 'Supprimer cette modification ?',
        message: "Cette modification sera retirée du scénario. Si c'est une nouvelle entrée, elle sera supprimée. Si c'est une modification d'une entrée de base, l'entrée de base sera restaurée.",
        onConfirm: () => dispatch({ type: 'DELETE_SCENARIO_ENTRY', payload: { scenarioId: selectedScenario.id, entryId } }),
      }
    });
  };

  return (
    <div className={isFocusMode ? "h-full flex flex-col" : "container mx-auto p-6 max-w-full flex flex-col h-full"}>
      {!isFocusMode && (
        <div className="mb-8 flex justify-between items-start">
            <div className="flex items-center gap-4">
            <Layers className="w-8 h-8 text-accent-600" />
            <div><h1 className="text-2xl font-bold text-gray-900">Gestion de Scénarios</h1></div>
            </div>
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow mb-8 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Vos Scénarios</h2>
          {projectScenarios.length < 3 && (<button onClick={() => handleOpenScenarioModal()} disabled={isConsolidated} className="bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"><Plus className="w-5 h-5" /> Nouveau Scénario</button>)}
        </div>
        <div className="space-y-3">
          {projectScenarios.length > 0 ? (projectScenarios.map(scenario => { const colors = colorMap[scenario.color] || defaultColors; return (
              <div key={scenario.id} className={`p-4 border rounded-lg flex justify-between items-center ${colors.bg}`}>
                <div><h3 className={`font-bold ${colors.text}`}>{scenario.displayName}</h3><p className={`text-sm ${colors.text}`}>{scenario.description}</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleVisibility(scenario.id)} className="p-2 text-gray-500 hover:text-gray-800" title={scenario.isVisible ? "Masquer dans le graphique" : "Afficher dans le graphique"}>{scenario.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  <button onClick={() => handleOpenDrawer(scenario)} disabled={isConsolidated} className="p-2 text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" title="Gérer les écritures"><List className="w-4 h-4" /></button>
                  <button onClick={() => handleAddEntryToScenario(scenario.id)} disabled={isConsolidated} className={`p-2 text-sm rounded-md flex items-center gap-1 ${colors.button} ${colors.text} disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}><Plus className="w-4 h-4" /> Ajouter une entrée</button>
                  <button onClick={() => handleOpenScenarioModal(scenario)} disabled={isConsolidated} className="p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleArchiveScenario(scenario.id)} disabled={isConsolidated} className="p-2 text-yellow-600 hover:text-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed" title="Archiver"><Archive className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteScenario(scenario.id)} disabled={isConsolidated} className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ); })) : (<EmptyState icon={Layers} title="Aucun scénario pour l'instant" message="Créez des simulations pour comparer différentes hypothèses financières et prendre de meilleures décisions." actionText={isConsolidated ? undefined : "Nouveau Scénario"} onActionClick={isConsolidated ? undefined : () => handleOpenScenarioModal()} />)}
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow flex-grow flex flex-col min-h-0">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Comparaison des Soldes de Trésorerie</h2>
        <div className="mb-6 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2"><button onClick={() => handlePeriodChange(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button><span className="text-sm font-semibold text-gray-700 w-24 text-center" title="Décalage par rapport à la période actuelle">{periodLabel}</span><button onClick={() => handlePeriodChange(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button></div>
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
        <div className="flex-grow min-h-0">
          <ReactECharts option={getChartOptions()} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} />
        </div>
      </div>
      {isBudgetModalOpen && <BudgetModal isOpen={isBudgetModalOpen} onClose={() => { setIsBudgetModalOpen(false); setActiveScenarioId(null); }} onSave={handleSaveScenarioEntry} editingData={editingEntry} />}
      <ScenarioEntriesDrawer 
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        scenario={selectedScenario}
        onAddEntry={handleAddEntryInDrawer}
        onEditEntry={handleEditEntryInDrawer}
        onDeleteEntry={handleDeleteEntryInDrawer}
      />
    </div>
  );
};

export default ScenarioView;
