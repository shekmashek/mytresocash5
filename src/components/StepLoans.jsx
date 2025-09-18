import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Banknote, Coins } from 'lucide-react';

const LoanRow = ({ loan, onUpdate, onDelete, type }) => {
  const config = type === 'borrowing'
    ? { thirdPartyLabel: 'Prêteur' }
    : { thirdPartyLabel: 'Emprunteur' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 border rounded-lg bg-surface">
      <div className="md:col-span-3">
        <label className="text-xs text-gray-500 md:hidden">{config.thirdPartyLabel}</label>
        <input
          type="text"
          placeholder={config.thirdPartyLabel}
          value={loan.thirdParty}
          onChange={(e) => onUpdate(loan.id, 'thirdParty', e.target.value)}
          className="p-2 border rounded-md bg-surface text-sm w-full"
          required
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs text-gray-500 md:hidden">Principal</label>
        <input
          type="number"
          placeholder="Principal"
          value={loan.principal}
          onChange={(e) => onUpdate(loan.id, 'principal', e.target.value)}
          className="p-2 border rounded-md bg-surface text-sm w-full"
          required
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs text-gray-500 md:hidden">Mensualité</label>
        <input
          type="number"
          placeholder="Mensualité"
          value={loan.monthlyPayment}
          onChange={(e) => onUpdate(loan.id, 'monthlyPayment', e.target.value)}
          className="p-2 border rounded-md bg-surface text-sm w-full"
          required
        />
      </div>
      <div className="md:col-span-1">
        <label className="text-xs text-gray-500 md:hidden">Durée (mois)</label>
        <input
          type="number"
          placeholder="Durée"
          value={loan.term}
          onChange={(e) => onUpdate(loan.id, 'term', e.target.value)}
          className="p-2 border rounded-md bg-surface text-sm w-full"
          required
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs text-gray-500">Date d'octroi</label>
        <input
          type="date"
          value={loan.principalDate || ''}
          onChange={(e) => onUpdate(loan.id, 'principalDate', e.target.value)}
          className="w-full p-2 border rounded-md bg-surface text-sm"
          required
        />
      </div>
      <div className="md:col-span-2 flex items-end gap-2">
        <div className="w-full">
            <label className="text-xs text-gray-500">Début remboursements</label>
            <input
              type="date"
              value={loan.repaymentStartDate || ''}
              onChange={(e) => onUpdate(loan.id, 'repaymentStartDate', e.target.value)}
              className="w-full p-2 border rounded-md bg-surface text-sm"
              required
            />
        </div>
        <button onClick={() => onDelete(loan.id)} className="text-secondary-400 hover:text-danger-500 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const StepLoans = ({ type, initialData, onUpdate }) => {
  const [loans, setLoans] = useState(initialData || []);

  const config = type === 'borrowing'
    ? { title: "Avez-vous des emprunts en cours ?", desc: "Listez les emprunts que vous devez rembourser. Cela nous aidera à prévoir vos sorties d'argent.", Icon: Banknote, addText: "Ajouter un emprunt" }
    : { title: "Avez-vous des prêts en cours ?", desc: "Listez les prêts que vous avez accordés et que l'on vous rembourse. Cela nous aidera à prévoir vos entrées d'argent.", Icon: Coins, addText: "Ajouter un prêt" };

  const handleAddRow = () => {
    const today = new Date();
    const principalDate = today.toISOString().split('T')[0];
    const repaymentStartDate = new Date(new Date().setMonth(today.getMonth() + 1)).toISOString().split('T')[0];
    const newLoans = [...loans, { id: uuidv4(), thirdParty: '', principal: '', monthlyPayment: '', term: '', principalDate, repaymentStartDate }];
    setLoans(newLoans);
    onUpdate(newLoans);
  };

  const handleUpdateRow = (id, field, value) => {
    const newLoans = loans.map(l => l.id === id ? { ...l, [field]: value } : l);
    setLoans(newLoans);
    onUpdate(newLoans);
  };

  const handleDeleteRow = (id) => {
    const newLoans = loans.filter(l => l.id !== id);
    setLoans(newLoans);
    onUpdate(newLoans);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{config.title}</h2>
      <p className="text-text-secondary text-center mb-6">{config.desc}</p>
      <div className="space-y-3 bg-secondary-50 p-4 rounded-lg">
        {loans.length > 0 ? (
          loans.map(loan => (
            <LoanRow key={loan.id} loan={loan} onUpdate={handleUpdateRow} onDelete={handleDeleteRow} type={type} />
          ))
        ) : (
          <p className="text-center text-secondary-500 py-4">Aucun {type === 'borrowing' ? 'emprunt' : 'prêt'} pour le moment. Cliquez sur "Ajouter" pour commencer.</p>
        )}
      </div>
      <div className="mt-4 flex justify-center">
        <button onClick={handleAddRow} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium">
          <Plus className="w-4 h-4" /> {config.addText}
        </button>
      </div>
    </div>
  );
};

export default StepLoans;
