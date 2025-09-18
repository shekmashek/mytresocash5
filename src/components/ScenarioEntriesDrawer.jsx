import React, { useMemo } from 'react';
import { X, Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';

const ScenarioEntriesDrawer = ({ isOpen, onClose, scenario, onAddEntry, onEditEntry, onDeleteEntry }) => {
  const { state } = useBudget();
  const { scenarioEntries, allEntries, activeProjectId } = state;

  const entriesForScenario = useMemo(() => {
    if (!scenario) return [];
    const deltas = scenarioEntries[scenario.id] || [];
    const baseEntries = allEntries[activeProjectId] || [];

    return deltas.map(delta => {
      const baseEntry = baseEntries.find(e => e.id === delta.id);
      if (delta.isDeleted) return null; // Don't show deleted entries
      // If it's a new entry (not in base) or a modified entry
      return { ...baseEntry, ...delta, isNew: !baseEntry };
    }).filter(Boolean); // Filter out nulls
  }, [scenario, scenarioEntries, allEntries, activeProjectId]);

  if (!isOpen || !scenario) return null;

  return (
    <>
      <div className={`fixed inset-0 bg-black z-40 transition-opacity ${isOpen ? 'bg-opacity-60' : 'bg-opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-xl bg-gray-50 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between p-4 border-b bg-white">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Écritures du Scénario
              </h2>
              <p className="text-sm text-purple-700 font-medium">{scenario.name}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-grow p-4 overflow-y-auto">
            {entriesForScenario.length > 0 ? (
              <ul className="space-y-3">
                {entriesForScenario.map(entry => {
                  const isIncome = entry.type === 'revenu';
                  return (
                    <li key={entry.id} className="p-3 bg-white rounded-lg border group">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {isIncome ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{entry.supplier}</p>
                            <p className="text-xs text-gray-500">{entry.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(entry.amount, state.settings)}
                                <span className="text-xs font-normal text-gray-500 ml-1">/{entry.frequency}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                <button onClick={() => onEditEntry(entry)} className="p-1 text-blue-600 hover:text-blue-800"><Edit size={14} /></button>
                                <button onClick={() => onDeleteEntry(entry.id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                            </div>
                        </div>
                      </div>
                      {entry.isNew && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-2 inline-block">Nouvelle entrée</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>Aucune écriture spécifique à ce scénario.</p>
                <p className="text-sm mt-1">Ajoutez des modifications pour simuler leur impact.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-white">
            <button onClick={onAddEntry} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter une écriture au scénario
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioEntriesDrawer;
