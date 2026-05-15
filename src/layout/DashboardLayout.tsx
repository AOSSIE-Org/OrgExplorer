import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({ children, orgInput, orgLogo }: any) {
  return (
    <div className="flex h-screen overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <Topbar orgInput={orgInput} logo={orgLogo}/>

        <div className="flex-1 p-4 overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  );
}