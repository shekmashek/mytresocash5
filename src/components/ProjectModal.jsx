import React, { useState, useEffect } from 'react';
import { X, Edit, Plus } from 'lucide-react';

const ProjectModal = ({ mode, isOpen, onClose, onSave, projectName }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(projectName || '');
    }
  }, [isOpen, projectName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  const title = mode === 'add' ? 'Créer un nouveau projet' : 'Renommer le projet';
  const buttonText = mode === 'add' ? 'Créer' : 'Enregistrer';
  const Icon = mode === 'add' ? Plus : Edit;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nom du projet</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Mon entreprise, Budget personnel..."
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
              Annuler
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
              <Icon className="w-4 h-4" /> {buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
