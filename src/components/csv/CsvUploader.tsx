'use client';

import { useState } from 'react';
import { CsvUploadResult } from '@/lib/models/CsvApplication';

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [applicationName, setApplicationName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CsvUploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !applicationName.trim()) {
      alert('Please select a CSV file and enter an application name');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicationName', applicationName.trim());

      const response = await fetch('/api/csv-upload', {
        method: 'POST',
        body: formData,
      });

      const data: CsvUploadResult = await response.json();
      setResult(data);

      if (data.success) {
        setFile(null);
        setApplicationName('');
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">CSV File Upload</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="applicationName" className="block text-sm font-medium text-gray-700 mb-2">
            Application Name
          </label>
          <input
            type="text"
            id="applicationName"
            value={applicationName}
            onChange={(e) => setApplicationName(e.target.value)}
            placeholder="Enter application name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
            CSV File
          </label>
          <input
            type="file"
            id="csvFile"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || !file || !applicationName.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className={`text-lg font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.success ? 'Upload Successful' : 'Upload Failed'}
          </h3>
          <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
          
          {result.success && (
            <div className="mt-3 space-y-1 text-sm text-green-700">
              <p>Application ID: {result.applicationId}</p>
              <p>Total Records: {result.totalRecords}</p>
              <p>Processed Records: {result.processedRecords}</p>
              {result.failedRecords! > 0 && (
                <p>Failed Records: {result.failedRecords}</p>
              )}
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-800">Errors (showing first 10):</h4>
              <div className="mt-2 space-y-1">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600">
                    Row {error.row}: {error.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}