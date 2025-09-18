import React from 'react';
import { BookOpen, Receipt } from 'lucide-react';
import BudgetJournal from './BudgetJournal';
import PaymentJournal from './PaymentJournal';
import { useBudget } from '../context/BudgetContext';

const JournalsView = ({ type = 'budget' }) => {
  const { dispatch } = useBudget();

  const handleEditEntry = (entry) => {
    dispatch({ type: 'OPEN_BUDGET_MODAL', payload: entry });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'budget' });
  };

  const config = {
    budget: {
      title: 'Journal du Budget',
      description: "Consultez l'historique de vos budgets prévisionnels.",
      icon: BookOpen,
      component: <BudgetJournal onEditEntry={handleEditEntry} />,
    },
    payment: {
      title: 'Journal des Paiements',
      description: "Consultez l'historique de tous les paiements réels.",
      icon: Receipt,
      component: <PaymentJournal />,
    }
  };
  const currentConfig = config[type];
  const Icon = currentConfig.icon;

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-8 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Icon className="w-8 h-8 text-yellow-600" />
              {currentConfig.title}
            </h1>
            <p className="text-gray-600">{currentConfig.description}</p>
          </div>
        </div>
      </div>
      <div>
        {currentConfig.component}
      </div>
    </div>
  );
};

export default JournalsView;
