import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';

export default function App() {
  return (
    <div className="bg-white text-black overflow-x-hidden">
      <Navbar />
      <main>
        <Home />
      </main>
      <Footer />
    </div>
  );
}
