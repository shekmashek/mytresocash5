import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { getEntryAmountForMonth } from '../utils/budgetCalculations';

const GoalsView = () => {
  const { state, dispatch } = useBudget();
  const { settings, displayYear, activeProjectId, projects, allEntries, allActuals } = state;

  const { activeProject, budgetEntries, actualTransactions, isConsolidated } = useMemo(() => {
    const isConsolidatedView = activeProjectId === 'consolidated';
    if (isConsolidatedView) {
      return {
        activeProject: { id: 'consolidated', name: 'Projet consolidé' },
        budgetEntries: Object.values(allEntries).flat(),
        actualTransactions: Object.values(allActuals).flat(),
        isConsolidated: true,
      };
    } else {
      const project = projects.find(p => p.id === activeProjectId);
      return {
        activeProject: project,
        budgetEntries: project ? (allEntries[project.id] || []) : [],
        actualTransactions: project ? (allActuals[project.id] || []) : [],
        isConsolidated: false,
      };
    }
  }, [activeProjectId, projects, allEntries, allActuals]);

  const projectCurrency = activeProject?.currency || settings.currency;
  const currencySettings = { ...settings, currency: projectCurrency };

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
      return projects.reduce((acc, project) => {
        const projectGoals = project.annualGoals?.[displayYear] || { revenue: 0, expense: 0 };
        acc.revenue += projectGoals.revenue;
        acc.expense += projectGoals.expense;
        return acc;
      }, { revenue: 0, expense: 0 });
    }
    return activeProject?.annualGoals?.[displayYear] || { revenue: 0, expense: 0 };
  }, [activeProject, displayYear, isConsolidated, projects]);

  const totalBudgeted = useMemo(() => {
    const totals = { revenue: 0, expense: 0 };
    if (!budgetEntries) return totals;
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
        <div className="flex justify-between items-baseline text-lg mb-1">
          <span className="font-semibold text-gray-600">{label}</span>
          <span className="font-bold text-gray-800">{formatCurrency(value, currencySettings)}</span>
        </div>
        <div className="relative h-4 w-full bg-gray-200 rounded-full overflow-hidden">
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
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-4">
          <h4 className={`text-2xl font-bold flex items-center gap-2 ${colorClass}`}>
            <Icon className="w-6 h-6" />
            Objectif Annuel - {title}
          </h4>
          <div className="flex items-center gap-2">
            <label htmlFor={`goal-input-${type}`} className="text-sm text-gray-600">Objectif:</label>
            <input
              id={`goal-input-${type}`}
              type="number"
              value={goal}
              onChange={(e) => handleGoalChange(type, e.target.value)}
              className="w-32 p-1 border-b text-right font-semibold text-lg text-gray-800 bg-transparent focus:outline-none focus:border-blue-500 disabled:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed rounded-md"
              placeholder="0"
              disabled={isConsolidated}
            />
          </div>
        </div>
        <div className="space-y-6">
          <ProgressLine label="Budgétisé" value={budgeted} goal={goal} colorClass={progressColorClass} />
          <ProgressLine label="Réalisé" value={realized} goal={goal} colorClass={realizedProgressColorClass} />
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-full">
        <div className="mb-8 flex justify-between items-start">
            <div className="flex items-center gap-4">
                <Target className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Suivi des Objectifs Annuels</h1>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
              <button onClick={() => handleYearChange(displayYear - 1)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-lg font-semibold text-gray-700 w-16 text-center">{displayYear}</span>
              <button onClick={() => handleYearChange(displayYear + 1)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderSection('revenue')}
            {renderSection('expense')}
        </div>
    </div>
  );
};

export default GoalsView;
