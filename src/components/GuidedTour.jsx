import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudget } from '../context/BudgetContext';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

const tourSteps = [
  {
    target: '#tour-step-dashboard',
    title: 'Bienvenue sur votre Tableau de Bord',
    content: 'C\'est votre page d\'accueil. Elle vous donne une vision synthétique et immédiate de la santé de votre trésorerie.',
    position: 'bottom'
  },
  {
    target: '#tour-step-budget',
    title: 'Le Tableau de Trésorerie',
    content: 'Votre centre de contrôle. Ici, vous avez une vision claire et détaillée de tous vos flux, période par période.',
    position: 'bottom'
  },
  {
    target: '#tour-step-cashflow',
    title: 'Le Suivi des Flux',
    content: 'Visualisez vos flux. Ce graphique vous permet de comprendre en un clin d\'œil d\'où vient et où va votre argent.',
    position: 'bottom'
  },
  {
    target: '#tour-step-schedule',
    title: 'L\'Échéancier',
    content: 'Ne manquez plus jamais une échéance. L\'échéancier vous présente toutes vos transactions à venir sous forme de calendrier.',
    position: 'bottom'
  },
  {
    target: '#tour-step-scenarios',
    title: 'La Simulation de Scénarios',
    content: 'Simulez l\'avenir. Créez des simulations pour visualiser l\'impact de vos décisions sur votre trésorerie future.',
    position: 'bottom'
  },
  {
    target: '#tour-step-expenseAnalysis',
    title: 'L\'Analyse Approfondie',
    content: 'Plongez dans vos données. Analysez la répartition de vos dépenses et revenus pour prendre les meilleures décisions.',
    position: 'bottom'
  },
  {
    target: '#project-switcher',
    title: 'Votre Super-Pouvoir : La Consolidation',
    content: 'Créez plusieurs projets et consolidez-les en un clic pour avoir une vision globale de votre patrimoine financier.',
    position: 'bottom'
  },
];

const GuidedTour = () => {
  const { dispatch } = useBudget();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = tourSteps[currentStep];

  useEffect(() => {
    const targetElement = document.querySelector(step.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      dispatch({ type: 'SET_TOUR_HIGHLIGHT', payload: step.target });
    } else {
      handleNext();
    }
  }, [currentStep, step.target, dispatch]);

  useEffect(() => {
    // Cleanup function to remove highlight when the tour component unmounts
    return () => {
      dispatch({ type: 'SET_TOUR_HIGHLIGHT', payload: null });
    };
  }, [dispatch]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const endTour = () => {
    dispatch({ type: 'END_TOUR' });
  };

  const tooltipPosition = useMemo(() => {
    if (!targetRect) return {};

    const positions = {
      top: { top: targetRect.top - 10, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, -100%)' },
      bottom: { top: targetRect.bottom + 10, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, 0)' },
      left: { top: targetRect.top + targetRect.height / 2, left: targetRect.left - 10, transform: 'translate(-100%, -50%)' },
      right: { top: targetRect.top + targetRect.height / 2, left: targetRect.right + 10, transform: 'translate(0, -50%)' },
    };
    return positions[step.position] || positions.bottom;
  }, [targetRect, step.position]);

  return (
    <div className="fixed inset-0 z-[999]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/20"
        onClick={endTour}
      />
      
      <AnimatePresence>
        {targetRect && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, ...targetRect }}
            animate={{ opacity: 1, ...targetRect }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed rounded-lg bg-white mix-blend-destination-over"
            style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.2)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {targetRect && (
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.1 }}
            className="fixed bg-white rounded-lg shadow-2xl w-80 p-5"
            style={tooltipPosition}
          >
            <h3 className="font-bold text-lg mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{step.content}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">{currentStep + 1} / {tourSteps.length}</span>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button onClick={handleBack} className="flex items-center gap-1 px-3 py-1 rounded-md text-sm text-gray-700 bg-gray-100 hover:bg-gray-200">
                    <ArrowLeft size={14} /> Précédent
                  </button>
                )}
                <button onClick={handleNext} className="flex items-center gap-1 px-3 py-1 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700">
                  {currentStep === tourSteps.length - 1 ? 'Terminer' : 'Suivant'} <ArrowRight size={14} />
                </button>
              </div>
            </div>
            <button onClick={endTour} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuidedTour;
