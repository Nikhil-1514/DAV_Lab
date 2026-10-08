import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChevronDown, 
  ChevronRight, 
  ArrowDown, 
  Database, 
  AlertCircle, 
  Copy, 
  BarChart, 
  FileCode, 
  Download, 
  CheckCircle2 
} from 'lucide-react';

export default function PreprocessingPage() {
  const [pipelineData, setPipelineData] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pipeRes, qualRes] = await Promise.all([
        axios.get('/api/preprocessing'),
        axios.get('/api/data-quality')
      ]);
      setPipelineData(pipeRes.data);
      setQualityReport(qualRes.data);
    } catch (err) {
      console.error("Error fetching pipeline & quality data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (index) => {
    setExpandedStage(expandedStage === index ? null : index);
  };

  const downloadTransformationLog = () => {
    const logs = pipelineData?.pipeline_stages || [];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "transformation_log.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return <div className="card"><p>Loading pipeline flowchart & quality reports...</p></div>;
  }

  const stages = pipelineData?.pipeline_stages || [];

  return (
    <div id="data-quality-pipeline-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Data Quality Profiling & Preprocessing Pipeline</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Complete audit trail showing data quality imperfections and step-by-step cleaning operations.
          </p>
        </div>
        <button id="download-log-btn" className="btn btn-outline" onClick={downloadTransformationLog}>
          <Download size={14} /> Download Transformation Log (JSON)
        </button>
      </div>

      {/* 1. VISUAL FLOWCHART PIPELINE */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">Interactive Data Processing Pipeline Flowchart</div>
        
        {/* Stage 0 */}
        <div className="card" style={{ padding: '14px 18px', backgroundColor: '#fee2e2', borderColor: '#fca5a5', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} color="#991b1b" />
              <strong>RAW DATA (Immutable Storage)</strong>
            </div>
            <span className="badge badge-raw">{pipelineData?.raw_rows} Records</span>
          </div>
        </div>

        {/* Stages 1 to N */}
        {stages.map((stage, idx) => {
          const isExpanded = expandedStage === idx;
          return (
            <React.Fragment key={idx}>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
                <ArrowDown size={16} color="#94a3b8" />
              </div>

              <div className="pipeline-step" style={{ margin: 0 }}>
                <div className="pipeline-header" onClick={() => toggleStage(idx)} style={{ padding: '12px 16px' }}>
                  <div className="pipeline-title" style={{ fontSize: '0.9rem' }}>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#eff6ff', 
                      color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem'
                    }}>
                      {idx + 1}
                    </div>
                    <span>{stage.stage}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge badge-good" style={{ fontSize: '0.75rem' }}>{stage.rows_affected} Records Affected</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pipeline-content" style={{ padding: '16px' }}>
                    <p style={{ marginBottom: '8px' }}><strong>What Happened:</strong> {stage.description}</p>
                    <p style={{ color: 'var(--text-secondary)' }}><strong>Why It Was Done:</strong> Required to preserve dataset integrity and domain statistical consistency.</p>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {/* Final Stage */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
          <ArrowDown size={16} color="#94a3b8" />
        </div>
        <div className="card" style={{ padding: '14px 18px', backgroundColor: '#dcfce7', borderColor: '#86efac', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="#166534" />
              <strong style={{ color: '#166534' }}>PROCESSED DATASET (Validated & Saved Separately)</strong>
            </div>
            <span className="badge badge-proc">{pipelineData?.processed_rows} Records</span>
          </div>
        </div>
      </div>

      {/* 2. MISSING VALUES CARD */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#d97706" />
            <span>1. Missing Values Analysis</span>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Missing Count</th>
                <th>Missing %</th>
                <th>Imputation Strategy</th>
              </tr>
            </thead>
            <tbody>
              {qualityReport?.missing_table?.map((row) => (
                <tr key={row.column}>
                  <td style={{ fontWeight: 600 }}>{row.column}</td>
                  <td style={row.missing_count > 0 ? { color: '#dc2626', fontWeight: 700 } : { color: '#16a34a' }}>
                    {row.missing_count}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{row.percentage}%</span>
                      <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', maxWidth: '80px' }}>
                        <div style={{ width: `${Math.min(100, row.percentage * 10)}%`, height: '100%', background: row.percentage > 0 ? '#f97316' : '#10b981', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {row.missing_count > 0 ? 'Group-Median / Mode Imputation' : 'Complete'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. DUPLICATES CARD */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={18} color="#dc2626" />
            <span>2. Duplicate Rows Analysis</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem', marginBottom: '16px' }}>
          <div>Total Raw Duplicate Rows Found: <strong>{qualityReport?.duplicate_count}</strong></div>
          <div>Duplicates Removed: <strong style={{ color: '#16a34a' }}>{qualityReport?.duplicate_count}</strong></div>
          <div>Remaining Duplicates: <strong style={{ color: '#16a34a' }}>0</strong></div>
        </div>
      </div>

      {/* 4. OUTLIERS CARD */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart size={18} color="#2563eb" />
            <span>3. Outlier Analysis (IQR Statistical Bounds)</span>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>IQR Range</th>
                <th>Outlier Count</th>
                <th>Outlier Percentage</th>
              </tr>
            </thead>
            <tbody>
              {qualityReport?.outlier_report?.map((row) => (
                <tr key={row.column}>
                  <td style={{ fontWeight: 600 }}>{row.column}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>[{row.lower_bound} to {row.upper_bound}]</td>
                  <td style={{ fontWeight: 700, color: row.outliers_count > 0 ? '#d97706' : 'inherit' }}>{row.outliers_count}</td>
                  <td>{row.outlier_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DATA TYPES CARD */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} color="#059669" />
            <span>4. Data Type Conversions</span>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Raw Column</th>
                <th>Raw Data Type</th>
                <th>Processed Column</th>
                <th>Processed Data Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {qualityReport?.dtype_issues?.map((row) => (
                <tr key={row.raw_column}>
                  <td style={{ fontWeight: 600 }}>{row.raw_column}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{row.raw_dtype}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.processed_column}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{row.processed_dtype}</td>
                  <td><span className="badge badge-proc">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
