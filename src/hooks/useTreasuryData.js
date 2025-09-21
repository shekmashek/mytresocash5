import { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { getTodayInTimezone, getStartOfWeek, getEntryAmountForPeriod, getActualAmountForPeriod } from '../utils/budgetCalculations';

export const useTreasuryData = () => {
    const { state } = useBudget();
    const { 
        projects, categories, settings, allCashAccounts, allEntries, allActuals, 
        activeProjectId, timeUnit, horizonLength, periodOffset, activeQuickSelect 
    } = state;

    const isConsolidated = useMemo(() => {
        if (!activeProjectId) return true; // Default to consolidated if no project is active
        return state.consolidatedViews.some(v => v.id === activeProjectId);
    }, [activeProjectId, state.consolidatedViews]);

    const { activeProject, budgetEntries, actualTransactions } = useMemo(() => {
        if (isConsolidated) {
            const activeProjectIds = state.consolidatedViews.find(v => v.id === activeProjectId)?.projectIds || projects.filter(p => !p.isArchived).map(p => p.id);
            return {
                activeProject: { id: activeProjectId, name: state.consolidatedViews.find(v => v.id === activeProjectId)?.name || 'Mes projets consolidé' },
                budgetEntries: Object.entries(allEntries)
                    .filter(([projectId]) => activeProjectIds.includes(projectId))
                    .flatMap(([, entries]) => entries.map(entry => ({ ...entry, projectId: entry.project_id }))),
                actualTransactions: Object.entries(allActuals)
                    .filter(([projectId]) => activeProjectIds.includes(projectId))
                    .flatMap(([, actuals]) => actuals.map(actual => ({ ...actual, projectId: actual.project_id }))),
            };
        } else {
            const project = projects.find(p => p.id === activeProjectId);
            return {
                activeProject: project,
                budgetEntries: project ? (allEntries[project.id] || []) : [],
                actualTransactions: project ? (allActuals[project.id] || []) : [],
            };
        }
    }, [activeProjectId, projects, allEntries, allActuals, isConsolidated, state.consolidatedViews]);

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
                case 'annually': label = String(periodStart.getFullYear()); break;
            }
            return { label, startDate: periodStart, endDate: periodEnd };
        });
    }, [timeUnit, horizonLength, periodOffset, activeQuickSelect, settings.timezoneOffset]);

    const isRowVisibleInPeriods = (entry) => {
        for (const period of periods) {
            if (getEntryAmountForPeriod(entry, period.startDate, period.endDate) > 0 || getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate) > 0) return true;
        }
        return false;
    };

    const groupedData = useMemo(() => {
        const entriesToGroup = budgetEntries.filter(e => !e.isOffBudget);
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
    }, [budgetEntries, categories, periods, actualTransactions]);

    const periodPositions = useMemo(() => {
        if (periods.length === 0) return [];
        
        const userCashAccounts = isConsolidated ? Object.values(allCashAccounts).flat() : allCashAccounts[activeProjectId] || [];
        const hasOffBudgetRevenues = budgetEntries.some(e => e.isOffBudget && e.type === 'revenu' && isRowVisibleInPeriods(e));
        const hasOffBudgetExpenses = budgetEntries.some(e => e.isOffBudget && e.type === 'depense' && isRowVisibleInPeriods(e));
    
        const calculateMainCategoryTotals = (entries, period) => {
            const budget = entries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
            const actual = entries.reduce((sum, entry) => sum + getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate), 0);
            return { budget, actual };
        };
        const calculateOffBudgetTotalsForPeriod = (type, period) => {
            const offBudgetEntries = budgetEntries.filter(e => e.isOffBudget && e.type === type);
            const budget = offBudgetEntries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
            const actual = offBudgetEntries.reduce((sum, entry) => sum + getActualAmountForPeriod(entry, actualTransactions, period.startDate, period.endDate), 0);
            return { budget, actual };
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

        const today = getTodayInTimezone(settings.timezoneOffset);
        let todayIndex = periods.findIndex(p => today >= p.startDate && today < p.endDate);
        if (todayIndex === -1) {
            if (periods.length > 0 && today < periods[0].startDate) todayIndex = -1;
            else if (periods.length > 0 && today >= periods[periods.length - 1].endDate) todayIndex = periods.length - 1;
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
    }, [periods, allCashAccounts, activeProjectId, isConsolidated, actualTransactions, groupedData, settings.timezoneOffset, budgetEntries]);

    return {
        isConsolidated,
        activeProject,
        budgetEntries,
        actualTransactions,
        periods,
        groupedData,
        periodPositions,
        isRowVisibleInPeriods,
    };
};
