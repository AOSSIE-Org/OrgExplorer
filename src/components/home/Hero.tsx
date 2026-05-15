export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 overflow-hidden border-b-[6px] border-black bg-white">
            {/* Floating Shapes */}
            <div className="shape-blob top-20 -left-10 w-48 h-48 bg-accent-green border-medium rotate-[15deg]" />
            <div className="shape-blob bottom-40 right-10 w-64 h-64 bg-primary border-medium rounded-full" />
            <div className="shape-blob top-1/2 left-2/3 w-32 h-32 bg-primary border-medium rotate-[-25deg]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <h1 className="text-7xl md:text-9xl font-black uppercase leading-[0.85] tracking-tighter mb-8 italic">
                    Explore <span className="text-primary">GitHub</span>
                    <br />
                    Like Never Before
                </h1>

                <div className="max-w-3xl mx-auto mb-12">
                    <div className="border-heavy bg-white p-8 shadow-neubrutal">
                        <p className="text-xl md:text-2xl font-bold leading-tight">
                            The aggressive, high-speed visualization engine for massive GitHub
                            organizations. Map dependencies, find bottlenecks, and conquer
                            technical debt.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-24">
                    <button className="btn-press bg-primary text-white text-3xl font-black uppercase py-6 px-12 border-heavy shadow-neubrutal active:shadow-none hover:bg-blue-700 transition-all cursor-pointer">
                        Get Started
                    </button>

                    <button className="btn-press bg-white text-black text-3xl font-black uppercase py-6 px-12 border-heavy shadow-neubrutal active:shadow-none hover:bg-gray-50 transition-all cursor-pointer">
                        View Demo
                    </button>
                </div>

                {/* BROKEN GRID PREVIEW */}
                <div className="relative mt-24 text-left">
                    <div className="grid grid-cols-12 gap-6 min-h-[400px]">
                        <div className="col-span-12 md:col-span-8 border-heavy bg-white shadow-neubrutal p-4 overflow-hidden relative">
                            <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                                <span className="w-3 h-3 rounded-full bg-red-500 border border-black" />
                                <span className="w-3 h-3 rounded-full bg-yellow-500 border border-black" />
                                <span className="w-3 h-3 rounded-full bg-green-500 border border-black" />
                                <span className="ml-4 font-mono font-bold text-sm">
                                    org-explorer / dashboard
                                </span>
                            </div>

                            <img
                                className="w-full h-full object-cover grayscale contrast-125 border-medium"
                                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                                alt="Dashboard Visualization"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-4 border-heavy bg-accent-green shadow-neubrutal p-10 flex flex-col justify-end transform md:translate-y-12">
                            <h3 className="text-5xl font-black uppercase leading-none mb-4">
                                Real-time Analysis
                            </h3>
                            <p className="font-bold uppercase tracking-tight text-lg">
                                Syncing 400+ Repositories in seconds.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
