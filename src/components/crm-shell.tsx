import Link from "next/link";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, UserRoundPlus, FileText, BadgeIndianRupee, Landmark,
  WalletCards, Handshake, BarChart3, FolderOpen, Settings, Bell, Search,
  ChevronDown, ShieldCheck, ListChecks, ReceiptIndianRupee, Headphones,
  MessageCircle, CalendarDays, Sun, Moon
} from "lucide-react";

const nav = [
  { label:"Dashboard", href:"/portal/owner", icon:LayoutDashboard },
  { label:"Leads", href:"/portal/employee", icon:UserRoundPlus },
  { label:"Applications", href:"/portal/manager", icon:FileText },
  { label:"Loan Pipeline", href:"/portal/manager", icon:ListChecks },
  { label:"Customers", href:"/portal/customer", icon:Users },
  { label:"Partners", href:"/portal/partner", icon:Handshake },
  { label:"Lenders", href:"/portal/lender", icon:Landmark },
  { label:"Payments", href:"/portal/finance", icon:WalletCards },
  { label:"Commission", href:"/portal/partner", icon:ReceiptIndianRupee },
  { label:"Documents", href:"/portal/employee", icon:FolderOpen },
  { label:"Reports", href:"/portal/owner", icon:BarChart3 }
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
    <div className="lux-crm-shell">
      <aside className="lux-sidebar">
        <div className="lux-sidebar-glow"/>
        <div className="lux-brand">
          <div className="lux-brand-mark">S</div>
          <div>
            <strong>SAVRDH</strong>
            <span>Financial Services</span>
          </div>
        </div>
        <div className="lux-tagline">FINANCING TODAY<br/>A STRONGER TOMORROW</div>

        <nav className="lux-nav">
          {nav.map(({label,href,icon:Icon})=>(
            <Link key={label} href={href} className={`lux-nav-item ${active===label?"active":""}`}>
              <Icon size={18}/>
              <span>{label}</span>
            </Link>
          ))}
          <Link href="/portal/owner" className="lux-nav-item"><Settings size={18}/><span>Settings</span></Link>
        </nav>

        <div className="lux-grow-card">
          <div className="lux-crown">✦</div>
          <strong>Grow Together</strong>
          <span>Empower businesses.<br/>Finance a stronger tomorrow.</span>
          <i>→</i>
        </div>

        <div className="lux-side-foot">
          <ShieldCheck size={15}/>
          <span>SAVRDH Financial Services Pvt. Ltd.<br/><small>Secure credit operations</small></span>
        </div>
      </aside>

      <div className="lux-main">
        <header className="lux-topbar">
          <div className="lux-search">
            <Search size={17}/>
            <input placeholder="Search leads, customers, applications, partners..." />
            <kbd>⌘ K</kbd>
          </div>

          <div className="lux-top-actions">
            <button className="lux-whatsapp"><MessageCircle size={18}/> WhatsApp</button>
            <button className="lux-bell"><Bell size={18}/><span>3</span></button>
            <div className="lux-profile">
              <div className="lux-profile-avatar">SF</div>
              <div>
                <strong>Savrdh User</strong>
                <span>{role.charAt(0).toUpperCase()+role.slice(1)} Portal</span>
              </div>
              <ChevronDown size={15}/>
            </div>
          </div>
        </header>

        <div className="lux-subbar">
          <div className="lux-date"><CalendarDays size={15}/> Fri, 25 Sep 2026</div>
          <div className="lux-theme-toggle"><Sun size={15}/><Moon size={15}/></div>
        </div>

        {children}
      </div>
    </div>
  );
}
