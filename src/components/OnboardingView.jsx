import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Sparkles, Loader } from 'lucide-react';
import { initializeProject } from '../context/actions';
import TrezocashLogo from './TrezocashLogo';
import { v4 as uuidv4 } from 'uuid';

const OnboardingProgress = ({ current, total }) => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < current ? 'bg-blue-500' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  );
};

const OnboardingSummary = ({ data, step }) => {
    const { state } = useBudget();
    const { settings } = state;
    const currency = settings.currency;

    return (
        <div className="bg-gray-800 text-white p-8 rounded-l-2xl flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-100 mb-8">Votre Projet Trezocash</h2>
            <div className="space-y-5 text-gray-300 flex-grow">
                {step >= 0 && data.projectName && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <p className="text-sm text-gray-400">Nom du projet</p>
                        <p className="font-semibold text-white flex items-center gap-2">
                            {data.projectName}
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{currency}</span>
                        </p>
                    </motion.div>
                )}
                {step >= 1 && data.projectStartDate && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <p className="text-sm text-gray-400">Date de début</p>
                        <p className="font-semibold text-white">{new Date(data.projectStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </motion.div>
                )}
            </div>
            <div className="mt-auto">
                <p className="text-xs text-gray-400">Vous pourrez modifier tous ces paramètres plus tard.</p>
            </div>
        </div>
    );
};

const OnboardingView = () => {
  const { state: budgetState, dispatch } = useBudget();
  const { projects, settings, session, tiers } = budgetState;
  const hasExistingProjects = useMemo(() => projects.filter(p => !p.isArchived).length > 0, [projects]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState({
    projectName: '',
    projectStartDate: new Date().toISOString().split('T')[0],
  });

  const steps = [
    { id: 'projectName', title: "Comment s'appelle votre projet ?" },
    { id: 'startDate', title: "Date de début du projet" },
    { id: 'finish', title: 'Tout est prêt !' }
  ];

  const currentStepInfo = steps[step];

  const handleNext = () => {
    if (step === 0 && !data.projectName.trim()) {
        dispatch({ type: 'ADD_TOAST', payload: { message: "Le nom du projet est obligatoire.", type: 'error' } });
        return;
    }
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'CANCEL_ONBOARDING' });
  };

  const handleFinish = async () => {
    if (!data.projectName.trim()) {
        dispatch({ type: 'ADD_TOAST', payload: { message: "Le nom du projet est obligatoire.", type: 'error' } });
        setStep(0);
        return;
    }
    setIsLoading(true);
    
    const payload = {
        projectName: data.projectName,
        projectStartDate: data.projectStartDate,
    };

    try {
        await initializeProject(dispatch, payload, session.user, settings.currency);
    } catch (error) {
        setIsLoading(false);
    }
  };

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction) => ({ zIndex: 0, x: direction < 0 ? 100 : -100, opacity: 0 }),
  };

  const renderStepContent = () => {
    switch (currentStepInfo.id) {
      case 'projectName':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentStepInfo.title}</h2>
            <input
              type="text"
              value={data.projectName}
              onChange={(e) => setData(prev => ({ ...prev, projectName: e.target.value }))}
              placeholder="Ex: Mon Budget 2025, Trésorerie SARL..."
              className="w-full max-w-md mx-auto text-center text-xl p-3 border-b-2 focus:border-blue-500 outline-none transition"
              autoFocus
              required
            />
          </div>
        );
      case 'startDate':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Quelle est la date de début de votre projet ?</h2>
            <p className="text-gray-600 mb-8">Les transactions et analyses commenceront à partir de cette date.</p>
            <input
              type="date"
              value={data.projectStartDate}
              onChange={(e) => setData(prev => ({ ...prev, projectStartDate: e.target.value }))}
              className="w-full max-w-sm mx-auto text-center text-xl p-3 border-b-2 focus:border-blue-500 outline-none transition"
              autoFocus
            />
            <div className="mt-8">
              <button onClick={() => setStep(steps.length - 1)} className="text-sm text-gray-500 hover:underline">
                Ignorer le reste des configurations et lancer directement le projet
              </button>
            </div>
          </div>
        );
      case 'finish':
        return (
            <div className="text-center">
                <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Tout est prêt !</h2>
                <p className="text-gray-600 mb-8">Votre premier projet est prêt à être lancé. Vous pourrez affiner les détails plus tard.</p>
                <button 
                  onClick={handleFinish} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-wait"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2"><Loader className="animate-spin" /> Création en cours...</span>
                    ) : "Lancer l'application"}
                </button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4 antialiased">
        <div className="flex flex-col items-center mb-6">
            <TrezocashLogo className="w-24 h-24 animate-spin-y-slow" />
            <h1 className="mt-4 text-5xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                Trezocash
            </h1>
        </div>
        <div className="w-full max-w-screen-lg mx-auto grid grid-cols-1 md:grid-cols-3 bg-white rounded-2xl shadow-xl overflow-hidden" style={{ minHeight: '500px' }}>
            <div className="hidden md:block md:col-span-1">
                <OnboardingSummary data={data} step={step} />
            </div>
            <div className="md:col-span-2 flex flex-col">
                <div className="p-8 border-b">
                    <OnboardingProgress current={step + 1} total={steps.length} />
                </div>
                <div className="flex-grow flex flex-col items-center justify-center p-8">
                    <div className="w-full">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full"
                            >
                                {renderStepContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={handleBack} disabled={step === 0 || isLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ArrowLeft className="w-4 h-4" /> Précédent
                        </button>
                        {hasExistingProjects && (
                            <button onClick={handleCancel} disabled={isLoading} className="px-4 py-2 rounded-lg text-red-600 hover:bg-red-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                Annuler
                            </button>
                        )}
                    </div>
                    {step < steps.length - 1 && (
                        <button onClick={handleNext} disabled={isLoading} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:bg-gray-400">
                            Suivant <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default OnboardingView;
