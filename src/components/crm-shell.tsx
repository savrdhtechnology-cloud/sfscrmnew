"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, UserRoundPlus, FileText, BadgeIndianRupee, Landmark,
  WalletCards, Handshake, BarChart3, FolderOpen, Settings, Bell, Search,
  ChevronDown, ShieldCheck, ListChecks, ReceiptIndianRupee, Headphones,
  MessageCircle, CalendarDays, Sun, Moon
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ownerNav = [
  { label:"Dashboard", href:"/portal/owner", icon:LayoutDashboard },
  { label:"Leads", href:"/crm/leads", icon:UserRoundPlus },
  { label:"Applications", href:"/crm/applications", icon:FileText },
  { label:"Loan Pipeline", href:"/crm/pipeline", icon:ListChecks },
  { label:"Customers", href:"/crm/customers", icon:Users },
  { label:"Partners", href:"/crm/partners", icon:Handshake },
  { label:"Lenders", href:"/crm/lenders", icon:Landmark },
  { label:"Payments", href:"/crm/payments", icon:WalletCards },
  { label:"Commission", href:"/crm/commissions", icon:ReceiptIndianRupee },
  { label:"Documents", href:"/crm/documents", icon:FolderOpen },
  { label:"Reports", href:"/crm/reports", icon:BarChart3 }
];

const roleNav:Record<string,typeof ownerNav> = {
  customer:[
    {label:"Dashboard",href:"/portal/customer",icon:LayoutDashboard},
    {label:"My Applications",href:"/portal/customer#applications",icon:FileText},
    {label:"Documents",href:"/portal/customer#documents",icon:FolderOpen},
    {label:"Offers & Sanctions",href:"/portal/customer#offers",icon:BadgeIndianRupee},
    {label:"Notifications",href:"/portal/customer#notifications",icon:Bell}
  ],
  partner:[
    {label:"Dashboard",href:"/portal/partner",icon:LayoutDashboard},
    {label:"Referrals",href:"/portal/partner#referrals",icon:UserRoundPlus},
    {label:"Applications",href:"/portal/partner#applications",icon:FileText},
    {label:"Documents",href:"/portal/partner#documents",icon:FolderOpen},
    {label:"Commission",href:"/portal/partner#commission",icon:ReceiptIndianRupee}
  ],
  employee:[
    {label:"Dashboard",href:"/portal/employee",icon:LayoutDashboard},
    {label:"Assigned Leads",href:"/portal/employee#leads",icon:UserRoundPlus},
    {label:"Applications",href:"/portal/employee#applications",icon:FileText},
    {label:"Follow-ups",href:"/portal/employee#followups",icon:ListChecks},
    {label:"Documents",href:"/portal/employee#documents",icon:FolderOpen},
    {label:"Tasks",href:"/portal/employee#tasks",icon:CheckCircle2}
  ],
  credit:[
    {label:"Dashboard",href:"/portal/credit",icon:LayoutDashboard},
    {label:"Credit Queue",href:"/portal/credit#queue",icon:BadgeIndianRupee},
    {label:"Financial Analysis",href:"/portal/credit#analysis",icon:BarChart3},
    {label:"Risk Flags",href:"/portal/credit#risk",icon:ShieldCheck},
    {label:"Lender Matching",href:"/portal/credit#matching",icon:Landmark},
    {label:"Submissions",href:"/portal/credit#submissions",icon:FileText}
  ],
  manager:[
    {label:"Dashboard",href:"/portal/manager",icon:LayoutDashboard},
    {label:"Loan Pipeline",href:"/portal/manager#pipeline",icon:ListChecks},
    {label:"Assignments",href:"/portal/manager#assignments",icon:Users},
    {label:"Approvals",href:"/portal/manager#approvals",icon:CheckCircle2},
    {label:"Team Analytics",href:"/portal/manager#analytics",icon:BarChart3},
    {label:"Escalations",href:"/portal/manager#escalations",icon:Bell}
  ],
  finance:[
    {label:"Dashboard",href:"/portal/finance",icon:LayoutDashboard},
    {label:"Verification Queue",href:"/portal/finance#verification",icon:ShieldCheck},
    {label:"Disbursements",href:"/portal/finance#disbursements",icon:BadgeIndianRupee},
    {label:"Payments",href:"/portal/finance#payments",icon:WalletCards},
    {label:"Commission",href:"/portal/finance#commission",icon:ReceiptIndianRupee},
    {label:"Reconciliation",href:"/portal/finance#reconciliation",icon:ListChecks}
  ],
  lender:[
    {label:"Dashboard",href:"/portal/lender",icon:LayoutDashboard},
    {label:"Assigned Applications",href:"/portal/lender#applications",icon:FileText},
    {label:"Queries",href:"/portal/lender#queries",icon:MessageCircle},
    {label:"Sanctions",href:"/portal/lender#sanctions",icon:BadgeIndianRupee},
    {label:"Status Updates",href:"/portal/lender#updates",icon:ListChecks}
  ],
  owner:ownerNav
};

