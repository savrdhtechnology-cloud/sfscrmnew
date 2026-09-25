import { notFound } from "next/navigation";
import { AlertCircle, ArrowRight, BadgeCheck, Boxes, FileText, ShieldCheck } from "lucide-react";
import { PORTALS } from "@/lib/portals";
import { ROLES, type Role } from "@/lib/rbac";
import { CrmShell, PageHeading } from "@/components/crm-shell";

const descriptions:Record<Role,string>={
  customer:"Manage profile, applications, document submissions, offers and disbursement visibility.",
  partner:"Track referrals, referred applications, documents and verified referral ledger activity.",
  employee:"Work assigned leads, applications, follow-ups, document collection and operational tasks.",
  credit:"Review financial profiles, risk indicators, credit analysis, lender matches and submissions.",
  manager:"Control pipeline assignments, approvals, escalations and team-level operating visibility.",
  finance:"Verify payments and disbursements, reconcile transactions and control commission approvals.",
  owner:"Executive control center for applications, lenders, rules, audit, analytics and access.",
  lender:"Future lender workspace for assigned applications, queries, sanctions and status updates."
};

export default async function PortalPage({params}:{params:Promise<{role:string}>}){
  const {role}=await params;
  if(!ROLES.includes(role as Role)) notFound();
  const typedRole=role as Role;
  const portal=PORTALS[typedRole];
  const active=typedRole==="finance"?"Finance & Disbursement":typedRole==="credit"?"Credit Analysis":typedRole==="partner"?"Partners":typedRole==="customer"?"Customers":typedRole==="lender"?"Lender Marketplace":typedRole==="owner"?"Audit & Controls":"Applications";

  return <CrmShell active={active}><main className="content">
    <PageHeading eyebrow="Role Workspace" title={portal.label} description={descriptions[typedRole]} actions={typedRole!=="customer"&&typedRole!=="lender"}/>
    <div className="role-banner"><div><h2>{portal.label}</h2><p>Permissions are isolated for this workspace and sensitive financial completion remains Finance controlled.</p></div><div className="role-chip">{typedRole}</div></div>
    <div className="notice" style={{marginBottom:18}}><AlertCircle size={15}/> Live records are intentionally not fabricated. Modules below will populate when Cloudflare D1 is bound.</div>
    <section className="module-grid">{portal.modules.map((module,index)=><article className="module-card" key={module}><div className="module-icon">{index%3===0?<Boxes size={17}/>:index%3===1?<FileText size={17}/>:<BadgeCheck size={17}/>}</div><div className="module-title">{module}</div><div className="module-desc">Structured {module.toLowerCase()} workspace with role-scoped actions, auditability and live data integration.</div></article>)}</section>
    <section className="grid-2" style={{marginTop:18}}>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Workspace Queue</div><div className="panel-sub">Assigned items and pending actions</div></div><ArrowRight size={18} color="#8f9bab"/></div><div className="empty-state"><div className="empty-icon"><Boxes size={18}/></div><div className="empty-title">No live records connected</div><div className="empty-text">D1-backed queue will appear here after database binding.</div></div></div>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Access & Control</div><div className="panel-sub">Role-specific operating boundary</div></div><ShieldCheck size={18} color="#a67c2d"/></div>
        <div className="panel-body"><div className="control-list"><div className="control-item"><div className="control-check"><BadgeCheck size={16}/></div><div><div className="control-title">Role-scoped access</div><div className="control-desc">Only actions permitted to {portal.label.toLowerCase()} will be available.</div></div></div><div className="control-item"><div className="control-check"><ShieldCheck size={16}/></div><div><div className="control-title">Sensitive actions audited</div><div className="control-desc">Financial and workflow-critical changes remain traceable.</div></div></div></div></div>
      </div>
    </section>
  </main></CrmShell>;
}
