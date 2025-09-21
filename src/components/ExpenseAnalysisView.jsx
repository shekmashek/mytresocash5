import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, ArrowLeft, Folder, User } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import ReactECharts from 'echarts-for-react';
import EmptyState from './EmptyState';
import { getTodayInTimezone, getEntryAmountForPeriod } from '../utils/budgetCalculations';
import { useTranslation } from '../utils/i18n';
import { useTreasuryData } from '../hooks/useTreasuryData';

const ExpenseAnalysisView = ({ isFocusMode = false, rangeStart: rangeStartProp, rangeEnd: rangeEndProp, analysisType: analysisTypeProp, analysisMode: analysisModeProp, setAnalysisMode: setAnalysisModeProp }) => {
  const { state } = useBudget();
  const { categories, settings, projects, allEntries, allActuals } = state;
  const { t } = useTranslation();

  const [localTimeUnit, setLocalTimeUnit] = useState('month');
  const [localPeriodOffset, setLocalPeriodOffset] = useState(0);
  const [localActiveQuickSelect, setLocalActiveQuickSelect] = useState('month');
  const [localAnalysisType, setLocalAnalysisType] = useState('expense');
  const [localAnalysisMode, setLocalAnalysisMode] = useState('category');
  
  const [drillDownState, setDrillDownState] = useState({
    level: 0, mainCategoryName: null, subCategoryName: null, dataType: null, color: null,
  });

  const analysisType = isFocusMode ? analysisTypeProp : localAnalysisType;
  const analysisMode = isFocusMode ? analysisModeProp : localAnalysisMode;
  const setAnalysisMode = isFocusMode ? setAnalysisModeProp : setLocalAnalysisMode;
  
  const { budgetEntries, actualTransactions, isConsolidated } = useTreasuryData();

  useEffect(() => {
    if (drillDownState.level > 0) {
        setDrillDownState({ level: 0, mainCategoryName: null, subCategoryName: null, dataType: null, color: null });
    }
  }, [analysisMode]);

  const handlePeriodChange = (direction) => { setLocalPeriodOffset(prev => prev + direction); setLocalActiveQuickSelect(null); };
  const handleQuickPeriodSelect = (quickSelectType) => {
    let payload;
    switch (quickSelectType) {
      case 'month': payload = { timeUnit: 'month', periodOffset: 0 }; break;
      case 'bimester': payload = { timeUnit: 'bimonthly', periodOffset: 0 }; break;
      case 'quarter': payload = { timeUnit: 'quarterly', periodOffset: 0 }; break;
      case 'semester': payload = { timeUnit: 'semiannually', periodOffset: 0 }; break;
      case 'year': payload = { timeUnit: 'annually', periodOffset: 0 }; break;
      default: return;
    }
    setLocalTimeUnit(payload.timeUnit);
    setLocalPeriodOffset(payload.periodOffset);
    setLocalActiveQuickSelect(quickSelectType);
  };

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (rangeStartProp && rangeEndProp) return { rangeStart: rangeStartProp, rangeEnd: rangeEndProp };
    const today = getTodayInTimezone(settings.timezoneOffset);
    let baseDate;
    switch (localTimeUnit) {
        case 'month': baseDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
        case 'bimonthly': const bimonthStartMonth = Math.floor(today.getMonth() / 2) * 2; baseDate = new Date(today.getFullYear(), bimonthStartMonth, 1); break;
        case 'quarterly': const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3; baseDate = new Date(today.getFullYear(), quarterStartMonth, 1); break;
        case 'semiannually': const semiAnnualStartMonth = Math.floor(today.getMonth() / 6) * 6; baseDate = new Date(today.getFullYear(), semiAnnualStartMonth, 1); break;
        case 'annually': baseDate = new Date(today.getFullYear(), 0, 1); break;
        default: baseDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    const periodStart = new Date(baseDate);
    switch (localTimeUnit) {
        case 'month': periodStart.setMonth(periodStart.getMonth() + localPeriodOffset); break;
        case 'bimonthly': periodStart.setMonth(periodStart.getMonth() + localPeriodOffset * 2); break;
        case 'quarterly': periodStart.setMonth(periodStart.getMonth() + localPeriodOffset * 3); break;
        case 'semiannually': periodStart.setMonth(periodStart.getMonth() + localPeriodOffset * 6); break;
        case 'annually': periodStart.setFullYear(periodStart.getFullYear() + localPeriodOffset); break;
    }
    const periodEnd = new Date(periodStart);
    switch (localTimeUnit) {
        case 'month': periodEnd.setMonth(periodEnd.getMonth() + 1); break;
        case 'bimonthly': periodEnd.setMonth(periodEnd.getMonth() + 2); break;
        case 'quarterly': periodEnd.setMonth(periodEnd.getMonth() + 3); break;
        case 'semiannually': periodEnd.setMonth(periodEnd.getMonth() + 6); break;
        case 'annually': periodEnd.setFullYear(periodEnd.getFullYear() + 1); break;
    }
    return { rangeStart: periodStart, rangeEnd: periodEnd };
  }, [rangeStartProp, rangeEndProp, localTimeUnit, localPeriodOffset, settings.timezoneOffset]);
  
  const analysisPeriodName = useMemo(() => {
    if (!rangeStart) return '';
    const year = rangeStart.getFullYear();
    const month = rangeStart.getMonth();
    let label = '';
    switch (localTimeUnit) {
        case 'month': label = rangeStart.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }); break;
        case 'bimonthly': const startMonthB = rangeStart.toLocaleString('fr-FR', { month: 'short' }); const endMonthB = new Date(year, month + 1, 1).toLocaleString('fr-FR', { month: 'short' }); label = `Bimestre ${startMonthB}-${endMonthB} ${year}`; break;
        case 'quarterly': const quarter = Math.floor(month / 3) + 1; label = `Trimestre ${quarter} ${year}`; break;
        case 'semiannually': const semester = Math.floor(month / 6) + 1; label = `Semestre ${semester} ${year}`; break;
        case 'annually': label = `Année ${year}`; break;
        default: return '';
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [rangeStart, localTimeUnit]);

  const projectActuals = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    return actualTransactions.filter(actual => 
        actual.type === (analysisType === 'expense' ? 'payable' : 'receivable') && 
        (actual.payments || []).some(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= rangeStart && paymentDate < rangeEnd;
        })
    );
  }, [actualTransactions, rangeStart, rangeEnd, analysisType]);

  const projectEntries = useMemo(() => {
    return budgetEntries.filter(e => e.type === (analysisType === 'expense' ? 'depense' : 'revenu'));
  }, [budgetEntries, analysisType]);

  const categoryAnalysisData = useMemo(() => {
    if (!rangeStart || !rangeEnd) return { categories: [], budgetData: [], actualData: [], totalBudget: 0, totalActual: 0 };
    const mainCategories = analysisType === 'expense' ? categories.expense : categories.revenue;
    const data = mainCategories.map(mainCat => {
        const budgetAmount = projectEntries.filter(entry => mainCat.subCategories.some(sc => sc.name === entry.category)).reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, rangeStart, rangeEnd), 0);
        const actualAmount = projectActuals.filter(actual => mainCat.subCategories.some(sc => sc.name === actual.category)).reduce((sum, actual) => sum + (actual.payments || []).filter(p => new Date(p.paymentDate) >= rangeStart && new Date(p.paymentDate) < rangeEnd).reduce((pSum, p) => pSum + p.paidAmount, 0), 0);
        return { name: mainCat.name, budget: budgetAmount, actual: actualAmount };
    }).filter(item => item.budget > 0 || item.actual > 0);
    data.sort((a, b) => b.actual - a.actual);
    const totalBudget = data.reduce((sum, item) => sum + item.budget, 0);
    const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
    return { categories: data.map(item => item.name), budgetData: data.map(item => item.budget), actualData: data.map(item => item.actual), totalBudget, totalActual };
  }, [categories.expense, categories.revenue, projectActuals, projectEntries, rangeStart, rangeEnd, analysisType]);

  const subCategoryDrillDownData = useMemo(() => {
    if (drillDownState.level < 1) return { labels: [], data: [], total: 0 };
    const mainCategories = analysisType === 'expense' ? categories.expense : categories.revenue;
    const mainCat = mainCategories.find(mc => mc.name === drillDownState.mainCategoryName);
    if (!mainCat || !mainCat.subCategories) return { labels: [], data: [], total: 0 };
    const subCategoryData = mainCat.subCategories.map(subCat => {
        let amount = 0;
        if (drillDownState.dataType === 'actual') {
            amount = projectActuals.filter(actual => actual.category === subCat.name).reduce((sum, actual) => sum + (actual.payments || []).filter(p => new Date(p.paymentDate) >= rangeStart && new Date(p.paymentDate) < rangeEnd).reduce((pSum, p) => pSum + p.paidAmount, 0), 0);
        } else {
            amount = projectEntries.filter(entry => entry.category === subCat.name).reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, rangeStart, rangeEnd), 0);
        }
        return { name: subCat.name, value: amount };
    }).filter(item => item.value > 0);
    subCategoryData.sort((a, b) => b.value - a.value);
    const total = subCategoryData.reduce((sum, item) => sum + item.value, 0);
    return { labels: subCategoryData.map(item => item.name), data: subCategoryData, total };
  }, [drillDownState, categories, projectActuals, projectEntries, rangeStart, rangeEnd, analysisType]);

  const supplierDrillDownData = useMemo(() => {
    if (drillDownState.level !== 2) return { labels: [], data: [], total: 0 };
    const { subCategoryName, dataType } = drillDownState;
    const supplierData = new Map();
    if (dataType === 'actual') {
        projectActuals.filter(actual => actual.category === subCategoryName).forEach(actual => {
            const totalPaidInPeriod = (actual.payments || []).filter(p => new Date(p.paymentDate) >= rangeStart && new Date(p.paymentDate) < rangeEnd).reduce((pSum, p) => pSum + p.paidAmount, 0);
            if (totalPaidInPeriod > 0) supplierData.set(actual.thirdParty, (supplierData.get(actual.thirdParty) || 0) + totalPaidInPeriod);
        });
    } else {
        projectEntries.filter(entry => entry.category === subCategoryName).forEach(entry => {
            const amount = getEntryAmountForPeriod(entry, rangeStart, rangeEnd);
            if (amount > 0) supplierData.set(entry.supplier, (supplierData.get(entry.supplier) || 0) + amount);
        });
    }
    const formattedData = Array.from(supplierData.entries()).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    const total = formattedData.reduce((sum, item) => sum + item.value, 0);
    return { labels: formattedData.map(item => item.name), data: formattedData, total };
  }, [drillDownState, projectActuals, projectEntries, rangeStart, rangeEnd]);

  const projectAnalysisData = useMemo(() => {
    if (!isConsolidated || !rangeStart || !rangeEnd) return { projects: [], budgetData: [], actualData: [], totalBudget: 0, totalActual: 0 };
    const projectData = projects.filter(p => !p.isArchived).map(project => {
        const projectEntries = allEntries[project.id] || [];
        const projectActuals = allActuals[project.id] || [];
        const budgetAmount = projectEntries.filter(e => e.type === (analysisType === 'expense' ? 'depense' : 'revenu')).reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, rangeStart, rangeEnd), 0);
        const actualAmount = projectActuals.filter(actual => actual.type === (analysisType === 'expense' ? 'payable' : 'receivable')).reduce((sum, actual) => sum + (actual.payments || []).filter(p => new Date(p.paymentDate) >= rangeStart && new Date(p.paymentDate) < rangeEnd).reduce((pSum, p) => pSum + p.paidAmount, 0), 0);
        return { name: project.name, budget: budgetAmount, actual: actualAmount };
    }).filter(p => p.budget > 0 || p.actual > 0);
    projectData.sort((a, b) => b.actual - a.actual);
    const totalBudget = projectData.reduce((sum, p) => sum + p.budget, 0);
    const totalActual = projectData.reduce((sum, p) => sum + p.actual, 0);
    return { projects: projectData.map(p => p.name), budgetData: projectData.map(p => p.budget), actualData: projectData.map(p => p.actual), totalBudget, totalActual };
  }, [projects, allEntries, allActuals, rangeStart, rangeEnd, analysisType, isConsolidated]);

  const tierAnalysisData = useMemo(() => {
    if (!rangeStart || !rangeEnd) return { tiers: [], budgetData: [], actualData: [], totalBudget: 0, totalActual: 0 };
    const tierBudgetMap = new Map();
    const tierActualMap = new Map();
    projectEntries.forEach(entry => { const amount = getEntryAmountForPeriod(entry, rangeStart, rangeEnd); if (amount > 0) tierBudgetMap.set(entry.supplier, (tierBudgetMap.get(entry.supplier) || 0) + amount); });
    projectActuals.forEach(actual => { const actualAmount = (actual.payments || []).filter(p => new Date(p.paymentDate) >= rangeStart && new Date(p.paymentDate) < rangeEnd).reduce((sum, p) => sum + p.paidAmount, 0); if (actualAmount > 0) tierActualMap.set(actual.thirdParty, (tierActualMap.get(actual.thirdParty) || 0) + actualAmount); });
    const allTiers = new Set([...tierBudgetMap.keys(), ...tierActualMap.keys()]);
    const tierData = Array.from(allTiers).map(tier => ({ name: tier, budget: tierBudgetMap.get(tier) || 0, actual: tierActualMap.get(tier) || 0, })).sort((a, b) => b.actual - a.actual).slice(0, 10);
    const totalBudget = tierData.reduce((sum, p) => sum + p.budget, 0);
    const totalActual = tierData.reduce((sum, p) => sum + p.actual, 0);
    return { tiers: tierData.map(p => p.name), budgetData: tierData.map(p => p.budget), actualData: tierData.map(p => p.actual), totalBudget, totalActual };
  }, [projectEntries, projectActuals, rangeStart, rangeEnd]);

  const handleBack = () => { if (drillDownState.level === 2) { setDrillDownState(prev => ({ ...prev, level: 1, subCategoryName: null, })); } else if (drillDownState.level === 1) { setDrillDownState({ level: 0, mainCategoryName: null, subCategoryName: null, dataType: null, color: null, }); } };
  const onChartClick = (params) => { if (params.componentType !== 'series' || analysisMode !== 'category') return; if (drillDownState.level === 0) { setDrillDownState({ level: 1, mainCategoryName: params.name, subCategoryName: null, dataType: params.seriesName.toLowerCase().startsWith('budget') ? 'budget' : 'actual', color: params.color, }); } else if (drillDownState.level === 1) { setDrillDownState(prev => ({ ...prev, level: 2, subCategoryName: params.name, })); } };
  const onEvents = { 'click': onChartClick };
  const getChartOptions = () => {
    const { categories, budgetData, actualData, totalBudget, totalActual } = categoryAnalysisData;
    const chartColors = analysisType === 'expense' ? { budget: '#fca5a5', actual: '#ef4444', budgetLabel: '#b91c1c', actualLabel: '#7f1d1d' } : { budget: '#6ee7b7', actual: '#10b981', budgetLabel: '#047857', actualLabel: '#065f46' };
    if (categories.length === 0) return { title: { text: 'Aucune donnée à afficher', left: 'center', top: 'center' }, series: [] };
    return { title: { text: 'Analyse par Catégorie', left: 'center', top: 0, textStyle: { fontSize: 16, fontWeight: '600', color: '#475569' } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => { let tooltip = `<strong>${params[0].name}</strong><br/>`; params.slice().reverse().forEach(param => { const total = param.seriesName.startsWith('Budget') ? totalBudget : totalActual; const percentage = total > 0 ? (param.value / total) * 100 : 0; tooltip += `${param.marker} ${param.seriesName.split(':')[0]}: <strong>${formatCurrency(param.value, settings)}</strong> (${percentage.toFixed(1)}%)<br/>`; }); return tooltip; } }, legend: { data: [`Budget: ${formatCurrency(totalBudget, settings)}`, `Réel: ${formatCurrency(totalActual, settings)}`], top: 30, textStyle: { fontSize: 14, fontWeight: 'bold' } }, grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true }, xAxis: { type: 'value', axisLabel: { formatter: (value) => formatCurrency(value, { ...settings, displayUnit: 'standard' }) } }, yAxis: { type: 'category', data: categories, axisLabel: { interval: 0, rotate: 0 } }, series: [ { name: `Budget: ${formatCurrency(totalBudget, settings)}`, type: 'bar', data: budgetData, itemStyle: { color: chartColors.budget }, emphasis: { focus: 'series' }, label: { show: true, position: 'right', formatter: (params) => { if (params.value <= 0) return ''; const percentage = totalBudget > 0 ? (params.value / totalBudget) * 100 : 0; return `${formatCurrency(params.value, settings)} (${percentage.toFixed(0)}%)`; }, color: chartColors.budgetLabel } }, { name: `Réel: ${formatCurrency(totalActual, settings)}`, type: 'bar', data: actualData, itemStyle: { color: chartColors.actual }, emphasis: { focus: 'series' }, label: { show: true, position: 'right', formatter: (params) => { if (params.value <= 0) return ''; const percentage = totalActual > 0 ? (params.value / totalActual) * 100 : 0; return `${formatCurrency(params.value, settings)} (${percentage.toFixed(0)}%)`; }, color: chartColors.actualLabel } } ] };
  };
  const getSubCategoryDrillDownChartOptions = () => {
    const { data, total } = subCategoryDrillDownData;
    const barColor = drillDownState.color;
    const labelColorMap = { '#fca5a5': '#b91c1c', '#ef4444': '#7f1d1d', '#6ee7b7': '#047857', '#10b981': '#065f46' };
    const labelColor = labelColorMap[barColor] || (analysisType === 'expense' ? '#7f1d1d' : '#065f46');
    return { title: { text: `Détail de : ${drillDownState.mainCategoryName}`, left: 'center', top: 0, textStyle: { fontSize: 16, fontWeight: '600', color: '#475569' } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => { const percentage = total > 0 ? (params[0].value / total) * 100 : 0; return `<strong>${params[0].name}</strong><br/>${params[0].marker} ${params[0].seriesName}: <strong>${formatCurrency(params[0].value, settings)}</strong> (${percentage.toFixed(1)}%)`; } }, grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true }, xAxis: { type: 'value', axisLabel: { formatter: (value) => formatCurrency(value, { ...settings, displayUnit: 'standard' }) } }, yAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { interval: 0 } }, series: [{ name: drillDownState.dataType === 'actual' ? 'Réel' : 'Budget', type: 'bar', data: data.map(d => d.value), itemStyle: { color: barColor }, label: { show: true, position: 'right', formatter: (params) => { if (params.value <= 0) return ''; const percentage = total > 0 ? (params.value / total) * 100 : 0; return `${formatCurrency(params.value, settings)} (${percentage.toFixed(0)}%)`; }, color: labelColor } }] };
  };
  const getSupplierDrillDownChartOptions = () => {
    const { data, total } = supplierDrillDownData;
    const barColor = drillDownState.color;
    const labelColorMap = { '#fca5a5': '#b91c1c', '#ef4444': '#7f1d1d', '#6ee7b7': '#047857', '#10b981': '#065f46' };
    const labelColor = labelColorMap[barColor] || (analysisType === 'expense' ? '#7f1d1d' : '#065f46');
    return { title: { text: `Détail de : ${drillDownState.subCategoryName}`, left: 'center', top: 0, textStyle: { fontSize: 16, fontWeight: '600', color: '#475569' } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => { const percentage = total > 0 ? (params[0].value / total) * 100 : 0; return `<strong>${params[0].name}</strong><br/>${params[0].marker} ${params[0].seriesName}: <strong>${formatCurrency(params[0].value, settings)}</strong> (${percentage.toFixed(1)}%)`; } }, grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true }, xAxis: { type: 'value', axisLabel: { formatter: (value) => formatCurrency(value, { ...settings, displayUnit: 'standard' }) } }, yAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { interval: 0 } }, series: [{ name: drillDownState.dataType === 'actual' ? 'Réel' : 'Budget', type: 'bar', data: data.map(d => d.value), itemStyle: { color: barColor }, label: { show: true, position: 'right', formatter: (params) => { if (params.value <= 0) return ''; const percentage = total > 0 ? (params.value / total) * 100 : 0; return `${formatCurrency(params.value, settings)} (${percentage.toFixed(0)}%)`; }, color: labelColor } }] };
  };
  const getProjectChartOptions = () => {
    const { projects, budgetData, actualData } = projectAnalysisData;
    const chartColors = analysisType === 'expense' ? { budget: '#fca5a5', actual: '#ef4444', budgetLabel: '#b91c1c', actualLabel: '#7f1d1d' } : { budget: '#6ee7b7', actual: '#10b981', budgetLabel: '#047857', actualLabel: '#065f46' };
    if (projects.length === 0) return { title: { text: 'Aucune donnée de projet à analyser', left: 'center', top: 'center' }, series: [] };
    return { title: { text: 'Analyse par Projet', left: 'center', top: 0, textStyle: { fontSize: 16, fontWeight: '600', color: '#475569' } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { data: ['Budget', 'Réel'], top: 30 }, grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }, xAxis: { type: 'value' }, yAxis: { type: 'category', data: projects }, series: [ { name: 'Budget', type: 'bar', data: budgetData, itemStyle: { color: chartColors.budget }, label: { show: true, position: 'right', color: chartColors.budgetLabel } }, { name: 'Réel', type: 'bar', data: actualData, itemStyle: { color: chartColors.actual }, label: { show: true, position: 'right', color: chartColors.actualLabel } } ] };
  };
  const getTierChartOptions = () => {
    const { tiers, budgetData, actualData } = tierAnalysisData;
    const chartColors = analysisType === 'expense' ? { budget: '#fca5a5', actual: '#ef4444', budgetLabel: '#b91c1c', actualLabel: '#7f1d1d' } : { budget: '#6ee7b7', actual: '#10b981', budgetLabel: '#047857', actualLabel: '#065f46' };
    if (tiers.length === 0) return { title: { text: 'Aucune donnée par tiers à analyser', left: 'center', top: 'center' }, series: [] };
    return { title: { text: 'Analyse par Tiers (Top 10)', left: 'center', top: 0, textStyle: { fontSize: 16, fontWeight: '600', color: '#475569' } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { data: ['Budget', 'Réel'], top: 30 }, grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }, xAxis: { type: 'value' }, yAxis: { type: 'category', data: tiers }, series: [ { name: 'Budget', type: 'bar', data: budgetData, itemStyle: { color: chartColors.budget }, label: { show: true, position: 'right', color: chartColors.budgetLabel } }, { name: 'Réel', type: 'bar', data: actualData, itemStyle: { color: chartColors.actual }, label: { show: true, position: 'right', color: chartColors.actualLabel } } ] };
  };

  const renderChart = () => {
    if (analysisMode === 'category') {
        if (drillDownState.level === 0) return categoryAnalysisData.categories.length > 0 ? <ReactECharts option={getChartOptions()} style={{ height: `${Math.max(500, categoryAnalysisData.categories.length * 80)}px`, width: '100%' }} onEvents={onEvents} /> : <EmptyState icon={PieChart} title={`Aucune ${analysisType === 'expense' ? 'dépense' : 'entrée'} à analyser`} message="Il n'y a pas de données pour la période sélectionnée." />;
        else if (drillDownState.level === 1) return subCategoryDrillDownData.data.length > 0 ? <ReactECharts option={getSubCategoryDrillDownChartOptions()} style={{ height: `${Math.max(400, subCategoryDrillDownData.data.length * 60)}px`, width: '100%' }} onEvents={onEvents} /> : <EmptyState icon={PieChart} title="Aucun détail" message="Aucune donnée de sous-catégorie pour cette sélection." />;
        else return supplierDrillDownData.data.length > 0 ? <ReactECharts option={getSupplierDrillDownChartOptions()} style={{ height: `${Math.max(400, supplierDrillDownData.data.length * 60)}px`, width: '100%' }} /> : <EmptyState icon={PieChart} title="Aucun détail" message="Aucune donnée par fournisseur pour cette sélection." />;
    } else if (analysisMode === 'project') {
        return projectAnalysisData.projects.length > 0 ? <ReactECharts option={getProjectChartOptions()} style={{ height: '500px', width: '100%' }} /> : <EmptyState icon={Folder} title="Aucune donnée par projet" message="Ce graphique est disponible en vue consolidée." />;
    } else {
        return tierAnalysisData.tiers.length > 0 ? <ReactECharts option={getTierChartOptions()} style={{ height: '500px', width: '100%' }} /> : <EmptyState icon={User} title="Aucune donnée par tiers" message="Aucune transaction trouvée pour la période sélectionnée." />;
    }
  };

  return (
    <div className={isFocusMode ? "h-full flex flex-col" : "container mx-auto p-6 max-w-full"}>
      {!isFocusMode && (
        <div className="mb-8"><div className="flex items-center gap-4"><PieChart className={`w-8 h-8 ${analysisType === 'expense' ? 'text-red-600' : 'text-green-600'}`} /><div><h1 className="text-2xl font-bold text-gray-900">Analyse</h1></div></div></div>
      )}
      {!isFocusMode && (
        <div className="mb-6"><div className="flex flex-wrap items-center justify-between gap-4">{!rangeStartProp && (<div className="flex flex-wrap items-center gap-x-4 gap-y-2"><div className="flex items-center gap-2"><button onClick={() => handlePeriodChange(-1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période précédente"><ChevronLeft size={18} /></button><span className="text-sm font-semibold text-gray-700 w-auto min-w-[9rem] text-center" title="Période sélectionnée">{(analysisPeriodName.charAt(0).toUpperCase() + analysisPeriodName.slice(1)) || 'Période'}</span><button onClick={() => handlePeriodChange(1)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Période suivante"><ChevronRight size={18} /></button></div><div className="h-8 w-px bg-gray-200 hidden md:block"></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => handleQuickPeriodSelect('month')} className={`px-2 py-1 text-xs rounded-md transition-colors ${localActiveQuickSelect === 'month' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Mois</button><button onClick={() => handleQuickPeriodSelect('bimester')} className={`px-2 py-1 text-xs rounded-md transition-colors ${localActiveQuickSelect === 'bimester' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Bimestre</button><button onClick={() => handleQuickPeriodSelect('quarter')} className={`px-2 py-1 text-xs rounded-md transition-colors ${localActiveQuickSelect === 'quarter' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Trimestre</button><button onClick={() => handleQuickPeriodSelect('semester')} className={`px-2 py-1 text-xs rounded-md transition-colors ${localActiveQuickSelect === 'semester' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Semestre</button><button onClick={() => handleQuickPeriodSelect('year')} className={`px-2 py-1 text-xs rounded-md transition-colors ${localActiveQuickSelect === 'year' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'font-normal text-gray-600 hover:bg-gray-300'}`}>Année</button></div></div>)}<div className="flex items-center gap-4"><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => setAnalysisMode('category')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${analysisMode === 'category' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Par catégorie</button>{isConsolidated && (<button onClick={() => setAnalysisMode('project')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${analysisMode === 'project' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Par projet</button>)}<button onClick={() => setAnalysisMode('tier')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${analysisMode === 'tier' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-300'}`}>Par tiers</button></div><div className="flex items-center gap-1 bg-gray-200 p-1 rounded-lg"><button onClick={() => setLocalAnalysisType('expense')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${analysisType === 'expense' ? 'bg-white shadow text-red-600' : 'text-gray-600 hover:bg-gray-300'}`}><TrendingDown className="w-4 h-4" />Sorties</button><button onClick={() => setLocalAnalysisType('revenue')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${analysisType === 'revenue' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:bg-gray-300'}`}><TrendingUp className="w-4 h-4" />Entrées</button></div></div></div></div>
      )}
      <div className="bg-white p-6 rounded-lg shadow">
        {drillDownState.level > 0 && (<div className="mb-4"><button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" />Retour</button></div>)}
        {renderChart()}
      </div>
    </div>
  );
};

export default ExpenseAnalysisView;
