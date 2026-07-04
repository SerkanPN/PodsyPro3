import { useEffect, useRef, useState } from 'react';
import { useAppContext } from './AppContext';
import { API_BASE_URL } from './config';

const formatTS = (ts: number | null) => {
  if (!ts) return 'N/A';
  return new Date(ts * 1000).toLocaleString();
};

const formatPrice = (amount: number, currency: string) => {
  return amount.toFixed(2) + " " + (currency || "USD");
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => alert("Copied: " + text));
};

interface ListingDetailProps {
  listingId: string;
  onShopClick: (shopId: string) => void;
  onTagClick: (tag: string) => void;
  onBack: () => void;
}

const ListingDetail = ({ listingId, onShopClick, onTagClick, onBack }: ListingDetailProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useAppContext();

  const fetchData = async (id: string, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || '';
      const response = await fetch(`${API_BASE_URL}/listing/${id}?force_refresh=${forceRefresh}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Listing data could not be fetched");
      
      const jsonData = await response.json();
      if (jsonData.ERROR) throw new Error(typeof jsonData.ERROR === 'string' ? jsonData.ERROR : JSON.stringify(jsonData.ERROR));
      
      setData(jsonData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setData(jsonData);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(listingId);
  }, [listingId]);

  const listing = data?.listing || {};
  const reviews = data?.reviews || [];
  const history = data?.history || [];
  const price = typeof data?.price === 'number' ? data.price : 0;
  const all_history_json = JSON.stringify(history);
  
  const [showModal, setShowModal] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);
  
  const [activeMetrics, setActiveMetrics] = useState({ views: true, favorites: true, quantity: true, price: true });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const createdTs = listing.original_creation_timestamp || listing.creation_timestamp || (Date.now() / 1000);
  const daysActive = Math.max(1, (Date.now() / 1000 - createdTs) / (24 * 60 * 60));
  const dailyViews = listing.views / daysActive;
  const dailyFavs = (listing.num_favorers || 0) / daysActive;
  const monthlyViews = (dailyViews * 30).toFixed(1);
  const monthlyFavs = (dailyFavs * 30).toFixed(1);
  
  let estimatedSalesFromStock = 0;
  if (history && history.length > 1) {
    for (let i = 0; i < history.length - 1; i++) {
      const prevStock = history[i + 1].quantity;
      const currStock = history[i].quantity;
      const prevMod = history[i + 1].last_modified_timestamp;
      const currMod = history[i].last_modified_timestamp;
      
      if (prevStock > currStock) {
        if (prevMod && currMod) {
          if (currMod !== prevMod) {
            estimatedSalesFromStock += (prevStock - currStock);
          }
        } else {
          estimatedSalesFromStock += (prevStock - currStock);
        }
      }
    }
  }

  let trendStatus = '⚖️ STABLE';
  if (history && history.length >= 10) {
    const recentHistory = history.slice(0, 10);
    const newest = recentHistory[0];
    const oldest = recentHistory[9];
    
    const stockDecreased = newest.quantity < oldest.quantity;
    const viewsIncreased = newest.views > oldest.views;
    const favsIncreased = newest.favorites > oldest.favorites;

    if (stockDecreased && viewsIncreased && favsIncreased) {
      trendStatus = '🔥 TRENDING';
    }
  } else {
    trendStatus = '⏳ Collecting Data (Min. 10 snapshots)';
  }

  useEffect(() => {
    if (!document.getElementById('chartjs-script')) {
      const script = document.createElement('script');
      script.id = 'chartjs-script';
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (showModal && chartRef.current && (window as any).Chart) {
      if (chartInstance.current) chartInstance.current.destroy();
      
      const ctx = chartRef.current.getContext('2d');
      const ChartConstructor = (window as any).Chart;
      
      let chartData = [];
      try {
        const rawData = typeof all_history_json === 'string' ? JSON.parse(all_history_json) : all_history_json;
        if (rawData && rawData.length > 0) {
          const reversed = rawData.slice().reverse();
          const groupedByDay: { [key: string]: any } = {};
          reversed.forEach((d: any) => {
            if (d.capture_time) {
              const day = d.capture_time.split('T')[0];
              groupedByDay[day] = d;
            }
          });
          chartData = Object.values(groupedByDay);
        }
      } catch (e) {
        console.error("History parse error", e);
        return;
      }

      if (dateRange.start && chartData) chartData = chartData.filter((d: any) => d.capture_time >= dateRange.start);
      if (dateRange.end && chartData) chartData = chartData.filter((d: any) => d.capture_time <= dateRange.end + " 23:59:59");

      const labels = chartData ? chartData.map((d: any) => d.capture_time) : [];
      const datasets = [];

      if (chartData) {
        if (activeMetrics.views) datasets.push({ label: 'Views', data: chartData.map((d: any) => d.views), borderColor: '#0ea5e9', backgroundColor: '#0ea5e915', fill: true, tension: 0.3 });
        if (activeMetrics.favorites) datasets.push({ label: 'Favorites', data: chartData.map((d: any) => d.favorites), borderColor: '#f43f5e', backgroundColor: '#f43f5e15', fill: true, tension: 0.3 });
        if (activeMetrics.quantity) datasets.push({ label: 'Stock', data: chartData.map((d: any) => d.quantity), borderColor: '#10b981', backgroundColor: '#10b98115', fill: true, tension: 0.3 });
        if (activeMetrics.price) datasets.push({ label: 'Price', data: chartData.map((d: any) => d.price), borderColor: '#f59e0b', backgroundColor: '#f59e0b15', fill: true, tension: 0.3 });
      }

      chartInstance.current = new ChartConstructor(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { grid: { color: '#222' } }, x: { grid: { color: '#222' } } },
          plugins: { legend: { display: false } }
        }
      });
    }
  }, [showModal, activeMetrics, dateRange, all_history_json]);

  const copyAllTags = () => {
    if (!listing.tags || listing.tags.length === 0) return;
    copyToClipboard(listing.tags.join(','));
  };

  const onToggleFollow = async (id: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/toggle-follow/listing/${encodeURIComponent(id)}`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (resData.status === 'success') {
        setData((prevData: any) => ({
          ...prevData,
          listing: { ...prevData.listing, is_tracked: resData.is_tracked }
        }));
      }
    } catch (err) {
      alert("Follow action failed");
    }
  };

  const HeartIcon = () => {
    if (listing.is_tracked) {
      return (
        <svg className="w-5 h-5 text-white fill-white transition" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-white transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
      </svg>
    );
  };

  if (loading) return <div className="text-white text-center mt-20 font-black animate-pulse">LOADING DATA...</div>;
  if (error) return <div className="text-red-500 text-center mt-20">Error: {error}</div>;
  if (!data) return <div className="text-zinc-500 text-center mt-20">No data found.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-[fadeIn_0.5s]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 gap-6">
        <div className="space-y-2">
          <button onClick={onBack} className="group flex items-center space-x-2 text-gray-400 hover:text-white transition cursor-pointer bg-transparent border-none p-0 mb-4">
            <div className="p-2 bg-[#2a2a2a] group-hover:bg-[#333] rounded-lg transition border border-[#3a3a3a]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </div>
            <span className="font-black text-sm tracking-wide">BACK</span>
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">{listing.title}</h1>
            <button onClick={() => copyToClipboard(listing.title)} className="p-2 hover:bg-zinc-800 rounded-lg transition shrink-0 text-zinc-500 hover:text-white" title="Copy Title">
              <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </button>
            <button onClick={() => fetchData(listingId, true)} className="p-2 hover:bg-zinc-800 rounded-lg transition shrink-0 text-zinc-500 hover:text-sky-400" title="Refresh Live Data">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-zinc-500 font-mono text-xs md:text-sm">
            <span className="flex items-center gap-1">ID: <span className="text-zinc-300 font-bold">{listing.listing_id}</span>
            <button onClick={() => copyToClipboard(listing.listing_id)} className="hover:text-white transition ml-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </button></span>
            <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-sky-500/20">{listing.state}</span>
            <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] uppercase border border-zinc-700">{listing.listing_type}</span>
          </div>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <button onClick={() => onToggleFollow(listing.listing_id)} className={`flex-1 md:flex-none justify-center px-6 py-3 transition rounded-xl font-black text-xs flex items-center space-x-2 shadow-lg cursor-pointer tracking-wide ${listing.is_tracked ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}>
            <HeartIcon />
            <span>{listing.is_tracked ? 'UNFOLLOW' : 'FOLLOW'}</span>
          </button>
          <a href={listing.url} target="_blank" rel="noreferrer" className="flex-1 md:flex-none justify-center px-6 py-3 bg-sky-600 rounded-xl hover:bg-sky-500 transition font-black text-xs flex items-center text-white tracking-wide shadow-lg shadow-sky-900/20">
            VIEW ON ETSY ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl hover:border-zinc-700 transition">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Price</p>
          <p className="text-2xl font-black text-sky-400">{price?.toFixed(2)} <span className="text-xs text-zinc-600 font-mono">{listing.price?.currency_code}</span></p>
        </div>
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl hover:border-zinc-700 transition">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Views</p>
          <p className="text-2xl font-black text-zinc-100">{listing.views || 0}</p>
        </div>
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl hover:border-zinc-700 transition">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Favorites</p>
          <p className="text-2xl font-black text-rose-500">❤️ {listing.num_favorers || 0}</p>
        </div>
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl hover:border-zinc-700 transition">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Stock</p>
          <p className="text-2xl font-black text-emerald-500">{listing.quantity}</p>
        </div>
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl hover:border-zinc-700 transition col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Featured Rank</p>
          <p className="text-2xl font-black text-zinc-100">{listing.featured_rank || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div className="bg-sky-900/10 p-5 rounded-2xl border border-sky-900/30 shadow-xl">
          <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1">Monthly Avg Views</p>
          <p className="text-2xl font-black text-sky-400">{monthlyViews}</p>
        </div>
        <div className="bg-rose-900/10 p-5 rounded-2xl border border-rose-900/30 shadow-xl">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Monthly Avg Favorites</p>
          <p className="text-2xl font-black text-rose-400">{monthlyFavs}</p>
        </div>
        <div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-900/30 shadow-xl">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Estimated Sales</p>
          <p className="text-2xl font-black text-emerald-400">{estimatedSalesFromStock} <span className="text-[10px] text-zinc-500">units</span></p>
        </div>
        <div className="bg-amber-900/10 p-5 rounded-2xl border border-amber-900/30 shadow-xl">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Trend Status</p>
          <p className="text-sm font-black text-amber-400 mt-2">{trendStatus}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Snapshots: {history ? history.length : 0}</p>
        </div>
      </div>

      {history && history.length > 0 && (
        <details className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl group" open>
          <summary className="p-5 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/50 cursor-pointer list-none select-none">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black italic text-sky-500 uppercase
