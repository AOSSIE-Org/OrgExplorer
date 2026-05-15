export default function Testimonials() {
    return (
        <section className="py-32 bg-primary text-white overflow-hidden border-b-[6px] border-black">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-6xl md:text-[8rem] font-black uppercase mb-24 text-center tracking-tighter leading-none">
                    Developer Shoutouts
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-20 relative">
                    <div className="relative bg-white text-black p-12 border-heavy shadow-neubrutal transform -rotate-2">
                        <span className="material-icons text-6xl text-primary absolute -top-8 -left-4 bg-white border-medium rounded-full p-2">
                            format_quote
                        </span>
                        <p className="text-2xl font-black mb-8 italic leading-tight">
                            "This is the first time I've actually understood our internal dependency hell. It's ugly in the best way possible."
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 border-medium bg-accent-green">
                                <img className="w-full h-full object-cover grayscale" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" alt="Dev" />
                            </div>
                            <div>
                                <p className="font-black uppercase text-xl">Alex Rivers</p>
                                <p className="font-bold opacity-70">Staff Engineer @ TechFlow</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative bg-accent-green text-black p-12 border-heavy shadow-neubrutal transform rotate-2 md:translate-y-16">
                        <span className="material-icons text-6xl text-primary absolute -top-8 -right-4 bg-white border-medium rounded-full p-2">
                            format_quote
                        </span>
                        <p className="text-2xl font-black mb-8 italic leading-tight">
                            "OrgExplorer didn't just show me our repos; it showed me the future of how we manage open source scale."
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 border-medium bg-accent-pink">
                                <img className="w-full h-full object-cover grayscale" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" alt="Dev" />
                            </div>
                            <div>
                                <p className="font-black uppercase text-xl">Sarah Chen</p>
                                <p className="font-bold opacity-70">CTO @ NexGen</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
