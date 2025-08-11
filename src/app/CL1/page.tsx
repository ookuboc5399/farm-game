'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CL1Page() {
  const params = useParams();
  const employeeName = 'CL1'; // Hardcoded for this specific page

  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('08'); // August
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<string>('2'); // Default to week 2

  const weekToFileSuffixMap: { [key: string]: string } = {
    '1': '_1.pdf',
    '2': '_2.pdf',
    '3': '_3.pdf',
    '4': '_4.pdf',
    '5': '_5.pdf',
    // Add more as needed
  };

  const currentPdfPath = useMemo(() => {
    const suffix = weekToFileSuffixMap[selectedWeekNumber];
    if (!suffix) return null;
    return `/${employeeName}/${selectedYear}${selectedMonth}${suffix}`;
  }, [employeeName, selectedYear, selectedMonth, selectedWeekNumber]);

  const years = Array.from({ length: 5 }, (_, i) => (2024 + i).toString()); // 2024 to 2028
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')); // 01 to 12
  const weekNumbers = Array.from({ length: 5 }, (_, i) => (i + 1).toString()); // 1 to 5

  return (
    <main
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col justify-start p-4 md:p-6"
      style={{ backgroundImage: "url('/0811.png')" }}
    >
      {/* Header */}
      <header className="relative w-full h-24 text-white z-20">
        {/* Top Left */}
        <div className="absolute top-0 left-0 flex items-center gap-x-4">
            <Link href="/" className="bg-black/60 p-3 rounded-lg text-sm text-blue-300 hover:underline cursor-pointer">
              ← 畑をさがす
            </Link>
            {/* Date Selection Dropdowns */}
            <div className="flex gap-x-2 bg-black/60 p-2 rounded-lg">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-white text-sm cursor-pointer outline-none"
              >
                {years.map(year => <option key={year} value={year}>{year}年</option>)}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white text-sm cursor-pointer outline-none"
              >
                {months.map(month => <option key={month} value={month}>{parseInt(month)}月</option>)}
              </select>
              <select
                value={selectedWeekNumber}
                onChange={(e) => setSelectedWeekNumber(e.target.value)}
                className="bg-transparent text-white text-sm cursor-pointer outline-none"
              >
                {weekNumbers.map(weekNum => <option key={weekNum} value={weekNum}>第{weekNum}週</option>)}
              </select>
            </div>
        </div>

        {/* Top Center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black/60 p-3 rounded-lg text-center">
          <h1 className="text-xl md:text-3xl font-bold" style={{ textShadow: '2px 2px 4px #000' }}>
            {employeeName} の資料
          </h1>
        </div>
      </header>

      {/* PDF Viewer Section */}
      {currentPdfPath && (
        <div className="relative z-10 w-full max-w-7xl mx-auto mt-8 bg-white rounded-lg shadow-xl overflow-hidden" style={{ height: '80vh' }}>
          <iframe src={currentPdfPath} className="w-full h-full" frameBorder="0"></iframe>
        </div>
      )}
    </main>
  );
}