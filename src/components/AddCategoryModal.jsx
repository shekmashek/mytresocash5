import React, { useState } from 'react';
import { X, Save, FolderPlus } from 'lucide-react';

const AddCategoryModal = ({ isOpen, onClose, onSave, mainCategoryName }) => {
  const [subCategoryName, setSubCategoryName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subCategoryName.trim()) {
      alert("Veuillez donner un nom à la sous-catégorie.");
      return;
    }
    onSave(subCategoryName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600" />
            Ajouter une nouvelle sous-catégorie
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dans la catégorie principale :
            </label>
            <p className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg font-semibold">{mainCategoryName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la nouvelle sous-catégorie :
            </label>
            <input
              type="text"
              value={subCategoryName}
              onChange={(e) => setSubCategoryName(e.target.value)}
              placeholder="Ex: Fournitures de bureau"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              autoFocus
              required
            />
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

export default AddCategoryModal;
