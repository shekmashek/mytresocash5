import React, { useState, useMemo, useEffect } from 'react';
import { X, Edit, Trash2, Plus, Save, Wallet, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { getEntryAmountForPeriod } from '../utils/budgetCalculations';

const InlinePaymentDrawer = ({ isOpen, onClose, actuals, entry, period, periodLabel }) => {
  const { state, dispatch } = useBudget();
  const { allCashAccounts, settings, activeProjectId, projects } = state;
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ paidAmount: '', paymentDate: '', cashAccount: '' });
  const [addForm, setAddForm] = useState({ paymentDate: '', paidAmount: '', cashAccount: '', targetActualId: '' });

  const userCashAccounts = useMemo(() => {
    return allCashAccounts[activeProjectId] || [];
  }, [allCashAccounts, activeProjectId]);

  useEffect(() => {
    if (isOpen) {
      setEditingPaymentId(null);
      const unsettledActuals = actuals.filter(a => ['pending', 'partially_paid', 'partially_received'].includes(a.status));
      const activeAccounts = userCashAccounts.filter(acc => !acc.isClosed);
      setAddForm({
        paymentDate: new Date().toISOString().split('T')[0],
        paidAmount: '',
        cashAccount: activeAccounts.length > 0 ? activeAccounts[0].id : '',
        targetActualId: unsettledActuals.length > 0 ? unsettledActuals[0].id : ''
      });
    }
  }, [isOpen, actuals, userCashAccounts]);

  const paymentsInPeriod = useMemo(() => {
    if (!isOpen || !period) return [];
    
    const actualsDueInPeriod = actuals.filter(a => {
        const dueDate = new Date(a.date);
        return dueDate >= period.startDate && dueDate < period.endDate;
    });

    return actualsDueInPeriod
      .flatMap(actual => (actual.payments || []).map(p => ({ ...p, actualId: actual.id, actualType: actual.type })))
      .sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
  }, [actuals, period, isOpen]);

  const budgetAmount = useMemo(() => {
    if (!entry || !period) return 0;
    return getEntryAmountForPeriod(entry, period.startDate, period.endDate);
  }, [entry, period]);

  const actualAmount = useMemo(() => {
    return paymentsInPeriod.reduce((sum, p) => sum + p.paidAmount, 0);
  }, [paymentsInPeriod]);

  const unsettledActualsInPeriod = useMemo(() => {
    if (!actuals || !period) return [];
    return actuals.filter(a => {
        const dueDate = new Date(a.date);
        return ['pending', 'partially_paid', 'partially_received'].includes(a.status) &&
               dueDate >= period.startDate && dueDate < period.endDate;
    });
  }, [actuals, period]);

  const handleStartEdit = (payment) => {
    setEditingPaymentId(payment.id);
    setPaymentForm({
      paidAmount: payment.paidAmount || '',
      paymentDate: payment.paymentDate || '',
      cashAccount: payment.cashAccount || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
  };

  const handleSaveEdit = (payment) => {
    dispatch({
      type: 'UPDATE_PAYMENT',
      payload: {
        actualId: payment.actualId,
        paymentData: { ...payment, ...paymentForm, paidAmount: parseFloat(paymentForm.paidAmount) }
      }
    });
    setEditingPaymentId(null);
  };

  const handleDeletePayment = (payment) => {
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: 'Supprimer ce paiement ?',
        message: 'Cette action est irréversible.',
        onConfirm: () => dispatch({ type: 'DELETE_PAYMENT', payload: { actualId: payment.actualId, paymentId: payment.id } }),
      }
    });
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(addForm.paidAmount);
    if (!addForm.targetActualId) {
        dispatch({ type: 'ADD_TOAST', payload: { message: "Aucune échéance prévisionnelle n'est disponible pour y attacher le paiement.", type: 'error' } });
        return;
    }
    if (!amount || amount <= 0 || !addForm.paymentDate || !addForm.cashAccount) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez remplir tous les champs pour ajouter un paiement.', type: 'error' } });
      return;
    }

    dispatch({
      type: 'RECORD_PAYMENT',
      payload: {
        actualId: addForm.targetActualId,
        paymentData: {
          paidAmount: amount,
          paymentDate: addForm.paymentDate,
          cashAccount: addForm.cashAccount,
        }
      }
    });
    setAddForm(prev => ({ ...prev, paidAmount: '' }));
  };

  if (!isOpen || !entry || !period) return null;
  const isRevenue = entry.type === 'revenu';

  return (
    <>
      <div className="fixed inset-0 bg-black z-40 transition-opacity bg-opacity-60" onClick={onClose}></div>
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-gray-50 shadow-xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Gérer le Réel - {periodLabel}</h2>
                <p className="text-sm text-gray-500">{entry.supplier} - {entry.category}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-4 bg-white border-b grid grid-cols-3 gap-4 text-center">
            <div>
                <div className="text-xs text-gray-500">Prévu</div>
                <div className="text-lg font-bold text-gray-800">{formatCurrency(budgetAmount, settings)}</div>
            </div>
            <div>
                <div className="text-xs text-blue-500">Réel</div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(actualAmount, settings)}</div>
            </div>
            <div>
                <div className="text-xs text-purple-500">Écart</div>
                <div className={`text-lg font-bold ${actualAmount - budgetAmount >= 0 ? (isRevenue ? 'text-green-600' : 'text-red-600') : (isRevenue ? 'text-red-600' : 'text-green-600')}`}>
                    {formatCurrency(actualAmount - budgetAmount, settings)}
                </div>
            </div>
          </div>

          <div className="flex-grow p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-700 mb-3">Paiements pour cette échéance</h3>
            {paymentsInPeriod.length > 0 ? (
              <ul className="space-y-3">
                {paymentsInPeriod.map(p => (
                  <li key={p.id} className="p-3 bg-white rounded-lg border">
                    {editingPaymentId === p.id ? (
                      <div className="space-y-2">
                        <input type="number" value={paymentForm.paidAmount} onChange={e => setPaymentForm(f => ({...f, paidAmount: e.target.value}))} className="w-full p-1 border rounded" />
                        <input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm(f => ({...f, paymentDate: e.target.value}))} className="w-full p-1 border rounded" min={activeProject?.startDate} />
                        <select value={paymentForm.cashAccount} onChange={e => setPaymentForm(f => ({...f, cashAccount: e.target.value}))} className="w-full p-1 border rounded bg-white">
                          {userCashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2">
                          <button onClick={handleCancelEdit} className="text-xs px-2 py-1 bg-gray-200 rounded">Annuler</button>
                          <button onClick={() => handleSaveEdit(p)} className="text-xs px-2 py-1 bg-green-600 text-white rounded">Sauver</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex-grow">
                          <div className={`font-bold text-lg ${p.actualType === 'receivable' ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(p.paidAmount, settings)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.paymentDate).toLocaleDateString('fr-FR')}</span>
                            <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {allCashAccounts[activeProjectId]?.find(acc => acc.id === p.cashAccount)?.name || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleStartEdit(p)} className="p-1 text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeletePayment(p)} className="p-1 text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4 text-sm">Aucun paiement réel pour cette échéance.</p>
            )}
          </div>

          <div className="p-4 border-t bg-white">
            <h3 className="font-semibold text-gray-700 mb-3">Ajouter un paiement</h3>
            <form onSubmit={handleAddPayment} className="space-y-3">
              {unsettledActualsInPeriod.length === 0 && (
                <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Aucune échéance prévisionnelle n'est disponible dans cette période. Le paiement sera rattaché à la prochaine échéance disponible.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Montant</label>
                  <input type="number" placeholder="0.00" value={addForm.paidAmount} onChange={e => setAddForm(f => ({...f, paidAmount: e.target.value}))} className="w-full p-2 border rounded-md text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                  <input type="date" value={addForm.paymentDate} onChange={e => setAddForm(f => ({...f, paymentDate: e.target.value}))} className="w-full p-2 border rounded-md text-sm" required min={activeProject?.startDate} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Compte</label>
                <select value={addForm.cashAccount} onChange={e => setAddForm(f => ({...f, cashAccount: e.target.value}))} className="w-full p-2 border rounded-md text-sm bg-white" required>
                  {userCashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.isClosed}>
                      {acc.name} {acc.isClosed ? `(Clôturé le ${new Date(acc.closureDate).toLocaleDateString('fr-FR')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {unsettledActualsInPeriod.length > 1 && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Rattacher à l'échéance</label>
                  <select value={addForm.targetActualId} onChange={e => setAddForm(f => ({...f, targetActualId: e.target.value}))} className="w-full p-2 border rounded-md text-sm bg-white" required>
                    {unsettledActualsInPeriod.map(actual => (
                      <option key={actual.id} value={actual.id}>
                        Échéance du {new Date(actual.date).toLocaleDateString('fr-FR')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter Paiement
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default InlinePaymentDrawer;
