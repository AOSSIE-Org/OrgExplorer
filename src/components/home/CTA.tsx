export default function CTA() {
    return (
        <section className="py-32 bg-white text-center">
            <div className="max-w-4xl mx-auto px-6">
                <h2 className="text-6xl md:text-[7rem] font-black uppercase mb-16 tracking-tighter">
                    Ready to Audit?
                </h2>

                <div className="flex flex-col md:flex-row gap-0 border-heavy shadow-neubrutal mb-12 overflow-hidden">
                    <input
                        className="flex-grow p-8 text-3xl font-black focus:outline-none placeholder:text-gray-300"
                        placeholder="github.com/your-org"
                        type="text"
                    />
                    <button className="bg-primary text-white font-black uppercase px-16 py-8 text-3xl border-l-4 border-black hover:bg-blue-700 transition-colors cursor-pointer">
                        SCAN
                    </button>
                </div>

                <p className="font-black uppercase tracking-[0.3em] text-primary text-lg">
                    No credit card. No fluff. Just raw data.
                </p>
            </div>
        </section>
    );
}
