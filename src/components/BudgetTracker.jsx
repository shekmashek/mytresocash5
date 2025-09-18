import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Edit, Eye, Search, Gem, Table, LogIn, Flag, ChevronDown, Folder, TrendingUp, TrendingDown, Layers, ChevronLeft, ChevronRight, Filter, XCircle, Trash2, Maximize, Minimize, AreaChart, BarChart, Hash, ArrowRightLeft, Archive, Calendar, PieChart, FilePlus, HandCoins, Banknote, AlertTriangle, ChevronUp } from 'lucide-react';
import TransactionDetailDrawer from './TransactionDetailDrawer';
import ResizableTh from './ResizableTh';
import { getEntryAmountForPeriod, getActualAmountForPeriod, getTodayInTimezone } from '../utils/budgetCalculations';
import { formatCurrency } from '../utils/formatting';
import { useBudget } from '../context/BudgetContext';
import { useTranslation } from '../utils/i18n';

const getStartOfWeek = (date) => { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setHours(0, 0, 0, 0); return new Date(d.setDate(diff)); };

const BudgetTracker = () => {
  const { state, dispatch } = useBudget();
  const { projects, categories, settings, allCashAccounts, allEntries, allActuals, activeProjectId, timeUnit, horizonLength, periodOffset, activeQuickSelect } = state;
  const { t } = useTranslation();

  const isConsolidated = activeProjectId === 'consolidated';

  const { activeProject, budgetEntries, actualTransactions } = useMemo(() => {
    if (isConsolidated) {
      return {
        activeProject: { id: 'consolidated', name: 'Projet consolidé' },
        budgetEntries: Object.entries(allEntries).flatMap(([projectId, entries]) => entries.map(entry => ({ ...entry, projectId }))),
        actualTransactions: Object.entries(allActuals).flatMap(([projectId, actuals]) => actuals.map(actual => ({ ...actual, projectId }))),
      };
    } else {
      const project = projects.find(p => p.id === activeProjectId);
      return {
        activeProject: project,
        budgetEntries: project ? (allEntries[project.id] || []) : [],
        actualTransactions: project ? (allActuals[project.id] || []) : [],
      };
    }
  }, [activeProjectId, projects, allEntries, allActuals, isConsolidated]);

  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({ budget: true, actual: true, reste: true });
  const [drawerData, setDrawerData] = useState({ isOpen: false, transactions: [], title: '' });
  const [collapsedItems, setCollapsedItems] = useState({});
  const [isEntreesCollapsed, setIsEntreesCollapsed] = useState(false);
  const [isSortiesCollapsed, setIsSortiesCollapsed] = useState(false);
  const topScrollRef = useRef(null);
  const mainScrollRef = useRef(null);
  const toggleCollapse = (id) => setCollapsedItems(prev => ({ ...prev, [id]: !prev[id] }));
  const [columnWidths, setColumnWidths] = useState(() => { try { const savedWidths = localStorage.getItem('budgetAppColumnWidths'); if (savedWidths) return JSON.parse(savedWidths); } catch (error) { console.error("Failed to parse column widths from localStorage", error); } return { category: 192, supplier: 160, project: 192 }; });
  
  const [isTierSearchOpen, setIsTierSearchOpen] = useState(false);
  const [isProjectSearchOpen, setIsProjectSearchOpen] = useState(false);
  const tierSearchRef = useRef(null);
  const projectSearchRef = useRef(null);
  const today = getTodayInTimezone(settings.timezoneOffset);

  useEffect(() => {
      const handleClickOutside = (event) => {
          if (tierSearchRef.current && !tierSearchRef.current.contains(event.target)) {
            setIsTierSearchOpen(false);
          }
          if (projectSearchRef.current && !projectSearchRef.current.contains(event.target)) {
            setIsProjectSearchOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
      };
  }, []);

  useEffect(() => localStorage.setItem('budgetAppColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);
  useEffect(() => { const topEl = topScrollRef.current; const mainEl = mainScrollRef.current; if (!topEl || !mainEl) return; let isSyncing = false; const syncTopToMain = () => { if (!isSyncing) { isSyncing = true; mainEl.scrollLeft = topEl.scrollLeft; requestAnimationFrame(() => { isSyncing = false; }); } }; const syncMainToTop = () => { if (!isSyncing) { isSyncing = true; topEl.scrollLeft = mainEl.scrollLeft; requestAnimationFrame(() => { isSyncing = false; }); } }; topEl.addEventListener('scroll', syncTopToMain); mainEl.addEventListener('scroll', syncMainToTop); return () => { topEl.removeEventListener('scroll', syncTopToMain); mainEl.removeEventListener('scroll', syncMainToTop); }; }, []);
  const handleResize = (columnId, newWidth) => setColumnWidths(prev => ({ ...prev, [columnId]: Math.max(newWidth, 80) }));
  
  const projectCurrency = activeProject?.currency || settings.currency;
  const currencySettings = { ...settings, currency: projectCurrency };

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
        payload = { timeUnit: 'annually', horizonLength: 3, periodOffset: 0, activeQuickSelect: 'short_term' };
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
  }, [periodOffset, timeUnit, timeUnitLabels]);

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
            case 'annually': label = String(periodStart.getFullYear()); break;
        }
        return { label, startDate: periodStart, endDate: periodEnd };
    });
  }, [timeUnit, horizonLength, periodOffset, activeQuickSelect, settings.timezoneOffset]);

  const filteredBudgetEntries = useMemo(() => {
    let entries = budgetEntries;
    if (searchTerm) {
        entries = entries.filter(entry => entry.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (isConsolidated && projectSearchTerm) {
        entries = entries.filter(entry => {
            const project = projects.find(p => p.id === entry.projectId);
            return project && project.name.toLowerCase().includes(projectSearchTerm.toLowerCase());
        });
    }
    return entries;
  }, [budgetEntries, searchTerm, isConsolidated, projectSearchTerm, projects]);

  const handleNewBudget = () => { if (!isConsolidated) { dispatch({ type: 'OPEN_BUDGET_MODAL', payload: null }); } };
  const handleEditEntry = (entry) => { dispatch({ type: 'OPEN_BUDGET_MODAL', payload: entry }); };
  const handleDeleteEntry = (entry) => {
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: `Supprimer "${entry.supplier}" ?`,
        message: "Cette action est irréversible et supprimera l'entrée budgétaire et ses prévisions.",
        onConfirm: () => dispatch({ type: 'DELETE_ENTRY', payload: { entryId: entry.id, entryProjectId: entry.projectId || activeProjectId } }),
      }
    });
  };
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const getFrequencyTitle = (entry) => { const freq = entry.frequency.charAt(0).toUpperCase() + entry.frequency.slice(1); if (entry.frequency === 'ponctuel') return `Ponctuel: ${formatDate(entry.date)}`; if (entry.frequency === 'irregulier') return `Irrégulier: ${entry.payments?.length || 0} paiements`; const period = `De ${formatDate(entry.startDate)} à ${entry.endDate ? formatDate(entry.endDate) : '...'}`; return `${freq} | ${period}`; };
  const getResteColor = (reste, isEntree) => reste === 0 ? 'text-text-secondary' : isEntree ? (reste <= 0 ? 'text-success-600' : 'text-danger-600') : (reste >= 0 ? 'text-success-600' : 'text-danger-600');
  
  const isRowVisibleInPeriods = (entry) => { for (const period of periods) { if (getEntryAmountForPeriod(entry, period.startDate, period.endDate) > 0 || getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate) > 0) return true; } return false; };
  const hasOffBudgetRevenues = budgetEntries.some(e => e.isOffBudget && e.type === 'revenu' && isRowVisibleInPeriods(e));
  const hasOffBudgetExpenses = budgetEntries.some(e => e.isOffBudget && e.type === 'depense' && isRowVisibleInPeriods(e));

  const handleOpenPaymentDrawer = (entry, period) => {
    const entryActuals = actualTransactions.filter(actual => actual.budgetId === entry.id);

    dispatch({
        type: 'OPEN_INLINE_PAYMENT_DRAWER',
        payload: {
            actuals: entryActuals,
            entry: entry,
            period: period,
            periodLabel: period.label
        }
    });
  };
  
  const getPaymentsForCategoryAndPeriod = (subCategoryName, period) => {
    let relevantActuals;
    const type = subCategoryName === 'Entrées Hors Budget' ? 'revenu' : (subCategoryName === 'Sorties Hors Budget' ? 'depense' : null);
    if (type) {
        const offBudgetEntryIds = budgetEntries.filter(e => e.isOffBudget && e.type === type).map(e => e.id);
        relevantActuals = actualTransactions.filter(t => offBudgetEntryIds.includes(t.budgetId));
    } else {
        relevantActuals = actualTransactions.filter(t => {
            if (t.category !== subCategoryName || !t.budgetId) return false;
            const budgetEntry = budgetEntries.find(e => e.id === t.budgetId);
            return !budgetEntry || !budgetEntry.isOffBudget;
        });
    }
    return relevantActuals.flatMap(t => (t.payments || []).filter(p => new Date(p.paymentDate) >= period.startDate && new Date(p.paymentDate) < period.endDate).map(p => ({ ...p, thirdParty: t.thirdParty, type: t.type })));
  };

  const getPaymentsForMainCategoryAndPeriod = (mainCategory, period) => mainCategory.subCategories.flatMap(sc => getPaymentsForCategoryAndPeriod(sc.name, period));
  
  const handleActualClick = (context) => {
    const { period } = context;
    let payments = [];
    let title = '';
    if (context.entryId) {
      const entry = budgetEntries.find(e => e.id === context.entryId);
      payments = actualTransactions.filter(t => t.budgetId === context.entryId).flatMap(t => (t.payments || []).filter(p => new Date(p.paymentDate) >= period.startDate && new Date(p.paymentDate) < period.endDate).map(p => ({ ...p, thirdParty: t.thirdParty, type: t.type })));
      title = `Détails pour ${entry.supplier}`;
    } else if (context.mainCategory) {
        payments = getPaymentsForMainCategoryAndPeriod(context.mainCategory, period);
        title = `Détails pour ${context.mainCategory.name}`;
    } else if (context.category === 'Sorties Hors Budget' || context.category === 'Entrées Hors Budget') {
        payments = getPaymentsForCategoryAndPeriod(context.category, period);
        title = `Détails pour ${context.category}`;
    } else if (context.type) {
      if (context.type === 'entree') {
        payments = categories.revenue.flatMap(mc => getPaymentsForMainCategoryAndPeriod(mc, period));
        if (hasOffBudgetRevenues) payments.push(...getPaymentsForCategoryAndPeriod('Entrées Hors Budget', period));
        title = 'Détails des Entrées';
      } else if (context.type === 'sortie') {
        let expensePayments = categories.expense.flatMap(mc => getPaymentsForMainCategoryAndPeriod(mc, period));
        if (hasOffBudgetExpenses) expensePayments.push(...getPaymentsForCategoryAndPeriod('Sorties Hors Budget', period));
        payments = expensePayments;
        title = 'Détails des Sorties';
      } else if (context.type === 'net') {
        const revenuePayments = categories.revenue.flatMap(mc => getPaymentsForMainCategoryAndPeriod(mc, period));
        if (hasOffBudgetRevenues) revenuePayments.push(...getPaymentsForCategoryAndPeriod('Entrées Hors Budget', period));
        let expensePayments = categories.expense.flatMap(mc => getPaymentsForMainCategoryAndPeriod(mc, period));
        if (hasOffBudgetExpenses) expensePayments.push(...getPaymentsForCategoryAndPeriod('Sorties Hors Budget', period));
        payments = [...revenuePayments, ...expensePayments];
        title = 'Détails des Transactions';
      }
    }
    if (payments.length > 0) setDrawerData({ isOpen: true, transactions: payments, title: `${title} - ${period.label}` });
  };

  const handleCloseDrawer = () => setDrawerData({ isOpen: false, transactions: [], title: '' });
  const groupedData = useMemo(() => {
    const entriesToGroup = filteredBudgetEntries.filter(e => !e.isOffBudget);
    const groupByType = (type) => {
      const catType = type === 'entree' ? 'revenue' : 'expense';
      if (!categories || !categories[catType]) return [];
      return categories[catType].map(mainCat => {
        if (!mainCat.subCategories) return null;
        const entriesForMainCat = entriesToGroup.filter(entry => mainCat.subCategories.some(sc => sc.name === entry.category) && isRowVisibleInPeriods(entry));
        return entriesForMainCat.length > 0 ? { ...mainCat, entries: entriesForMainCat } : null;
      }).filter(Boolean);
    };
    return { entree: groupByType('entree'), sortie: groupByType('sortie') };
  }, [filteredBudgetEntries, categories, periods]);

  const handleDrillDown = () => {
    const newCollapsedState = {};
    groupedData.entree.forEach(mainCat => newCollapsedState[mainCat.id] = false);
    groupedData.sortie.forEach(mainCat => newCollapsedState[mainCat.id] = false);
    setCollapsedItems(newCollapsedState);
    setIsEntreesCollapsed(false);
    setIsSortiesCollapsed(false);
  };

  const handleDrillUp = () => {
    const newCollapsedState = {};
    groupedData.entree.forEach(mainCat => newCollapsedState[mainCat.id] = true);
    groupedData.sortie.forEach(mainCat => newCollapsedState[mainCat.id] = true);
    setCollapsedItems(newCollapsedState);
  };

  const calculateMainCategoryTotals = (entries, period) => {
    const budget = entries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
    const actual = entries.reduce((sum, entry) => sum + getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate), 0);
    return { budget, actual, reste: budget - actual };
  };
  const calculateOffBudgetTotalsForPeriod = (type, period) => {
      const offBudgetEntries = filteredBudgetEntries.filter(e => e.isOffBudget && e.type === type);
      const budget = offBudgetEntries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
      const actual = offBudgetEntries.reduce((sum, entry) => sum + getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate), 0);
      return { budget, actual, reste: budget - actual };
  };
  const calculateGeneralTotals = (mainCategories, period, type) => {
    const totals = mainCategories.reduce((acc, mainCategory) => {
      const categoryTotals = calculateMainCategoryTotals(mainCategory.entries, period);
      acc.budget += categoryTotals.budget;
      acc.actual += categoryTotals.actual;
      return acc;
    }, { budget: 0, actual: 0 });
    if (type === 'entree' && hasOffBudgetRevenues) {
        const offBudgetTotals = calculateOffBudgetTotalsForPeriod('revenu', period);
        totals.budget += offBudgetTotals.budget;
        totals.actual += offBudgetTotals.actual;
    } else if (type === 'sortie' && hasOffBudgetExpenses) {
        const offBudgetTotals = calculateOffBudgetTotalsForPeriod('depense', period);
        totals.budget += offBudgetTotals.budget;
        totals.actual += offBudgetTotals.actual;
    }
    return totals;
  };
  
  const periodPositions = useMemo(() => {
    if (periods.length === 0) return [];
    
    const userCashAccounts = isConsolidated ? Object.values(allCashAccounts).flat() : allCashAccounts[activeProjectId] || [];

    const today = getTodayInTimezone(settings.timezoneOffset);
    let todayIndex = periods.findIndex(p => today >= p.startDate && today < p.endDate);
    if (todayIndex === -1) {
        if (periods.length > 0 && today < periods[0].startDate) todayIndex = -1; // All future
        else if (periods.length > 0 && today >= periods[periods.length - 1].endDate) todayIndex = periods.length - 1; // All past
    }
    
    const firstPeriodStart = periods[0].startDate;
    const initialBalanceSum = userCashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
    const netFlowBeforeFirstPeriod = actualTransactions
      .flatMap(actual => actual.payments || [])
      .filter(p => new Date(p.paymentDate) < firstPeriodStart)
      .reduce((sum, p) => {
        const actual = actualTransactions.find(a => (a.payments || []).some(payment => payment.id === p.id));
        if (!actual) return sum;
        return actual.type === 'receivable' ? sum + p.paidAmount : sum - p.paidAmount;
      }, 0);
    const startingBalance = initialBalanceSum + netFlowBeforeFirstPeriod;

    const positions = [];
    let lastPeriodFinalPosition = startingBalance;
    
    for (let i = 0; i <= todayIndex; i++) {
        if (!periods[i]) continue;
        const period = periods[i];
        const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
        const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
        const netActual = revenueTotals.actual - expenseTotals.actual;
        const initialPosition = lastPeriodFinalPosition;
        const finalPosition = initialPosition + netActual;
        positions.push({ initial: initialPosition, final: finalPosition });
        lastPeriodFinalPosition = finalPosition;
    }
    
    if (todayIndex < periods.length - 1) {
        const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
        const impayes = actualTransactions.filter(a => new Date(a.date) < today && unpaidStatuses.includes(a.status));
        const netImpayes = impayes.reduce((sum, actual) => {
            const totalPaid = (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
            const remaining = actual.amount - totalPaid;
            return actual.type === 'receivable' ? sum + remaining : sum - remaining;
        }, 0);
        lastPeriodFinalPosition += netImpayes;
        
        for (let i = todayIndex + 1; i < periods.length; i++) {
            if (!periods[i]) continue;
            const period = periods[i];
            const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
            const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
            const netPlanned = revenueTotals.budget - expenseTotals.budget;
            const initialPosition = lastPeriodFinalPosition;
            const finalPosition = initialPosition + netPlanned;
            positions.push({ initial: initialPosition, final: finalPosition });
            lastPeriodFinalPosition = finalPosition;
        }
    }
    return positions;
  }, [periods, allCashAccounts, activeProjectId, isConsolidated, actualTransactions, groupedData, settings.timezoneOffset]);
  
  const numVisibleCols = Object.values(visibleColumns).filter(v => v).length;
  const periodColumnWidth = numVisibleCols > 0 ? numVisibleCols * 90 : 50;
  const separatorWidth = 4;
  const fixedColsWidth = columnWidths.category + columnWidths.supplier + (isConsolidated ? columnWidths.project : 0);
  const totalTableWidth = fixedColsWidth + separatorWidth + (periods.length * (periodColumnWidth + separatorWidth));
  const supplierColLeft = columnWidths.category;
  const projectColLeft = supplierColLeft + columnWidths.supplier;
  const totalCols = (isConsolidated ? 3 : 2) + 1 + (periods.length * 2);
  
  const renderBudgetRows = (type) => {
    const isEntree = type === 'entree';
    const mainCategories = groupedData[type] || [];
    const isCollapsed = type === 'entree' ? isEntreesCollapsed : isSortiesCollapsed;
    const toggleMainCollapse = type === 'entree' ? () => setIsEntreesCollapsed(p => !p) : () => setIsSortiesCollapsed(p => !p);
    const Icon = type === 'entree' ? TrendingUp : TrendingDown;
    const colorClass = type === 'entree' ? 'text-success-600' : 'text-danger-600';

    if (mainCategories.length === 0 && (type === 'entree' ? !hasOffBudgetRevenues : !hasOffBudgetExpenses)) {
      return null;
    }

    return (
      <>
        {/* Total Row for Type */}
        <tr className="bg-gray-200 border-y-2 border-gray-300 cursor-pointer" onClick={toggleMainCollapse}>
          <td colSpan={isConsolidated ? 3 : 2} className="px-4 py-2 font-bold text-text-primary bg-gray-200 sticky left-0 z-10">
            <div className="flex items-center gap-2">
              <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              <Icon className={`w-4 h-4 ${colorClass}`} />
              {isEntree ? 'TOTAL ENTRÉES' : 'TOTAL SORTIES'}
            </div>
          </td>
          <td className="bg-surface" style={{ width: `${separatorWidth}px` }}></td>
          {periods.map((period, periodIndex) => {
            const totals = calculateGeneralTotals(mainCategories, period, type);
            const reste = totals.budget - totals.actual;
            return (
              <React.Fragment key={periodIndex}>
                <td className="px-2 py-2">
                  {numVisibleCols > 0 && (
                    <div className="flex gap-2 justify-around text-sm font-bold">
                      {visibleColumns.budget && <div className="flex-1 text-center text-text-primary">{formatCurrency(totals.budget, currencySettings)}</div>}
                      {visibleColumns.actual && <button onClick={(e) => { e.stopPropagation(); if (totals.actual !== 0) handleActualClick({ type, period }); }} disabled={totals.actual === 0} className="flex-1 text-center text-text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60">{formatCurrency(totals.actual, currencySettings)}</button>}
                      {visibleColumns.reste && <div className={`flex-1 text-center ${getResteColor(reste, isEntree)}`}>{formatCurrency(reste, currencySettings)}</div>}
                    </div>
                  )}
                </td>
                <td className="bg-surface" style={{ width: `${separatorWidth}px` }}></td>
              </React.Fragment>
            );
          })}
        </tr>

        {/* Rows for each Main Category and Entry */}
        {!isCollapsed && mainCategories.map(mainCategory => {
          const isMainCollapsed = collapsedItems[mainCategory.id];
          return (
            <React.Fragment key={mainCategory.id}>
              <tr onClick={() => toggleCollapse(mainCategory.id)} className="bg-gray-100 font-semibold text-gray-700 cursor-pointer hover:bg-gray-200">
                <td colSpan={isConsolidated ? 3 : 2} className="px-4 py-2 sticky left-0 z-10 bg-gray-100">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isMainCollapsed ? '-rotate-90' : ''}`} />
                    {mainCategory.name}
                  </div>
                </td>
                <td className="bg-surface"></td>
                {periods.map((period, periodIndex) => {
                  const totals = calculateMainCategoryTotals(mainCategory.entries, period);
                  const reste = totals.budget - totals.actual;
                  return (
                    <React.Fragment key={periodIndex}>
                      <td className="px-2 py-2">
                        {numVisibleCols > 0 && (
                          <div className="flex gap-2 justify-around text-xs font-semibold">
                            {visibleColumns.budget && <div className="flex-1 text-center">{formatCurrency(totals.budget, currencySettings)}</div>}
                            {visibleColumns.actual && <button onClick={(e) => { e.stopPropagation(); if (totals.actual !== 0) handleActualClick({ mainCategory, period }); }} disabled={totals.actual === 0} className="flex-1 text-center hover:underline disabled:cursor-not-allowed disabled:opacity-60">{formatCurrency(totals.actual, currencySettings)}</button>}
                            {visibleColumns.reste && <div className={`flex-1 text-center ${getResteColor(reste, isEntree)}`}>{formatCurrency(reste, currencySettings)}</div>}
                          </div>
                        )}
                      </td>
                      <td className="bg-surface"></td>
                    </React.Fragment>
                  );
                })}
              </tr>
              {!isMainCollapsed && mainCategory.entries.map((entry) => {
                const project = isConsolidated ? projects.find(p => p.id === entry.projectId) : null;
                return (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                    <td className="px-4 py-1 font-normal text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-10">{entry.category}</td>
                    <td className="px-4 py-1 text-gray-700 sticky bg-white group-hover:bg-gray-50 z-10" style={{ left: `${supplierColLeft}px` }}>
                      <div className="flex items-center justify-between">
                        <span className="truncate" title={getFrequencyTitle(entry)}>{entry.supplier}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditEntry(entry)} className="p-1 text-blue-500 hover:text-blue-700"><Edit size={14} /></button>
                          <button onClick={() => handleDeleteEntry(entry)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </td>
                    {isConsolidated && <td className="px-4 py-1 text-gray-600 sticky bg-white group-hover:bg-gray-50 z-10" style={{ left: `${projectColLeft}px` }}><div className="flex items-center gap-2"><Folder className="w-4 h-4 text-blue-500" />{project?.name || 'N/A'}</div></td>}
                    <td className="bg-surface"></td>
                    {periods.map((period, periodIndex) => {
                      const budget = getEntryAmountForPeriod(entry, period.startDate, period.endDate);
                      const actual = getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate);
                      const reste = budget - actual;
                      return (
                        <React.Fragment key={periodIndex}>
                          <td className="px-2 py-1">
                            {numVisibleCols > 0 && (
                              <div className="flex gap-2 justify-around text-xs">
                                {visibleColumns.budget && <div className="flex-1 text-center text-gray-500">{formatCurrency(budget, currencySettings)}</div>}
                                {visibleColumns.actual && <button onClick={() => handleOpenPaymentDrawer(entry, period)} disabled={actual === 0 && budget === 0} className="flex-1 text-center text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400">{formatCurrency(actual, currencySettings)}</button>}
                                {visibleColumns.reste && <div className={`flex-1 text-center font-medium ${getResteColor(reste, isEntree)}`}>{formatCurrency(reste, currencySettings)}</div>}
                              </div>
                            )}
                          </td>
                          <td className="bg-surface"></td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </React.Fragment>
          );
        })}
        
        {/* Off-budget rows */}
        {(type === 'entree' ? hasOffBudgetRevenues : hasOffBudgetExpenses) && (
          <tr className="bg-purple-50 font-semibold text-purple-800">
            <td colSpan={isConsolidated ? 3 : 2} className="px-4 py-2 sticky left-0 z-10 bg-purple-50">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{isEntree ? 'Entrées Hors Budget' : 'Sorties Hors Budget'}</div>
            </td>
            <td className="bg-surface"></td>
            {periods.map((period, periodIndex) => {
              const totals = calculateOffBudgetTotalsForPeriod(isEntree ? 'revenu' : 'depense', period);
              const reste = totals.budget - totals.actual;
              return (
                <React.Fragment key={periodIndex}>
                  <td className="px-2 py-2">
                    {numVisibleCols > 0 && (
                      <div className="flex gap-2 justify-around text-xs font-semibold">
                        {visibleColumns.budget && <div className="flex-1 text-center">{formatCurrency(totals.budget, currencySettings)}</div>}
                        {visibleColumns.actual && <button onClick={() => totals.actual !== 0 && handleActualClick({ category: isEntree ? 'Entrées Hors Budget' : 'Sorties Hors Budget', period })} disabled={totals.actual === 0} className="flex-1 text-center hover:underline disabled:cursor-not-allowed disabled:opacity-60">{formatCurrency(totals.actual, currencySettings)}</button>}
                        {visibleColumns.reste && <div className={`flex-1 text-center ${getResteColor(reste, isEntree)}`}>{formatCurrency(reste, currencySettings)}</div>}
                      </div>
                    )}
                  </td>
                  <td className="bg-surface"></td>
                </React.Fragment>
              );
            })}
          </tr>
        )}
      </>
    );
  };
  
  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-8 flex justify-between items-start">
        <div className="flex items-center gap-4">
            <Table className="w-8 h-8 text-blue-600" />
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Votre tableau de Trésorerie</h1>
            </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePeriodChange(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button>
                    <span className="text-sm font-semibold text-gray-700 w-24 text-center" title="Décalage par rapport à la période actuelle">{periodLabel}</span>
                    <button onClick={() => handlePeriodChange(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button>
                </div>
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                <div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => handleQuickPeriodSelect('today')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'today' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Jour</button>
                    <button onClick={() => handleQuickPeriodSelect('week')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'week' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Semaine</button>
                    <button onClick={() => handleQuickPeriodSelect('month')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'month' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Mois</button>
                    <button onClick={() => handleQuickPeriodSelect('quarter')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'quarter' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Trim.</button>
                    <button onClick={() => handleQuickPeriodSelect('year')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'year' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Année</button>
                    <button onClick={() => handleQuickPeriodSelect('short_term')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'short_term' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>CT (3a)</button>
                    <button onClick={() => handleQuickPeriodSelect('medium_term')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'medium_term' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>MT (5a)</button>
                    <button onClick={() => handleQuickPeriodSelect('long_term')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeQuickSelect === 'long_term' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>LT (10a)</button>
                </div>
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-text-secondary"/>
                    <div className="flex items-center bg-secondary-200 rounded-lg p-0.5">
                        <button onClick={() => setVisibleColumns(p => ({...p, budget: !p.budget}))} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visibleColumns.budget ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`}>
                            Prév.
                        </button>
                        <button onClick={() => setVisibleColumns(p => ({...p, actual: !p.actual}))} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visibleColumns.actual ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`}>
                            Réel
                        </button>
                        <button onClick={() => setVisibleColumns(p => ({...p, reste: !p.reste}))} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visibleColumns.reste ? 'bg-surface text-primary-600 shadow-sm' : 'bg-transparent text-text-secondary'}`}>
                            Reste
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={handleNewBudget} className="text-primary-600 hover:bg-primary-100 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:text-secondary-400 disabled:cursor-not-allowed" disabled={isConsolidated}><Plus className="w-5 h-5" /> Nouvelle Entrée</button>
            </div>
        </div>
      </div>
      
      <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
        <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar"><div style={{ width: `${totalTableWidth}px`, height: '1px' }}></div></div>
        <div ref={mainScrollRef} className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr>
                <ResizableTh id="category" width={columnWidths.category} onResize={handleResize} className="sticky left-0 z-40 bg-gray-100">
                    <div className="flex items-center justify-between w-full">
                        <span>Catégorie</span>
                        <div className="flex items-center">
                            <button onClick={handleDrillUp} className="p-1 text-gray-500 hover:text-gray-800" title="Réduire tout"><ChevronUp size={16} /></button>
                            <button onClick={handleDrillDown} className="p-1 text-gray-500 hover:text-gray-800" title="Développer tout"><ChevronDown size={16} /></button>
                        </div>
                    </div>
                </ResizableTh>
                <ResizableTh id="supplier" width={columnWidths.supplier} onResize={handleResize} className="sticky z-20 bg-gray-100" style={{ left: `${supplierColLeft}px` }}>
                    {isTierSearchOpen ? (
                        <div ref={tierSearchRef} className="flex items-center gap-1 w-full">
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher..." className="w-full px-2 py-1 border rounded-md text-sm bg-white" autoFocus onClick={(e) => e.stopPropagation()} />
                            <button onClick={() => { setSearchTerm(''); }} className="p-1 text-gray-500 hover:text-gray-800" title="Effacer"><XCircle size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <span>Tiers</span>
                            <button onClick={() => setIsTierSearchOpen(true)} className="p-1 text-gray-500 hover:text-gray-800" title="Rechercher par tiers"><Search size={14} /></button>
                        </div>
                    )}
                </ResizableTh>
                {isConsolidated && (
                    <ResizableTh id="project" width={columnWidths.project} onResize={handleResize} className="sticky z-20 bg-gray-100" style={{ left: `${projectColLeft}px` }}>
                        {isProjectSearchOpen ? (
                            <div ref={projectSearchRef} className="flex items-center gap-1 w-full">
                                <input type="text" value={projectSearchTerm} onChange={(e) => setProjectSearchTerm(e.target.value)} placeholder="Rechercher..." className="w-full px-2 py-1 border rounded-md text-sm bg-white" autoFocus onClick={(e) => e.stopPropagation()} />
                                <button onClick={() => { setProjectSearchTerm(''); }} className="p-1 text-gray-500 hover:text-gray-800" title="Effacer">
                                    <XCircle size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full">
                                <span>Projet</span>
                                <button onClick={() => setIsProjectSearchOpen(true)} className="p-1 text-gray-500 hover:text-gray-800" title="Rechercher par projet">
                                    <Search size={14} />
                                </button>
                            </div>
                        )}
                    </ResizableTh>
                )}
                <th className="bg-surface border-b-2" style={{ width: `${separatorWidth}px` }}></th>
                {periods.map((period, periodIndex) => {
                  const isPast = period.endDate <= today;
                  const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
                  const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
                  const netBudget = revenueTotals.budget - expenseTotals.budget;
                  const isNegativeFlow = netBudget < 0;
                  return (
                    <React.Fragment key={periodIndex}>
                      <th className={`px-2 py-2 text-center font-semibold border-b-2 ${isPast ? 'bg-gray-50' : 'bg-surface'} ${isNegativeFlow && !isPast ? 'bg-red-50' : ''}`} style={{ minWidth: `${periodColumnWidth}px` }}>
                        <div className={`text-base mb-1 ${isNegativeFlow && !isPast ? 'text-red-700 font-bold' : 'text-text-primary'}`}>{period.label}</div>
                        {numVisibleCols > 0 && (
                          <div className="flex gap-2 justify-around text-xs font-medium text-text-secondary">
                            {visibleColumns.budget && <div className="flex-1">Prév.</div>}
                            {visibleColumns.actual && <div className="flex-1">Réel</div>}
                            {visibleColumns.reste && <div className="flex-1">Reste</div>}
                          </div>
                        )}
                      </th>
                      <th className="bg-surface border-b-2" style={{ width: `${separatorWidth}px` }}></th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-200 font-bold text-gray-800"><td colSpan={isConsolidated ? 3 : 2} className="px-4 py-2 bg-gray-200 sticky left-0 z-10"><div className="flex items-center gap-2"><LogIn className="w-4 h-4" />Trésorerie début de période</div></td><td className="bg-surface"></td>{periods.map((_, periodIndex) => (<React.Fragment key={periodIndex}><td className="px-2 py-2 text-center" colSpan={1}>{formatCurrency(periodPositions[periodIndex]?.initial || 0, currencySettings)}</td><td className="bg-surface"></td></React.Fragment>))}</tr>
              <tr className="bg-surface"><td colSpan={totalCols} className="py-2"></td></tr>
              {renderBudgetRows('entree')}
              <tr className="bg-surface"><td colSpan={totalCols} className="py-2"></td></tr>
              {renderBudgetRows('sortie')}
              <tr className="bg-surface"><td colSpan={totalCols} className="py-2"></td></tr>
              <tr className="bg-gray-200 border-t-2 border-gray-300">
                  <td colSpan={isConsolidated ? 3 : 2} className="px-4 py-2 font-bold text-text-primary bg-gray-200 sticky left-0 z-10"><div className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" />Flux de trésorerie</div></td>
                  <td className="bg-surface" style={{ width: `${separatorWidth}px` }}></td>
                  {periods.map((period, periodIndex) => {
                      const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
                      const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
                      const netBudget = revenueTotals.budget - expenseTotals.budget;
                      const netActual = revenueTotals.actual - expenseTotals.actual;
                      const netReste = netBudget - netActual;
                      return (
                          <React.Fragment key={periodIndex}>
                              <td className="px-2 py-2">
                                  {numVisibleCols > 0 && (
                                      <div className="flex gap-2 justify-around text-sm font-bold">
                                          {visibleColumns.budget && <div className={`flex-1 text-center ${netBudget < 0 ? 'text-red-600' : 'text-text-primary'}`}>{formatCurrency(netBudget, currencySettings)}</div>}
                                          {visibleColumns.actual && <button onClick={() => netActual !== 0 && handleActualClick({ type: 'net', period })} disabled={netActual === 0} className="flex-1 text-center text-text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60">{formatCurrency(netActual, currencySettings)}</button>}
                                          {visibleColumns.reste && <div className={`flex-1 text-center ${getResteColor(netReste, true)}`}>{formatCurrency(netReste, currencySettings)}</div>}
                                      </div>
                                  )}
                              </td>
                              <td className="bg-surface" style={{ width: `${separatorWidth}px` }}></td>
                          </React.Fragment>
                      );
                  })}
              </tr>
              <tr className="bg-gray-300 font-bold text-gray-900"><td colSpan={isConsolidated ? 3 : 2} className="px-4 py-2 bg-gray-300 sticky left-0 z-10"><div className="flex items-center gap-2"><Flag className="w-4 h-4" />Trésorerie fin de période</div></td><td className="bg-surface"></td>{periods.map((_, periodIndex) => (<React.Fragment key={periodIndex}><td className="px-2 py-2 text-center" colSpan={1}>{formatCurrency(periodPositions[periodIndex]?.final || 0, currencySettings)}</td><td className="bg-surface"></td></React.Fragment>))}</tr>
            </tbody>
          </table>
        </div>
      </div>
      <TransactionDetailDrawer isOpen={drawerData.isOpen} onClose={handleCloseDrawer} transactions={drawerData.transactions} title={drawerData.title} currency={projectCurrency} />
    </div>
  );
};

export default BudgetTracker;
