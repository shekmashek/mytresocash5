import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useTranslation } from '../utils/i18n';
import { Plus, Table, AreaChart, Calendar, Layers, PieChart, Minimize, ChevronLeft, ChevronRight, Eye, TrendingDown, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectSwitcher from './ProjectSwitcher';
import CashflowView from './CashflowView';
import ScheduleView from './ScheduleView';
import ScenarioView from './ScenarioView';
import ExpenseAnalysisView from './ExpenseAnalysisView';
import BudgetTracker from './BudgetTracker';
import { getTodayInTimezone, getStartOfWeek } from '../utils/budgetCalculations';

const FocusView = () => {
    const { state, dispatch } = useBudget();
    const { focusView, activeProjectId, timeUnit, horizonLength, periodOffset, activeQuickSelect, settings } = state;
    const { t } = useTranslation();
    const isConsolidated = activeProjectId === 'consolidated';

    // State for Expense Analysis in Focus Mode
    const [expenseAnalysisTimeUnit, setExpenseAnalysisTimeUnit] = useState('month');
    const [expenseAnalysisPeriodOffset, setExpenseAnalysisPeriodOffset] = useState(0);
    const [expenseAnalysisActiveQuickSelect, setExpenseAnalysisActiveQuickSelect] = useState('month');
    const [expenseAnalysisType, setExpenseAnalysisType] = useState('expense');
    const [expenseAnalysisMode, setExpenseAnalysisMode] = useState('category');

    // State for Schedule View in Focus Mode
    const [scheduleViewMode, setScheduleViewMode] = useState('month');
    const [scheduleCurrentDate, setScheduleCurrentDate] = useState(new Date());

    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const newMenuRef = useRef(null);

    const [visibleColumns, setVisibleColumns] = useState({ budget: true, actual: true, reste: true });

    useEffect(() => {
        if (!isConsolidated && expenseAnalysisMode === 'project') {
            setExpenseAnalysisMode('category');
        }
    }, [isConsolidated, expenseAnalysisMode]);
    
    useEffect(() => {
      const handleClickOutside = (event) => {
          if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
            setIsNewMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const focusNewMenuItems = [
        { label: 'Budget prévisionnel', icon: Plus, action: () => { if (!isConsolidated) { dispatch({ type: 'OPEN_BUDGET_MODAL', payload: null }); } }, disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Ajouter une nouvelle entrée ou sortie prévisionnelle" },
        { label: 'Entrée reçue', icon: TrendingUp, action: () => dispatch({ type: 'OPEN_DIRECT_PAYMENT_MODAL', payload: 'receivable' }), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Encaisser directement des entrées" },
        { label: 'Sortie payée', icon: TrendingDown, action: () => dispatch({ type: 'OPEN_DIRECT_PAYMENT_MODAL', payload: 'payable' }), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Payer directement des sorties" }
    ];

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

    const timeUnitLabels = { day: 'Jour', week: 'Semaine', fortnightly: 'Quinzaine', month: 'Mois', bimonthly: 'Bimestre', quarterly: 'Trimestre', semiannually: 'Semestre', annually: 'Année' };
    const periodLabel = useMemo(() => { if (periodOffset === 0) return 'Actuel'; const label = timeUnitLabels[timeUnit] || 'Période'; const plural = Math.abs(periodOffset) > 1 ? 's' : ''; return `${periodOffset > 0 ? '+' : ''}${periodOffset} ${label}${plural}`; }, [periodOffset, timeUnit, timeUnitLabels]);

    const handleExpenseAnalysisPeriodChange = (direction) => { setExpenseAnalysisPeriodOffset(prev => prev + direction); setExpenseAnalysisActiveQuickSelect(null); };
    const handleExpenseAnalysisQuickPeriodSelect = (quickSelectType) => { let payload; switch (quickSelectType) { case 'month': payload = { timeUnit: 'month', periodOffset: 0 }; break; case 'bimester': payload = { timeUnit: 'bimonthly', periodOffset: 0 }; break; case 'quarter': payload = { timeUnit: 'quarterly', periodOffset: 0 }; break; case 'semester': payload = { timeUnit: 'semiannually', periodOffset: 0 }; break; case 'year': payload = { timeUnit: 'annually', periodOffset: 0 }; break; default: return; } setExpenseAnalysisTimeUnit(payload.timeUnit); setExpenseAnalysisPeriodOffset(payload.periodOffset); setExpenseAnalysisActiveQuickSelect(quickSelectType); };
    
    const { expenseAnalysisRangeStart, expenseAnalysisRangeEnd } = useMemo(() => {
        const today = getTodayInTimezone(settings.timezoneOffset);
        let baseDate;
        let horizon = 1;
        switch (expenseAnalysisTimeUnit) {
            case 'month': baseDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
            case 'bimonthly': const bimonthStartMonth = Math.floor(today.getMonth() / 2) * 2; baseDate = new Date(today.getFullYear(), bimonthStartMonth, 1); break;
            case 'quarterly': const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3; baseDate = new Date(today.getFullYear(), quarterStartMonth, 1); break;
            case 'semiannually': const semiAnnualStartMonth = Math.floor(today.getMonth() / 6) * 6; baseDate = new Date(today.getFullYear(), semiAnnualStartMonth, 1); break;
            case 'annually': baseDate = new Date(today.getFullYear(), 0, 1); break;
            default: baseDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        const periodList = [];
        for (let i = 0; i < horizon; i++) {
            const periodIndex = i + expenseAnalysisPeriodOffset;
            const periodStart = new Date(baseDate);
            switch (expenseAnalysisTimeUnit) {
                case 'month': periodStart.setMonth(periodStart.getMonth() + periodIndex); break;
                case 'bimonthly': periodStart.setMonth(periodStart.getMonth() + periodIndex * 2); break;
                case 'quarterly': periodStart.setMonth(periodStart.getMonth() + periodIndex * 3); break;
                case 'semiannually': periodStart.setMonth(periodStart.getMonth() + periodIndex * 6); break;
                case 'annually': periodStart.setFullYear(periodStart.getFullYear() + periodIndex); break;
            }
            periodList.push(periodStart);
        }
        if (periodList.length === 0) return { expenseAnalysisRangeStart: null, expenseAnalysisRangeEnd: null };
        const firstPeriodStart = periodList[0];
        const lastPeriodStart = periodList[periodList.length - 1];
        const lastPeriodEnd = new Date(lastPeriodStart);
        switch (expenseAnalysisTimeUnit) {
            case 'month': lastPeriodEnd.setMonth(lastPeriodEnd.getMonth() + 1); break;
            case 'bimonthly': lastPeriodEnd.setMonth(lastPeriodEnd.getMonth() + 2); break;
            case 'quarterly': lastPeriodEnd.setMonth(lastPeriodEnd.getMonth() + 3); break;
            case 'semiannually': lastPeriodEnd.setMonth(lastPeriodEnd.getMonth() + 6); break;
            case 'annually': lastPeriodEnd.setFullYear(lastPeriodEnd.getFullYear() + 1); break;
        }
        return { expenseAnalysisRangeStart: firstPeriodStart, expenseAnalysisRangeEnd: lastPeriodEnd };
    }, [expenseAnalysisTimeUnit, expenseAnalysisPeriodOffset, settings.timezoneOffset]);
    
    const expenseAnalysisPeriodLabel = useMemo(() => {
        if (!expenseAnalysisRangeStart) return 'Période';
        const year = expenseAnalysisRangeStart.getFullYear();
        const month = expenseAnalysisRangeStart.getMonth();
        let label = '';
        switch (expenseAnalysisTimeUnit) {
            case 'month': label = expenseAnalysisRangeStart.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }); break;
            case 'bimonthly': const startMonthB = expenseAnalysisRangeStart.toLocaleString('fr-FR', { month: 'short' }); const endMonthB = new Date(year, month + 1, 1).toLocaleString('fr-FR', { month: 'short' }); label = `Bimestre ${startMonthB}-${endMonthB} ${year}`; break;
            case 'quarterly': const quarter = Math.floor(month / 3) + 1; label = `Trimestre ${quarter} ${year}`; break;
            case 'semiannually': const semester = Math.floor(month / 6) + 1; label = `Semestre ${semester} ${year}`; break;
            case 'annually': label = `Année ${year}`; break;
            default: return 'Période';
        }
        return label.charAt(0).toUpperCase() + label.slice(1);
    }, [expenseAnalysisTimeUnit, expenseAnalysisRangeStart]);

    const handleScheduleViewChange = (mode) => setScheduleViewMode(mode);
    const handleScheduleDateNav = (direction) => setScheduleCurrentDate(prevDate => { const newDate = new Date(prevDate); if (scheduleViewMode === 'month') { newDate.setMonth(newDate.getMonth() + direction); } else { newDate.setDate(newDate.getDate() + (direction * 7)); } return newDate; });
    const handleScheduleGoToToday = () => setScheduleCurrentDate(new Date());
    const scheduleHeaderLabel = useMemo(() => { if (scheduleViewMode === 'month') { const label = scheduleCurrentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); } else { const currentDayOfWeek = scheduleCurrentDate.getDay(); const startOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; const weekStartDate = new Date(scheduleCurrentDate); weekStartDate.setDate(weekStartDate.getDate() - startOffset); const endOfWeek = new Date(weekStartDate); endOfWeek.setDate(endOfWeek.getDate() + 6); const startFormatted = weekStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); const endFormatted = endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); return `Semaine du ${startFormatted} au ${endFormatted}`; } }, [scheduleCurrentDate, scheduleViewMode]);

    return (
        <div className="h-screen w-screen bg-background p-4 flex flex-col">
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
                <div>
                    {focusView === 'table' && <h1 className="text-xl font-medium text-gray-800 flex items-center gap-2"><Table className="w-5 h-5 text-blue-600" /><span>Tableau de Trésorerie</span></h1>}
                    {focusView === 'chart' && <h1 className="text-xl font-medium text-gray-800 flex items-center gap-2"><AreaChart className="w-5 h-5 text-green-600" /><span>Flux de Trésorerie</span></h1>}
                    {focusView === 'scenarios' && <h1 className="text-xl font-medium text-gray-800 flex items-center gap-2"><Layers className="w-5 h-5 text-accent-600" /><span>Gestion de Scénarios</span></h1>}
                    {focusView === 'expenseAnalysis' && <h1 className="text-xl font-medium text-gray-800 flex items-center gap-2"><PieChart className="w-5 h-5 text-red-600" /><span>Analyse</span></h1>}
                    {focusView === 'schedule' && <h1 className="text-xl font-medium text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /><span>Échéancier {scheduleHeaderLabel}</span></h1>}
                    <div className="mt-2">
                        <ProjectSwitcher />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {(focusView === 'table' || focusView === 'chart' || focusView === 'scenarios') && (
                        <><div className="flex items-center gap-2"><button onClick={() => handlePeriodChange(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button><span className="text-sm font-semibold text-gray-700 w-24 text-center" title="Décalage par rapport à la période actuelle">{periodLabel}</span><button onClick={() => handlePeriodChange(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button></div><div className="h-8 w-px bg-gray-300"></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => handleQuickPeriodSelect('today')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'today' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Jour</button><button onClick={() => handleQuickPeriodSelect('week')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'week' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Semaine</button><button onClick={() => handleQuickPeriodSelect('month')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'month' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Mois</button><button onClick={() => handleQuickPeriodSelect('quarter')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'quarter' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Trim.</button><button onClick={() => handleQuickPeriodSelect('year')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'year' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Année</button><button onClick={() => handleQuickPeriodSelect('short_term')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'short_term' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>CT (3a)</button><button onClick={() => handleQuickPeriodSelect('medium_term')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'medium_term' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>MT (5a)</button><button onClick={() => handleQuickPeriodSelect('long_term')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'long_term' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>LT (10a)</button></div></>
                    )}
                    {focusView === 'table' && (
                        <><div className="h-8 w-px bg-gray-300"></div><div className="flex items-center gap-2"><Eye className="w-4 h-4 text-text-secondary" /><div className="flex items-center bg-secondary-200 rounded-lg p-0.5"><button onClick={() => setVisibleColumns(p => ({ ...p, budget: !p.budget }))} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visibleColumns.budget ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`}>Prév.</button><button onClick={() => setVisibleColumns(p => ({ ...p, actual: !p.actual }))} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visibleColumns.actual ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`}>Réel</button><button onClick={() => setVisibleColumns(p => ({ ...p, reste: !p.reste }))} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visibleColumns.reste ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`}>Reste</button></div></div></>
                    )}
                    {focusView === 'expenseAnalysis' && (
                        <><div className="flex items-center gap-2"><button onClick={() => handleExpenseAnalysisPeriodChange(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button><span className="text-sm font-semibold text-gray-700 w-auto min-w-[9rem] text-center" title="Période sélectionnée">{expenseAnalysisPeriodLabel}</span><button onClick={() => handleExpenseAnalysisPeriodChange(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button></div><div className="h-8 w-px bg-gray-300"></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => handleExpenseAnalysisQuickPeriodSelect('month')} className={`px-2 py-1 text-xs rounded-md transition-colors ${expenseAnalysisActiveQuickSelect === 'month' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Mois</button><button onClick={() => handleExpenseAnalysisQuickPeriodSelect('bimester')} className={`px-2 py-1 text-xs rounded-md transition-colors ${expenseAnalysisActiveQuickSelect === 'bimester' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Bimestre</button><button onClick={() => handleExpenseAnalysisQuickPeriodSelect('quarter')} className={`px-2 py-1 text-xs rounded-md transition-colors ${expenseAnalysisActiveQuickSelect === 'quarter' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Trimestre</button><button onClick={() => handleExpenseAnalysisQuickPeriodSelect('semester')} className={`px-2 py-1 text-xs rounded-md transition-colors ${expenseAnalysisActiveQuickSelect === 'semester' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Semestre</button><button onClick={() => handleExpenseAnalysisQuickPeriodSelect('year')} className={`px-2 py-1 text-xs rounded-md transition-colors ${expenseAnalysisActiveQuickSelect === 'year' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Année</button></div><div className="h-8 w-px bg-gray-300"></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => setExpenseAnalysisMode('category')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${expenseAnalysisMode === 'category' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Par catégorie</button>{isConsolidated && (<button onClick={() => setExpenseAnalysisMode('project')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${expenseAnalysisMode === 'project' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Par projet</button>)}<button onClick={() => setExpenseAnalysisMode('tier')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${expenseAnalysisMode === 'tier' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Par tiers</button></div><div className="h-8 w-px bg-gray-300"></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => setExpenseAnalysisType('expense')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${expenseAnalysisType === 'expense' ? 'bg-white shadow text-red-600' : 'text-gray-600 hover:bg-gray-300'}`}><TrendingDown className="w-4 h-4" />Sorties</button><button onClick={() => setExpenseAnalysisType('revenue')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${expenseAnalysisType === 'revenue' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:bg-gray-300'}`}><TrendingUp className="w-4 h-4" />Entrées</button></div></>
                    )}
                    {focusView === 'schedule' && (
                        <><div className="flex items-center gap-2"><button onClick={() => handleScheduleDateNav(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button><button onClick={() => handleScheduleDateNav(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button></div><div className="h-8 w-px bg-gray-300"></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => handleScheduleViewChange('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${scheduleViewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Mois</button><button onClick={() => handleScheduleViewChange('week')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${scheduleViewMode === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Semaine</button></div><button onClick={handleScheduleGoToToday} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Aujourd'hui</button></>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={newMenuRef}><button onClick={() => setIsNewMenuOpen(p => !p)} disabled={isConsolidated} className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed" title="Créer"><Plus className="w-5 h-5" /></button>
                        <AnimatePresence>{isNewMenuOpen && (<motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"><ul className="p-2">{focusNewMenuItems.map(item => (<li key={item.label}><button onClick={() => { if (!item.disabled) { item.action(); setIsNewMenuOpen(false); } }} disabled={item.disabled} title={item.tooltip} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"><item.icon className="w-4 h-4 text-gray-500" /><span>{item.label}</span></button></li>))}</ul></motion.div>)}</AnimatePresence>
                    </div>
                    <div className="flex items-center bg-secondary-200 rounded-lg p-1"><button onClick={() => dispatch({ type: 'SET_FOCUS_VIEW', payload: 'table' })} className={`p-2 rounded-md transition-colors ${focusView === 'table' ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`} title="Vue Tableau"><Table size={20} /></button><button onClick={() => dispatch({ type: 'SET_FOCUS_VIEW', payload: 'chart' })} className={`p-2 rounded-md transition-colors ${focusView === 'chart' ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`} title="Vue Graphique"><AreaChart size={20} /></button><button onClick={() => dispatch({ type: 'SET_FOCUS_VIEW', payload: 'schedule' })} className={`p-2 rounded-md transition-colors ${focusView === 'schedule' ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`} title="Vue Échéancier"><Calendar size={20} /></button><button onClick={() => dispatch({ type: 'SET_FOCUS_VIEW', payload: 'scenarios' })} className={`p-2 rounded-md transition-colors ${focusView === 'scenarios' ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`} title="Vue Scénarios"><Layers size={20} /></button><button onClick={() => dispatch({ type: 'SET_FOCUS_VIEW', payload: 'expenseAnalysis' })} className={`p-2 rounded-md transition-colors ${focusView === 'expenseAnalysis' ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`} title="Vue Analyse"><PieChart size={20} /></button></div>
                    <button onClick={() => dispatch({ type: 'SET_FOCUS_VIEW', payload: 'none' })} className="p-2 text-secondary-500 hover:text-primary-600" title="Quitter le focus"><Minimize size={20} /></button>
                </div>
            </div>
            <div className="flex-grow min-h-0">
                {focusView === 'table' && <BudgetTracker />}
                {focusView === 'chart' && <div className="h-full bg-background rounded-lg overflow-hidden"><CashflowView isFocusMode={true} /></div>}
                {focusView === 'scenarios' && <div className="h-full bg-background rounded-lg overflow-hidden"><ScenarioView isFocusMode={true} /></div>}
                {focusView === 'schedule' && <div className="h-full bg-background rounded-lg overflow-hidden"><ScheduleView isFocusMode={true} currentDate={scheduleCurrentDate} viewMode={scheduleViewMode} /></div>}
                {focusView === 'expenseAnalysis' && <div className="h-full bg-background rounded-lg overflow-hidden"><ExpenseAnalysisView isFocusMode={true} rangeStart={expenseAnalysisRangeStart} rangeEnd={expenseAnalysisRangeEnd} analysisType={expenseAnalysisType} analysisMode={expenseAnalysisMode} setAnalysisMode={setExpenseAnalysisMode} /></div>}
            </div>
        </div>
    );
};

export default FocusView;
