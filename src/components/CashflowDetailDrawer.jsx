import React, { useMemo } from 'react';
import { X, Calendar, Wallet, User, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import { useBudget } from '../context/BudgetContext';

const CashflowDetailDrawer = ({ isOpen, onClose, transactions, title, currency }) => {
  const { state } = useBudget();
  const { allCashAccounts, settings } = state;

  const accountNameMap = useMemo(() => {
    const map = new Map();
    Object.values(allCashAccounts).flat().forEach(account => {
        map.set(account.id, account.name);
    });
    return map;
  }, [allCashAccounts]);

  if (!isOpen) return null;

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR');
  const getCashAccountName = (accountId) => accountNameMap.get(accountId) || accountId || 'N/A';
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const currencySettings = { ...settings, currency };

  return (
    <>
      <div className={`fixed inset-0 bg-black z-40 transition-opacity ${isOpen ? 'bg-opacity-60' : 'bg-opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold text-gray-800">{title}</h2><button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
          <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
            {transactions.length === 0 ? (<p className="text-gray-500">Aucune transaction pour cette semaine.</p>) : (
              <ul className="space-y-3">
                {transactions.map(tx => (
                  <li key={tx.id} className="p-3 bg-white rounded-lg border flex">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 mr-3 flex-shrink-0 ${tx.type === 'receivable' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2"><div className="font-semibold text-gray-800 flex items-center gap-2"><User className="w-4 h-4 text-gray-500" />{tx.thirdParty}</div><div className="font-bold text-lg text-blue-600">{formatCurrency(tx.amount, currencySettings)}</div></div>
                      <div className="text-sm text-gray-600 space-y-1">
                         <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /><span>Date: {formatDate(tx.date)}</span></div>
                         {tx.status === 'realized' && tx.cashAccount && (<div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-gray-400" /><span>Compte: {getCashAccountName(tx.cashAccount)}</span></div>)}
                         <div className="flex items-center gap-2">{tx.status === 'realized' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}<span>Statut: {tx.status === 'realized' ? 'Réalisé' : 'Prévu'}</span></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 border-t bg-gray-100"><div className="flex justify-between items-center"><span className="font-semibold text-gray-800">Total pour la semaine</span><span className="font-bold text-xl text-blue-700">{formatCurrency(totalAmount, currencySettings)}</span></div></div>
        </div>
      </div>
    </>
  );
};

export default CashflowDetailDrawer;
