import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { getEntryAmountForMonth } from '../utils/budgetCalculations';
import { Calendar } from 'lucide-react';

const MonthlyBudgetSummary = () => {
  const { state } = useBudget();
  const { allEntries, activeProjectId, settings, projects } = state;
  const isConsolidated = activeProjectId === 'consolidated';

  const activeProjectName = useMemo(() => {
    if (isConsolidated) {
      return 'Consolidé';
    }
    const project = projects.find(p => p.id === activeProjectId);
    return project ? project.name : '';
  }, [activeProjectId, projects, isConsolidated]);

  const budgetEntries = useMemo(() => {
    if (isConsolidated) {
      return Object.values(allEntries).flat();
    }
    const project = projects.find(p => p.id === activeProjectId);
    return project ? allEntries[project.id] || [] : [];
  }, [activeProjectId, allEntries, isConsolidated, projects]);

  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const monthName = new Date(currentYear, i, 1).toLocaleString('fr-FR', { month: 'long' });
      
      const totalIncome = budgetEntries
        .filter(e => e.type === 'revenu')
        .reduce((sum, entry) => sum + getEntryAmountForMonth(entry, i, currentYear), 0);
        
      const totalExpense = budgetEntries
        .filter(e => e.type === 'depense')
        .reduce((sum, entry) => sum + getEntryAmountForMonth(entry, i, currentYear), 0);

      data.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense,
      });
    }
    return data;
  }, [budgetEntries, currentYear]);

  const totals = useMemo(() => {
    return monthlyData.reduce((acc, month) => {
      acc.income += month.income;
      acc.expense += month.expense;
      acc.net += month.net;
      return acc;
    }, { income: 0, expense: 0, net: 0 });
  }, [monthlyData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-indigo-600" />
        Budget Prévisionnel {currentYear} <span className="text-gray-500 font-medium">- {activeProjectName}</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b">
              <th className="py-2 text-left font-medium text-gray-500">Mois</th>
              <th className="py-2 text-right font-medium text-gray-500">Entrées Prév.</th>
              <th className="py-2 text-right font-medium text-gray-500">Sorties Prév.</th>
              <th className="py-2 text-right font-medium text-gray-500">Solde Prév.</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row, index) => (
              <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-700">{row.month}</td>
                <td className="py-2 text-right text-green-600">{formatCurrency(row.income, settings)}</td>
                <td className="py-2 text-right text-red-600">{formatCurrency(row.expense, settings)}</td>
                <td className={`py-2 text-right font-semibold ${row.net >= 0 ? 'text-gray-800' : 'text-red-700'}`}>
                  {formatCurrency(row.net, settings)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold sticky bottom-0">
              <td className="py-2 px-1">Total</td>
              <td className="py-2 px-1 text-right">{formatCurrency(totals.income, settings)}</td>
              <td className="py-2 px-1 text-right">{formatCurrency(totals.expense, settings)}</td>
              <td className={`py-2 px-1 text-right ${totals.net >= 0 ? 'text-gray-800' : 'text-red-700'}`}>
                {formatCurrency(totals.net, settings)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MonthlyBudgetSummary;
