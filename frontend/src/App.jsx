import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

import Dashboard from './pages/Dashboard';
import DatasetPage from './pages/DatasetPage';
import PreprocessingPage from './pages/PreprocessingPage';
import VisualizationStudio from './pages/VisualizationStudio';
import UploadPage from './pages/UploadPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const res = await axios.get('/api/versions');
      const vers = res.data.versions || [];
      setVersions(vers);
      const activeId = res.data.current_active_version_id;
      const found = vers.find(v => v.version_id === activeId);
      setActiveVersion(found || vers[0] || null);
    } catch (err) {
      console.error("Error fetching version metadata:", err);
    }
  };

  const handleSelectVersion = async (versionId) => {
    try {
      const formData = new FormData();
      formData.append('version_id', versionId);
      await axios.post('/api/versions/select', formData);
      await fetchVersions();
    } catch (err) {
      console.error("Error selecting version from topbar:", err);
    }
  };

  const pageTitles = {
    'dashboard': 'Executive Indoor Air Quality Dashboard',
    'dataset': 'Dataset Explorer & Comparison Matrix',
    'data-quality-pipeline': 'Data Quality Profiling & Preprocessing Pipeline',
    'visualization-studio': 'Interactive Visualization Studio & Notebook Analytics',
    'insights-upload': 'Automated Insights, Dataset Upload & Lab Report'
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'dataset':
        return <DatasetPage />;
      case 'data-quality-pipeline':
        return <PreprocessingPage />;
      case 'visualization-studio':
        return <VisualizationStudio />;
      case 'insights-upload':
        return <UploadPage onVersionChange={fetchVersions} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-wrapper">
        <TopBar
          title={pageTitles[activeTab] || 'IAQ Analytics Platform'}
          activeVersion={activeVersion}
          versions={versions}
          onSelectVersion={handleSelectVersion}
          onRefresh={fetchVersions}
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
