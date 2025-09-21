import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Plus, Edit, Trash2, Archive, Layers } from 'lucide-react';
import ProjectModal from './ProjectModal';
import { useBudget } from '../context/BudgetContext';
import { useTranslation } from '../utils/i18n';
import { supabase } from '../utils/supabase';

const ProjectSwitcher = () => {
  const { state, dispatch } = useBudget();
  const { projects, activeProjectId, consolidatedViews } = state;
  const { t } = useTranslation();
  
  const activeProjects = projects.filter(p => !p.isArchived);
  const activeItem = 
    consolidatedViews.find(v => v.id === activeProjectId) ||
    projects.find(p => p.id === activeProjectId);

  const [isListOpen, setIsListOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (listRef.current && !listRef.current.contains(event.target)) setIsListOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (itemId) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: itemId });
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

  const handleOpenConsolidatedViewModal = (view = null) => {
    dispatch({ type: 'OPEN_CONSOLIDATED_VIEW_MODAL', payload: view });
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
        message: "Cette action est irréversible. Toutes les données associées à ce projet seront définitivement perdues.",
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
        message: "L'archivage d'un projet le masquera de la liste principale, mais toutes ses données seront conservées.",
        onConfirm: () => dispatch({ type: 'ARCHIVE_PROJECT', payload: projectId }),
        confirmText: 'Archiver',
        cancelText: 'Annuler',
        confirmColor: 'primary'
      }
    });
  };

  const handleDeleteConsolidatedView = (viewId) => {
    const viewToDelete = consolidatedViews.find(v => v.id === viewId);
    if (!viewToDelete) return;
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: `Supprimer la vue "${viewToDelete.name}" ?`,
        message: "Cette action est irréversible. La vue consolidée sera supprimée, mais vos projets resteront intacts.",
        onConfirm: () => dispatch({ type: 'DELETE_CONSOLIDATED_VIEW', payload: viewId }),
      }
    });
  };
  
  const displayName = activeItem ? activeItem.name : 'Sélectionner un projet';

  return (
    <div className="relative w-full" ref={listRef}>
      <button onClick={() => setIsListOpen(!isListOpen)} className="flex items-center gap-2 text-left text-gray-700 hover:text-blue-600 transition-colors focus:outline-none">
        <span className="font-medium truncate">{displayName}</span>
        <ChevronsUpDown className="w-4 h-4 text-gray-500 shrink-0" />
      </button>
      {isListOpen && (
        <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <ul className="py-1 max-h-80 overflow-y-auto">
            <li className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase">Vues Consolidées</li>
            {consolidatedViews.map(view => (
              <li key={view.id} className="flex items-center justify-between w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 group">
                <button onClick={() => handleSelectItem(view.id)} className="flex items-center gap-2 flex-grow truncate">
                  <span className="truncate">{view.name}</span>
                </button>
                <div className="flex items-center gap-1 pl-2">
                  {view.id === activeProjectId && <Check className="w-4 h-4 text-blue-600" />}
                  <button onClick={(e) => { e.stopPropagation(); handleOpenConsolidatedViewModal(view); }} className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Modifier"><Edit className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteConsolidatedView(view.id); }} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
            <li><button onClick={() => handleOpenConsolidatedViewModal(null)} className="flex items-center w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50"><Plus className="w-4 h-4 mr-2" />Créer une vue consolidée</button></li>
            
            <li><hr className="my-1" /></li>
            <li className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase">Projets Individuels</li>
            {activeProjects.map(project => (
              <li key={project.id} className="flex items-center justify-between w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 group">
                  <button onClick={() => handleSelectItem(project.id)} className="flex items-center gap-2 flex-grow truncate">
                      <span className="truncate">{project.name}</span>
                  </button>
                  <div className="flex items-center gap-1 pl-2">
                      {project.id === activeProjectId && <Check className="w-4 h-4 text-blue-600" />}
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
