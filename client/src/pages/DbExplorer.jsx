import React, { useState } from 'react';
import mockDatabase from '../data/mockDatabase';
import '../styles/dbexplorer.css';

export default function DbExplorer() {
  const tableNames = Object.keys(mockDatabase);
  const [selectedTable, setSelectedTable] = useState(tableNames[0] || 'courses');
  const [searchTerm, setSearchTerm] = useState('');

  const currentData = mockDatabase[selectedTable] || [];

  const filteredData = currentData.filter((row) => {
    if (!searchTerm) return true;
    return JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  return (
    <div className="dbe-root">
      <header className="dbe-header">
        <h1 className="dbe-title">
          <span className="dbe-title__icon">🗄️</span> SecureLearn Mock Database Explorer
        </h1>
        <p className="dbe-subtitle">
          Công cụ trực quan hóa toàn bộ Database Mock theo ERD của SecureLearn (Frontend Development Mode)
        </p>
      </header>

      <div className="dbe-layout">
        {/* Sidebar chứa danh sách bảng */}
        <aside className="dbe-sidebar">
          <p className="dbe-sidebar__label">Tables ({tableNames.length})</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {tableNames.map((table) => (
              <li key={table} style={{ marginBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTable(table);
                    setSearchTerm('');
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedTable === table ? '#1f6feb22' : 'transparent',
                    color: selectedTable === table ? '#58a6ff' : '#8b949e',
                    fontWeight: selectedTable === table ? '600' : 'normal',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{table}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: '#21262d',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      color: '#c9d1d9',
                    }}
                  >
                    {mockDatabase[table]?.length || 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Nội dung bảng */}
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#f0f6fc', margin: '0 0 4px' }}>
                TABLE: <code>{selectedTable}</code>
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                Tổng cộng {currentData.length} bản ghi {searchTerm && `(Lọc được ${filteredData.length})`}
              </span>
            </div>

            <input
              type="text"
              placeholder={`Tìm kiếm trong ${selectedTable}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#c9d1d9',
                padding: '6px 12px',
                fontSize: '0.85rem',
                width: '260px',
              }}
            />
          </div>

          {filteredData.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#8b949e',
                background: '#0d1117',
                borderRadius: '8px',
                border: '1px dashed #30363d',
              }}
            >
              Không tìm thấy dữ liệu phù hợp.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid #30363d',
                borderRadius: '8px',
                background: '#0d1117',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                }}
              >
                <thead>
                  <tr style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#58a6ff' }}>#</th>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          color: '#58a6ff',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #21262d',
                        background: idx % 2 === 0 ? 'transparent' : '#0e131a',
                      }}
                    >
                      <td style={{ padding: '8px 14px', color: '#6e7681' }}>{idx + 1}</td>
                      {columns.map((col) => {
                        const val = row[col];
                        let renderedVal = String(val);
                        if (val === null || val === undefined) {
                          renderedVal = <em style={{ color: '#6e7681' }}>null</em>;
                        } else if (typeof val === 'object') {
                          renderedVal = JSON.stringify(val);
                        } else if (typeof val === 'number') {
                          renderedVal = <span style={{ color: '#79c0ff' }}>{val.toLocaleString()}</span>;
                        } else if (typeof val === 'string' && val.startsWith('http')) {
                          renderedVal = (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#a5d6ff', textDecoration: 'underline' }}
                            >
                              {val.length > 35 ? val.slice(0, 35) + '...' : val}
                            </a>
                          );
                        }
                        return (
                          <td
                            key={col}
                            style={{
                              padding: '8px 14px',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={typeof val === 'string' ? val : ''}
                          >
                            {renderedVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
