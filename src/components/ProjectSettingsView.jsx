import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

const ProjectSettingsView = () => {
  const { state, dispatch } = useBudget();
  const { projects, activeProjectId } = state;

  const activeProject = projects.find(p => p.id === activeProjectId);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (activeProject) {
      setName(activeProject.name);
      setStartDate(activeProject.startDate || new Date().toISOString().split('T')[0]);
    }
  }, [activeProject]);

  const handleSaveChanges = () => {
    if (!name.trim() || !startDate) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Le nom et la date de début sont requis.', type: 'error' } });
      return;
    }
    dispatch({
      type: 'UPDATE_PROJECT_SETTINGS',
      payload: {
        projectId: activeProjectId,
        newSettings: { name, startDate }
      }
    });
  };
  
  const isConsolidated = activeProjectId === 'consolidated';

  if (isConsolidated) {
    return (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
                <h4 className="font-bold">Vue Consolidée</h4>
                <p className="text-sm">Les paramètres de projet sont spécifiques à chaque projet. Veuillez sélectionner un projet pour les modifier.</p>
            </div>
        </div>
    );
  }

  if (!activeProject) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-bold text-lg text-gray-800 mb-4">Paramètres du Projet</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Projet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de Début du Projet</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
             <p className="text-xs text-gray-500 mt-1">Aucune transaction ne peut être enregistrée avant cette date.</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSaveChanges}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Enregistrer les Modifications
        </button>
      </div>
    </div>
  );
};

export default ProjectSettingsView;
