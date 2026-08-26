import React, { useState, useEffect } from 'react';

const SemesterPaymentPage = () => {
  const [semesterDetails, setSemesterDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // In a real app, fetch the student's current semester and subjects
    setTimeout(() => {
      setSemesterDetails({
        semesterName: 'First Semester 2026',
        programName: 'M.Div. Regular',
        subjectsCount: 5,
        feePerSubject: 6000,
        totalFee: 30000,
        dueDate: '2026-06-15',
        status: 'UNPAID'
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handlePayment = () => {
    setProcessing(true);
    // Call backend to generate payment link and redirect
    setTimeout(() => {
      alert('Redirecting to payment gateway for Rs. ' + semesterDetails.totalFee);
      setProcessing(false);
    }, 1500);
  };

  if (loading) return <div className="p-6">Loading fee details...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Semester Fee Payment</h1>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-xl font-semibold">{semesterDetails.semesterName}</h2>
          <p className="text-blue-100 mt-1">{semesterDetails.programName}</p>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <span className="text-gray-600 font-medium">Status</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${semesterDetails.status === 'UNPAID' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {semesterDetails.status}
            </span>
          </div>
          
          <div className="space-y-3 mb-8">
            <div className="flex justify-between">
              <span className="text-gray-600">Enrolled Subjects</span>
              <span className="font-semibold text-gray-800">{semesterDetails.subjectsCount} Subjects</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fee per Subject</span>
              <span className="font-semibold text-gray-800">Rs. {semesterDetails.feePerSubject.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-200 border-dashed">
              <span className="text-xl font-bold text-gray-800">Total Semester Fee</span>
              <span className="text-2xl font-bold text-blue-600">Rs. {semesterDetails.totalFee.toLocaleString()}</span>
            </div>
          </div>
          
          {semesterDetails.status === 'UNPAID' && (
            <button 
              onClick={handlePayment} 
              disabled={processing}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition shadow-md disabled:bg-gray-400"
            >
              {processing ? 'Processing...' : `Pay Rs. ${semesterDetails.totalFee.toLocaleString()} Now`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemesterPaymentPage;
