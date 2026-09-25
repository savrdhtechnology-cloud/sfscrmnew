import { notFound } from "next/navigation";
import {
  ArrowUpRight, BadgeIndianRupee, Building2, CheckCircle2, FileCheck2,
  FileText, Handshake, Landmark, MoreHorizontal, Plus, TrendingUp,
  Users, WalletCards, UploadCloud, UserPlus, FolderUp, Clock3
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
  partner:"Partners",
  employee:"Leads",
  credit:"Applications",
  manager:"Loan Pipeline",
  finance:"Payments",
  owner:"Dashboard",
  lender:"Lenders"
};

const metricCards = [
  {label:"Total Leads",value:"—",sub:"Awaiting live D1 data",icon:Users,tone:"gold"},
  {label:"Active Applications",value:"—",sub:"Awaiting live D1 data",icon:FileText,tone:"violet"},
  {label:"Sanctioned Amount",value:"—",sub:"Awaiting lender updates",icon:BadgeIndianRupee,tone:"green"},
  {label:"Active Partners",value:"—",sub:"Awaiting partner data",icon:Handshake,tone:"amber"}
] as const;

const stages = [
  {name:"New Leads",count:"—",icon:Users,tone:"blue"},
  {name:"KYC / Documents",count:"—",icon:FileCheck2,tone:"gold"},
  {name:"Credit Analysis",count:"—",icon:TrendingUp,tone:"violet"},
  {name:"Bank Assigned",count:"—",icon:Landmark,tone:"cyan"},
  {name:"Sanctioned",count:"—",icon:CheckCircle2,tone:"green"},
  {name:"Disbursed",count:"—",icon:BadgeIndianRupee,tone:"amber"}
] as const;

