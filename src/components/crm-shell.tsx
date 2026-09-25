import Link from "next/link";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Files, Users, BadgeIndianRupee, Landmark, WalletCards,
  Handshake, FolderLock, BarChart3, ShieldCheck, Search, Bell, Settings,
  Plus, UserPlus, CheckCircle2, ChevronRight
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Applications", href: "/portal/manager", icon: Files },
  { label: "Customers", href: "/portal/customer", icon: Users },
  { label: "Credit Analysis", href: "/portal/credit", icon: BadgeIndianRupee },
  { label: "Lender Marketplace", href: "/portal/lender", icon: Landmark },
  { label: "Finance & Disbursement", href: "/portal/finance", icon: WalletCards },
  { label: "Partners", href: "/portal/partner", icon: Handshake },
  { label: "Documents", href: "/portal/employee", icon: FolderLock },
  { label: "Analytics", href: "/portal/owner", icon: BarChart3 },
  { label: "Audit & Controls", href: "/portal/owner", icon: ShieldCheck }
];

export function CrmShell({children,active="Dashboard"}:{children:ReactNode;active?:string}) {
  return (
    <div className="crm-shell">
      <aside className="crm-sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-copy"><div className="brand-title">Savrdh Credit</div><div className="brand-sub">Financial Services</div></div>
        </div>
        <div className="nav-section">
          <div className="nav-kicker">Workspace</div>
          <nav className="nav-list">
            {nav.map(({label,href,icon:Icon})=>(
              <Link key={label} href={href} className={`nav-item ${active===label?"active":""}`}>
                <Icon className="nav-icon"/><span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer"><div className="sidebar-secure"><span className="secure-dot"/><span>Finance-controlled secure workflow</span></div></div>
      </aside>

      <div className="crm-main">
        <header className="crm-topbar">
          <div className="search-box"><Search size={16}/><input placeholder="Search customers, applications, UTR, lender..." aria-label="Search CRM"/></div>
          <div className="top-actions">
            <span className="env-pill">Cloudflare · Production</span>
            <button className="icon-btn" aria-label="Notifications"><Bell size={17}/></button>
            <button className="icon-btn" aria-label="Settings"><Settings size={17}/></button>
            <div className="avatar">SF</div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function PageHeading({eyebrow,title,description,actions=true}:{eyebrow:string;title:string;description:string;actions?:boolean}) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-desc">{description}</p></div>
      {actions&&<div className="heading-actions"><button className="btn btn-secondary"><UserPlus size={16}/> Add Customer</button><button className="btn btn-primary"><Plus size={16}/> New Application</button></div>}
    </div>
  );
}

export function EmptyActivity(){
  return <div className="empty-state"><div className="empty-icon"><Files size={19}/></div><div className="empty-title">No live activity yet</div><div className="empty-text">Recent applications and workflow events will appear after D1 is connected.</div></div>;
}
export function ControlItem({title,description}:{title:string;description:string}){
  return <div className="control-item"><div className="control-check"><CheckCircle2 size={16}/></div><div><div className="control-title">{title}</div><div className="control-desc">{description}</div></div></div>;
}
export function PortalLink({href}:{href:string}){
  return <Link className="portal-link" href={href}>Open workspace <ChevronRight size={13}/></Link>;
}
