import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({ children, orgInput }: any) {
  return (
    <div className="flex h-screen overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <Topbar orgInput={orgInput}/>

        <div className="flex-1 overflow-hidden p-4">
          {children}
        </div>

      </div>
    </div>
  );
}