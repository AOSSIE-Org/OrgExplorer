export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-white border-b-[4px] border-black px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="text-3xl font-black tracking-tighter uppercase">
                    Org<span className="text-primary">Explorer</span>
                </div>

                <div className="hidden md:flex space-x-8 font-extrabold uppercase tracking-tight text-sm">
                    <a className="hover:underline decoration-4 underline-offset-4" href="#">Features</a>
                    <a className="hover:underline decoration-4 underline-offset-4" href="#">Pricing</a>
                    <a className="hover:underline decoration-4 underline-offset-4" href="#">Changelog</a>
                    <a className="hover:underline decoration-4 underline-offset-4 text-primary" href="#">Login</a>
                </div>

                <button className="md:hidden">
                    <span className="material-icons text-4xl">menu</span>
                </button>
            </div>
        </nav>
    );
}
