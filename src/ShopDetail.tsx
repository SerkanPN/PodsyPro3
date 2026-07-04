import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useAppContext } from './AppContext';
import { API_BASE_URL } from './config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

interface ShopDetailProps {
  shopId: string;
  onBack: () => void;
  onListingClick: (listingId: string) => void;
  onUploadClick?: (shopId: string) => void;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatTS = (ts: number | null) => {
  if (!ts) return 'N/A';
  return new Date(ts * 1000).toLocaleString();
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => alert("Copied"));
};

const ShopDetail = ({ shopId, onBack, onListingClick, onUploadClick }: ShopDetailProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toggleFollow, HeartIcon, supabase } = useAppContext();

  const fetchData = useCallback(async (id: string, forceRefresh = false) => {
    if (!id || id === 'null') {
      setError("Invalid shop link. Please verify setup.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/shop/${id}?force_refresh=${forceRefresh}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Shop data could not be fetched");
      const json = await res.json();
      if(json.ERROR) throw new Error(typeof json.ERROR === 'string' ? json.ERROR : JSON.stringify(json.ERROR));
      setData(json);
    } catch (e: any) { 
      setError(e.message); 
    }
    finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchData(shopId);
  }, [shopId]);

  const S = data?.shop || {};
  const shopListings = data?.listings || [];

  const [showModal, setShowModal] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const history = data?.history || [];

  const [sortBy, setSortBy] = useState<string>('default');

  const createdTs = S.created_timestamp || (Date.now() / 1000);
  const daysActive = Math.max(1, (Date.now() / 1000 - createdTs) / (24 * 60 * 60));
  const dailySales = (S.transaction_sold_count || 0) / daysActive;
  const monthlySales = (dailySales * 30).toFixed(1);
  
  const isSalesVisible = S.transaction_sold_count > 0; 
  const salesVisibilityText = isSalesVisible ? "VISIBLE" : "HIDDEN";
  const salesVisibilityColor = isSalesVisible ? "text-emerald-400" : "text-rose-400";

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return { labels: [], datasets: [] };

    const reversedHistory = [...history].reverse();
    const labels = reversedHistory.map((d: any) => new Date(d.capture_time).toLocaleDateString());
    const dataPoints = reversedHistory.map((d: any) => d.transaction_sold_count);

    return {
      labels,
      datasets: [{
        label: 'Total Sales',
        data: dataPoints,
        borderColor: '#10b981',
        backgroundColor: '#10b98120',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#10b981',
        pointRadius: 3,
      }],
    };
  }, [history]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { grid: { color: '#333' } }, x: { grid: { color: '#333' } } },
    plugins: { legend: { display: false } }
  };

  const sortedListings = useMemo(() => {
    if (!shopListings) return [];
    const list = [...shopListings];
    
    const resolvePrice = (p: any) => (p?.amount ? p.amount / p.divisor : (typeof p === 'number' ? p : 0));

    if (sortBy === 'favorites') return list.sort((a: any, b: any) => (b.num_favorers || 0) - (a.num_favorers || 0));
    if (sortBy === 'views') return list.sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
    if (sortBy === 'price_asc') return list.sort((a, b) => resolvePrice(a.price) - resolvePrice(b.price));
    if (sortBy === 'price_desc') return list.sort((a, b) => resolvePrice(b.price) - resolvePrice(a.price));
    if (sortBy === 'reviews') return list.sort((a: any, b: any) => (b.review_count || 0) - (a.review_count || 0));
    if (sortBy === 'featured') return list.sort((a: any, b: any) => (a.featured_rank || 999999) - (b.featured_rank || 999999));
    
    return list;
  }, [shopListings, sortBy]);

  const handleShopFollow = useCallback(() => {
    toggleFollow('shop', S.shop_id).then(newStatus => {
      if (newStatus !== undefined) {
        setData((prev: any) => ({ ...prev, shop: { ...prev.shop, is_tracked: newStatus } }));
      }
    });
  }, [S.shop_id, toggleFollow]);

  const handleListingFollow = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFollow('listing', id).then(newStatus => {
      if (newStatus !== undefined) {
        setData((prev: any) => ({
          ...prev,
          listings: prev.listings.map((l: any) => l.listing_id === id ? { ...l, is_tracked: newStatus } : l)
        }));
      }
    });
  }, [toggleFollow]);

  if (loading) return <div className="text-white text-center mt-20 font-black animate-pulse">LOADING DATA...</div>;
  if (error) return <div className="text-red-500 text-center mt-20">Error: {error}</div>;
  if (!data) return <div className="text-zinc-500 text-center mt-20">No data found.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 animate-[fadeIn_0.5s]">
      <div className="flex items-center justify-between border-b border-[#3a3a3a] pb-6">
        <button onClick={onBack} className="group flex items-center space-x-2 text-gray-400 hover:text-white transition cursor-pointer bg-transparent border-none p-0">
          <div className="p-2 bg-[#2a2a2a] group-hover:bg-[#333] rounded-lg transition border border-[#3a3a3a]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </div>
          <span className="font-black text-sm tracking-wide">BACK</span>
        </button>
        <div className="flex space-x-3">
          <button onClick={() => fetchData(shopId, true)} className="px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition font-black text-xs flex items-center space-x-2 text-white shadow-lg cursor-pointer border border-zinc-700">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             <span className="hidden sm:inline">REFRESH</span>
          </button>
          <button onClick={handleShopFollow} className={`px-4 py-2 rounded-xl transition font-black text-xs flex items-center space-x-2 shadow-lg cursor-pointer ${S.is_tracked ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            <HeartIcon isTracked={S.is_tracked} />
            <span className="hidden sm:inline">{S.is_tracked ? 'UNFOLLOW' : 'FOLLOW'}</span>
          </button>
          <a href={S.url} target="_blank" rel="noreferrer" className="px-6 py-2 bg-sky-600 rounded-xl hover:bg-sky-700 transition font-black text-xs flex items-center cursor-pointer text-white shadow-lg shadow-sky-900/20">
            VISIT SHOP ↗
          </a>
          {onUploadClick && (
            <button onClick={() => onUploadClick(shopId)} className="px-6 py-2 bg-emerald-600 rounded-xl hover:bg-emerald-500 transition font-black text-xs flex items-center cursor-pointer text-white shadow-lg shadow-emerald-900/20 border border-emerald-500">
              UPLOAD PRODUCT
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-[#2a2a2a] rounded-3xl border border-sky-500/20 p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-64 h-64 text-sky-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 001-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"></path></svg>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
          <div className="relative shrink-0">
            <img src={S.icon_url_fullxfull || 'https://via.placeholder.com/150'} className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-[#333] shadow-2xl object-cover" alt={S.shop_name} />
            <div className="absolute -bottom-3 -right-3 bg-sky-600 text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-xl border border-[#1a1a1a] flex items-center space-x-1 cursor-pointer hover:bg-sky-500 transition" onClick={() => copyToClipboard(S.shop_id)}>
              <span>ID: {S.shop_id}</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-none">{S.shop_name}</h1>
                <p className="text-gray-400 mt-2 font-mono text-sm">{S.title || "No shop title provided."}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 font-mono justify-center md:justify-start">
                  <span>@{S.login_name}</span>
                  <span>•</span>
                  <span>User ID: {S.user_id}</span>
                </div>
              </div>
              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#333] text-center shrink-0">
                <div className="text-rose-500 font-black text-xl">{S.review_average ? `${S.review_average.toFixed(1)} ⭐` : 'N/A'}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">{S.review_count?.toLocaleString() || 0} Reviews</div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#333] flex items-center gap-2">
                <span className="text-emerald-500 font-black text-lg">{S.listing_active_count}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Listings</span>
              </div>
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#333] flex items-center gap-2">
                <span className="text-sky-500 font-black text-lg">{S.digital_listing_count || 0}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Digital Listings</span>
              </div>
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#333] flex items-center gap-2">
                <span className="text-amber-500 font-black text-lg">{S.transaction_sold_count?.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sales</span>
              </div>
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#333] flex items-center gap-2">
                <span className="text-rose-500 font-black text-lg">❤️ {S.num_favorers || 0}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Favorites</span>
              </div>
              {S.is_vacation && (
                <div className="bg-rose-900/20 px-4 py-2 rounded-xl border border-rose-900/30 flex items-center gap-2">
                  <span className="text-rose-500 font-black text-[10px] uppercase">ON VACATION</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4 border-t border-[#333] pt-4">
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#333] flex items-center gap-2">
                <span className="text-amber-500 font-black text-lg">{monthlySales}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly Avg Sales</span>
              </div>
              <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-[#333] flex items-center gap-2">
                <span className={`font-black text-sm ${salesVisibilityColor}`}>{salesVisibilityText}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sales Visibility</span>
              </div>
              {history && history.length > 0 && (
                <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-[10px] transition uppercase cursor-pointer shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                  View Shop Chart
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      <details className="bg-transparent group" open>
        <summary className="p-4 cursor-pointer list-none flex justify-between items-center select-none bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] mb-6 hover:bg-[#333] transition">
          <h2 className="text-lg font-black italic text-white uppercase tracking-tighter">Announcements & Messages</h2>
          <svg className="w-6 h-6 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </summary>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#3a3a3a] bg-[#2d2d2d]">
              <h2 className="text-sm font-black italic text-sky-400 uppercase tracking-tighter">Shop Announcement</h2>
            </div>
            <div className="p-6 flex-1 max-h-[350px] overflow-y-auto custom-scrollbar">
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{S.announcement || "No announcements."}</p>
            </div>
          </div>
          
          <div className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#3a3a3a] bg-[#2d2d2d]">
              <h2 className="text-sm font-black italic text-emerald-500 uppercase tracking-tighter">Sales Message</h2>
            </div>
            <div className="p-6 flex-1 max-h-[350px] overflow-y-auto custom-scrollbar">
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{S.sale_message || "No sales message."}</p>
            </div>
          </div>

          <div className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#3a3a3a] bg-[#2d2d2d]">
              <h2 className="text-sm font-black italic text-amber-500 uppercase tracking-tighter">Digital Sales Message</h2>
            </div>
            <div className="p-6 flex-1 max-h-[350px] overflow-y-auto custom-scrollbar">
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{S.digital_sale_message || "No digital sales message."}</p>
            </div>
          </div>
        </div>
      </details>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <details className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] overflow-hidden shadow-2xl group" open>
            <summary className="p-6 border-b border-[#3a3a3a] bg-[#2d2d2d] cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#333] transition">
              <h2 className="text-xl font-black italic text-sky-400 uppercase tracking-tighter">Shop Policies</h2>
              <svg className="w-6 h-6 text-sky-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            
            <div className="p-6 space-y-6">
              {S.policy_welcome && (
                <div>
                  <h3 className="text-xs font-black text-sky-500 uppercase tracking-[0.2em] mb-2">Welcome</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">{S.policy_welcome}</p>
                </div>
              )}
              {S.policy_payment && (
                <div>
                  <h3 className="text-xs font-black text-sky-500 uppercase tracking-[0.2em] mb-2">Payment</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">{S.policy_payment}</p>
                </div>
              )}
              {S.policy_shipping && (
                <div>
                  <h3 className="text-xs font-black text-sky-500 uppercase tracking-[0.2em] mb-2">Shipping</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">{S.policy_shipping}</p>
                </div>
              )}
              {S.policy_refunds && (
                <div>
                  <h3 className="text-xs font-black text-sky-500 uppercase tracking-[0.2em] mb-2">Refunds & Returns</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">{S.policy_refunds}</p>
                </div>
              )}

              {S.policy_additional && (
                <details className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden group/policy">
                  <summary className="p-4 cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#222]">
                    <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em]">Additional Policies / FAQ</h3>
                    <svg className="w-5 h-5 text-gray-500 group-open/policy:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </summary>
                  <div className="p-6 border-t border-[#333] max-h-[400px] overflow-y-auto custom-scrollbar">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{S.policy_additional}</p>
                  </div>
                </details>
              )}

              {S.policy_privacy && (
                <details className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden group/policy">
                  <summary className="p-4 cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#222]">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Privacy Policy</h3>
                    <svg className="w-5 h-5 text-gray-500 group-open/policy:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </summary>
                  <div className="p-6 border-t border-[#333] max-h-[400px] overflow-y-auto custom-scrollbar">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{S.policy_privacy}</p>
                  </div>
                </details>
              )}
            </div>
          </details>
        </div>

        <div className="space-y-6">
          <details className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] shadow-2xl overflow-hidden group" open>
            <summary className="p-6 border-b border-[#3a3a3a] cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#333] transition">
              <h2 className="text-lg font-black italic text-sky-400 uppercase tracking-tighter">Localization & Logistics</h2>
              <svg className="w-5 h-5 text-sky-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            <div className="p-6 space-y-3 text-sm font-mono uppercase text-[10px]">
              <div className="flex justify-between border-b border-[#333] pb-2 text-white"><span>Shop Country</span><span className="font-bold text-right text-sky-400">{S.shop_location_country_iso}</span></div>
              <div className="flex justify-between border-b border-[#333] pb-2 text-white"><span>Shipping Country</span><span className="font-bold text-right text-emerald-400">{S.shipping_from_country_iso}</span></div>
              <div className="flex justify-between border-b border-[#333] pb-2 text-white"><span>Currency</span><span className="font-bold text-right">{S.currency_code}</span></div>
              <div className="flex flex-col border-b border-[#333] pb-2 text-white gap-2">
                <span>Supported Languages:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {S.languages?.map((lang: string, i: number) => (
                    <span key={i} className="bg-[#1a1a1a] px-2 py-1 border border-[#333] rounded text-[9px]">{lang}</span>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <details className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] shadow-2xl overflow-hidden group" open>
            <summary className="p-6 border-b border-[#3a3a3a] cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#333] transition">
              <h2 className="text-lg font-black italic text-sky-400 uppercase tracking-tighter">Shop Features</h2>
              <svg className="w-5 h-5 text-sky-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            <div className="p-6 space-y-2 text-[10px] font-mono uppercase text-gray-400">
              <div className="flex justify-between"><span>Accepts Custom Requests:</span> <span className="text-white text-right">{S.accepts_custom_requests ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>US Based:</span> <span className="text-white text-right">{S.is_shop_us_based ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Calculated Shipping Eligible:</span> <span className="text-white text-right">{S.is_calculated_eligible ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between border-t border-[#333] pt-2 mt-2"><span>Using Structured Policies:</span> <span className="text-white text-right">{S.is_using_structured_policies ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Onboarded Policies:</span> <span className="text-white text-right">{S.has_onboarded_structured_policies ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Unstructured Policies:</span> <span className="text-white text-right">{S.has_unstructured_policies ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between border-t border-[#333] pt-2 mt-2"><span>Etsy Payments Onboarded:</span> <span className="text-emerald-500 text-right font-bold">{S.is_etsy_payments_onboarded ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Direct Checkout Onboarded:</span> <span className="text-emerald-500 text-right font-bold">{S.is_direct_checkout_onboarded ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Opted In Buyer Promise:</span> <span className="text-white text-right">{S.is_opted_in_to_buyer_promise ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Include Dispute Form:</span> <span className="text-white text-right">{S.include_dispute_form_link ? 'YES' : 'NO'}</span></div>
              <div className="flex justify-between"><span>Private Receipt Info:</span> <span className="text-white text-right">{S.policy_has_private_receipt_info ? 'YES' : 'NO'}</span></div>
            </div>
          </details>
          
          {S.vacation_message && (
            <details className="bg-[#2a2a2a] rounded-3xl border border-rose-900/50 shadow-2xl overflow-hidden group">
              <summary className="p-6 border-b border-[#3a3a3a] cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#333] transition">
                <h2 className="text-lg font-black italic text-rose-500 uppercase tracking-tighter">Vacation Status</h2>
                <svg className="w-5 h-5 text-rose-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </summary>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Vacation Message</h3>
                  <p className="text-gray-300 text-xs italic bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">{S.vacation_message}</p>
                </div>
                {S.vacation_autoreply && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Auto-Reply</h3>
                    <p className="text-gray-300 text-xs italic bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">{S.vacation_autoreply}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>

      {shopListings.length > 0 && (
        <details className="bg-[#2a2a2a] rounded-3xl border border-[#3a3a3a] shadow-2xl overflow-hidden group" open>
          <summary className="p-6 md:p-8 border-b border-[#3a3a3a] cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#333] transition">
            <h2 className="text-2xl font-black italic text-sky-400 uppercase tracking-tighter">Shop Listings ({shopListings.length})</h2>
            
            <div className="flex items-center gap-4">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a1a1a] border border-[#333] text-zinc-300 text-[11px] font-bold rounded-lg px-3 py-2 outline-none focus:border-sky-500 cursor-pointer uppercase tracking-wider"
              >
                <option value="default">SORT: Relevance</option>
                <option value="favorites">SORT: Most Favorites</option>
                <option value="views">SORT: Most Views</option>
                <option value="price_asc">SORT: Lowest Price</option>
                <option value="price_desc">SORT: Highest Price</option>
                <option value="reviews">SORT: Review Count</option>
                <option value="featured">SORT: Featured Rank</option>
              </select>
              <svg className="w-6 h-6 text-sky-400 group-open:rotate-180 transition-transform pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </summary>
          <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedListings.map((item: any, i: number) => {
              const img_url = item.img_url || item.image || item.image_url || '';
              return (
                <div key={i} onClick={() => onListingClick(item.listing_id)} className="bg-[#1a1a1a] rounded-2xl border border-[#333] overflow-hidden hover:border-sky-500 transition group flex flex-col shadow-lg cursor-pointer relative">
                  <div className="absolute top-2 left-2 z-10" title="Track" onClick={(e) => handleListingFollow(item.listing_id, e)}>
                    <HeartIcon isTracked={item.is_tracked} />
                  </div>
                  <div className="relative aspect-square overflow-hidden bg-[#222]">
                    {img_url ? <img src={img_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <div className="text-zinc-700 flex justify-center items-center h-full text-xs">NO IMG</div>}
                  </div>
                  <div className="p-4 flex flex-col flex-1 space-y-2">
                    <h3 className="text-white text-xs font-bold line-clamp-2 leading-snug group-hover:text-sky-400 transition">{item.title}</h3>
                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-[#333]">
                      <span className="text-sky-400 font-black text-sm">
                        {item.price?.amount ? (item.price.amount / item.price.divisor).toFixed(2) : (item.price || 'N/A')} {item.price?.currency_code || item.currency_code || ''}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                        {item.views !== undefined && <span>👁 {item.views}</span>}
                        {item.num_favorers !== undefined && <span className="text-rose-500">❤️ {item.num_favorers}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <details className="bg-black/20 rounded-3xl border border-[#3a3a3a] overflow-hidden group">
        <summary className="p-6 md:p-8 border-b border-[#333] cursor-pointer list-none flex justify-between items-center select-none hover:bg-[#222] transition">
          <h2 className="text-xl font-black italic text-gray-600 uppercase tracking-tighter font-sans">Shop Metadata Engine</h2>
          <svg className="w-6 h-6 text-gray-600 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </summary>
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-[10px] text-gray-500">
            <div className="flex flex-col uppercase gap-1"><span>Create Date:</span> <span className="text-white font-bold">{formatTS(S.create_date)}</span></div>
            <div className="flex flex-col uppercase gap-1"><span>Created Timestamp:</span> <span className="text-white">{formatTS(S.created_timestamp)}</span></div>
            <div className="flex flex-col uppercase gap-1"><span>Last Updated:</span> <span className="text-sky-500 font-bold">{formatTS(S.update_date)}</span></div>
            <div className="flex flex-col uppercase gap-1"><span>Updated Timestamp:</span> <span className="text-white">{formatTS(S.updated_timestamp)}</span></div>
            <div className="flex flex-col uppercase gap-1"><span>Policy Update Date:</span> <span className="text-rose-500 font-bold">{S.policy_update_date ? formatTS(S.policy_update_date) : 'N/A'}</span></div>
        </div>
      </details>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-w-6xl rounded-3xl border border-zinc-800 p-6 sm:p-10 relative flex flex-col h-[90vh] shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white uppercase font-black text-xs transition cursor-pointer">Close [ESC]</button>
            <h2 className="text-2xl sm:text-3xl font-black italic text-emerald-500 uppercase tracking-tighter mb-6 sm:mb-8 mt-4 sm:mt-0">Shop Sales History</h2>
            <div className="flex-grow bg-zinc-950 rounded-2xl p-4 sm:p-6 border border-zinc-800 relative min-h-[300px]">
              <Line options={chartOptions} data={chartData} />
            </div>
          </div>
        </div>
      )}

      <div className="mt-10">
        <details className="bg-black/50 rounded-3xl border border-green-900/20 group text-center">
          <summary className="p-6 cursor-pointer text-green-900 font-black uppercase text-[10px] list-none tracking-[0.5em] tracking-tighter">RAW SHOP DATA DUMP</summary>
          <div className="p-8 border-t border-green-900/10">
            <pre className="text-[10px] text-green-800 font-mono text-left leading-tight overflow-auto">{JSON.stringify(S, null, 2)}</pre>
          </div>
        </details>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #0ea5e9; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default ShopDetail;
