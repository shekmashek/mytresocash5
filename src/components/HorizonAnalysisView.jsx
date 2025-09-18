import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useTranslation } from '../utils/i18n';

const HorizonAnalysisView = () => {
  const { state, dispatch } = useBudget();
  const { timeUnit, horizonLength } = state;
  const { t } = useTranslation();

  const handleTimeUnitChange = (value) => {
    dispatch({ type: 'SET_TIME_UNIT', payload: value });
  };

  const handleHorizonLengthChange = (value) => {
    dispatch({ type: 'SET_HORIZON_LENGTH', payload: Number(value) });
  };

  const timeUnitOptions = {
    day: t('sidebar.day'),
    week: t('sidebar.week'),
    fortnightly: t('sidebar.fortnightly'),
    month: t('sidebar.month'),
    bimonthly: t('sidebar.bimonthly'),
    quarterly: t('sidebar.quarterly'),
    semiannually: t('sidebar.semiannually'),
    annually: t('sidebar.annually'),
  };

  return (
    <div className="space-y-6 max-w-md">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-500" />
          {t('sidebar.analysisUnit')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez l'échelle de temps pour regrouper vos données dans le tableau de trésorerie et les graphiques.
        </p>
        <select 
          value={timeUnit} 
          onChange={(e) => handleTimeUnitChange(e.target.value)} 
          className="w-full text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 py-2"
        >
          <option value="day">{t('sidebar.day')}</option>
          <option value="week">{t('sidebar.week')}</option>
          <option value="fortnightly">{t('sidebar.fortnightly')}</option>
          <option value="month">{t('sidebar.month')}</option>
          <option value="bimonthly">{t('sidebar.bimonthly')}</option>
          <option value="quarterly">{t('sidebar.quarterly')}</option>
          <option value="semiannually">{t('sidebar.semiannually')}</option>
          <option value="annually">{t('sidebar.annually')}</option>
        </select>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-500" />
          {t('sidebar.horizon')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Définissez le nombre de périodes à afficher simultanément.
        </p>
        <select 
          value={horizonLength} 
          onChange={(e) => handleHorizonLengthChange(e.target.value)} 
          className="w-full text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 py-2"
        >
          <option value={1}>1 {timeUnitOptions[timeUnit]}</option>
          <option value={2}>2 {timeUnitOptions[timeUnit]}</option>
          <option value={3}>3 {timeUnitOptions[timeUnit]}</option>
          <option value={4}>4 {timeUnitOptions[timeUnit]}</option>
          <option value={5}>5 {timeUnitOptions[timeUnit]}</option>
          <option value={6}>6 {timeUnitOptions[timeUnit]}</option>
          <option value={10}>10 {timeUnitOptions[timeUnit]}</option>
          <option value={12}>12 {timeUnitOptions[timeUnit]}</option>
        </select>
      </div>
    </div>
  );
};

export default HorizonAnalysisView;
