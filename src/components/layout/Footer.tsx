export default function Footer() {
    return (
        <footer className="bg-black text-white py-24 px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-20">
                    <div className="col-span-2">
                        <h4 className="text-5xl font-black uppercase mb-8 tracking-tighter">OrgExplorer</h4>
                        <p className="text-xl font-bold opacity-50 max-w-sm">
                            Built for the developers who build everything else. Neumorphic is dead. Neubrutalism is the new standard.
                        </p>
                    </div>
                    <div>
                        <h5 className="font-black uppercase mb-8 text-primary tracking-widest">Resources</h5>
                        <ul className="space-y-4 font-black uppercase">
                            <li><a className="hover:text-accent-green" href="#">Documentation</a></li>
                            <li><a className="hover:text-accent-green" href="#">API Reference</a></li>
                            <li><a className="hover:text-accent-green" href="#">Community</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-black uppercase mb-8 text-primary tracking-widest">Legal</h5>
                        <ul className="space-y-4 font-black uppercase">
                            <li><a className="hover:text-accent-pink" href="#">Privacy Policy</a></li>
                            <li><a className="hover:text-accent-pink" href="#">Terms Service</a></li>
                            <li><a className="hover:text-accent-pink" href="#">Security</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-10">
                    <p className="font-black uppercase text-sm opacity-50">© 2026 OrgExplorer Platform. All rights reserved.</p>
                    <div className="flex gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-14 h-14 border-2 border-white flex items-center justify-center hover:bg-primary hover:border-primary transition-all cursor-pointer">
                                <span className="material-icons">north_east</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
