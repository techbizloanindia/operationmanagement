'use client';

import React, { useState } from 'react';

const CSVDiagnostic = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const runDiagnostic = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/csv-diagnostic', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: `Network error: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">🔍 CSV Upload Diagnostic Tool</h2>
      
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Upload Your CSV File</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {file && (
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Run Diagnostic'}
          </button>
        )}
      </div>

      {result && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {result.success ? '✅ Diagnostic Results' : '❌ Diagnostic Failed'}
          </h3>
          
          {result.success ? (
            <div className="space-y-6">
              {/* File Info */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">📄 File Information</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p><strong>Name:</strong> {result.diagnostic.fileName}</p>
                  <p><strong>Size:</strong> {(result.diagnostic.fileSize / 1024).toFixed(2)} KB</p>
                  <p><strong>Total Lines:</strong> {result.diagnostic.totalLines}</p>
                </div>
              </div>

              {/* Column Analysis */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">📋 Column Analysis</h4>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                  <p><strong>Original Headers:</strong></p>
                  <code className="block bg-white p-2 rounded text-xs">
                    {JSON.stringify(result.diagnostic.header.original, null, 2)}
                  </code>
                  <p><strong>Required Fields Found:</strong> {result.diagnostic.header.requiredFieldsFound.join(', ') || 'None'}</p>
                </div>
              </div>

              {/* Sample Data */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">📊 Sample Data (First 5 rows)</h4>
                <div className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        {result.diagnostic.header.original.map((header: string, index: number) => (
                          <th key={index} className="border p-1 bg-blue-100">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.diagnostic.sampleData.map((row: string[], index: number) => (
                        <tr key={index}>
                          {row.map((cell: string, cellIndex: number) => (
                            <td key={cellIndex} className="border p-1">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TaskName Analysis */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🎯 TaskName Sanction Analysis</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p><strong>TaskName Column:</strong> {result.diagnostic.taskNameAnalysis.columnName}</p>
                  <p><strong>Column Index:</strong> {result.diagnostic.taskNameAnalysis.columnIndex}</p>
                  
                  {result.diagnostic.taskNameAnalysis.sampleValues.length > 0 && (
                    <div className="mt-3">
                      <p><strong>Sample TaskName Values:</strong></p>
                      <div className="space-y-1 mt-2">
                        {result.diagnostic.taskNameAnalysis.sampleValues.map((item: any, index: number) => (
                          <div key={index} className={`p-2 rounded text-xs ${item.isSanctioned ? 'bg-green-100' : 'bg-red-100'}`}>
                            <strong>Row {item.row}:</strong> "{item.taskName}" 
                            {item.isSanctioned ? (
                              <span className="text-green-700 ml-2">✅ SANCTIONED (matches: {item.matchedKeywords.join(', ')})</span>
                            ) : (
                              <span className="text-red-700 ml-2">❌ NOT SANCTIONED</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">💡 Recommendations</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {result.diagnostic.recommendations.map((rec: string, index: number) => (
                    <p key={index} className="mb-1">{rec}</p>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🔍 Supported Sanction Keywords</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="text-xs">{result.diagnostic.sanctionKeywords.join(', ')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <p><strong>Error:</strong> {result.error}</p>
              {result.stack && (
                <pre className="mt-4 text-xs bg-red-50 p-3 rounded overflow-auto">
                  {result.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVDiagnostic;
