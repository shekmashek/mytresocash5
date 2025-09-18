import React, { useState } from 'react';
import { X } from 'lucide-react';

const CloseAccountModal = ({ isOpen, onClose, onConfirm, accountName, minDate }) => {
  const [closureDate, setClosureDate] = useState(new Date().toISOString().split('T')[0]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Clôturer le compte "{accountName}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture *</label>
            <input
              type="date"
              value={closureDate}
              onChange={(e) => setClosureDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
              min={minDate}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button>
            <button type="button" onClick={() => onConfirm(closureDate)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Confirmer la clôture</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloseAccountModal;