export default async function PortalPage({params}:{params:Promise<{role:string}>}){
  const {role}=await params;
  if(!ROLES.includes(role as Role)) notFound();
  const typedRole=role as Role;
  const portal=PORTALS[typedRole];

  return (
    <CrmShell active={activeMap[typedRole]} role={typedRole}>
      <main className="lux-content">
        <section className="lux-welcome">
          <div>
            <span>WELCOME BACK,</span>
            <h1>{typedRole==="owner"?"Savrdh Team":titles[typedRole].replace(" Dashboard","")}!</h1>
            <p>Here&apos;s what&apos;s happening with your loan business today.</p>
          </div>
          <div className="lux-slogan">“Bigger Businesses.<br/><em>Brighter Tomorrows</em>”</div>
        </section>

        <section className="lux-kpi-grid">
          {metricCards.map(({label,value,sub,icon:Icon,tone})=>(
            <article className="lux-kpi" key={label}>
              <div className={`lux-kpi-icon ${tone}`}><Icon size={22}/></div>
              <div className="lux-kpi-copy">
                <span>{label}</span>
                <div className="lux-kpi-number">{value}</div>
                <small>{sub}</small>
              </div>
              <div className={`lux-mini-spark ${tone}`}/>
            </article>
          ))}
        </section>

        <section className="lux-main-grid">
          <div className="lux-card lux-pipeline">
            <div className="lux-card-head">
              <div><h2>Loan Pipeline</h2><p>Track applications at every stage</p></div>
              <button>This Month <ChevronDownIcon/></button>
            </div>
            <div className="lux-stage-row">
              {stages.map(({name,count,icon:Icon,tone},index)=>(
                <div className="lux-stage" key={name}>
                  <div className={`lux-stage-icon ${tone}`}><Icon size={20}/></div>
                  {index<stages.length-1&&<div className="lux-stage-line">›</div>}
                  <span>{name}</span>
                  <strong>{count}</strong>
                  <small>Live after D1 binding</small>
                </div>
              ))}
            </div>
          </div>

          <div className="lux-card lux-actions">
            <div className="lux-card-head"><div><h2>Quick Actions</h2><p>Common tasks</p></div><button>View All →</button></div>
            <div className="lux-action-grid">
              <button><span><Plus size={18}/></span><b>Add Lead</b></button>
              <button><span><FileText size={18}/></span><b>New Application</b></button>
              <button><span><UploadCloud size={18}/></span><b>Upload Document</b></button>
              <button><span><UserPlus size={18}/></span><b>Assign to Team</b></button>
            </div>
          </div>
        </section>

        <section className="lux-charts-grid">
          <div className="lux-card">
            <div className="lux-card-head"><div><h2>Applications Trend</h2><p>Monthly application movement</p></div><button>Last 6 Months</button></div>
            <div className="lux-bars">
              {[38,22,44,28,53,41,59,49,67,44,55,37].map((h,i)=><i key={i} className={i%2===0?"gold":"slate"} style={{height:`${h}%`}}/>)}
            </div>
            <div className="lux-chart-labels"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div>
          </div>

          <div className="lux-card">
            <div className="lux-card-head"><div><h2>Lead Sources</h2><p>Current month</p></div><button>This Month</button></div>
            <div className="lux-donut-wrap">
              <div className="lux-donut bluegold"><strong>—</strong><span>Leads</span></div>
              <ul><li><i className="l1"/>Partner</li><li><i className="l2"/>Website</li><li><i className="l3"/>Direct</li><li><i className="l4"/>WhatsApp</li></ul>
            </div>
          </div>

          <div className="lux-card">
            <div className="lux-card-head"><div><h2>Loan Types</h2><p>Portfolio mix</p></div><button>This Month</button></div>
            <div className="lux-donut-wrap">
              <div className="lux-donut goldblue"><strong>—</strong><span>Applications</span></div>
              <ul><li><i className="l1"/>Term Loan</li><li><i className="l2"/>Working Capital</li><li><i className="l3"/>Business Loan</li><li><i className="l4"/>Machinery</li></ul>
            </div>
          </div>

          <div className="lux-card lux-tasks">
            <div className="lux-card-head"><div><h2>Today&apos;s Tasks</h2><p>Pending actions</p></div><button>View All →</button></div>
            <div className="lux-task-list">
              <div><span><Clock3 size={15}/></span><p><b>Credit review queue</b><small>No live tasks yet</small></p><em>—</em></div>
              <div><span><Landmark size={15}/></span><p><b>Lender follow-ups</b><small>No live tasks yet</small></p><em>—</em></div>
              <div><span><WalletCards size={15}/></span><p><b>Finance verification</b><small>No live tasks yet</small></p><em>—</em></div>
              <div><span><Handshake size={15}/></span><p><b>Partner referrals</b><small>No live tasks yet</small></p><em>—</em></div>
            </div>
          </div>
        </section>

        <section className="lux-bottom-grid">
          <div className="lux-card">
            <div className="lux-card-head"><div><h2>Recent Leads & Applications</h2><p>Latest CRM activity</p></div><button>View All →</button></div>
            <div className="lux-table-wrap">
              <table className="lux-table">
                <thead><tr><th>#</th><th>Name</th><th>Business Type</th><th>Loan Amount</th><th>Stage</th><th>Assigned To</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody><tr><td colSpan={8}><div className="lux-empty-table"><FileText size={23}/><strong>No live records yet</strong><span>D1-connected applications will appear here.</span></div></td></tr></tbody>
              </table>
            </div>
          </div>

          <div className="lux-card">
            <div className="lux-card-head"><div><h2>Recent Activities</h2><p>Workflow updates</p></div><button>View All →</button></div>
            <div className="lux-activity-list">
              <div><span className="a1"><FileText size={14}/></span><p>New lead activity will appear here</p><small>—</small></div>
              <div><span className="a2"><FileCheck2 size={14}/></span><p>Document verification events</p><small>—</small></div>
              <div><span className="a3"><Landmark size={14}/></span><p>Lender submission activity</p><small>—</small></div>
              <div><span className="a4"><WalletCards size={14}/></span><p>Verified payment activity</p><small>—</small></div>
            </div>
          </div>
        </section>
      </main>
    </CrmShell>
  );
}

function ChevronDownIcon(){
  return <span style={{fontSize:10}}>⌄</span>;
}
