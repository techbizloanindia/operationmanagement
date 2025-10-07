import CsvUploader from '@/components/csv/CsvUploader';

export default function CsvUploadPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          CSV File Upload System
        </h1>
        <CsvUploader />
      </div>
    </div>
  );
}