import React, { useState, useMemo } from 'react';
import { useBudget, mainCashAccountCategories } from '../context/BudgetContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, User, Briefcase, Plus, Trash2, Sparkles, Building, Calendar, Wallet, Landmark, TrendingUp, TrendingDown, Banknote, Coins, Loader } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '../utils/i18n';
import StepLoans from './StepLoans';
import TrezocashLogo from './TrezocashLogo';
import { initializeProject } from '../context/actions';

const OnboardingProgress = ({ current, total }) => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < current ? 'bg-primary-500' : 'bg-secondary-200'}`}
        />
      ))}
    </div>
  );
};

const OnboardingSummary = ({ data, step }) => {
    const { state } = useBudget();
    const { settings } = state;
    const currency = settings.currency;
    const { t } = useTranslation();
    const useCaseText = {
        personal: t('onboarding.useCasePersonal'),
        business: t('onboarding.useCaseBusiness')
    };

    const totalInitialBalance = data.cashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
    const totalIncome = data.entries.filter(e => e.type === 'revenu').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalExpense = data.entries.filter(e => e.type === 'depense').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalBorrowings = data.borrowings.reduce((sum, b) => sum + (parseFloat(b.principal) || 0), 0);
    const totalLoans = data.loans.reduce((sum, l) => sum + (parseFloat(l.principal) || 0), 0);

    return (
        <div className="bg-secondary-800 text-white p-8 rounded-l-2xl flex flex-col h-full">
            <h2 className="text-2xl font-bold text-secondary-100 mb-8">{t('onboarding.mainTitle')}</h2>
            <div className="space-y-5 text-secondary-300 flex-grow">
                {step > 0 && data.useCase && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <p className="text-sm text-secondary-400">{t('onboarding.projectType')}</p>
                        <p className="font-semibold text-white">{useCaseText[data.useCase]}</p>
                    </motion.div>
                )}
                {step > 1 && data.projectName && (
                     <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <p className="text-sm text-secondary-400">{t('onboarding.projectName')}</p>
                        <p className="font-semibold text-white flex items-center gap-2">
                            {data.projectName}
                            <span className="text-xs bg-secondary-700 text-secondary-300 px-2 py-0.5 rounded-full">{currency}</span>
                        </p>
                    </motion.div>
                )}
                {step > 2 && data.projectStartDate && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                        <p className="text-sm text-secondary-400">Date de début</p>
                        <p className="font-semibold text-white">{new Date(data.projectStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </motion.div>
                )}
                {step > 3 && (data.monthlyRevenue || data.monthlyExpense) && (
                    <>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                            <p className="text-sm text-secondary-400">{t('onboarding.monthlyIncomeGoal')}</p>
                            <p className="font-semibold text-success-400">{(parseFloat(data.monthlyRevenue) || 0).toLocaleString('fr-FR')} {currency}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                            <p className="text-sm text-secondary-400">{t('onboarding.monthlyExpenseGoal')}</p>
                            <p className="font-semibold text-danger-400">{(parseFloat(data.monthlyExpense) || 0).toLocaleString('fr-FR')} {currency}</p>
                        </motion.div>
                    </>
                )}
                 {step > 4 && data.cashAccounts.length > 0 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                        <p className="text-sm text-secondary-400">{t('onboarding.initialCashTitle')}</p>
                        <p className="font-semibold text-primary-400">{totalInitialBalance.toLocaleString('fr-FR')} {currency}</p>
                    </motion.div>
                )}
                {step > 5 && totalBorrowings > 0 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                        <p className="text-sm text-secondary-400">Total Emprunts</p>
                        <p className="font-semibold text-danger-400">{totalBorrowings.toLocaleString('fr-FR')} {currency}</p>
                    </motion.div>
                )}
                {step > 6 && totalLoans > 0 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
                        <p className="text-sm text-secondary-400">Total Prêts</p>
                        <p className="font-semibold text-success-400">{totalLoans.toLocaleString('fr-FR')} {currency}</p>
                    </motion.div>
                )}
                {step > 7 && (
                    <>
                        {totalIncome > 0 && (
                             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}>
                                <p className="text-sm text-secondary-400">{t('onboarding.configuredIncomes')}</p>
                                <p className="font-semibold text-success-400">{totalIncome.toLocaleString('fr-FR')} {currency}</p>
                            </motion.div>
                        )}
                        {totalExpense > 0 && (
                             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }}>
                                <p className="text-sm text-secondary-400">{t('onboarding.configuredExpenses')}</p>
                                <p className="font-semibold text-danger-400">{totalExpense.toLocaleString('fr-FR')} {currency}</p>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
            <div className="mt-auto">
                <p className="text-xs text-secondary-400">{t('onboarding.canChangeLater')}</p>
            </div>
        </div>
    );
};

const StepGoals = ({ monthlyRevenue, monthlyExpense, onUpdate, currency }) => {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('onboarding.goalsTitle')}</h2>
      <p className="text-text-secondary mb-8">{t('onboarding.goalsDesc')}</p>
      <div className="max-w-md mx-auto space-y-8">
        <div>
          <label className="flex items-center gap-2 text-left text-lg font-semibold text-text-primary mb-2">
            <TrendingUp className="w-6 h-6 text-success-500" />
            {t('onboarding.goalsIncomeLabel')}
          </label>
          <div className="relative">
            <input
              type="number"
              value={monthlyRevenue}
              onChange={(e) => onUpdate('monthlyRevenue', e.target.value)}
              placeholder="Ex: 5000"
              className="w-full text-left text-xl p-3 pl-4 border-b-2 focus:border-primary-500 outline-none transition"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-text-secondary">{currency}</span>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-left text-lg font-semibold text-text-primary mb-2">
            <TrendingDown className="w-6 h-6 text-danger-500" />
            {t('onboarding.goalsExpenseLabel')}
          </label>
           <div className="relative">
            <input
              type="number"
              value={monthlyExpense}
              onChange={(e) => onUpdate('monthlyExpense', e.target.value)}
              placeholder="Ex: 3500"
              className="w-full text-left text-xl p-3 pl-4 border-b-2 focus:border-primary-500 outline-none transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-text-secondary">{currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const EntryRow = ({ entry, onUpdate, onDelete, categories }) => {
  const frequencyOptions = [
    { value: 'ponctuel', label: 'Ponctuel' },
    { value: 'journalier', label: 'Journalier' },
    { value: 'hebdomadaire', label: 'Hebdomadaire' },
    { value: 'mensuel', label: 'Mensuel' },
    { value: 'bimestriel', label: 'Bimestriel' },
    { value: 'trimestriel', label: 'Trimestriel' },
    { value: 'annuel', label: 'Annuel' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 border rounded-lg bg-surface">
      <select
        value={entry.category}
        onChange={(e) => onUpdate(entry.id, 'category', e.target.value)}
        className="md:col-span-3 p-2 border rounded-md bg-surface text-sm w-full"
      >
        <option value="">Choisir catégorie</option>
        {categories.map(cat => (
          <optgroup key={cat.id} label={cat.name}>
            {cat.subCategories.map(sub => (
              <option key={sub.id} value={sub.name}>{sub.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <input
        type="text"
        placeholder="Source / Tiers"
        value={entry.supplier}
        onChange={(e) => onUpdate(entry.id, 'supplier', e.target.value)}
        className="md:col-span-2 p-2 border rounded-md bg-surface text-sm w-full"
      />
      <input
        type="number"
        placeholder="Montant"
        value={entry.amount}
        onChange={(e) => onUpdate(entry.id, 'amount', e.target.value)}
        className="md:col-span-2 p-2 border rounded-md bg-surface text-sm w-full"
      />
      <select
        value={entry.frequency}
        onChange={(e) => onUpdate(entry.id, 'frequency', e.target.value)}
        className="md:col-span-2 p-2 border rounded-md bg-surface text-sm w-full"
      >
        {frequencyOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="md:col-span-3 flex items-center gap-2">
        {entry.frequency === 'ponctuel' ? (
          <input
            type="date"
            value={entry.date || ''}
            onChange={(e) => onUpdate(entry.id, 'date', e.target.value)}
            className="w-full p-2 border rounded-md bg-surface text-sm"
            title="Date de paiement"
          />
        ) : (
          <input
            type="date"
            value={entry.startDate || ''}
            onChange={(e) => onUpdate(entry.id, 'startDate', e.target.value)}
            className="w-full p-2 border rounded-md bg-surface text-sm"
            title="Date de début"
          />
        )}
        <button onClick={() => onDelete(entry.id)} className="text-secondary-400 hover:text-danger-500 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const StepInitialCash = ({ initialAccounts, onUpdate }) => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState(initialAccounts);

  const handleAddAccount = () => {
    const newAccount = { id: uuidv4(), mainCategoryId: 'bank', name: '', initialBalance: '', initialBalanceDate: new Date().toISOString().split('T')[0] };
    const newAccounts = [...accounts, newAccount];
    setAccounts(newAccounts);
    onUpdate(newAccounts);
  };

  const handleUpdateAccount = (id, field, value) => {
    const newAccounts = accounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc);
    setAccounts(newAccounts);
    onUpdate(newAccounts);
  };

  const handleDeleteAccount = (id) => {
    if (accounts.length > 1) {
      const newAccounts = accounts.filter(acc => acc.id !== id);
      setAccounts(newAccounts);
      onUpdate(newAccounts);
    } else {
      alert("Vous devez conserver au moins un compte.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{t('onboarding.initialCashTitle')}</h2>
      <p className="text-text-secondary text-center mb-6">{t('onboarding.initialCashDesc')}</p>
      <div className="space-y-4 bg-secondary-50 p-4 rounded-lg">
        {accounts.map(account => (
          <div key={account.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 border rounded-lg bg-surface">
            <select
              value={account.mainCategoryId}
              onChange={(e) => handleUpdateAccount(account.id, 'mainCategoryId', e.target.value)}
              className="md:col-span-3 p-2 border rounded-md bg-surface text-sm w-full"
            >
              {mainCashAccountCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nom du compte (ex: Compte Pro)"
              value={account.name}
              onChange={(e) => handleUpdateAccount(account.id, 'name', e.target.value)}
              className="md:col-span-4 p-2 border rounded-md bg-surface text-sm w-full"
            />
            <input
              type="number"
              placeholder="Solde initial"
              value={account.initialBalance}
              onChange={(e) => handleUpdateAccount(account.id, 'initialBalance', e.target.value)}
              className="md:col-span-4 p-2 border rounded-md bg-surface text-sm w-full"
            />
            <div className="md:col-span-1 flex justify-end">
              <button onClick={() => handleDeleteAccount(account.id)} className="text-secondary-400 hover:text-danger-500 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button onClick={handleAddAccount} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium">
          <Plus className="w-4 h-4" /> {t('onboarding.addAccount')}
        </button>
      </div>
    </div>
  );
};


const OnboardingView = () => {
  const { state: budgetState, dispatch } = useBudget();
  const { projects, settings, session, tiers } = budgetState;
  const { t } = useTranslation();
  const hasExistingProjects = useMemo(() => projects.filter(p => !p.isArchived).length > 0, [projects]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState({
    useCase: null,
    projectName: '',
    projectStartDate: new Date().toISOString().split('T')[0],
    monthlyRevenue: '',
    monthlyExpense: '',
    cashAccounts: [{ id: uuidv4(), mainCategoryId: 'cash', name: 'Caisse Espèce', initialBalance: '0', initialBalanceDate: new Date().toISOString().split('T')[0] }],
    entries: [],
    loans: [],
    borrowings: [],
  });

  const { revenue: revenueCategories, expense: expenseCategories } = budgetState.categories;

  const steps = useMemo(() => {
    let filteredExpenseCategories = [];
    const personalCategoryIds = ['exp-main-10', 'exp-main-11', 'exp-main-12'];

    if (data.useCase === 'personal') {
      filteredExpenseCategories = expenseCategories.filter(cat => personalCategoryIds.includes(cat.id));
    } else if (data.useCase === 'business') {
      filteredExpenseCategories = expenseCategories.filter(cat => !personalCategoryIds.includes(cat.id));
    }

    return [
        { id: 'welcome', title: t('onboarding.welcomeTitle') },
        { id: 'projectName', title: t('onboarding.projectNameTitle') },
        { id: 'startDate', title: "Date de début du projet" },
        { id: 'goals', title: t('onboarding.goalsTitle') },
        { id: 'initialCash', title: t('onboarding.initialCashTitle') },
        { id: 'borrowings', title: "Vos Emprunts Actuels", type: 'borrowing' },
        { id: 'loans', title: "Vos Prêts Actuels", type: 'loan' },
        { id: 'income', title: t('onboarding.entriesTitle'), type: 'revenu', categories: revenueCategories },
        ...filteredExpenseCategories.map(cat => ({
            id: cat.id,
            title: t('onboarding.expensesTitle', { categoryName: cat.name }),
            type: 'depense',
            categories: [cat]
        })),
        { id: 'finish', title: t('onboarding.finishTitle') }
    ];
  }, [revenueCategories, expenseCategories, t, data.useCase]);

  const currentStepInfo = steps[step];

  const handleNext = () => {
    if (step === 1 && !data.projectName.trim()) {
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

  const handleSkip = () => {
    if (step >= 2 && step < steps.length - 1) {
        setDirection(1);
        setStep(steps.length - 1);
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'CANCEL_ONBOARDING' });
  };

  const handleUpdateEntries = (updatedEntries) => {
    const subCategoryNamesForCurrentStep = currentStepInfo.categories.flatMap(mainCat => mainCat.subCategories.map(subCat => subCat.name));

    const otherEntries = data.entries.filter(entry => {
      if (entry.type !== currentStepInfo.type) {
        return true;
      }
      return !subCategoryNamesForCurrentStep.includes(entry.category);
    });

    setData(prev => ({ ...prev, entries: [...otherEntries, ...updatedEntries] }));
  };
  
  const handleFinish = async () => {
    if (!data.projectName.trim()) {
        dispatch({ type: 'ADD_TOAST', payload: { message: "Le nom du projet est obligatoire.", type: 'error' } });
        setStep(1); // Go back to project name step
        return;
    }
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const finalEntries = data.entries.map(e => ({
        ...e,
        amount: parseFloat(e.amount) || 0,
        date: e.frequency === 'ponctuel' ? (e.date || today) : null,
        startDate: e.frequency !== 'ponctuel' ? (e.startDate || today) : null,
        endDate: null
    })).filter(e => e.amount > 0 && e.category && e.supplier);

    const payload = {
        projectName: data.projectName,
        projectStartDate: data.projectStartDate,
        cashAccounts: data.cashAccounts.map(acc => ({...acc, initialBalance: parseFloat(acc.initialBalance) || 0})),
        entries: finalEntries,
        monthlyRevenue: data.monthlyRevenue,
        monthlyExpense: data.monthlyExpense,
        loans: data.loans,
        borrowings: data.borrowings,
    };

    try {
        await initializeProject(dispatch, payload, session.user, tiers, settings.currency);
    } catch (error) {
        setIsLoading(false);
    }
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  const renderStepContent = () => {
    switch (currentStepInfo.id) {
      case 'welcome':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-6">{currentStepInfo.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => { setData(prev => ({...prev, useCase: 'personal'})); handleNext(); }} className="p-6 border rounded-lg hover:bg-primary-50 hover:border-primary-400 transition-all text-left">
                <User className="w-8 h-8 text-primary-500 mb-2" />
                <h3 className="font-semibold text-lg">{t('onboarding.welcomePersonalTitle')}</h3>
                <p className="text-sm text-text-secondary">{t('onboarding.welcomePersonalDesc')}</p>
              </button>
              <button onClick={() => { setData(prev => ({...prev, useCase: 'business'})); handleNext(); }} className="p-6 border rounded-lg hover:bg-accent-50 hover:border-accent-400 transition-all text-left">
                <Briefcase className="w-8 h-8 text-accent-500 mb-2" />
                <h3 className="font-semibold text-lg">{t('onboarding.welcomeBusinessTitle')}</h3>
                <p className="text-sm text-text-secondary">{t('onboarding.welcomeBusinessDesc')}</p>
              </button>
            </div>
          </div>
        );
      case 'projectName':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-6">{currentStepInfo.title}</h2>
            <input
              type="text"
              value={data.projectName}
              onChange={(e) => setData(prev => ({ ...prev, projectName: e.target.value }))}
              placeholder={t('onboarding.projectNamePlaceholder')}
              className="w-full max-w-md mx-auto text-center text-xl p-3 border-b-2 focus:border-primary-500 outline-none transition"
              autoFocus
              required
            />
          </div>
        );
      case 'startDate':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Quelle est la date de début de votre projet ?</h2>
            <p className="text-text-secondary mb-8">Les transactions et analyses commenceront à partir de cette date. Vous ne pourrez pas saisir de données avant cette date.</p>
            <input
              type="date"
              value={data.projectStartDate}
              onChange={(e) => setData(prev => ({ ...prev, projectStartDate: e.target.value }))}
              className="w-full max-w-sm mx-auto text-center text-xl p-3 border-b-2 focus:border-primary-500 outline-none transition"
              autoFocus
            />
          </div>
        );
      case 'goals':
        return <StepGoals
                  key="goals"
                  monthlyRevenue={data.monthlyRevenue}
                  monthlyExpense={data.monthlyExpense}
                  onUpdate={(field, value) => setData(prev => ({ ...prev, [field]: value }))}
                  currency={settings.currency}
                />;
      case 'initialCash':
        return <StepInitialCash
                  key="initialCash"
                  initialAccounts={data.cashAccounts}
                  onUpdate={(accounts) => setData(prev => ({ ...prev, cashAccounts: accounts }))}
                />;
      case 'borrowings':
      case 'loans':
        const dataKey = `${currentStepInfo.type}s`;
        return <StepLoans
                  key={currentStepInfo.id}
                  type={currentStepInfo.type}
                  initialData={data[dataKey]}
                  onUpdate={(loansOrBorrowings) => setData(prev => ({ ...prev, [dataKey]: loansOrBorrowings }))}
                  currency={settings.currency}
                />;
      case 'income':
      case (currentStepInfo.categories && currentStepInfo.id):
        return <StepEntries key={currentStepInfo.id} stepInfo={currentStepInfo} onUpdate={handleUpdateEntries} initialEntries={data.entries.filter(e => e.type === currentStepInfo.type && (currentStepInfo.type === 'revenu' || currentStepInfo.categories.some(mc => mc.subCategories.some(sc => sc.name === e.category))))} />;

      case 'finish':
        return (
            <div className="text-center">
                <Sparkles className="w-16 h-16 text-warning-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-primary mb-2">{t('onboarding.finishTitle')}</h2>
                <p className="text-text-secondary mb-8">{t('onboarding.finishDesc')}</p>
                <button 
                  onClick={handleFinish} 
                  disabled={isLoading}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-wait"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2"><Loader className="animate-spin" /> Création en cours...</span>
                    ) : t('onboarding.launchApp')}
                </button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-secondary-100 min-h-screen flex flex-col items-center justify-center p-4 antialiased">
        <div className="flex flex-col items-center mb-6">
            <TrezocashLogo className="w-24 h-24 animate-spin-y-slow" />
            <h1 className="mt-4 text-5xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                Trezocash
            </h1>
        </div>
        <div className="w-full max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 bg-surface rounded-2xl shadow-xl overflow-hidden" style={{ minHeight: '750px' }}>
            <div className="hidden md:block md:col-span-1">
                <OnboardingSummary data={data} step={step} />
            </div>
            <div className="md:col-span-3 flex flex-col">
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
                     {step >= 2 && step < steps.length - 1 && (
                        <button 
                            onClick={handleSkip} 
                            className="mt-8 text-sm text-gray-500 hover:text-blue-600 underline"
                        >
                            Ignorer le reste des configurations et lancer directement le projet
                        </button>
                    )}
                </div>
                <div className="p-6 bg-secondary-50 border-t flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={handleBack} disabled={step === 0 || isLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-text-secondary hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ArrowLeft className="w-4 h-4" /> {t('onboarding.previous')}
                        </button>
                        {hasExistingProjects && (
                            <button onClick={handleCancel} disabled={isLoading} className="px-4 py-2 rounded-lg text-danger-600 hover:bg-danger-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                {t('common.cancel')}
                            </button>
                        )}
                    </div>
                    {step < steps.length - 2 && (
                        <button onClick={handleNext} disabled={isLoading} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-semibold disabled:bg-gray-400">
                            {t('onboarding.next')} <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                    {step === steps.length - 2 && (
                         <button onClick={handleNext} disabled={isLoading} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-success-600 text-white hover:bg-success-700 font-semibold disabled:bg-gray-400">
                            {t('onboarding.finishSetup')} <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                    {currentStepInfo.id === 'finish' && (
                        <div></div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const StepEntries = ({ stepInfo, onUpdate, initialEntries }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [entries, setEntries] = useState(initialEntries.length > 0 ? initialEntries : [{ id: uuidv4(), type: stepInfo.type, category: '', supplier: '', amount: '', frequency: 'mensuel', date: today, startDate: today }]);
  
  const handleAddRow = () => {
    const today = new Date().toISOString().split('T')[0];
    setEntries([...entries, { id: uuidv4(), type: stepInfo.type, category: '', supplier: '', amount: '', frequency: 'mensuel', date: today, startDate: today }]);
  };

  const handleUpdateRow = (id, field, value) => {
    const newEntries = entries.map(e => e.id === id ? { ...e, [field]: value } : e);
    setEntries(newEntries);
    onUpdate(newEntries);
  };

  const handleDeleteRow = (id) => {
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    onUpdate(newEntries);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{stepInfo.title}</h2>
      <p className="text-text-secondary text-center mb-6">{t('onboarding.entriesDesc')}</p>
      <div className="space-y-3 bg-secondary-50 p-4 rounded-lg">
        {entries.map(entry => (
          <EntryRow key={entry.id} entry={entry} onUpdate={handleUpdateRow} onDelete={handleDeleteRow} categories={stepInfo.categories} />
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button onClick={handleAddRow} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium">
          <Plus className="w-4 h-4" /> {t('onboarding.addRow')}
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;
