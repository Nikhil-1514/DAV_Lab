import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { Sparkles, Download, Sliders, BookOpen, Code, LineChart, Info } from 'lucide-react';

export default function VisualizationStudio() {
  const chartRef = useRef(null);

  // Custom Chart Builder state
  const [useRaw, setUseRaw] = useState(false);
  const [chartType, setChartType] = useState('Bar');
  const [xAxis, setXAxis] = useState('city');
  const [yAxis, setYAxis] = useState('co2_ppm');
  const [groupBy, setGroupBy] = useState('None');
  const [aggregation, setAggregation] = useState('mean');
  const [chartTitle, setChartTitle] = useState('Custom Air Quality Analysis Chart');
  
  // Filters
  const [cityFilter, setCityFilter] = useState('All');
  const [roomFilter, setRoomFilter] = useState('All');
  const [ventFilter, setVentFilter] = useState('All');
  const [iaqFilter, setIaqFilter] = useState('All');

  const [recommendation, setRecommendation] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Predefined analytical visual state
  const [cityData, setCityData] = useState([]);
  const [roomData, setRoomData] = useState([]);
  const [ventData, setVentData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);

  const categoricalCols = ['city', 'room_type', 'ventilation_type', 'iaq_category', 'day_of_week'];
  const numericalCols = ['co2_ppm', 'pm2_5_ug_m3', 'pm10_ug_m3', 'temperature_c', 'relative_humidity', 'occupancy', 'voc_ppb', 'co_ppm', 'iaq_index', 'hour'];

  useEffect(() => {
    fetchRecommendation();
    fetchChartData();
    fetchPredefinedData();
  }, [xAxis, yAxis, chartType, groupBy, aggregation, cityFilter, roomFilter, ventFilter, iaqFilter, useRaw]);

  const fetchRecommendation = async () => {
    try {
      const formData = new FormData();
      formData.append('x_axis', xAxis);
      if (yAxis) formData.append('y_axis', yAxis);
      const res = await axios.post('/api/visualization/recommend', formData);
      setRecommendation(res.data);
    } catch (err) {
      console.error("Error fetching recommendation:", err);
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('chart_type', chartType);
      formData.append('x_axis', xAxis);
      if (yAxis) formData.append('y_axis', yAxis);
      if (groupBy) formData.append('group_by', groupBy);
      formData.append('aggregation', aggregation);
      formData.append('city', cityFilter);
      formData.append('room_type', roomFilter);
      formData.append('ventilation_type', ventFilter);
      formData.append('iaq_category', iaqFilter);
      formData.append('use_raw', useRaw ? "true" : "false");

      const res = await axios.post('/api/visualization/custom', formData);
      setChartData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching custom chart data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredefinedData = async () => {
    try {
      const [cRes, rRes, vRes, tRes, oRes] = await Promise.all([
        axios.get('/api/analysis/city'),
        axios.get('/api/analysis/room'),
        axios.get('/api/analysis/ventilation'),
        axios.get('/api/analysis/time'),
        axios.get('/api/analysis/occupancy')
      ]);
      setCityData(cRes.data);
      setRoomData(rRes.data);
      setVentData(vRes.data);
      setTimeData(tRes.data);
      setOccupancyData(oRes.data);
    } catch (err) {
      console.error("Error fetching predefined data:", err);
    }
  };

  const applyRecommendation = () => {
    if (recommendation?.recommended_chart) {
      const chartMap = {
        'Line Chart': 'Line',
        'Bar Chart': 'Bar',
        'Scatter Plot': 'Scatter',
        'Histogram': 'Histogram',
        'Box Plot': 'Box Plot'
      };
      const rec = chartMap[recommendation.recommended_chart] || 'Bar';
      setChartType(rec);
    }
  };

  const exportPNG = () => {
    if (chartRef.current) {
      const link = document.createElement('a');
      link.download = `${chartTitle.replace(/[\s_]+/g, '_')}.png`;
      link.href = chartRef.current.toBase64Image();
      link.click();
    }
  };

  const exportCSV = () => {
    if (!chartData || chartData.length === 0) return;
    const headers = Object.keys(chartData[0]).join(',');
    const rows = chartData.map(row => Object.values(row).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${chartTitle.replace(/[\s_]+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRenderableChart = () => {
    if (loading) return <p style={{ padding: '40px', textAlign: 'center' }}>Building custom visualization...</p>;
    if (!chartData || chartData.length === 0) return <p style={{ padding: '40px', textAlign: 'center' }}>No chart data matches current criteria.</p>;

    if (chartType === 'Bar') {
      const data = {
        labels: chartData.map(d => String(d[xAxis])),
        datasets: [{
          label: `${aggregation.toUpperCase()} of ${yAxis || 'Count'}`,
          data: chartData.map(d => d[yAxis] ?? d['count'] ?? 0),
          backgroundColor: '#2563eb',
          borderRadius: 4
        }]
      };
      return <Bar ref={chartRef} data={data} options={{ responsive: true, maintainAspectRatio: false }} />;
    }

    if (chartType === 'Line') {
      const data = {
        labels: chartData.map(d => String(d[xAxis])),
        datasets: [{
          label: `${aggregation.toUpperCase()} of ${yAxis || 'Metric'}`,
          data: chartData.map(d => d[yAxis] ?? 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3
        }]
      };
      return <Line ref={chartRef} data={data} options={{ responsive: true, maintainAspectRatio: false }} />;
    }

    if (chartType === 'Scatter') {
      const data = {
        datasets: [{
          label: `${xAxis} vs ${yAxis}`,
          data: chartData.map(d => ({ x: d[xAxis], y: d[yAxis] })),
          backgroundColor: 'rgba(37, 99, 235, 0.6)'
        }]
      };
      return <Scatter ref={chartRef} data={data} options={{ responsive: true, maintainAspectRatio: false }} />;
    }

    if (chartType === 'Histogram') {
      const data = {
        labels: chartData.map(d => d.bin),
        datasets: [{
          label: `Frequency Count (${xAxis})`,
          data: chartData.map(d => d.count),
          backgroundColor: '#8b5cf6',
          borderRadius: 2
        }]
      };
      return <Bar ref={chartRef} data={data} options={{ responsive: true, maintainAspectRatio: false }} />;
    }

    if (chartType === 'Box Plot') {
      const data = {
        labels: chartData.map(d => d.category),
        datasets: [
          { label: 'Median', data: chartData.map(d => d.median), backgroundColor: '#2563eb' },
          { label: 'Q1', data: chartData.map(d => d.q1), backgroundColor: '#60a5fa' },
          { label: 'Q3', data: chartData.map(d => d.q3), backgroundColor: '#93c5fd' }
        ]
      };
      return <Bar ref={chartRef} data={data} options={{ responsive: true, maintainAspectRatio: false }} />;
    }

    return <Bar ref={chartRef} data={{ labels: chartData.map(d => String(d[xAxis])), datasets: [{ data: chartData.map(d => d[yAxis] ?? 0), backgroundColor: '#2563eb' }] }} options={{ responsive: true, maintainAspectRatio: false }} />;
  };

  return (
    <div id="visualization-studio-page">
      {/* Project IAQ Disclaimer */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Info size={16} />
        <span>Project-defined analytical Indoor Air Quality classification. This classification is intended for academic analysis and does not represent an official AQI measurement.</span>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '4px' }}>
        Interactive Custom Visualization Studio & Notebook Analytics
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Custom chart builder, deterministic smart visualization recommendations, predefined analysis modules, and Jupyter notebook flow.
      </p>

      {/* Smart Chart Recommendation Alert */}
      {recommendation && (
        <div className="rec-box" id="smart-recommendation-box" style={{ marginBottom: '20px' }}>
          <Sparkles size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Recommended Visualization:</strong> {recommendation.recommended_chart}
            <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>{recommendation.reason}</div>
          </div>
          <button id="use-recommendation-btn" className="btn btn-primary" onClick={applyRecommendation} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Use Recommendation
          </button>
        </div>
      )}

      {/* SECTION 1: CUSTOM CHART BUILDER */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', marginBottom: '36px' }}>
        {/* Controls */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-title" style={{ fontSize: '0.95rem' }}>
            <Sliders size={16} /> Chart Configuration
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TARGET DATASET</label>
            <select className="select-field" value={useRaw ? "Raw" : "Processed"} onChange={(e) => setUseRaw(e.target.value === "Raw")} style={{ width: '100%', marginTop: '4px' }}>
              <option value="Processed">Processed Dataset (Cleaned)</option>
              <option value="Raw">Raw Dataset (Immutable)</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CHART TITLE</label>
            <input
              id="chart-title-input"
              type="text"
              className="input-field"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CHART TYPE</label>
            <select id="select-chart-type" className="select-field" value={chartType} onChange={(e) => setChartType(e.target.value)} style={{ width: '100%', marginTop: '4px' }}>
              <option value="Bar">Bar Chart</option>
              <option value="Line">Line Chart</option>
              <option value="Scatter">Scatter Plot</option>
              <option value="Histogram">Histogram / Density</option>
              <option value="Box Plot">Box Plot Summary</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>X-AXIS (DIMENSION)</label>
            <select id="select-x-axis" className="select-field" value={xAxis} onChange={(e) => setXAxis(e.target.value)} style={{ width: '100%', marginTop: '4px' }}>
              {categoricalCols.map(c => <option key={c} value={c}>{c}</option>)}
              {numericalCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Y-AXIS (MEASURE)</label>
            <select id="select-y-axis" className="select-field" value={yAxis} onChange={(e) => setYAxis(e.target.value)} style={{ width: '100%', marginTop: '4px' }}>
              {numericalCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AGGREGATION METHOD</label>
            <select id="select-aggregation" className="select-field" value={aggregation} onChange={(e) => setAggregation(e.target.value)} style={{ width: '100%', marginTop: '4px' }}>
              <option value="mean">Mean (Average)</option>
              <option value="median">Median</option>
              <option value="sum">Sum Total</option>
              <option value="count">Count</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600 }}>{chartTitle}</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button id="export-png-btn" className="btn btn-outline" onClick={exportPNG}>
                <Download size={14} /> Export PNG
              </button>
              <button id="export-csv-btn" className="btn btn-outline" onClick={exportCSV}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '380px', position: 'relative' }}>
            {getRenderableChart()}
          </div>
        </div>
      </div>

      {/* SECTION 2: PREDEFINED ANALYSES WITH SHORT EXPLANATIONS */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Predefined Domain Analyses & Interpretations</h3>
      <div className="grid-2" style={{ marginBottom: '36px' }}>
        <div className="card">
          <div className="card-title">Mean CO₂ by City</div>
          <div style={{ height: '200px', marginBottom: '14px' }}>
            <Bar data={{ labels: cityData.map(c => c.city), datasets: [{ label: 'Mean CO2 (ppm)', data: cityData.map(c => c.co2_ppm), backgroundColor: '#2563eb' }] }} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
            <div><strong>What does this show?</strong> Compares mean indoor CO₂ levels across AP cities.</div>
            <div><strong>What pattern is observed?</strong> High density commercial centers show higher CO₂ accumulation.</div>
            <div><strong>What does it suggest?</strong> Indicates fresh air exchange rates vary across urban buildings.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">PM2.5 by Ventilation Type</div>
          <div style={{ height: '200px', marginBottom: '14px' }}>
            <Bar data={{ labels: ventData.map(v => v.ventilation_type), datasets: [{ label: 'Mean PM2.5 (µg/m³)', data: ventData.map(v => v.pm2_5_ug_m3), backgroundColor: '#10b981' }] }} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
            <div><strong>What does this show?</strong> Fine particulate matter concentration across ventilation modes.</div>
            <div><strong>What pattern is observed?</strong> Air Conditioned and Mechanical HVAC systems exhibit lower PM2.5.</div>
            <div><strong>What does it suggest?</strong> HVAC filtration successfully scrubs outdoor ambient dust.</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: NOTEBOOK-STYLE VISUAL ANALYSIS FLOW */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Notebook Analysis Execution Flow</h3>
      <div className="notebook-cell">
        <div className="cell-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={14} />
            <span>Problem Statement → Dataset Overview → Data Cleaning → Exploratory Analysis → Findings</span>
          </div>
        </div>
        <div className="cell-body">
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The Jupyter Notebook artifact (<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>notebooks/indoor_air_quality_analysis.ipynb</code>) executes the complete 25-section analytical workflow. Results calculated by the backend engine are visually mirrored across these platform modules.
          </p>
        </div>
      </div>
    </div>
  );
}
