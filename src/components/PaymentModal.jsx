import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Check } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import { useBudget } from '../context/BudgetContext';
import { recordPayment } from '../context/actions';

const PaymentModal = ({ isOpen, onClose, actualToPay, type }) => {
  const { state, dispatch } = useBudget();
  const { allCashAccounts, settings, activeProjectId, projects } = state;

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const userCashAccounts = useMemo(() => {
    return allCashAccounts[activeProjectId] || [];
  }, [allCashAccounts, activeProjectId]);

  const [paymentDate, setPaymentDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [cashAccount, setCashAccount] = useState('');
  
  const totalDue = actualToPay.amount;
  const totalPaid = (actualToPay.payments || []).reduce((sum, p) => sum + p.paidAmount, 0);
  const remainingAmount = totalDue - totalPaid;

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaidAmount(remainingAmount.toFixed(2));
      const activeAccounts = userCashAccounts.filter(acc => !acc.isClosed);
      setCashAccount(activeAccounts.length > 0 ? activeAccounts[0].id : '');
    }
  }, [isOpen, remainingAmount, userCashAccounts]);

  const handleSubmit = (isFinalPayment) => {
    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez entrer un montant valide.', type: 'error' } });
      return;
    }
    if (!cashAccount) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez sélectionner un compte de trésorerie.', type: 'error' } });
      return;
    }

    const paymentData = { paymentDate, paidAmount: amount, cashAccount, isFinalPayment };

    if (amount > remainingAmount && !isFinalPayment) {
      dispatch({
        type: 'OPEN_CONFIRMATION_MODAL',
        payload: {
          title: 'Montant supérieur au restant dû',
          message: 'Le montant saisi est supérieur au montant restant. Voulez-vous continuer ?',
          onConfirm: () => recordPayment(dispatch, { actualId: actualToPay.id, paymentData, allActuals: state.allActuals }),
        }
      });
    } else {
      recordPayment(dispatch, { actualId: actualToPay.id, paymentData, allActuals: state.allActuals });
    }
  };

  if (!isOpen) return null;

  const title = type === 'payable' ? 'Enregistrer un Paiement' : 'Enregistrer un Encaissement';
  const partialButtonText = type === 'payable' ? 'Paiement Partiel' : 'Encaissement Partiel';
  const finalButtonText = type === 'payable' ? 'Paiement Total' : 'Encaissement Total';
  const amountColor = type === 'payable' ? 'text-red-600' : 'text-green-600';
  const dateLabel = type === 'payable' ? 'Date de paiement *' : 'Date d\'encaissement *';
  const amountLabel = type === 'payable' ? `Montant payé (${settings.currency}) *` : `Montant encaissé (${settings.currency}) *`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b"><h2 className="text-xl font-semibold text-gray-900">{title}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button></div>
        <div className="p-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-4"><p><span className="font-medium">Tiers:</span> {actualToPay.thirdParty}</p><p><span className="font-medium">Catégorie:</span> {actualToPay.category}</p><div className="flex justify-between items-baseline mt-2"><span className="font-medium text-lg">Montant Restant:</span><span className={`font-bold text-2xl ${amountColor}`}>{formatCurrency(remainingAmount, settings)}</span></div></div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">{dateLabel}</label><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required min={activeProject?.startDate} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">{amountLabel}</label><input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required step="0.01" min="0.01" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Compte de trésorerie *</label>
              <select value={cashAccount} onChange={(e) => setCashAccount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Sélectionner un compte</option>
                {userCashAccounts.map(acc => (
                  <option key={acc.id} value={acc.id} disabled={acc.isClosed}>
                    {acc.name} {acc.isClosed ? `(Clôturé le ${new Date(acc.closureDate).toLocaleDateString('fr-FR')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button><button type="button" onClick={() => handleSubmit(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><DollarSign className="w-4 h-4" /> {partialButtonText}</button><button type="button" onClick={() => handleSubmit(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Check className="w-4 h-4" /> {finalButtonText}</button></div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
