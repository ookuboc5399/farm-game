'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- DATA INTERFACES ---
interface RankEntry {
  name: string;
  count: number;
}

interface FarmEntry {
  name: string;
}

// --- HELPER FUNCTIONS ---
const getUserIcon = (name: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-indigo-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const color = colors[Math.abs(hash) % colors.length];
  const initial = name.charAt(0).toUpperCase();
  return { color, initial };
};

const getRankIcon = (rank: number) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return <span className="font-bold text-gray-500">{rank + 1}</span>;
};

// --- UI COMPONENTS ---

const CornerLink = ({ href, position, iconSrc, label, size }: { href: string, position: string, iconSrc: string, label: string, size?: string }) => (
  <Link 
    href={href}
    className={`absolute ${position} z-20 flex flex-col items-center text-white transform transition-transform hover:scale-105 cursor-pointer`}
    title={label}
  >
    <img src={iconSrc} alt={label} className={size || "w-24 h-24"} />
    <span className="absolute inset-0 flex items-center justify-center text-black text-5xl font-bold pointer-events-none">{label}</span>
  </Link>
);

const RankingBoard = ({ ranking, loading }: { ranking: RankEntry[], loading: boolean }) => {
  return (
    <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl mt-12">
      <h2 className="text-2xl font-bold text-center mb-4">
        <span className="text-purple-600">👑</span> 今週の貢献度ランキング
      </h2>
      {loading ? (
        <p className="text-center text-gray-500">集計中...</p>
      ) : ranking.length > 0 ? (
        <ul className="space-y-3">
          {ranking.slice(0, 5).map((player, index) => {
            const { color, initial } = getUserIcon(player.name);
            return (
              <li key={player.name} className="flex items-center gap-x-4 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-8 text-center text-xl">{getRankIcon(index)}</div>
                <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold`}>
                  {initial}
                </div>
                <span className="text-lg font-semibold text-gray-700 flex-1">{player.name}</span>
                <span className="text-lg font-bold text-blue-600">{player.count.toLocaleString()} <span className="text-sm text-gray-500">回</span></span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-center text-gray-500">今週のデータはまだありません。</p>
      )}
    </div>
  );
};

export default function HomePage() {
  const [name, setName] = useState('');
  const [allEmployees, setAllEmployees] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingRanking(true);
        const rankRes = await fetch('/api/ranking');
        const rankJson = await rankRes.json();
        setRanking(rankJson.data || []);
        setLoadingRanking(false);

        const allNamesRes = await fetch('/api/sheets');
        const allNamesJson = await allNamesRes.json();
        const uniqueNames = Array.from(new Set(allNamesJson.data.map((entry: FarmEntry) => entry.name).filter(Boolean)));
        setAllEmployees(uniqueNames);

      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoadingRanking(false);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value) {
      const filteredSuggestions = allEmployees.filter(emp => 
        emp.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion);
    setSuggestions([]);
    router.push(`/${encodeURIComponent(suggestion)}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      router.push(`/${encodeURIComponent(name.trim())}`);
    }
  };

  const textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000';

  return (
    <main 
      className="relative flex min-h-screen flex-col items-center justify-start p-8 pt-20 bg-cover bg-center"
      style={{ backgroundImage: "url('/mv_01.jpg')" }}
    >
      {/* Background Text Watermark */}
      <div className="absolute inset-0 flex items-center justify-center z-0 overflow-hidden">
        <div className="-rotate-12 select-none">
          <h1 
            className="text-white text-7xl md:text-8xl font-black opacity-20 whitespace-nowrap"
            style={{ textShadow }}
          >
            アイドマコンタクトマネジメント
          </h1>
          <h2 
            className="text-white text-6xl md:text-7xl font-black opacity-20 text-right"
            style={{ textShadow }}
          >
            の畑
          </h2>
        </div>
      </div>

      {/* Corner Links */}
      <CornerLink href="/CL1" position="top-[-15rem] left-[-15rem]" iconSrc="/CL1.svg" label="CL1" size="w-200 h-200" />
      <CornerLink href="/CL3" position="top-[-15rem] right-[-15rem]" iconSrc="/CL3.svg" label="CL3" size="w-200 h-200" />
      <CornerLink href="/CL4" position="bottom-[-15rem] left-[-15rem]" iconSrc="/CL4.svg" label="CL4" size="w-200 h-200" />
      <CornerLink href="/CU" position="bottom-[-15rem] right-[-15rem]" iconSrc="/CU.svg" label="CU" size="w-200 h-200" />

      {/* Foreground Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Search Box */}
        <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl text-center">
          <h1 className="text-4xl font-bold text-green-800 mb-4 font-serif whitespace-nowrap">
            あなたの畑を見に行こう
          </h1>
          <p className="text-gray-600 mb-8">
            名前を入力して、自分の畑の様子を確認できます。
          </p>
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={name}
              onChange={handleInputChange}
              placeholder="名前を入力してください..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-300"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto text-left">
                {suggestions.map(suggestion => (
                  <li 
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
            <button 
              type="submit"
              className="w-full mt-4 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 duration-300 shadow-lg"
            >
              畑を見る
            </button>
          </form>
        </div>

        {/* Ranking Board below the search box */}
        <RankingBoard ranking={ranking} loading={loadingRanking} />
      </div>

    </main>
  );
}