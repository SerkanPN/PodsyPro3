// src/LandingPage.tsx
import React from 'react';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-gray-800 border-b border-gray-700">
        <div className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          PODSYPRO
        </div>
        <button 
          onClick={onLoginClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Sisteme Giriş
        </button>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            Etsy İstihbarat Motoru
          </h1>
          <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Print-on-Demand (POD) mağazanız için veri odaklı kararlar alın. Rakiplerin stoklarını X-Ray ile tarayın, trendleri analiz edin ve tek tıkla ürün yükleyin. Milyonlarca müşteriye ulaşmak için tasarlandı.
          </p>
          <button 
            onClick={onLoginClick}
            className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-xl text-xl font-bold transition-all shadow-lg shadow-purple-500/30"
          >
            Hemen Kullanmaya Başla
          </button>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-100">Akıllı Anahtar Kelime Keşfi</h3>
              <p className="text-gray-400">Etsy arama sonuçlarını analiz edin. Düşük rekabetli ve yüksek hacimli anahtar kelimeleri rakiplerinizden önce yakalayın.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-100">Listing X-Ray ve Satış Tahmini</h3>
              <p className="text-gray-400">Ürünlerin fiyat, favori, gizli etiket ve stok geçmişlerini inceleyin. Stok geçmişi üzerinden net tahmini satış miktarlarını hesaplayın.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-colors">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-100">Mağaza Radarı & Benchmark</h3>
              <p className="text-gray-400">Rakip mağazaları ve listelemeleri günlük olarak cron job ile veritabanına yedekleyin. Favori ve trend değişimlerini grafikler üzerinden anlık kıyaslayın.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-pink-500 transition-colors">
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-100">Sıfır Eforla Yükleme</h3>
              <p className="text-gray-400">Sistem içerisinden POD taslaklarınızı, varyasyonlarınızı ve taksonomi verilerinizi hazırlayarak tek tıkla doğrudan Etsy mağazanıza aktarın.</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
