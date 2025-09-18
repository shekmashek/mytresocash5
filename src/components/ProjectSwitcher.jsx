import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Plus, Edit, Trash2, Archive } from 'lucide-react';
import ProjectModal from './ProjectModal';
import { useBudget } from '../context/BudgetContext';
import { useTranslation } from '../utils/i18n';
import { supabase } from '../utils/supabase';

const ProjectSwitcher = () => {
  const { state, dispatch } = useBudget();
  const { projects, activeProjectId } = state;
  const { t } = useTranslation();
  const activeProjects = projects.filter(p => !p.isArchived);
  const activeProject = projects.find(p => p.id === activeProjectId) || { id: 'consolidated', name: t('subHeader.consolidatedBudget') };

  const [isListOpen, setIsListOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  const listRef = useRef(null);

  const isConsolidated = activeProject.id === 'consolidated';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (listRef.current && !listRef.current.contains(event.target)) setIsListOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProject = (projectId) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: projectId });
    setIsListOpen(false);
  };

  const handleStartOnboarding = () => {
    dispatch({ type: 'START_ONBOARDING' });
    setIsListOpen(false);
  };

  const handleOpenRenameModal = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
    setIsListOpen(false);
  };

  const handleSaveRename = async (newName) => {
    if (editingProject) {
      const { data, error } = await supabase
        .from('projects')
        .update({ name: newName })
        .eq('id', editingProject.id)
        .select()
        .single();

      if (error) {
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur lors du renommage: ${error.message}`, type: 'error' } });
      } else {
        dispatch({
          type: 'UPDATE_PROJECT_SETTINGS_SUCCESS',
          payload: {
            projectId: editingProject.id,
            newSettings: { name: data.name }
          }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Projet renommé avec succès.', type: 'success' } });
      }
    }
  };

  const handleDeleteProject = (projectId) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: `Supprimer le projet "${projectToDelete.name}" ?`,
        message: "Cette action est irréversible. Toutes les données associées à ce projet (budgets, transactions, scénarios) seront définitivement perdues. Pour conserver les données, vous pouvez plutôt l'archiver.",
        onConfirm: () => dispatch({ type: 'DELETE_PROJECT', payload: projectId }),
      }
    });
  };
  
  const handleArchiveProject = (projectId) => {
    const projectToArchive = projects.find(p => p.id === projectId);
    if (!projectToArchive) return;

    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: `Archiver le projet "${projectToArchive.name}" ?`,
        message: "L'archivage d'un projet le masquera de la liste principale, mais toutes ses données seront conservées. Vous pourrez le restaurer à tout moment depuis les paramètres avancés.",
        onConfirm: () => dispatch({ type: 'ARCHIVE_PROJECT', payload: projectId }),
        confirmText: 'Archiver',
        cancelText: 'Annuler',
        confirmColor: 'primary'
      }
    });
  };
  
  const displayName = activeProject.id === 'consolidated' ? `Mes projets consolidé` : activeProject.name;

  return (
    <div className="relative w-full" ref={listRef}>
      <button onClick={() => setIsListOpen(!isListOpen)} className="flex items-center gap-2 text-left text-gray-700 hover:text-blue-600 transition-colors focus:outline-none">
        <span className="font-medium truncate">{displayName}</span>
        <ChevronsUpDown className="w-4 h-4 text-gray-500 shrink-0" />
      </button>
      {isListOpen && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <ul className="py-1 max-h-60 overflow-y-auto">
            <li><button onClick={() => handleSelectProject('consolidated')} className="flex items-center justify-between w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50"><span className="font-semibold">Mes projets consolidé</span>{isConsolidated && <Check className="w-4 h-4 text-purple-600" />}</button></li>
            <li><hr className="my-1" /></li>
            {activeProjects.map(project => (
              <li key={project.id} className="flex items-center justify-between w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 group">
                  <button onClick={() => handleSelectProject(project.id)} className="flex items-center gap-2 flex-grow truncate">
                      <span className="truncate">{project.name}</span>
                  </button>
                  <div className="flex items-center gap-1 pl-2">
                      {project.id === activeProject.id && <Check className="w-4 h-4 text-blue-600" />}
                      <button onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(project); }} className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Renommer"><Edit className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleArchiveProject(project.id); }} className="p-1 text-gray-400 hover:text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Archiver"><Archive className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </div>
              </li>
            ))}
            <li><hr className="my-1" /></li>
            <li><button onClick={handleStartOnboarding} className="flex items-center w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50"><Plus className="w-4 h-4 mr-2" />{t('subHeader.newProject')}</button></li>
          </ul>
        </div>
      )}
      {isModalOpen && (<ProjectModal mode="rename" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveRename} projectName={editingProject ? editingProject.name : ''} />)}
    </div>
  );
};

export default ProjectSwitcher;