export function CrmShell({
  children,
  active="Dashboard",
  role="owner"
}:{
  children:ReactNode;
  active?:string;
  role?:string;
}) {
  const [notificationOpen,setNotificationOpen]=useState(false);
  const [notifications,setNotifications]=useState<any[]>([]);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      let local:any[]=[];
      try{
        const raw=localStorage.getItem("savrdh-crm-notifications");
        local=raw?JSON.parse(raw):[];
      }catch{}
      let live:any[]=[];
      try{
        const {data}=await supabase.from("scp_notifications")
          .select("id,title,body,type,entity_type,entity_id,read_at,created_at")
          .order("created_at",{ascending:false}).limit(12);
        if(data) live=(data as any[]).map(n=>({
          id:n.id,title:n.title,body:n.body||"",entityType:n.entity_type,entityId:n.entity_id,
          createdAt:n.created_at,read:Boolean(n.read_at),live:true
        }));
      }catch{}
      if(active){
        const map=new Map<string,any>();
        [...live,...local].forEach(n=>map.set(n.id,n));
        setNotifications(Array.from(map.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,12));
      }
    };
    void load();
    const sync=()=>{void load();};
    window.addEventListener("savrdh-notification-update",sync);
    window.addEventListener("savrdh-crm-update",sync);
    return()=>{active=false;window.removeEventListener("savrdh-notification-update",sync);window.removeEventListener("savrdh-crm-update",sync)};
  },[]);

  const unread=notifications.filter(n=>!n.read).length;
  const nav=roleNav[role]||ownerNav;

  async function markRead(n:any){
    if(n.live){
      try{await supabase.from("scp_notifications").update({read_at:new Date().toISOString()}).eq("id",n.id);}catch{}
    }else{
      try{
        const raw=localStorage.getItem("savrdh-crm-notifications");const rows=raw?JSON.parse(raw):[];
        localStorage.setItem("savrdh-crm-notifications",JSON.stringify(rows.map((x:any)=>x.id===n.id?{...x,read:true}:x)));
      }catch{}
    }
    setNotifications(prev=>prev.map(x=>x.id===n.id?{...x,read:true}:x));
    if(n.entityType==="lead"&&n.entityId) window.location.href="/crm/leads/"+n.entityId;
    else if(n.entityType==="application"&&n.entityId) window.location.href="/crm/applications/"+n.entityId;
  }

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
          {role==="owner"&&<Link href="/crm/settings" className="lux-nav-item"><Settings size={18}/><span>Settings</span></Link>}
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
            <input placeholder="Search leads, customers, applications, partners..." onKeyDown={(e)=>{ if(e.key==="Enter"){ window.location.href=`/crm/search?q=${encodeURIComponent((e.currentTarget as HTMLInputElement).value)}`; } }} />
            <kbd>⌘ K</kbd>
          </div>

          <div className="lux-top-actions">
            <Link href="/crm/communications" className="lux-whatsapp"><MessageCircle size={18}/> WhatsApp</Link>
            <div className="lux-notification-wrap">
              <button type="button" className="lux-bell" onClick={()=>setNotificationOpen(v=>!v)} aria-label="Notifications">
                <Bell size={18}/>{unread>0&&<span>{unread}</span>}
              </button>
              {notificationOpen&&<div className="lux-notification-menu">
                <div className="lux-notification-head"><strong>Notifications</strong><Link href="/crm/notifications" onClick={()=>setNotificationOpen(false)}>View all</Link></div>
                <div className="lux-notification-list">
                  {notifications.length?notifications.map(n=><button type="button" key={n.id} className={n.read?"read":""} onClick={()=>markRead(n)}>
                    <i/>
                    <div><strong>{n.title}</strong><span>{n.body}</span><small>{new Date(n.createdAt).toLocaleString("en-IN")}</small></div>
                  </button>):<div className="lux-notification-empty">No notifications yet.</div>}
                </div>
              </div>}
            </div>
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
