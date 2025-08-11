"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- DATA INTERFACES ---
interface FarmEntry {
  name: string;
  client: string;
  date: string; // This is now the latest contact date (I, J, K)
  content: string;
  lastConfirmedDate: string; // From column N
}

interface ClientData {
  count: number;
  latestContactDate: string;
  lastConfirmedDate: string;
}

interface ClientGrowthData {
  [clientName: string]: ClientData;
}

interface PlantData {
  clientName: string;
  data: ClientData;
  x?: number; // percentage (optional)
  y?: number; // percentage (optional)
}

// --- UTILITY FUNCTIONS ---

const getClientBaseEmoji = (clientName: string) => {
  const produce = [
    '🥕', '🥬', '🍅', '🍆', '🌽', '🥦', '🥔', '🥒', '🌶️', '🫑',
    '🍓', '🧅', '🧄', '🍉', '🍇', '🍊', '🍋', '🍌', '🍍', '🥭',
    '🍎', '🍐', '🍑', '🍒', '🥝', '🥥', '🥑', '🫛', '🫒', '🍄'
  ];
  let hash = 0;
  for (let i = 0; i < clientName.length; i++) {
    hash = (hash << 5) - hash + clientName.charCodeAt(i);
    hash |= 0;
  }
  return produce[Math.abs(hash) % produce.length];
};

const getGrowthDisplay = (baseEmoji: string, count: number) => {
  if (count <= 2) return { emoji: '🌱', stage: 1 };
  if (count <= 5) return { emoji: '🌿', stage: 2 };
  if (count <= 9) return { emoji: baseEmoji, stage: 3 };
  return { emoji: `✨${baseEmoji}✨`, stage: 4 };
};

const useClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  return time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

// --- UI COMPONENTS ---

const GrowthLegend = () => (
  <div className="bg-black/60 p-3 rounded-lg text-white text-sm">
    <h3 className="font-bold mb-2 border-b border-white/50">成長の凡例</h3>
    <ul className="space-y-1">
      <li><span className="inline-block w-6">🌱</span>: 1-2回</li>
      <li><span className="inline-block w-6">🌿</span>: 3-5回</li>
      <li><span className="inline-block w-6">🥕</span>: 6-9回 (実る)</li>
      <li><span className="inline-block w-6">✨</span>: 10回+ (収穫間近!)</li>
    </ul>
  </div>
);

