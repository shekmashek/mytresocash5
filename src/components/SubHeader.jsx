import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { supabase } from '../utils/supabase';
import { Save, User, Shield, CreditCard, FileText, HelpCircle, LogOut, Table, ArrowDownUp, HandCoins, PieChart, Layers, BookOpen, Cog, Users, FolderKanban, Wallet, Archive, Clock, FolderCog, Globe, Target, Calendar, Plus, FilePlus, Banknote, Maximize, AreaChart, Receipt, Hash, LayoutDashboard, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';
import ProjectSwitcher from './ProjectSwitcher';
import FlagIcon from './FlagIcon';
import { useNavigate, useLocation } from 'react-router-dom';

const SettingsLink = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <li title={item.label}>
      <button 
        onClick={onClick} 
        disabled={item.disabled}
        className={`flex items-center w-full h-10 px-4 rounded-lg text-sm font-medium transition-colors text-text-secondary hover:bg-secondary-100 hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${item.color}`} />
        <span className={`ml-4`}>
          {item.label}
        </span>
      </button>
    </li>
  );
};

const SubHeader = ({ onOpenSettingsDrawer, onNewBudgetEntry, onNewScenario, isConsolidated }) => {
  const { state, dispatch } = useBudget();
  const { settings, isTourActive, tourHighlightId } = state;
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCurrencyPopoverOpen, setIsCurrencyPopoverOpen] = useState(false);
  const currencyPopoverRef = useRef(null);
  const [isLangPopoverOpen, setIsLangPopoverOpen] = useState(false);
  const langPopoverRef = useRef(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsPopoverRef = useRef(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newMenuRef = useRef(null);

  const [isUnitPopoverOpen, setIsUnitPopoverOpen] = useState(false);
  const unitPopoverRef = useRef(null);
  const [isDecimalPopoverOpen, setIsDecimalPopoverOpen] = useState(false);
  const decimalPopoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyPopoverRef.current && !currencyPopoverRef.current.contains(event.target)) setIsCurrencyPopoverOpen(false);
      if (langPopoverRef.current && !langPopoverRef.current.contains(event.target)) setIsLangPopoverOpen(false);
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) setIsAvatarMenuOpen(false);
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(event.target)) setIsSettingsOpen(false);
      if (newMenuRef.current && !newMenuRef.current.contains(event.target)) setIsNewMenuOpen(false);
      if (unitPopoverRef.current && !unitPopoverRef.current.contains(event.target)) setIsUnitPopoverOpen(false);
      if (decimalPopoverRef.current && !decimalPopoverRef.current.contains(event.target)) setIsDecimalPopoverOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (newLang) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { ...settings, language: newLang } });
    setIsLangPopoverOpen(false);
  };
  
  const handleSettingsChange = (key, value) => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { ...settings, [key]: value } });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur lors de la déconnexion: ${error.message}`, type: 'error' } });
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsSettingsOpen(false);
    setIsAvatarMenuOpen(false);
  };

  const handleFocusClick = () => {
    const currentView = location.pathname.split('/')[2] || 'dashboard';
    let focusTarget;
    switch (currentView) {
        case 'analyse': focusTarget = 'expenseAnalysis'; break;
        case 'echeancier': focusTarget = 'schedule'; break;
        case 'flux': focusTarget = 'chart'; break;
        case 'scenarios': focusTarget = 'scenarios'; break;
        default: focusTarget = 'table'; break;
    }
    dispatch({ type: 'SET_FOCUS_VIEW', payload: focusTarget });
  };

  const menuItems = [
    { title: 'Mon profil', icon: User, path: '/app/profil' },
    { title: 'Mot de passe et sécurité', icon: Shield, path: '/app/securite' },
    { title: 'Mon abonnement', icon: CreditCard, path: '/app/abonnement' },
    { title: 'Factures', icon: FileText, path: '/app/factures' },
    { title: 'Supprimer mon compte', icon: Trash2, path: '/app/delete-account', isDestructive: true },
    { title: 'Centre d\'aide', icon: HelpCircle, path: '/app/aide' },
  ];

  const advancedNavItems = [
    { id: 'journal-budget', label: t('nav.budgetJournal'), icon: BookOpen, color: 'text-yellow-600', path: '/app/journal-budget' },
    { id: 'journal-paiements', label: t('nav.paymentJournal'), icon: Receipt, color: 'text-blue-600', path: '/app/journal-paiements' },
  ];

  const settingsItems = [
    { id: 'projectSettings', label: 'Paramètres du Projet', icon: FolderCog, color: 'text-blue-500' },
    { id: 'categoryManagement', label: t('advancedSettings.categories'), icon: FolderKanban, color: 'text-orange-500' },
    { id: 'tiersManagement', label: t('advancedSettings.tiers'), icon: Users, color: 'text-pink-500' },
    { id: 'cashAccounts', label: t('advancedSettings.accounts'), icon: Wallet, color: 'text-teal-500' },
    { id: 'timezoneSettings', label: 'Fuseau Horaire', icon: Globe, color: 'text-cyan-500' },
    { id: 'archives', label: t('advancedSettings.archives'), icon: Archive, color: 'text-secondary-500' },
  ];

  const newMenuItems = [
    { label: 'Budget prévisionnel', icon: FilePlus, action: onNewBudgetEntry, disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Ajouter une nouvelle entrée ou sortie prévisionnelle" },
    { label: 'Entrée reçue', icon: HandCoins, action: () => dispatch({ type: 'OPEN_DIRECT_PAYMENT_MODAL', payload: 'receivable' }), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Encaisser directement des entrées" },
    { label: 'Sortie payée', icon: Banknote, action: () => dispatch({ type: 'OPEN_DIRECT_PAYMENT_MODAL', payload: 'payable' }), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Payer directement des sorties" },
    { label: 'Scénario', icon: Layers, action: onNewScenario, disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Créer une nouvelle simulation financière" },
    { label: 'Nouvelle Note', icon: FileText, action: () => dispatch({ type: 'ADD_NOTE' }), disabled: false, tooltip: "Ajouter une note épinglée sur l'écran" },
    { label: 'Compte de liquidité', icon: Wallet, action: () => onOpenSettingsDrawer('cashAccounts'), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Ajouter un nouveau compte bancaire, caisse, etc." }
  ];

  const handleSettingsItemClick = (itemId) => {
    if (typeof onOpenSettingsDrawer === 'function') {
      onOpenSettingsDrawer(itemId);
    }
    setIsSettingsOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
    { id: 'trezo', label: 'Trezo', icon: Table, path: '/app/trezo' },
    { id: 'flux', label: 'Flux', icon: AreaChart, path: '/app/flux' },
    { id: 'echeancier', label: 'Echeancier', icon: Calendar, path: '/app/echeancier' },
    { id: 'scenarios', label: 'Scénarios', icon: Layers, path: '/app/scenarios' },
    { id: 'analyse', label: 'Analyse', icon: PieChart, path: '/app/analyse' },
  ];

  const CurrencySelector = () => {
    const { state: budgetState, dispatch: budgetDispatch } = useBudget();
    const { settings: budgetSettings } = budgetState;
    const [currency, setCurrency] = useState(budgetSettings.currency);
    const [customCurrency, setCustomCurrency] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const predefinedCurrencies = ['€', '$', '£', 'Ar'];

    useEffect(() => {
        if (predefinedCurrencies.includes(budgetSettings.currency)) {
            setCurrency(budgetSettings.currency);
            setIsCustom(false);
        } else {
            setCurrency('custom');
            setCustomCurrency(budgetSettings.currency);
            setIsCustom(true);
        }
    }, [budgetSettings.currency]);

    const handleGlobalCurrencyChange = (newCurrency) => {
        budgetDispatch({ type: 'UPDATE_SETTINGS', payload: { ...budgetSettings, currency: newCurrency } });
    };

    const handleCurrencySelection = (value) => {
        setCurrency(value);
        if (value === 'custom') {
            setIsCustom(true);
        } else {
            setIsCustom(false);
            handleGlobalCurrencyChange(value);
        }
    };

    const handleSaveCustomCurrency = () => {
        if (customCurrency.trim()) {
            handleGlobalCurrencyChange(customCurrency.trim());
        }
    };

    return (
        <div className="p-2 space-y-2">
            <select value={currency} onChange={(e) => handleCurrencySelection(e.target.value)} className="w-full text-sm rounded-md border-secondary-300 focus:ring-primary-500 focus:border-primary-500 py-1">
                {predefinedCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="custom">{t('onboarding.other')}</option>
            </select>
            {isCustom && (
                <div className="mt-2 flex items-center gap-2">
                    <input type="text" value={customCurrency} onChange={(e) => setCustomCurrency(e.target.value)} placeholder="Ex: Ar" className="w-full text-sm px-2 py-1 border rounded-md border-secondary-300" maxLength="5" />
                    <button onClick={handleSaveCustomCurrency} className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md">
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
  };
  
  const isProjectSwitcherHighlighted = isTourActive && tourHighlightId === '#project-switcher';

  return (
    <>
      <div className="sticky top-0 z-30 bg-gray-100 border-b border-gray-200">
        <div className="container mx-auto px-6 py-2 flex w-full items-center justify-between">
          
          <div className="flex-1 flex justify-start">
            <div id="project-switcher" className={`w-64 flex-shrink-0 rounded-lg transition-all ${isProjectSwitcherHighlighted ? 'relative z-[1000] ring-4 ring-blue-500 ring-offset-4 ring-offset-black/60' : ''}`}>
              <ProjectSwitcher />
            </div>
          </div>

          <div className="flex-shrink-0">
            <nav className="flex items-center gap-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                const isHighlighted = isTourActive && tourHighlightId === `#tour-step-${item.id}`;
                return (
                  <button
                    key={item.id}
                    id={`tour-step-${item.id}`}
                    onClick={() => handleNavigate(item.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    } ${isHighlighted ? 'relative z-[1000] ring-4 ring-blue-500 ring-offset-4 ring-offset-black/60' : ''}`}
                    title={item.label}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-4">
              <div className="relative" ref={newMenuRef}>
                  <button
                      onClick={() => setIsNewMenuOpen(p => !p)}
                      className="flex items-center gap-2 px-3 h-9 rounded-md bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                      title="Créer"
                  >
                      <Plus className="w-4 h-4" />
                      Nouveau
                  </button>
                  <AnimatePresence>
                      {isNewMenuOpen && (
                          <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"
                          >
                              <ul className="p-2">
                                  {newMenuItems.map(item => (
                                      <li key={item.label}>
                                          <button
                                              onClick={() => { if (!item.disabled) { item.action(); setIsNewMenuOpen(false); } }}
                                              disabled={item.disabled}
                                              title={item.tooltip}
                                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                          >
                                              <item.icon className="w-4 h-4 text-gray-500" />
                                              <span>{item.label}</span>
                                          </button>
                                      </li>
                                  ))}
                              </ul>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                  <div className="relative" ref={currencyPopoverRef}>
                      <button 
                          onClick={() => setIsCurrencyPopoverOpen(p => !p)}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Changer la devise globale"
                      >
                          <span className="text-sm">{settings.currency}</span>
                      </button>
                      <AnimatePresence>
                      {isCurrencyPopoverOpen && (
                          <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border z-20"
                          >
                              <CurrencySelector />
                          </motion.div>
                      )}
                      </AnimatePresence>
                  </div>
                  <div className="relative" ref={unitPopoverRef}>
                      <button 
                          onClick={() => setIsUnitPopoverOpen(p => !p)}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Changer l'unité d'affichage"
                      >
                          <span className="text-sm">U</span>
                      </button>
                      <AnimatePresence>
                          {isUnitPopoverOpen && (
                              <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border z-20 p-1"
                              >
                                  <button onClick={() => { handleSettingsChange('displayUnit', 'standard'); setIsUnitPopoverOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100">{t('sidebar.standard')}</button>
                                  <button onClick={() => { handleSettingsChange('displayUnit', 'thousands'); setIsUnitPopoverOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100">{t('sidebar.thousands')}</button>
                                  <button onClick={() => { handleSettingsChange('displayUnit', 'millions'); setIsUnitPopoverOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100">{t('sidebar.millions')}</button>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
                  <div className="relative" ref={decimalPopoverRef}>
                      <button 
                          onClick={() => setIsDecimalPopoverOpen(p => !p)}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Changer le nombre de décimales"
                      >
                          <span className="text-sm">#</span>
                      </button>
                      <AnimatePresence>
                          {isDecimalPopoverOpen && (
                              <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-24 bg-white rounded-lg shadow-lg border z-20 p-1"
                              >
                                  <button onClick={() => { handleSettingsChange('decimalPlaces', 0); setIsDecimalPopoverOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100">0</button>
                                  <button onClick={() => { handleSettingsChange('decimalPlaces', 1); setIsDecimalPopoverOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100">1</button>
                                  <button onClick={() => { handleSettingsChange('decimalPlaces', 2); setIsDecimalPopoverOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100">2</button>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
                  <div className="relative" ref={langPopoverRef}>
                      <button
                          onClick={() => setIsLangPopoverOpen(p => !p)}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Changer la langue"
                      >
                          <FlagIcon lang={lang} className="w-6 h-auto rounded-sm" />
                      </button>
                      <AnimatePresence>
                      {isLangPopoverOpen && (
                          <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border z-20 p-1"
                          >
                              <button onClick={() => handleLanguageChange('fr')} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-3">
                                  <FlagIcon lang="fr" className="w-5 h-auto rounded-sm" />
                                  Français
                              </button>
                              <button onClick={() => handleLanguageChange('en')} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-3">
                                  <FlagIcon lang="en" className="w-5 h-auto rounded-sm" />
                                  English
                              </button>
                          </motion.div>
                      )}
                      </AnimatePresence>
                  </div>
                  <div className="relative" ref={settingsPopoverRef}>
                      <button
                          onClick={() => setIsSettingsOpen(p => !p)}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Paramètres avancés"
                      >
                          <Cog className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                          {isSettingsOpen && (
                              <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"
                              >
                                  <div className="p-2">
                                    <ul className="space-y-1">
                                      {advancedNavItems.map(item => (
                                        <SettingsLink 
                                          key={item.id} 
                                          item={item} 
                                          onClick={() => handleNavigate(item.path)} 
                                        />
                                      ))}
                                    </ul>
                                    <hr className="my-2" />
                                    <ul className="space-y-1">
                                      {settingsItems.map(item => (
                                        <SettingsLink 
                                          key={item.id} 
                                          item={item} 
                                          onClick={() => handleSettingsItemClick(item.id)} 
                                        />
                                      ))}
                                    </ul>
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
                  <div className="relative" ref={avatarMenuRef}>
                      <button 
                          onClick={() => setIsAvatarMenuOpen(p => !p)}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Profil utilisateur"
                      >
                          <User className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                          {isAvatarMenuOpen && (
                              <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"
                              >
                                  <div className="px-4 py-3 border-b">
                                      <p className="text-sm font-semibold text-gray-800">{state.profile?.fullName || 'Utilisateur'}</p>
                                      <p className="text-xs text-gray-500 truncate">{state.session?.user?.email}</p>
                                  </div>
                                  <div className="p-1">
                                      {menuItems.map((item) => (
                                          <button 
                                              key={item.title}
                                              onClick={() => handleNavigate(item.path)}
                                              className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md ${
                                                  item.isDestructive 
                                                  ? 'text-red-600 hover:bg-red-50' 
                                                  : 'text-gray-700 hover:bg-gray-100'
                                              }`}
                                          >
                                              <item.icon className="w-4 h-4" />
                                              <span>{item.title}</span>
                                          </button>
                                      ))}
                                      <div className="h-px bg-gray-200 my-1 mx-1"></div>
                                      <button 
                                          onClick={handleLogout}
                                          className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50"
                                      >
                                          <LogOut className="w-4 h-4" />
                                          <span>Se déconnecter</span>
                                      </button>
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
                  <button
                      onClick={handleFocusClick}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                      title="Focus"
                  >
                      <Maximize className="w-5 h-5" />
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubHeader;
