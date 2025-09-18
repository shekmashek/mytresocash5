import React from 'react';
import { X, DollarSign, HandCoins, FileX } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import { useBudget } from '../context/BudgetContext';

const ActionPriorityModal = ({ isOpen, onClose, transaction, onPay, onWriteOff }) => {
  const { state } = useBudget();
  const { settings } = state;

  if (!isOpen || !transaction) return null;

  const isPayable = transaction.type === 'payable';
  const title = isPayable ? 'Action pour une sortie' : 'Action pour une entrée';
  const payButtonText = isPayable ? 'Payer' : 'Encaisser';
  const PayIcon = isPayable ? DollarSign : HandCoins;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p><span className="font-medium">Tiers:</span> {transaction.thirdParty}</p>
            <p><span className="font-medium">Échéance:</span> {new Date(transaction.date).toLocaleDateString('fr-FR')}</p>
            <div className="flex justify-between items-baseline mt-2">
              <span className="font-medium text-lg">Montant Restant:</span>
              <span className={`font-bold text-2xl ${isPayable ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(transaction.remainingAmount, settings)}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => { onPay(transaction); onClose(); }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-white transition-colors ${isPayable ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <PayIcon className="w-5 h-5" />
              {payButtonText}
            </button>
            <button
              onClick={() => { onWriteOff(transaction); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-yellow-800 bg-yellow-200 hover:bg-yellow-300 transition-colors"
            >
              <FileX className="w-5 h-5" />
              Write-off
            </button>
          </div>
          <div className="mt-6 text-center">
            <button onClick={onClose} className="text-sm text-gray-500 hover:underline">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPriorityModal;
