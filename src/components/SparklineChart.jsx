import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { formatCurrency } from '../utils/formatting';

const SparklineChart = ({ data, periods, currencySettings, showXAxis = false, xAxisLabels = [] }) => {
  const cleanData = useMemo(() => Array.isArray(data) ? data.map(d => Number.isFinite(d) ? d : null) : [], [data]);
  
  const hasEnoughData = useMemo(() => cleanData.filter(d => d !== null).length >= 1, [cleanData]);

  if (!hasEnoughData) {
    return <div className="h-16 w-full bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">Données insuffisantes pour une tendance</div>;
  }

  const numericData = cleanData.filter(d => d !== null);
  const dataMin = Math.min(...numericData);
  const dataMax = Math.max(...numericData);
  
  let yAxisMin = dataMin >= 0 ? dataMin * 0.95 : dataMin * 1.05;
  let yAxisMax = dataMax > 0 ? dataMax * 1.05 : dataMax * 0.95;

  if (yAxisMin === yAxisMax) {
    const buffer = Math.abs(yAxisMin * 0.1) || 1;
    yAxisMin -= buffer;
    yAxisMax += buffer;
  }
  
  const positiveData = cleanData.map(d => d !== null && d >= 0 ? d : null);
  const negativeData = cleanData.map(d => d !== null && d < 0 ? d : null);

  const option = {
    grid: { left: 5, right: 5, top: 10, bottom: showXAxis ? 25 : 5 },
    xAxis: {
        type: 'category',
        show: showXAxis,
        data: showXAxis ? xAxisLabels : cleanData.map((_, i) => i),
        axisLabel: {
            fontSize: 9,
            color: '#6b7280',
            interval: 0,
        },
        axisTick: { show: false },
        axisLine: { show: false },
    },
    yAxis: { type: 'value', show: false, min: yAxisMin, max: yAxisMax },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#9ca3af', width: 1, type: 'dashed' } },
      formatter: (params) => {
        const validParam = params.find(p => p.value !== null && p.value !== undefined);
        if (!validParam) return '';
        
        const dataIndex = validParam.dataIndex;
        const value = validParam.value;
        const period = periods && periods[dataIndex];
        
        if (!period) return `Solde: <strong>${formatCurrency(value, currencySettings)}</strong>`;

        const periodLabel = String(period.label);
        const periodDate = new Date(period.startDate);
        const fullYear = periodDate.getFullYear();
        
        let finalLabel = periodLabel;
        if (!/\d{4}/.test(periodLabel) && !/'\d{2}/.test(periodLabel)) {
            finalLabel = `${periodLabel} ${fullYear}`;
        } else {
            finalLabel = periodLabel.replace(/'(\d{2})/, ` ${fullYear}`);
        }

        return `<strong>${finalLabel}</strong><br/>Solde: <strong>${formatCurrency(value, currencySettings)}</strong>`;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#374151' },
      extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-radius: 8px;'
    },
    series: [
      {
        name: 'Solde',
        data: positiveData,
        type: 'line',
        connectNulls: true,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: { color: '#3b82f6', opacity: 0.3 }
      },
      {
        name: 'Solde',
        data: negativeData,
        type: 'line',
        connectNulls: true,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#ef4444' },
        areaStyle: { color: '#ef4444', opacity: 0.3 }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: showXAxis ? '80px' : '64px', width: '100%' }} notMerge={true} lazyUpdate={true} />;
};

export default SparklineChart;
