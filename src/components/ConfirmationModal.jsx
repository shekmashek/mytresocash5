import React from 'react';
import { X, AlertTriangle, Archive } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmer', cancelText = 'Annuler', confirmColor = 'danger' }) => {
  if (!isOpen) return null;

  const colorConfig = {
    danger: {
      button: 'bg-danger-600 hover:bg-danger-700',
      iconBg: 'bg-danger-100',
      icon: <AlertTriangle className="h-6 w-6 text-danger-600" aria-hidden="true" />
    },
    primary: {
      button: 'bg-primary-600 hover:bg-primary-700',
      iconBg: 'bg-primary-100',
      icon: <Archive className="h-6 w-6 text-primary-600" aria-hidden="true" />
    },
  };

  const currentColors = colorConfig[confirmColor] || colorConfig.danger;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${currentColors.iconBg}`}>
              {currentColors.icon}
            </div>
            <div className="mt-0 text-left">
              <h3 className="text-lg leading-6 font-bold text-text-primary" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-text-secondary">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-secondary-50 px-6 py-4 flex flex-row-reverse gap-3 rounded-b-lg">
          <button
            type="button"
            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${currentColors.button}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-secondary-300 shadow-sm px-4 py-2 bg-surface text-base font-medium text-text-primary hover:bg-secondary-50 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
