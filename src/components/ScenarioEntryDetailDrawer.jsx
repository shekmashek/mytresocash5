import React from 'react';
import { X, Edit, Trash2 } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';

const ScenarioEntryDetailDrawer = ({ isOpen, onClose, scenarioId, entryId, onEdit, onDelete }) => {
  const { state } = useBudget();
  const { scenarios, scenarioEntries, allEntries, activeProjectId } = state;

  if (!isOpen || !scenarioId || !entryId) return null;

  const scenario = scenarios.find(s => s.id === scenarioId);
  const scenarioDeltas = scenarioEntries[scenarioId] || [];
  
  const baseEntry = (allEntries[activeProjectId] || []).find(e => e.id === entryId);
  const scenarioEntryDelta = scenarioDeltas.find(e => e.id === entryId);
  
  // The entry to display is the base entry overridden by any delta changes
  const entry = { ...baseEntry, ...scenarioEntryDelta };

  if (!entry) return null;

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

  const getFrequencyTitle = (entry) => {
    const freq = entry.frequency.charAt(0).toUpperCase() + entry.frequency.slice(1);
    if (entry.frequency === 'ponctuel') return `Ponctuel: ${formatDate(entry.date)}`;
    if (entry.frequency === 'irregulier') return `Irrégulier: ${entry.payments?.length || 0} paiements`;
    const period = `De ${formatDate(entry.startDate)} à ${entry.endDate ? formatDate(entry.endDate) : '...'}`;
    return `${freq} | ${period}`;
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black z-40 transition-opacity ${isOpen ? 'bg-opacity-60' : 'bg-opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Détail de l'entrée du Scénario</h2>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-grow p-6 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-purple-700">{scenario?.name}</h3>
              <div className="p-4 bg-white rounded-lg border">
                <p><span className="font-semibold">Fournisseur/Client:</span> {entry.supplier}</p>
                <p><span className="font-semibold">Catégorie:</span> {entry.category}</p>
                <p><span className="font-semibold">Description:</span> {entry.description || '-'}</p>
                <p><span className="font-semibold">Montant:</span> {formatCurrency(entry.amount, state.settings)}</p>
                <p><span className="font-semibold">Fréquence:</span> {getFrequencyTitle(entry)}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => onEdit(scenarioId, entry)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Modifier
                </button>
                <button onClick={() => onDelete(scenarioId, entryId)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioEntryDetailDrawer;
