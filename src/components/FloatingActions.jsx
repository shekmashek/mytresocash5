import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Plus, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingActions = () => {
  const { state, dispatch } = useBudget();
  const { activeProjectId } = state;
  const [isOpen, setIsOpen] = useState(false);
  const isConsolidated = activeProjectId === 'consolidated';

  const handleNewEntry = () => {
    dispatch({ type: 'OPEN_BUDGET_MODAL', payload: { type: 'revenu' } });
    setIsOpen(false);
  };

  const handleNewExpense = () => {
    dispatch({ type: 'OPEN_BUDGET_MODAL', payload: { type: 'depense' } });
    setIsOpen(false);
  };

  const handleNewScenario = () => {
    dispatch({ type: 'OPEN_SCENARIO_MODAL', payload: null });
    setIsOpen(false);
  };

  const subButtonVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 20
      },
    }),
    exit: { opacity: 0, scale: 0.5 }
  };

  const actions = [
    { label: 'Nouveau Scénario', icon: Layers, action: handleNewScenario, disabled: isConsolidated, color: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'Nouvelle Sortie', icon: TrendingDown, action: handleNewExpense, disabled: isConsolidated, color: 'bg-red-500 hover:bg-red-600' },
    { label: 'Nouvelle Entrée', icon: TrendingUp, action: handleNewEntry, disabled: isConsolidated, color: 'bg-green-500 hover:bg-green-600' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="flex flex-col items-end gap-3 mb-3"
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {actions.map((action, i) => (
              <motion.div key={action.label} custom={actions.length - 1 - i} variants={subButtonVariants} className="flex items-center gap-3">
                <span className="bg-gray-800 text-white text-xs font-semibold px-3 py-1 rounded-md shadow-lg">{action.label}</span>
                <button
                  onClick={action.action}
                  disabled={action.disabled}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${action.color} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                  <action.icon className="w-6 h-6 animate-spin-slow-continuous" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onHoverStart={() => setIsOpen(true)}
        onHoverEnd={() => setIsOpen(false)}
        className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }}>
          <Plus className="w-8 h-8" />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default FloatingActions;
