import { Activity, BadgeIndianRupee, FileCheck2, Landmark, ShieldCheck, Users, WalletCards } from "lucide-react";
import { PORTALS } from "@/lib/portals";
import { CrmShell, PageHeading, ControlItem, PortalLink, EmptyActivity } from "@/components/crm-shell";

const kpis=[
  {label:"Active Applications",value:"—",foot:"Awaiting live D1 data",icon:FileCheck2},
  {label:"Sanction Pipeline",value:"—",foot:"Verified lender updates only",icon:Landmark},
  {label:"Disbursement Queue",value:"—",foot:"Finance verification required",icon:WalletCards},
  {label:"Partner Referrals",value:"—",foot:"Referral ledger not connected",icon:Users}
];
const pipeline=[["New / Draft",0],["Credit Review",0],["Matched to Lender",0],["Sanctioned",0],["Disbursement Verification",0]] as const;

export default function HomePage(){
  return <CrmShell><main className="content">
    <PageHeading eyebrow="Savrdh Financial Services" title="Credit Operations Dashboard" description="One controlled workspace for customer onboarding, underwriting, lender matching, disbursement verification, commissions and audit."/>
    <section className="kpi-grid">
      {kpis.map(({label,value,foot,icon:Icon})=><article className="kpi-card" key={label}>
        <div className="kpi-top"><div className="kpi-icon"><Icon size={18}/></div><ShieldCheck size={16} color="#9aa6b4"/></div>
        <div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-foot">{foot}</div>
      </article>)}
    </section>
    <section className="grid-2">
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Application Pipeline</div><div className="panel-sub">Live stage distribution will populate from D1</div></div><BadgeIndianRupee size={18} color="#8f9bab"/></div>
        <div className="panel-body"><div className="pipeline">{pipeline.map(([label,count])=><div className="pipe-row" key={label}><div className="pipe-label">{label}</div><div className="pipe-track"><div className="pipe-fill" style={{width:count?"34%":"0%"}}/></div><div className="pipe-num">{count}</div></div>)}</div></div>
      </div>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Financial Control Layer</div><div className="panel-sub">Non-bypassable operating rules</div></div><ShieldCheck size={18} color="#a67c2d"/></div>
        <div className="panel-body"><div className="control-list"><ControlItem title="Finance-only disbursement verification" description="Employees and partners cannot mark loans as disbursed."/><ControlItem title="Duplicate UTR protection" description="Transaction references remain unique at database level."/><ControlItem title="Verified commission basis" description="Commissions arise only from verified disbursement/payment records."/></div></div>
      </div>
    </section>
    <section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><div className="panel-title">Role Workspaces</div><div className="panel-sub">Operational access separated by responsibility</div></div><Activity size={18} color="#8f9bab"/></div>
      <div className="panel-body"><div className="portal-strip">{Object.values(PORTALS).map(portal=><div className="portal-card" key={portal.role}><div className="portal-name">{portal.label}</div><div className="portal-modules">{portal.modules.slice(0,3).join(" · ")}</div><PortalLink href={portal.path}/></div>)}</div></div>
    </section>
    <section className="grid-2">
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Recent Workflow Activity</div><div className="panel-sub">Applications, approvals, sanctions and financial events</div></div></div><EmptyActivity/></div>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Infrastructure Status</div><div className="panel-sub">Current platform readiness</div></div></div>
        <div className="panel-body"><div className="control-list"><ControlItem title="Cloudflare Worker" description="Application runtime is live in production."/><ControlItem title="Role-based architecture" description="Customer, Partner, Employee, Credit, Manager, Finance, Owner and Lender workspaces are defined."/><div className="notice"><Landmark size={15}/> D1 database and R2 document storage are the next live-data bindings.</div></div></div>
      </div>
    </section>
  </main></CrmShell>;
}
