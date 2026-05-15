export default function Features() {
    const features = [
        { title: "Org Visualizer", desc: "Deep dive into complex repo structures with our proprietary forced-graph layout engine.", icon: "hub", color: "bg-primary text-white" },
        { title: "Heatmaps", desc: "Bold, color-coded activity tracking that highlights burnouts and bottlenecks before they happen.", icon: "local_fire_department", color: "bg-accent-pink text-black" },
        { title: "Dependency Graphs", desc: "High-contrast relationship mapping for cross-repo dependencies and shared libraries.", icon: "account_tree", color: "bg-white text-black" }
    ];

    return (
        <section className="py-32 bg-gray-50 border-b-[6px] border-black">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-7xl md:text-9xl font-black uppercase mb-24 tracking-tighter">
                    Weaponized Tools
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {features.map((f, i) => (
                        <div key={i} className="group border-heavy p-10 bg-white shadow-neubrutal hover:translate-x-1 hover:translate-y-1 hover:shadow-neubrutal-hover transition-all">
                            <div className={`${f.color} w-20 h-20 border-medium mb-10 flex items-center justify-center`}>
                                <span className="material-icons text-5xl">{f.icon}</span>
                            </div>
                            <h3 className="text-3xl font-black uppercase mb-6">{f.title}</h3>
                            <p className="font-bold text-xl mb-10 leading-snug">{f.desc}</p>
                            <div className="h-2 bg-black w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
