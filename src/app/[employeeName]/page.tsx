'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- DATA INTERFACES ---
interface FarmEntry {
  name: string;
  client: string;
  date: string;
  content: string;
}

interface ClientData {
  count: number;
  lastContact: string;
}

interface ClientGrowthData {
  [clientName: string]: ClientData;
}

interface PlantData {
  clientName: string;
  data: ClientData;
  x: number; // percentage
  y: number; // percentage
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
  const baseEmoji = getClientBaseEmoji(p_data.clientName);
  const { emoji } = getGrowthDisplay(baseEmoji, p_data.data.count);

  return (
    <div 
      className="absolute flex flex-col items-center justify-center p-1 cursor-pointer group"
      style={{ top: `${p_data.y}%`, left: `${p_data.x}%`, transform: 'translate(-50%, -50%)' }}
      title={`${p_data.clientName}: ${p_data.data.count}回 (最新: ${p_data.data.lastContact})`}
    >
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-yellow-900/70 shadow-lg">
        <div className="text-4xl drop-shadow-lg">
          {emoji}
        </div>
      </div>
      <div className="mt-1 text-center text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-full whitespace-nowrap">
        {p_data.clientName}
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

  const plantPositions = useMemo(() => {
    const positions: PlantData[] = [];
    const clients = Object.entries(clientGrowthData);
    const minDistance = 12;

    for (const [clientName, data] of clients) {
      let x, y, hasCollision;
      let attempts = 0;
      do {
        x = Math.random() * 90 + 5;
        y = Math.random() * 50 + 45;
        hasCollision = false;
        for (const pos of positions) {
          const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2) * 2);
          if (distance < minDistance) {
            hasCollision = true;
            break;
          }
        }
        attempts++;
      } while (hasCollision && attempts < 50);
      positions.push({ clientName, data, x, y });
    }
    return positions;
  }, [clientGrowthData]);

  useEffect(() => {
    if (!employeeName) return;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/sheets');
        if (!res.ok) throw new Error((await res.json()).details || 'Failed to fetch data');
        
        const { data }: { data: FarmEntry[] } = await res.json();
        const employeeEntries = data.filter(entry => entry.name === employeeName);

        const growthData: ClientGrowthData = {};
        for (const entry of employeeEntries) {
          if (entry.client && entry.date) {
            const existing = growthData[entry.client];
            if (!existing) {
              growthData[entry.client] = { count: 1, lastContact: entry.date };
            } else {
              const isNewer = new Date(entry.date) > new Date(existing.lastContact);
              growthData[entry.client] = {
                count: existing.count + 1,
                lastContact: isNewer ? entry.date : existing.lastContact,
              };
            }
          }
        }
        setClientGrowthData(growthData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeName]);

  const totalContributions = Object.values(clientGrowthData).reduce((sum, data) => sum + data.count, 0);

  return (
    <main 
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col justify-start p-4 md:p-6"
      style={{ backgroundImage: "url('/0811.png')" }}
    >
      {/* Header now acts as a container for absolutely positioned UI elements */}
      <header className="relative w-full h-24 text-white z-20">
        {/* Top Left */}
        <div className="absolute top-0 left-0">
            <Link href="/" className="bg-black/60 p-3 rounded-lg text-sm text-blue-300 hover:underline cursor-pointer">
              ← 畑をさがす
            </Link>
        </div>

        {/* Top Center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black/60 p-3 rounded-lg text-center">
          <h1 className="text-xl md:text-3xl font-bold" style={{ textShadow: '2px 2px 4px #000' }}>
            {employeeName} の畑
          </h1>
          <p className="text-xs md:text-sm text-gray-300">総貢献回数: {totalContributions}回</p>
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

      {/* Plant container is now separate from header, with a lower z-index */}
      <div className="absolute inset-0 w-full h-full z-0">
        {!loading && !error && plantPositions.length > 0 && (
            plantPositions.map((plantData) => (
              <Plant key={plantData.clientName} p_data={plantData} />
            ))
        )}
      </div>
    </main>
  );
}