import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export default function FilterBar({ filters, setFilters, onReset }) {
  const cities = ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Nellore', 'Rajahmundry'];
  const roomTypes = ['Classroom', 'Office', 'Laboratory', 'Library', 'Bedroom', 'Living Room', 'Conference Room'];
  const ventTypes = ['Natural', 'Mechanical', 'Air Conditioned', 'Mixed'];
  const iaqCategories = ['Good', 'Moderate', 'Poor', 'Very Poor'];

  const handleChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="card" style={{ padding: '14px 20px', marginBottom: '20px', backgroundColor: '#ffffff' }} id="global-filter-bar">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Filter size={16} color="var(--primary)" />
          <span>GLOBAL DATA FILTERS:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* City Filter */}
          <div>
            <select
              id="filter-city-select"
              className="select-field"
              value={filters.city || 'All'}
              onChange={(e) => handleChange('city', e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="All">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Room Type Filter */}
          <div>
            <select
              id="filter-room-select"
              className="select-field"
              value={filters.room_type || 'All'}
              onChange={(e) => handleChange('room_type', e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="All">All Room Types</option>
              {roomTypes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Ventilation Filter */}
          <div>
            <select
              id="filter-vent-select"
              className="select-field"
              value={filters.ventilation_type || 'All'}
              onChange={(e) => handleChange('ventilation_type', e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="All">All Ventilation</option>
              {ventTypes.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* IAQ Category Filter */}
          <div>
            <select
              id="filter-iaq-select"
              className="select-field"
              value={filters.iaq_category || 'All'}
              onChange={(e) => handleChange('iaq_category', e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="All">All IAQ Categories</option>
              {iaqCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Reset Filters */}
          <button
            id="reset-filters-btn"
            className="btn btn-outline"
            onClick={onReset}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <RotateCcw size={14} /> Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
