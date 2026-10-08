import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Doughnut, Line, Scatter } from 'react-chartjs-2';
import { 
  FileText, 
  Layers, 
  AlertCircle, 
  Copy, 
  MapPin, 
  Home,
  Wind,
  Thermometer,
  Droplets,
  Users
} from 'lucide-react';
import FilterBar from '../components/FilterBar';

export default function Dashboard() {
  const [filters, setFilters] = useState({
    city: 'All',
    room_type: 'All',
    ventilation_type: 'All',
    iaq_category: 'All'
  });

  const [stats, setStats] = useState(null);
  const [cityData, setCityData] = useState([]);
  const [roomData, setRoomData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.city !== 'All') params.city = filters.city;
      if (filters.room_type !== 'All') params.room_type = filters.room_type;
      if (filters.ventilation_type !== 'All') params.ventilation_type = filters.ventilation_type;
      if (filters.iaq_category !== 'All') params.iaq_category = filters.iaq_category;

      const [statsRes, cityRes, roomRes, occRes, overviewRes] = await Promise.all([
        axios.get('/api/dataset/stats', { params }),
        axios.get('/api/analysis/city', { params }),
        axios.get('/api/analysis/room', { params }),
        axios.get('/api/analysis/occupancy', { params }),
        axios.get('/api/analysis/overview', { params })
      ]);

      setStats(statsRes.data);
      setCityData(cityRes.data);
      setRoomData(roomRes.data);
      setOccupancyData(occRes.data);
      setOverviewData(overviewRes.data);
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ city: 'All', room_type: 'All', ventilation_type: 'All', iaq_category: 'All' });
  };

  if (loading && !stats) {
    return <div className="card"><p>Loading dashboard metrics...</p></div>;
  }

  const averages = stats?.overview_averages || {};

  // Chart 1: IAQ Distribution
  const iaqDist = overviewData?.iaq_category_distribution || {};
  const doughnutChartData = {
    labels: Object.keys(iaqDist),
    datasets: [{
      data: Object.values(iaqDist),
      backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
      borderWidth: 1
    }]
  };

  // Chart 2: CO2 by City
  const barChartCityData = {
    labels: cityData.map(c => c.city),
    datasets: [{
      label: 'Avg CO2 (ppm)',
      data: cityData.map(c => c.co2_ppm),
      backgroundColor: '#2563eb',
      borderRadius: 4
    }]
  };

  // Chart 3: PM2.5 by Room Type
  const barChartRoomData = {
    labels: roomData.map(r => r.room_type),
    datasets: [{
      label: 'Avg PM2.5 (µg/m³)',
      data: roomData.map(r => r.pm2_5_ug_m3),
      backgroundColor: '#10b981',
      borderRadius: 4
    }]
  };

  // Chart 4: Occupancy vs CO2 Scatter
  const scatterData = {
    datasets: [{
      label: 'Occupancy vs CO2',
      data: occupancyData.slice(0, 150).map(item => ({ x: item.occupancy, y: item.co2_ppm })),
      backgroundColor: 'rgba(37, 99, 235, 0.6)'
    }]
  };

  return (
    <div id="dashboard-page">
      {/* Global Filter Bar */}
      <FilterBar filters={filters} setFilters={setFilters} onReset={resetFilters} />

      {/* Dataset Statistics Grid */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
        Dataset Architecture Overview
      </h2>
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span>Raw Records</span>
            <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.raw_records?.toLocaleString()}</div>
          <div className="stat-sub">Immutable raw dataset storage</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Processed Records</span>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.processed_records?.toLocaleString()}</div>
          <div className="stat-sub">Active processed selection</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Total Features</span>
            <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.processed_features}</div>
          <div className="stat-sub">Raw: {stats?.raw_features} columns (+7 engineered)</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Missing Values</span>
            <div className="stat-icon" style={{ backgroundColor: '#fffbe3', color: '#d97706' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.processed_missing_values} Missing</div>
          <div className="stat-sub">Raw missing: {stats?.raw_missing_values} imputed</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Duplicate Records</span>
            <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <Copy size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.processed_duplicates}</div>
          <div className="stat-sub">Raw duplicates: {stats?.raw_duplicates} removed</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Cities & Room Types</span>
            <div className="stat-icon" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
              <MapPin size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.cities_count} Cities / {stats?.room_types_count} Rooms</div>
          <div className="stat-sub">Andhra Pradesh Locations</div>
        </div>
      </div>

      {/* IAQ Summary Bar */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
        Processed Environmental Metrics
      </h2>
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563eb' }}>
            <Wind size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AVERAGE CO₂</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px' }}>{averages.avg_co2} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>ppm</span></div>
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f97316' }}>
            <Wind size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AVERAGE PM2.5</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px' }}>{averages.avg_pm2_5} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>µg/m³</span></div>
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8b5cf6' }}>
            <Wind size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AVERAGE PM10</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '8px' }}>{averages.avg_pm10} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>µg/m³</span></div>
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
            <Thermometer size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AVG TEMP / HUMIDITY</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '8px' }}>{averages.avg_temp}°C / {averages.avg_humidity}%</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
        Key Analytical Visualizations
      </h2>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">IAQ Category Distribution</div>
          <div className="card-subtitle">Project-defined air quality classifications breakdown</div>
          <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={doughnutChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Average Indoor CO₂ by City</div>
          <div className="card-subtitle">Mean CO₂ levels across Andhra Pradesh urban centers</div>
          <div style={{ height: '260px' }}>
            <Bar data={barChartCityData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Average PM2.5 by Room Type</div>
          <div className="card-subtitle">Fine particulate matter accumulation across room categories</div>
          <div style={{ height: '260px' }}>
            <Bar data={barChartRoomData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Occupancy vs. CO₂ Scatter</div>
          <div className="card-subtitle">Relationship between occupant density and CO₂ accumulation</div>
          <div style={{ height: '260px' }}>
            <Scatter data={scatterData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
}
