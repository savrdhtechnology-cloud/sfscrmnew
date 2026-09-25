import { notFound } from "next/navigation";
import {
  ArrowUpRight, BadgeIndianRupee, CalendarClock, CheckCircle2, CircleDollarSign,
  Clock3, FileCheck2, FileText, Handshake, Landmark, MoreHorizontal, Plus,
  ShieldCheck, TrendingUp, Users, WalletCards
} from "lucide-react";
import { PORTALS } from "@/lib/portals";
import { ROLES, type Role } from "@/lib/rbac";
import { CrmShell } from "@/components/crm-shell";

const titles:Record<Role,string>={
  customer:"Customer Dashboard",
  partner:"Partner Dashboard",
  employee:"Employee Dashboard",
  credit:"Credit Dashboard",
  manager:"Manager Dashboard",
  finance:"Finance Dashboard",
  owner:"CRM Dashboard",
  lender:"Lender Dashboard"
};

const activeMap:Record<Role,string>={
  customer:"Customers",
  partner:"Commissions",
  employee:"Leads",
  credit:"Credit Analysis",
  manager:"Applications",
  finance:"Payments",
  owner:"Dashboard",
  lender:"Lenders"
};

const metrics = [
  {label:"Total Applications",value:"0",sub:"No live records yet",icon:FileText,tone:"blue"},
  {label:"Under Credit Review",value:"0",sub:"Pending analysis",icon:BadgeIndianRupee,tone:"violet"},
  {label:"Sanctioned",value:"0",sub:"Awaiting live lender data",icon:CheckCircle2,tone:"green"},
  {label:"Disbursement Queue",value:"0",sub:"Finance verification only",icon:WalletCards,tone:"orange"}
] as const;

const pipeline = [
  {name:"New Applications",count:0,width:"8%"},
  {name:"Credit Review",count:0,width:"8%"},
  {name:"Lender Submitted",count:0,width:"8%"},
  {name:"Sanctioned",count:0,width:"8%"},
  {name:"Disbursed",count:0,width:"8%"}
];

export default async function PortalPage({params}:{params:Promise<{role:string}>}){
  const {role}=await params;
  if(!ROLES.includes(role as Role)) notFound();
  const typedRole=role as Role;
  const portal=PORTALS[typedRole];

  return (
    <CrmShell active={activeMap[typedRole]} role={typedRole}>
      <main className="ref-content">
        <div className="ref-page-head">
          <div>
            <div className="ref-breadcrumb">Dashboard / {portal.label}</div>
            <h1>{titles[typedRole]}</h1>
            <p>Monitor applications, credit workflow, lender activity and finance-controlled transactions.</p>
          </div>
          <div className="ref-head-actions">
            <button className="ref-outline-btn"><CalendarClock size={15}/> Today</button>
            <button className="ref-primary-btn"><Plus size={15}/> New Application</button>
          </div>
        </div>

        <section className="ref-metric-grid">
          {metrics.map(({label,value,sub,icon:Icon,tone})=>(
            <article className="ref-metric-card" key={label}>
              <div className={`ref-metric-icon ${tone}`}><Icon size={18}/></div>
              <div>
                <span className="ref-metric-label">{label}</span>
                <div className="ref-metric-value-row"><strong>{value}</strong><small>—</small></div>
                <p>{sub}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="ref-dashboard-grid">
          <div className="ref-card ref-pipeline-card">
            <div className="ref-card-head">
              <div>
                <h2>Application Pipeline</h2>
                <p>Current application status distribution</p>
              </div>
              <button className="ref-card-menu"><MoreHorizontal size={18}/></button>
            </div>
            <div className="ref-pipeline-list">
              {pipeline.map((row,index)=>(
                <div className="ref-pipeline-row" key={row.name}>
                  <div className="ref-pipeline-name"><span className={`dot d${index+1}`}/>{row.name}</div>
                  <div className="ref-pipeline-track"><div className={`ref-pipeline-fill f${index+1}`} style={{width:row.width}}/></div>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
            <div className="ref-pipeline-foot">
              <span><TrendingUp size={14}/> Pipeline will populate from Cloudflare D1</span>
              <button>View applications <ArrowUpRight size={13}/></button>
            </div>
          </div>

          <div className="ref-card ref-summary-card">
            <div className="ref-card-head">
              <div><h2>Quick Summary</h2><p>Operational controls</p></div>
            </div>
            <div className="ref-summary-list">
              <div><span className="sum-icon green"><ShieldCheck size={16}/></span><p><strong>Finance Verification</strong><small>Required before disbursement</small></p><b>ON</b></div>
              <div><span className="sum-icon blue"><CircleDollarSign size={16}/></span><p><strong>Duplicate UTR Block</strong><small>Transaction-level protection</small></p><b>ON</b></div>
              <div><span className="sum-icon purple"><Handshake size={16}/></span><p><strong>Commission Basis</strong><small>Verified records only</small></p><b>ON</b></div>
              <div><span className="sum-icon orange"><FileCheck2 size={16}/></span><p><strong>Audit Trail</strong><small>Sensitive actions logged</small></p><b>ON</b></div>
            </div>
          </div>
        </section>

        <section className="ref-bottom-grid">
          <div className="ref-card">
            <div className="ref-card-head">
              <div><h2>Recent Applications</h2><p>Latest customer applications</p></div>
              <button className="ref-text-btn">View all</button>
            </div>
            <div className="ref-table-wrap">
              <table className="ref-table">
                <thead><tr><th>APPLICATION</th><th>CUSTOMER</th><th>PRODUCT</th><th>AMOUNT</th><th>STATUS</th><th>ASSIGNED TO</th></tr></thead>
                <tbody>
                  <tr className="ref-empty-row"><td colSpan={6}>
                    <div><FileText size={22}/><strong>No live applications yet</strong><span>D1-connected applications will appear here.</span></div>
                  </td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="ref-card">
            <div className="ref-card-head">
              <div><h2>Tasks & Alerts</h2><p>Pending operational actions</p></div>
              <button className="ref-text-btn">View all</button>
            </div>
            <div className="ref-task-list">
              <div><span className="task-icon blue"><Clock3 size={16}/></span><p><strong>Credit review queue</strong><small>No pending live records</small></p><em>0</em></div>
              <div><span className="task-icon orange"><Landmark size={16}/></span><p><strong>Lender follow-ups</strong><small>No pending lender updates</small></p><em>0</em></div>
              <div><span className="task-icon green"><WalletCards size={16}/></span><p><strong>Finance verification</strong><small>No pending transactions</small></p><em>0</em></div>
              <div><span className="task-icon purple"><Users size={16}/></span><p><strong>Partner referrals</strong><small>No pending referrals</small></p><em>0</em></div>
            </div>
          </div>
        </section>

        <section className="ref-quick-actions">
          <button><span><Plus size={16}/></span><div><strong>Create Application</strong><small>Start new credit case</small></div></button>
          <button><span><Users size={16}/></span><div><strong>Add Customer</strong><small>Create customer profile</small></div></button>
          <button><span><BadgeIndianRupee size={16}/></span><div><strong>Credit Review</strong><small>Open analysis queue</small></div></button>
          <button><span><Landmark size={16}/></span><div><strong>Lender Match</strong><small>Review lender options</small></div></button>
        </section>
      </main>
    </CrmShell>
  );
}
