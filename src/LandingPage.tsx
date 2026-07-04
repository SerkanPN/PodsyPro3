// src/LandingPage.tsx
import React from 'react';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <span className="text-lg font-black italic tracking-tighter text-white">
            PODSY<span className="text-sky-500">PRO</span>
          </span>
          <button
            onClick={onLoginClick}
            className="text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] px-4 py-2 rounded-full transition"
          >
            Sign In
          </button>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-32 pb-24 text-center">
          <p className="text-sky-500 text-sm font-medium mb-4">PodsyPro</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.05]">
            See everything.
            <br />
            Sell smarter.
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10">
            The clearest way to research, track, and grow your Etsy shop.
          </p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={onLoginClick}
              className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-6 py-3 rounded-full transition"
            >
              Get Started
            </button>
            <button onClick={onLoginClick} className="text-sm font-semibold text-sky-500 hover:text-sky-400 transition flex items-center gap-1">
              Watch the demo
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </section>

        {/* Product moment - simplified search bar */}
        <section className="max-w-2xl mx-auto px-6 pb-32">
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-5 py-4">
            <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-zinc-500">A keyword, an Etsy link, or a shop...</span>
          </div>
        </section>

        {/* Feature 1 */}
        <section className="border-t border-white/5 py-28 md:py-36">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sky-500 text-sm font-medium mb-4">Discovery</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-5">
              Find your next best seller.
            </h2>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto">
              Uncover the keywords your competitors haven't found yet — before they do.
            </p>
          </div>
        </section>

        {/* Feature 2 */}
        <section className="border-t border-white/5 bg-white/[0.02] py-28 md:py-36">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sky-500 text-sm font-medium mb-4">Analysis</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-5">
              Know a listing before you compete with it.
            </h2>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto">
              Price, favorites, and true sales — all at a glance.
            </p>
          </div>
        </section>

        {/* Feature 3 */}
        <section className="border-t border-white/5 py-28 md:py-36">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sky-500 text-sm font-medium mb-4">Tracking</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-5">
              Keep an eye on every competitor.
            </h2>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto">
              Compare your shop against theirs, side by side.
            </p>
          </div>
        </section>

        {/* Feature 4 */}
        <section className="border-t border-white/5 bg-white/[0.02] py-28 md:py-36">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sky-500 text-sm font-medium mb-4">Publishing</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-5">
              From idea to live listing. Instantly.
            </h2>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto">
              Upload straight to your Etsy shop in a single click.
            </p>
          </div>
        </section>

        {/* What's next */}
        <section className="border-t border-white/5 py-28 md:py-36">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <p className="text-sky-500 text-sm font-medium mb-4">Coming Soon</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-5">
              PodsyPro is learning.
            </h2>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto mb-10">
              An AI layer is on its way — turning research into ready-made decisions,
              listings, and reports, all on its own.
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-zinc-500">
              <span>Insights</span>
              <span>Cloning</span>
              <span>Coaching</span>
              <span>Reports</span>
              <span>Trends</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/5 bg-white/[0.02] py-28 md:py-36">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-5">
              Start seeing clearly.
            </h2>
            <p className="text-lg text-zinc-400 mb-10">
              Create your account and run your first search in under a minute.
            </p>
            <button
              onClick={onLoginClick}
              className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-8 py-3.5 rounded-full transition"
            >
              Get Started
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm font-black italic tracking-tighter text-zinc-600">
            PODSY<span className="text-sky-600">PRO</span>
          </span>
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} PodsyPro</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
