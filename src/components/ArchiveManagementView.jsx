import React from 'react';
import { Archive, ArchiveRestore, Folder, Layers } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import EmptyState from './EmptyState';

const ArchiveManagementView = () => {
  const { state, dispatch } = useBudget();
  const { projects, scenarios } = state;

  const archivedProjects = projects.filter(p => p.isArchived);
  const archivedScenarios = scenarios.filter(s => s.isArchived);

  const handleRestoreProject = (projectId) => {
    dispatch({ type: 'RESTORE_PROJECT', payload: projectId });
  };

  const handleRestoreScenario = (scenarioId) => {
    dispatch({ type: 'RESTORE_SCENARIO', payload: scenarioId });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Archive className="w-5 h-5 text-slate-600" />
          Projets Archivés
        </h2>
        {archivedProjects.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {archivedProjects.map(project => (
              <li key={project.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-700">{project.name}</span>
                </div>
                <button
                  onClick={() => handleRestoreProject(project.id)}
                  className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-md font-medium flex items-center gap-2 text-sm"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  Restaurer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Archive}
            title="Aucun projet archivé"
            message="Les projets que vous choisissez d'archiver apparaîtront ici pour une consultation ou une restauration future."
          />
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-slate-600" />
          Scénarios Archivés
        </h2>
        {archivedScenarios.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {archivedScenarios.map(scenario => {
              const project = projects.find(p => p.id === scenario.projectId);
              return (
                <li key={scenario.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-700">{scenario.name}</span>
                      <span className="ml-2 text-xs text-gray-500">(Projet: {project?.name || 'Inconnu'})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreScenario(scenario.id)}
                    className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-md font-medium flex items-center gap-2 text-sm"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Restaurer
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={Archive}
            title="Aucun scénario archivé"
            message="Les scénarios que vous archivez seront conservés ici."
          />
        )}
      </div>
    </div>
  );
};

export default ArchiveManagementView;
