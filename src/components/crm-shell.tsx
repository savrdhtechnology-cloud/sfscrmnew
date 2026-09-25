import Link from "next/link";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, UserRoundPlus, FileText, BadgeIndianRupee, Landmark,
  WalletCards, Handshake, BarChart3, FolderOpen, Settings, Bell, Search,
  ChevronDown, ShieldCheck, ListChecks, ReceiptIndianRupee, Headphones
} from "lucide-react";

const nav = [
  { label:"Dashboard", href:"/portal/owner", icon:LayoutDashboard },
  { label:"Leads", href:"/portal/employee", icon:UserRoundPlus },
  { label:"Customers", href:"/portal/customer", icon:Users },
  { label:"Applications", href:"/portal/manager", icon:FileText },
  { label:"Credit Analysis", href:"/portal/credit", icon:BadgeIndianRupee },
  { label:"Lenders", href:"/portal/lender", icon:Landmark },
  { label:"Payments", href:"/portal/finance", icon:WalletCards },
  { label:"Commissions", href:"/portal/partner", icon:ReceiptIndianRupee },
  { label:"Reports", href:"/portal/owner", icon:BarChart3 },
  { label:"Documents", href:"/portal/employee", icon:FolderOpen }
];

export function CrmShell({
  children,
  active="Dashboard",
  role="owner"
}:{
  children:ReactNode;
  active?:string;
  role?:string;
}) {
  return (
    <div className="ref-crm-shell">
      <aside className="ref-sidebar">
        <div className="ref-logo">
          <div className="ref-logo-mark">S</div>
          <div>
            <strong>SAVRDH</strong>
            <span>Credit CRM</span>
          </div>
        </div>

        <div className="ref-user-card">
          <div className="ref-avatar">SF</div>
          <div className="ref-user-copy">
            <strong>Savrdh User</strong>
            <span>{role.charAt(0).toUpperCase()+role.slice(1)} Portal</span>
          </div>
          <ChevronDown size={14}/>
        </div>

        <nav className="ref-nav">
          <div className="ref-nav-label">MAIN MENU</div>
          {nav.map(({label,href,icon:Icon})=>(
            <Link key={label} href={href} className={`ref-nav-item ${active===label?"active":""}`}>
              <Icon size={16}/>
              <span>{label}</span>
            </Link>
          ))}
          <div className="ref-nav-label second">MANAGEMENT</div>
          <Link href="/portal/owner" className="ref-nav-item"><ListChecks size={16}/><span>Audit & Controls</span></Link>
          <Link href="/portal/owner" className="ref-nav-item"><Settings size={16}/><span>Settings</span></Link>
        </nav>

        <div className="ref-sidebar-foot">
          <div className="ref-secure"><ShieldCheck size={14}/><span>Secure financial workflow</span></div>
          <Link href="/" className="ref-help"><Headphones size={14}/> Portal Home</Link>
        </div>
      </aside>

      <div className="ref-main">
        <header className="ref-topbar">
          <div className="ref-search">
            <Search size={16}/>
            <input placeholder="Search lead, customer, application, UTR..." />
          </div>
          <div className="ref-top-actions">
            <button className="ref-top-icon"><Bell size={17}/><i/></button>
            <span className="ref-division">Savrdh Financial Services</span>
            <div className="ref-top-avatar">SF</div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
