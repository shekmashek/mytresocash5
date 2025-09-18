import React from 'react';
import { Wrench } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

const UnderConstructionView = ({ title }) => {
  const { dispatch } = useBudget();

  const handleGoBack = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'budget' });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
      <div className="text-center">
        <Wrench className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-lg text-gray-600 mb-8">Cette section est en cours de construction.</p>
        <button
          onClick={handleGoBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Retourner à l'accueil
        </button>
      </div>
    </div>
  );
};

export default UnderConstructionView;
