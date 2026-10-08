import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Sliders, 
  PieChart, 
  Lightbulb, 
  Wind
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dataset', label: 'Dataset Explorer', icon: Database },
    { id: 'data-quality-pipeline', label: 'Data Quality & Pipeline', icon: Sliders },
    { id: 'visualization-studio', label: 'Visualization Studio', icon: PieChart },
    { id: 'insights-upload', label: 'Insights & Upload', icon: Lightbulb }
  ];

  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Wind size={22} color="#3b82f6" />
          <span>IAQ ANALYTICS</span>
        </div>
        <div className="sidebar-sub">Andhra Pradesh Indoor Air</div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div>Semester-End DAV Project</div>
        <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '2px' }}>FastAPI + React</div>
      </div>
    </aside>
  );
}