const Plant = ({ p_data }: { p_data: PlantData }) => {
  console.log("Plant data:", p_data);
  const baseEmoji = getClientBaseEmoji(p_data.clientName);
  const { emoji } = getGrowthDisplay(baseEmoji, p_data.data.count);

  // Determine color for latest contact date
  const latestDateStr = p_data.data.latestContactDate;
  let latestContactColor = 'text-blue-300';
  if (latestDateStr) {
    const parsed = new Date(latestDateStr.replace(/\//g, '-'));
    if (!isNaN(parsed.getTime())) {
      const diffDays = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 28) {
        latestContactColor = 'text-red-400';
      } else if (diffDays >= 14) {
        latestContactColor = 'text-yellow-300';
      }
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-2 cursor-pointer group bg-black/40 rounded-lg shadow-md hover:bg-black/50 transition-colors"
      title={`${p_data.clientName}: ${p_data.data.count}回 (最終更新: ${p_data.data.latestContactDate}) (最終確認: ${p_data.data.lastConfirmedDate})`}
    >
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-yellow-900/70 shadow-lg">
        <div className="text-4xl drop-shadow-lg">
          {emoji}
        </div>
      </div>
      <div className="mt-1 text-center text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-full whitespace-nowrap">
        {p_data.clientName}
      </div>
      <div className="mt-1 text-center text-sm text-white bg-black/50 px-2 py-1 rounded font-semibold leading-snug">
        <div>
          最終コンタクト日: <span className={`${latestContactColor}`}>{p_data.data.latestContactDate || '-'}</span>
        </div>
        <div>最終確認日: {p_data.data.lastConfirmedDate || '-'}</div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

export default function EmployeePage() {
  const params = useParams();
  const employeeName = params.employeeName ? decodeURIComponent(params.employeeName as string) : '';
  const [clientGrowthData, setClientGrowthData] = useState<ClientGrowthData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTime = useClock();
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('08'); // August
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<string>('2'); // Default to week 2
  const [latestOverallDate, setLatestOverallDate] = useState<string | null>(null);
  const [latestOverallConfirmedDate, setLatestOverallConfirmedDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/employee/${employeeName}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch data for ${employeeName}`);
        }
        const { data }: { data: FarmEntry[] } = await res.json();

        let maxDate: Date | null = null;
        let maxDateString: string | null = null;
        let maxConfirmedDate: Date | null = null;
        let maxConfirmedDateString: string | null = null;

        const aggregatedData: ClientGrowthData = {};
        data.forEach(entry => {
          if (!aggregatedData[entry.client]) {
            aggregatedData[entry.client] = { count: 0, latestContactDate: '', lastConfirmedDate: '' };
          }
          aggregatedData[entry.client].count++;

          // Update per-client latest contact date
          const currentClientLatest = aggregatedData[entry.client].latestContactDate;
          const parsedEntryDate = new Date((entry.date || '').replace(/\//g, '-'));
          if (!currentClientLatest || (!isNaN(parsedEntryDate.getTime()) && parsedEntryDate > new Date(currentClientLatest.replace(/\//g, '-')))) {
            aggregatedData[entry.client].latestContactDate = entry.date;
          }

          // Update per-client latest confirmed date
          const entryConfirmed = entry.lastConfirmedDate || '';
          if (entryConfirmed) {
            const currentClientConfirmed = aggregatedData[entry.client].lastConfirmedDate;
            const parsedConfirmed = new Date(entryConfirmed.replace(/\//g, '-'));
            if (!currentClientConfirmed || (!isNaN(parsedConfirmed.getTime()) && parsedConfirmed > new Date(currentClientConfirmed.replace(/\//g, '-')))) {
              aggregatedData[entry.client].lastConfirmedDate = entryConfirmed;
            }
          }

          // Find the overall latest contact date
          const entryDateString = entry.date || '';
          const entryDate = new Date(entryDateString.replace(/\//g, '-'));
          if (!isNaN(entryDate.getTime())) {
            if (!maxDate || entryDate > maxDate) {
              maxDate = entryDate;
              maxDateString = entry.date;
            }
          }

          // Find the overall latest confirmed date
          const entryConfirmedDateString = entry.lastConfirmedDate || '';
          const entryConfirmedDate = new Date(entryConfirmedDateString.replace(/\//g, '-'));
          if (!isNaN(entryConfirmedDate.getTime())) {
            if (!maxConfirmedDate || entryConfirmedDate > maxConfirmedDate) {
              maxConfirmedDate = entryConfirmedDate;
              maxConfirmedDateString = entry.lastConfirmedDate;
            }
          }
        });
        setClientGrowthData(aggregatedData);
        setLatestOverallDate(maxDateString);
        setLatestOverallConfirmedDate(maxConfirmedDateString);
        console.log("Frontend - latestOverallDate:", maxDateString);
        console.log("Frontend - latestOverallConfirmedDate:", maxConfirmedDateString);
      } catch (error) {
        console.error("Error fetching employee data:", error);
        const message = error instanceof Error ? error.message : "データの読み込みに失敗しました。";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (employeeName) {
      fetchData();
    }
  }, [employeeName]);

  const plantPositions = useMemo(() => {
    const positions: PlantData[] = [];
    const clients = Object.entries(clientGrowthData);

    for (const [clientName, data] of clients) {
      positions.push({ clientName, data });
    }
    return positions;
  }, [clientGrowthData]);

  const weekToFileSuffixMap: { [key: string]: string } = {
    '1': '_1.pdf',
    '2': '_2.pdf',
    '3': '_3.pdf',
    '4': '_4.pdf',
    '5': '_5.pdf',
  };

  const currentPdfPath = useMemo(() => {
    const suffix = weekToFileSuffixMap[selectedWeekNumber];
    if (!suffix) return null;
    return `/${employeeName}/${selectedYear}${selectedMonth}${suffix}`;
  }, [employeeName, selectedYear, selectedMonth, selectedWeekNumber]);

  const totalContributions = Object.values(clientGrowthData).reduce((sum, data) => sum + data.count, 0);

  const years = Array.from({ length: 5 }, (_, i) => (2024 + i).toString()); // 2024 to 2028
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')); // 01 to 12
  const weekNumbers = Array.from({ length: 5 }, (_, i) => (i + 1).toString()); // 1 to 5

  return (
    <main
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col justify-start p-4 md:p-6"
      style={{ backgroundImage: "url('/0811.png')" }}
    >
      {/* Header now acts as a container for absolutely positioned UI elements */}
      <header className="relative w-full h-24 text-white z-20">
        {/* Top Left */}
        <div className="absolute top-0 left-0 flex items-center gap-x-4">
          <Link href="/" className="bg-black/60 p-3 rounded-lg text-sm text-blue-300 hover:underline cursor-pointer">
            ← 畑をさがす
          </Link>

        </div>

        {/* Top Center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black/60 p-3 rounded-lg text-center">
          <h1 className="text-xl md:text-3xl font-bold" style={{ textShadow: '2px 2px 4px #000' }}>
            {employeeName} の畑
          </h1>
          <p className="text-xs md:text-sm text-gray-300">
            総貢献回数: {totalContributions}回
          </p>
        </div>

        {/* Top Right */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-y-2">
          <div className="bg-black/60 p-3 rounded-lg">
            <p className="text-xl md:text-3xl font-mono font-bold" style={{ textShadow: '2px 2px 4px #000' }}>
              {currentTime}
            </p>
          </div>
          <GrowthLegend />
        </div>
      </header>

      <div className="absolute inset-0 flex items-center justify-center z-10">
        {loading && <p className="text-white bg-black/50 p-4 rounded-lg">畑を読み込んでいます...</p>}
        {error && <p className="text-red-300 bg-black/50 p-4 rounded-lg">エラー: {error}</p>}
      </div>

      {/* Plant container (field of vegetables) */}
      <div className="relative w-full z-0 mt-28 pb-16 px-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {!loading && !error && plantPositions.length > 0 && (
          <>
            {plantPositions.map((plantData) => (
              <Plant key={plantData.clientName} p_data={plantData} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}