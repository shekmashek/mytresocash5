import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { getEntryAmountForMonth } from '../utils/budgetCalculations';

const AnnualGoalsTracker = ({ activeProject, budgetEntries, actualTransactions }) => {
  const { state, dispatch } = useBudget();
  const { settings, displayYear } = state;
  const isConsolidated = activeProject.id === 'consolidated';
  const currencySettings = settings;

  const handleYearChange = (newYear) => {
    const startYear = !isConsolidated && activeProject ? new Date(activeProject.startDate).getFullYear() : 1970;
    if (!isConsolidated && newYear < startYear) {
      dispatch({ type: 'ADD_TOAST', payload: { message: `Le projet commence en ${startYear}.`, type: 'info' } });
      return;
    }
    dispatch({ type: 'SET_DISPLAY_YEAR', payload: newYear });
  };

  const annualGoals = useMemo(() => {
    if (isConsolidated) {
      return state.projects.reduce((acc, project) => {
        const projectGoals = project.annualGoals?.[displayYear] || { revenue: 0, expense: 0 };
        acc.revenue += projectGoals.revenue;
        acc.expense += projectGoals.expense;
        return acc;
      }, { revenue: 0, expense: 0 });
    }
    return activeProject?.annualGoals?.[displayYear] || { revenue: 0, expense: 0 };
  }, [activeProject, displayYear, isConsolidated, state.projects]);

  const totalBudgeted = useMemo(() => {
    const totals = { revenue: 0, expense: 0 };
    budgetEntries.forEach(entry => {
      for (let i = 0; i < 12; i++) {
        const amount = getEntryAmountForMonth(entry, i, displayYear);
        if (entry.type === 'revenu') {
          totals.revenue += amount;
        } else if (entry.type === 'depense') {
          totals.expense += amount;
        }
      }
    });
    return totals;
  }, [budgetEntries, displayYear]);

  const totalRealized = useMemo(() => {
    const totals = { revenue: 0, expense: 0 };
    if (!actualTransactions) return totals;

    actualTransactions.forEach(actual => {
      (actual.payments || []).forEach(payment => {
        const paymentDate = new Date(payment.paymentDate);
        if (paymentDate.getFullYear() === displayYear) {
          if (actual.type === 'receivable') {
            totals.revenue += payment.paidAmount;
          } else if (actual.type === 'payable') {
            totals.expense += payment.paidAmount;
          }
        }
      });
    });
    return totals;
  }, [actualTransactions, displayYear]);

  const handleGoalChange = (type, value) => {
    if (isConsolidated) return;
    const numericValue = parseFloat(value) || 0;
    dispatch({
      type: 'UPDATE_ANNUAL_GOALS',
      payload: {
        projectId: activeProject.id,
        year: displayYear,
        type,
        value: numericValue,
      },
    });
  };

  const ProgressLine = ({ label, value, goal, colorClass }) => {
    const percentage = goal > 0 ? (value / goal) * 100 : 0;
    return (
      <div>
        <div className="flex justify-between items-baseline text-xs mb-1">
          <span className="font-semibold text-gray-500">{label}</span>
          <span className="font-bold text-gray-700">{formatCurrency(value, currencySettings)}</span>
        </div>
        <div className="relative h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${colorClass}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const renderSection = (type) => {
    const isRevenue = type === 'revenue';
    const title = isRevenue ? 'Entrées' : 'Sorties';
    const Icon = isRevenue ? TrendingUp : TrendingDown;
    const colorClass = isRevenue ? 'text-teal-600' : 'text-red-600';
    const progressColorClass = isRevenue ? 'bg-teal-500' : 'bg-red-500';
    const realizedProgressColorClass = 'bg-blue-500';
    
    const goal = annualGoals[type];
    const budgeted = totalBudgeted[type];
    const realized = totalRealized[type];

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-sm font-bold flex items-center gap-1.5 ${colorClass}`}>
            <Icon className="w-4 h-4" />
            {title}
          </h4>
          <div className="flex items-center gap-1">
            <label htmlFor={`goal-input-${type}`} className="text-xs text-gray-500">Obj:</label>
            <input
              id={`goal-input-${type}`}
              type="number"
              value={goal}
              onChange={(e) => handleGoalChange(type, e.target.value)}
              className="w-20 p-0.5 border-b text-right font-semibold text-gray-700 bg-transparent focus:outline-none focus:border-blue-500 disabled:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed rounded-md text-xs"
              placeholder="0"
              disabled={isConsolidated}
            />
          </div>
        </div>
        <div className="space-y-2">
          <ProgressLine label="Budgétisé" value={budgeted} goal={goal} colorClass={progressColorClass} />
          <ProgressLine label="Réalisé" value={realized} goal={goal} colorClass={realizedProgressColorClass} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-secondary-200">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          Objectifs Annuels
        </h3>
        <div className="flex items-center gap-1 bg-gray-100 px-1 py-0.5 rounded-md border">
          <button onClick={() => handleYearChange(displayYear - 1)} className="p-0.5 rounded-full hover:bg-gray-200 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-gray-700 w-8 text-center">{displayYear}</span>
          <button onClick={() => handleYearChange(displayYear + 1)} className="p-0.5 rounded-full hover:bg-gray-200 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-3">
        {renderSection('revenue')}
        {renderSection('expense')}
      </div>
    </div>
  );
};

export default AnnualGoalsTracker;
