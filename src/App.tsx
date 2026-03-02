import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ContributorActivityFeature } from './features/contributor-activity';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>OrgExplorer</h1>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/contributors/AOSSIE-Org">AOSSIE Contributors</Link>
            <Link to="/contributors/StabilityNexus">StabilityNexus Contributors</Link>
            <Link to="/contributors/DjedAlliance">DjedAlliance Contributors</Link>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/contributors/:org" 
              element={<ContributorActivityFeatureWrapper />} 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <h1>Welcome to OrgExplorer</h1>
      <p>Track contributor activity across your GitHub organizations.</p>
      
      <div className="org-cards">
        <Link to="/contributors/AOSSIE-Org" className="org-card">
          <h2>AOSSIE-Org</h2>
          <p>View contributor activity matrix</p>
        </Link>
        <Link to="/contributors/StabilityNexus" className="org-card">
          <h2>StabilityNexus</h2>
          <p>View contributor activity matrix</p>
        </Link>
        <Link to="/contributors/DjedAlliance" className="org-card">
          <h2>DjedAlliance</h2>
          <p>View contributor activity matrix</p>
        </Link>
      </div>
    </div>
  );
};

const ContributorActivityFeatureWrapper: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const org = window.location.pathname.split('/').pop() || 'AOSSIE-Org';
  const fromDate = params.get('from') || undefined;
  
  return <ContributorActivityFeature organization={org} defaultFromDate={fromDate} />;
};

export default App;
