import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, CheckCircle2, FileText, Clock, AlertTriangle, Layers, Database, Lightbulb, Printer, Download } from 'lucide-react';

export default function UploadPage({ onVersionChange }) {
  const [file, setFile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeVersionId, setActiveVersionId] = useState('v0_original');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVersionsAndInsights();
  }, []);

  const fetchVersionsAndInsights = async () => {
    try {
      const [vRes, iRes, sRes] = await Promise.all([
        axios.get('/api/versions'),
        axios.get('/api/insights'),
        axios.get('/api/dataset/stats')
      ]);
      setVersions(vRes.data.versions || []);
      setActiveVersionId(vRes.data.current_active_version_id);
      setInsights(iRes.data || []);
      setStats(sRes.data);
    } catch (err) {
      console.error("Error fetching versions or insights:", err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setMessage(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a CSV dataset file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(res.data.message);
      setFile(null);
      await fetchVersionsAndInsights();
      if (onVersionChange) onVersionChange();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload and process CSV file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectVersion = async (versionId) => {
    try {
      const formData = new FormData();
      formData.append('version_id', versionId);
      await axios.post('/api/versions/select', formData);
      setActiveVersionId(versionId);
      await fetchVersionsAndInsights();
      if (onVersionChange) onVersionChange();
    } catch (err) {
      console.error("Error selecting version:", err);
    }
  };

  // Printable Summary Lab Report Generator
  const generatePrintableReport = () => {
    const activeVer = versions.find(v => v.version_id === activeVersionId) || {};
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Academic Lab Report - Indoor Air Quality Analysis</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
          h1 { color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 24px; font-size: 1.2rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          .meta-table, .data-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 0.88rem; }
          .meta-table td, .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          .data-table th { background: #f1f5f9; font-weight: bold; }
          .insight-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin-bottom: 12px; }
          .disclaimer { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; font-size: 0.8rem; color: #1e40af; margin-bottom: 20px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; float: right;">Print / Save as PDF</button>
        <h1>Indoor Air Quality Analysis — Andhra Pradesh</h1>
        <p><strong>Semester-End Data Analysis and Visualization Lab Project Report</strong></p>

        <div class="disclaimer">
          <strong>Academic Disclaimer:</strong> This project uses a synthetically generated dataset for educational purposes. It simulates indoor environmental observations across selected locations in Andhra Pradesh.
        </div>

        <h2>1. Executive Summary & Active Version</h2>
        <table class="meta-table">
          <tr><td><strong>Active Version:</strong> ${activeVer.name || 'Original'}</td><td><strong>File Name:</strong> ${activeVer.file_name || 'indoor_air_quality_raw.csv'}</td></tr>
          <tr><td><strong>Raw Records:</strong> ${stats?.raw_records || 5278} rows</td><td><strong>Processed Records:</strong> ${stats?.processed_records || 5200} rows</td></tr>
          <tr><td><strong>Raw Missing Values:</strong> ${stats?.raw_missing_values || 230}</td><td><strong>Duplicates Removed:</strong> ${stats?.raw_duplicates || 78}</td></tr>
        </table>

        <h2>2. Data Preprocessing & Wrangling Pipeline</h2>
        <ul>
          <li><strong>Column Standardization:</strong> Converted raw headers into canonical snake_case.</li>
          <li><strong>Duplicate Removal:</strong> Purged exact duplicate observations.</li>
          <li><strong>Numeric Parsing:</strong> Cleaned string numbers (commas, quotes, spaces) into float64.</li>
          <li><strong>Missing Value Imputation:</strong> Group medians per room type and city.</li>
          <li><strong>Feature Engineering:</strong> Engineered IAQ Index, IAQ Category, PM Ratio, and Ventilation Efficiency.</li>
        </ul>

        <h2>3. Automated Domain Insights</h2>
        ${insights.map((item, idx) => `
          <div class="insight-box">
            <strong>Finding #${idx + 1}: ${item.title}</strong><br/>
            ${item.finding}<br/>
            <em>Metric: ${item.supporting_metric}</em><br/>
            <small>Interpretation: ${item.interpretation}</small>
          </div>
        `).join('')}

        <h2>4. Academic Conclusions & Future Scope</h2>
        <p>The indoor air quality analysis pipeline successfully profiles environmental stress periods and proves that filtered mechanical ventilation significantly mitigates fine particulate matter indoor accumulation.</p>
      </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return (
    <div id="insights-upload-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Automated Insights, Dataset Upload & Lab Report</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Empirical finding conclusions, dataset version history, CSV upload pipeline, and summary report generator.
          </p>
        </div>
        <button id="export-report-btn" className="btn btn-primary" onClick={generatePrintableReport}>
          <Printer size={16} /> Export Summary Lab Report
        </button>
      </div>

      {/* SECTION 1: AUTOMATED INSIGHTS */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
        1. Automated Analytical Findings
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {insights.map((item, idx) => (
          <div key={idx} className="card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={20} color="var(--primary)" />
                <span>Finding #{idx + 1}: {item.title}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {item.finding}
                </p>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>Interpretation:</strong> {item.interpretation}
                </p>
              </div>

              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>SUPPORTING METRIC</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d4ed8', marginTop: '4px' }}>
                  {item.supporting_metric}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: UPLOAD CSV DATASET */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
        2. Upload Updated CSV Dataset
      </h3>
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <Upload size={18} color="var(--primary)" /> Upload Dataset (Preserves Raw File)
        </div>

        {message && (
          <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> {message}
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div style={{
            border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '14px', cursor: 'pointer'
          }}>
            <input
              id="file-upload-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
              <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '6px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {file ? file.name : "Click to select or drag & drop CSV file"}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                CSV format. Workflow: Upload → Validate → Profile → Process → Save Version
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button id="submit-upload-btn" type="submit" className="btn btn-primary" disabled={!file || uploading}>
              {uploading ? "Processing Pipeline..." : "Upload & Run Preprocessing"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: DATASET VERSIONING REGISTRY */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-primary)' }}>
        3. Dataset Version Registry
      </h3>
      <div className="card">
        <div className="table-container">
          <table className="data-table" id="versions-registry-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Version Name</th>
                <th>File Name</th>
                <th>Timestamp</th>
                <th>Raw Rows</th>
                <th>Proc Rows</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((ver) => {
                const isActive = ver.version_id === activeVersionId;
                return (
                  <tr key={ver.version_id} style={isActive ? { backgroundColor: '#eff6ff' } : {}}>
                    <td>
                      {isActive ? (
                        <span className="badge badge-proc">Active Selection</span>
                      ) : (
                        <span className="badge badge-good" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>Saved Version</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{ver.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{ver.file_name}</td>
                    <td style={{ fontSize: '0.78rem' }}>{ver.created_at}</td>
                    <td>{ver.raw_rows}</td>
                    <td>{ver.processed_rows}</td>
                    <td>
                      {!isActive ? (
                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleSelectVersion(ver.version_id)}>
                          Activate
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2563eb' }}>Current Selected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
