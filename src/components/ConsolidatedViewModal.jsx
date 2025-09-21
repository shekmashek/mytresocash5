import React, { useState, useEffect } from 'react';
import { Layers, Save, X } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

const ConsolidatedViewModal = ({ isOpen, onClose, onSave, editingView }) => {
  const { state } = useBudget();
  const { projects } = state;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjects, setSelectedProjects] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      if (editingView) {
        setName(editingView.name);
        setDescription(editingView.description || '');
        setSelectedProjects(new Set(editingView.projectIds || []));
      } else {
        setName('');
        setDescription('');
        setSelectedProjects(new Set());
      }
    }
  }, [isOpen, editingView]);

  const handleProjectToggle = (projectId) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Veuillez donner un nom à la vue consolidée.");
      return;
    }
    onSave({
      id: editingView?.id,
      name,
      description,
      projectIds: Array.from(selectedProjects),
    });
  };

  if (!isOpen) return null;

  const availableProjects = projects.filter(p => !p.isArchived);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            {editingView ? 'Modifier la vue consolidée' : 'Créer une vue consolidée'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la vue *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: Projets Personnels, Activités Pro..."
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="2"
              placeholder="Décrivez l'objectif de cette vue..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Projets à inclure</label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50 space-y-2">
              {availableProjects.length > 0 ? (
                availableProjects.map(project => (
                  <label key={project.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{project.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-center text-gray-500 py-4">Aucun projet disponible. Créez-en un d'abord.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
              Annuler
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
              <Save className="w-4 h-4" /> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsolidatedViewModal;
