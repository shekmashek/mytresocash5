import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { X, Save, Banknote, Coins } from 'lucide-react';

const LoanModal = ({ isOpen, onClose, onSave, editingLoan, type }) => {
    const { state } = useBudget();
    const { tiers } = state;

    const [formData, setFormData] = useState({
        thirdParty: '',
        principal: '',
        monthlyPayment: '',
        term: '', // in months
        principalDate: new Date().toISOString().split('T')[0],
        repaymentStartDate: '',
    });

    useEffect(() => {
        if (isOpen) {
            if (editingLoan) {
                setFormData({
                    thirdParty: editingLoan.thirdParty,
                    principal: editingLoan.principal,
                    monthlyPayment: editingLoan.monthlyPayment,
                    term: editingLoan.term,
                    principalDate: editingLoan.principalDate,
                    repaymentStartDate: editingLoan.repaymentStartDate,
                });
            } else {
                const today = new Date();
                const principalDate = today.toISOString().split('T')[0];
                const repaymentStartDate = new Date(new Date().setMonth(today.getMonth() + 1)).toISOString().split('T')[0];
                setFormData({
                    thirdParty: '',
                    principal: '',
                    monthlyPayment: '',
                    term: '',
                    principalDate,
                    repaymentStartDate,
                });
            }
        }
    }, [editingLoan, isOpen]);

    const config = type === 'borrowing'
        ? { title: 'Nouvel Emprunt', thirdPartyLabel: 'Prêteur' }
        : { title: 'Nouveau Prêt', thirdPartyLabel: 'Emprunteur' };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            principal: parseFloat(formData.principal),
            monthlyPayment: parseFloat(formData.monthlyPayment),
            term: parseInt(formData.term, 10),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {type === 'borrowing' ? <Banknote className="w-5 h-5 text-danger-700" /> : <Coins className="w-5 h-5 text-success-700" />}
                        {editingLoan ? `Modifier l'${type === 'borrowing' ? 'emprunt' : 'prêt'}` : config.title}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{config.thirdPartyLabel} *</label>
                        <input type="text" list="tiers-list" value={formData.thirdParty || ''} onChange={(e) => setFormData(f => ({ ...f, thirdParty: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required />
                        <datalist id="tiers-list">{tiers.map(tier => (<option key={tier.id} value={tier.name} />))}</datalist>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant Principal *</label>
                            <input type="number" value={formData.principal || ''} onChange={(e) => setFormData(f => ({ ...f, principal: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mensualité *</label>
                            <input type="number" value={formData.monthlyPayment || ''} onChange={(e) => setFormData(f => ({ ...f, monthlyPayment: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required step="0.01" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Durée (en mois) *</label>
                            <input type="number" value={formData.term || ''} onChange={(e) => setFormData(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'octroi *</label>
                            <input type="date" value={formData.principalDate || ''} onChange={(e) => setFormData(f => ({ ...f, principalDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Début des remboursements *</label>
                        <input type="date" value={formData.repaymentStartDate || ''} onChange={(e) => setFormData(f => ({ ...f, repaymentStartDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button>
                        <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                            <Save className="w-4 h-4" /> {editingLoan ? 'Modifier' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoanModal;
