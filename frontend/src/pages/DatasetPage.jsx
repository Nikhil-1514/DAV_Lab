import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, Eye, Database, CheckCircle, GitCompare } from 'lucide-react';

export default function DatasetPage() {
  const [activeTab, setActiveTab] = useState('raw'); // 'raw', 'processed', or 'comparison'
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 25, total_records: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Comparison data state
  const [compData, setCompData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showColMenu, setShowColMenu] = useState(false);

  useEffect(() => {
    if (activeTab === 'comparison') {
      fetchComparisonData();
    } else {
      fetchTableData(1);
    }
  }, [activeTab, search, sortBy, sortOrder, pagination.page_size]);

  const fetchTableData = async (targetPage = 1) => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'raw' ? '/api/dataset/raw' : '/api/dataset/processed';
      const params = {
        page: targetPage,
        page_size: pagination.page_size,
        search: search || undefined,
        sort_by: sortBy || undefined,
        sort_order: sortOrder,
      };

      const res = await axios.get(endpoint, { params });
      setData(res.data.data);
      setPagination(res.data.pagination);
      setColumns(res.data.columns);
      if (visibleColumns.length === 0 || visibleColumns.length !== res.data.columns.length) {
        setVisibleColumns(res.data.columns);
      }
    } catch (err) {
      console.error("Error fetching dataset table:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/comparison');
      setCompData(res.data);
    } catch (err) {
      console.error("Error fetching comparison data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (col) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length > 2) {
        setVisibleColumns(visibleColumns.filter(c => c !== col));
      }
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const matrix = compData?.dataset_level?.matrix || [];

  return (
    <div id="dataset-explorer-page">
      {/* Top Comparison Matrix Banner */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <GitCompare size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Raw vs. Processed Empirical Comparison Matrix</h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th style={{ textAlign: 'right' }}>Raw Dataset</th>
                <th style={{ textAlign: 'right' }}>Processed Dataset</th>
                <th style={{ textAlign: 'right' }}>Calculated Difference</th>
              </tr>
            </thead>
            <tbody>
              {matrix.length > 0 ? (
                matrix.map((row) => (
                  <tr key={row.metric}>
                    <td style={{ fontWeight: 600 }}>{row.metric}</td>
                    <td style={{ textAlign: 'right' }}>{row.raw?.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{row.processed?.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.difference !== 0 ? '#dc2626' : '#64748b' }}>
                      {row.difference > 0 ? `+${row.difference}` : row.difference}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>Calculating metrics...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="tabs-container">
        <button
          id="tab-btn-raw"
          className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => { setActiveTab('raw'); setVisibleColumns([]); }}
        >
          Raw Dataset View
        </button>
        <button
          id="tab-btn-processed"
          className={`tab-button ${activeTab === 'processed' ? 'active' : ''}`}
          onClick={() => { setActiveTab('processed'); setVisibleColumns([]); }}
        >
          Processed Dataset View
        </button>
        <button
          id="tab-btn-comparison"
          className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Detailed Comparison & Log
        </button>
      </div>

      {/* Tab 1 & Tab 2: Raw / Processed Dataset View */}
      {activeTab !== 'comparison' && (
        <>
          <div className="card" style={{ padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={20} color={activeTab === 'raw' ? '#dc2626' : '#16a34a'} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {activeTab === 'raw' ? 'Raw Environmental Measurements' : 'Cleaned & Feature-Engineered Dataset'}
                  </h4>
                  {activeTab === 'raw' ? (
                    <span className="badge badge-raw">ORIGINAL / IMMUTABLE RAW DATA</span>
                  ) : (
                    <span className="badge badge-proc">CLEANED / PROCESSED DATA</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {pagination.total_records?.toLocaleString()} Records Total
            </div>
          </div>

          {/* Table Controls */}
          <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  id="dataset-search-input"
                  type="text"
                  className="input-field"
                  placeholder="Search records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '32px', width: '100%' }}
                />
              </div>

              {/* Column selector */}
              <div style={{ position: 'relative' }}>
                <button
                  id="col-visibility-toggle"
                  className="btn btn-outline"
                  onClick={() => setShowColMenu(!showColMenu)}
                >
                  <Eye size={14} />
                  <span>Columns ({visibleColumns.length}/{columns.length})</span>
                </button>
                {showColMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '40px', background: '#ffffff', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, width: '220px', maxHeight: '250px', overflowY: 'auto'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>TOGGLE VISIBILITY</div>
                    {columns.map((col) => (
                      <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', marginBottom: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col)}
                          onChange={() => toggleColumn(col)}
                        />
                        <span>{col}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.filter(c => visibleColumns.includes(c)).map((col) => (
                    <th key={col} onClick={() => handleSort(col)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{col}</span>
                        {sortBy === col && (<span>{sortOrder === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '24px' }}>Loading dataset...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '24px' }}>No records found.</td></tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={row.Record_ID || row.record_id || idx}>
                      {columns.filter(c => visibleColumns.includes(c)).map((col) => {
                        const val = row[col];
                        const isMissing = val === null || val === undefined;
                        return (
                          <td key={col} style={isMissing ? { color: '#dc2626', backgroundColor: '#fef2f2', fontWeight: 600 } : {}}>
                            {isMissing ? 'NaN / Null' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing page {pagination.page} of {pagination.total_pages} ({pagination.total_records?.toLocaleString()} total rows)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <select
                className="select-field"
                value={pagination.page_size}
                onChange={(e) => setPagination({ ...pagination, page_size: Number(e.target.value) })}
              >
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <button
                className="btn btn-outline"
                disabled={pagination.page <= 1}
                onClick={() => fetchTableData(pagination.page - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>

              <button
                className="btn btn-outline"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchTableData(pagination.page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tab 3: Detailed Comparison & Transformation Log */}
      {activeTab === 'comparison' && (
        <div className="card">
          <div className="card-title">Column-Level Empirical Matrix</div>
          <p className="card-subtitle">
            Detailed breakdown comparing Data Types, Missing Values, Unique Counts, and Ranges before vs after preprocessing.
          </p>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Raw Column</th>
                  <th>Raw Type</th>
                  <th>Raw Missing</th>
                  <th>Raw Unique</th>
                  <th>Processed Column</th>
                  <th>Proc Type</th>
                  <th>Proc Missing</th>
                  <th>Proc Unique</th>
                </tr>
              </thead>
              <tbody>
                {compData?.column_level?.map((col, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{col.raw_column}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{col.raw_dtype}</td>
                    <td style={{ color: col.raw_missing > 0 ? '#dc2626' : 'inherit', fontWeight: col.raw_missing > 0 ? 700 : 400 }}>{col.raw_missing}</td>
                    <td>{col.raw_unique}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{col.proc_column}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{col.proc_dtype}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{col.proc_missing}</td>
                    <td>{col.proc_unique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
