"use client";

import { useMemo } from "react";
import {
  BadgeIndianRupee, BarChart3, CheckCircle2, FileCheck2, FileText, FolderOpen,
  Handshake, Landmark, ListChecks, MessageCircle, ShieldCheck, Users, WalletCards
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import type { Role } from "@/lib/rbac";

const configs:Record<Exclude<Role,"owner"|"partner">,{
  title:string;subtitle:string;
  metrics:{label:string;value:string;icon:any;sub:string}[];
  sections:{id:string;title:string;desc:string;icon:any;items:string[]}[]
}>={
  customer:{
    title:"Customer Dashboard",subtitle:"Track your applications, documents, offers and loan status.",
    metrics:[
      {label:"Applications",value:"0",icon:FileText,sub:"Your submitted cases"},
      {label:"Documents",value:"0",icon:FolderOpen,sub:"Uploaded documents"},
      {label:"Active Offers",value:"0",icon:BadgeIndianRupee,sub:"Lender offers"},
      {label:"Notifications",value:"0",icon:MessageCircle,sub:"Recent updates"}
    ],
    sections:[
      {id:"applications",title:"My Applications",desc:"Track every loan application and its current status.",icon:FileText,items:["Application status","Requested amount","Current processing stage","Sanction / disbursement updates"]},
      {id:"documents",title:"Documents",desc:"Upload and manage documents requested for your application.",icon:FolderOpen,items:["KYC documents","Bank statements","ITR / financials","Business documents"]},
      {id:"offers",title:"Offers & Sanctions",desc:"Review lender offers and sanction information.",icon:BadgeIndianRupee,items:["Eligible offers","Sanction details","Conditions pending","Disbursement status"]},
      {id:"notifications",title:"Notifications",desc:"Application and document updates from SAVRDH.",icon:MessageCircle,items:["Document requests","Application updates","Lender updates","Disbursement alerts"]}
    ]
  },
  employee:{
    title:"Employee Dashboard",subtitle:"Work on assigned leads, follow-ups, documents and applications.",
    metrics:[
      {label:"Assigned Leads",value:"0",icon:Users,sub:"Leads assigned to you"},
      {label:"Follow-ups",value:"0",icon:ListChecks,sub:"Pending actions"},
      {label:"Applications",value:"0",icon:FileText,sub:"Cases in processing"},
      {label:"Documents Pending",value:"0",icon:FolderOpen,sub:"Customer documents"}
    ],
    sections:[
      {id:"leads",title:"Assigned Leads",desc:"Only leads allocated to your employee account.",icon:Users,items:["Lead profile","Customer contact","Requirement capture","Convert to application"]},
      {id:"applications",title:"Applications",desc:"Applications created or assigned to you.",icon:FileText,items:["KYC stage","Document collection","Credit hand-off","Status tracking"]},
      {id:"followups",title:"Follow-ups",desc:"Scheduled calls, meetings and reminders.",icon:ListChecks,items:["Calls due","Meetings","Document follow-up","Customer response"]},
      {id:"documents",title:"Documents",desc:"Collect required customer documents.",icon:FolderOpen,items:["Upload","Checklist","Missing documents","Verification status"]},
      {id:"tasks",title:"Tasks",desc:"Your operational work queue.",icon:CheckCircle2,items:["Open tasks","Due today","Completed","Escalated"]}
    ]
  },
  credit:{
    title:"Credit Dashboard",subtitle:"Review borrower financials, risk and lender eligibility.",
    metrics:[
      {label:"Credit Queue",value:"0",icon:BadgeIndianRupee,sub:"Awaiting credit review"},
      {label:"Analysis Pending",value:"0",icon:BarChart3,sub:"Financial assessment"},
      {label:"Risk Flags",value:"0",icon:ShieldCheck,sub:"Cases needing review"},
      {label:"Lender Matches",value:"0",icon:Landmark,sub:"Eligible lender products"}
    ],
    sections:[
      {id:"queue",title:"Credit Queue",desc:"Applications handed over for credit processing.",icon:BadgeIndianRupee,items:["Borrower profile","Bureau score","Banking","Financial documents"]},
      {id:"analysis",title:"Financial Analysis",desc:"Assess turnover, profitability, leverage and repayment.",icon:BarChart3,items:["Turnover","Net profit","DSCR","FOIR / obligations"]},
      {id:"risk",title:"Risk Flags",desc:"Review risks before recommendation.",icon:ShieldCheck,items:["Bureau alerts","Banking anomalies","Document gaps","Liability exposure"]},
      {id:"matching",title:"Lender Matching",desc:"Match approved credit profiles with lender criteria.",icon:Landmark,items:["Eligibility","Policy fit","Loan amount fit","Recommended lender"]},
      {id:"submissions",title:"Submissions",desc:"Track lender submission status after human approval.",icon:FileText,items:["Selected lender","Submission ID","Query status","Sanction response"]}
    ]
  },
  manager:{
    title:"Manager Dashboard",subtitle:"Control pipeline, assignments, approvals and team performance.",
    metrics:[
      {label:"Pipeline Cases",value:"0",icon:ListChecks,sub:"Active applications"},
      {label:"Unassigned",value:"0",icon:Users,sub:"Needs team assignment"},
      {label:"Approvals",value:"0",icon:CheckCircle2,sub:"Waiting for decision"},
      {label:"Escalations",value:"0",icon:ShieldCheck,sub:"Attention required"}
    ],
    sections:[
      {id:"pipeline",title:"Loan Pipeline",desc:"Monitor all operational stages.",icon:ListChecks,items:["New applications","KYC","Credit review","Bank assigned"]},
      {id:"assignments",title:"Assignments",desc:"Allocate leads and applications to team members.",icon:Users,items:["Employee allocation","Credit allocation","Reassignment","Workload view"]},
      {id:"approvals",title:"Approvals",desc:"Human approval gate before lender workflow.",icon:CheckCircle2,items:["Credit recommendation","Lender match approval","Submission approval","Exceptions"]},
      {id:"analytics",title:"Team Analytics",desc:"Operational performance by team member.",icon:BarChart3,items:["Lead conversion","Turnaround time","Open workload","Completed cases"]},
      {id:"escalations",title:"Escalations",desc:"Cases requiring manager intervention.",icon:ShieldCheck,items:["Overdue tasks","Document gaps","Credit exceptions","Lender delays"]}
    ]
  },
  finance:{
    title:"Finance Dashboard",subtitle:"Verify transactions, disbursements, commissions and reconciliation.",
    metrics:[
      {label:"Verification Queue",value:"0",icon:ShieldCheck,sub:"Pending finance checks"},
      {label:"Disbursements",value:"0",icon:BadgeIndianRupee,sub:"Awaiting verification"},
      {label:"Payments",value:"0",icon:WalletCards,sub:"Transactions recorded"},
      {label:"Commission",value:"0",icon:Handshake,sub:"Pending payout review"}
    ],
    sections:[
      {id:"verification",title:"Verification Queue",desc:"Finance-only verification controls.",icon:ShieldCheck,items:["UTR validation","Duplicate check","Sanction consistency","Beneficiary check"]},
      {id:"disbursements",title:"Disbursements",desc:"Verify disbursement before final completion.",icon:BadgeIndianRupee,items:["Lender disbursement","Customer receipt","Reference number","Verified amount"]},
      {id:"payments",title:"Payments",desc:"Review and reconcile recorded transactions.",icon:WalletCards,items:["Customer payment","Lender payment","Refund","Adjustment"]},
      {id:"commission",title:"Commission",desc:"Approve commission only against verified basis.",icon:Handshake,items:["Partner commission","Employee incentive","Verified basis","Payout status"]},
      {id:"reconciliation",title:"Reconciliation",desc:"Match finance records and resolve exceptions.",icon:ListChecks,items:["Bank reference","CRM transaction","Difference","Resolution"]}
    ]
  },
  lender:{
    title:"Lender Dashboard",subtitle:"Review applications submitted to your institution and update outcomes.",
    metrics:[
      {label:"Assigned Applications",value:"0",icon:FileText,sub:"Cases sent to you"},
      {label:"Queries",value:"0",icon:MessageCircle,sub:"Open information requests"},
      {label:"Sanctions",value:"0",icon:BadgeIndianRupee,sub:"Approved cases"},
      {label:"Pending Updates",value:"0",icon:ListChecks,sub:"Status action required"}
    ],
    sections:[
      {id:"applications",title:"Assigned Applications",desc:"Applications submitted to your lender account.",icon:FileText,items:["Borrower summary","Loan request","Documents","Credit summary"]},
      {id:"queries",title:"Queries",desc:"Raise and track information requirements.",icon:MessageCircle,items:["Customer query","Document query","Credit clarification","Response status"]},
      {id:"sanctions",title:"Sanctions",desc:"Record approved loan terms.",icon:BadgeIndianRupee,items:["Sanction amount","Tenure","Rate","Conditions"]},
      {id:"updates",title:"Status Updates",desc:"Update processing status visible to SAVRDH.",icon:ListChecks,items:["Under review","Query raised","Sanctioned","Declined"]}
    ]
  }
};

export function RolePortalWorkspace({role}:{role:Exclude<Role,"owner"|"partner">}){
  const cfg=configs[role];
  return <CrmShell active="Dashboard" role={role}>
    <main className="role-portal-page">
      <section className="role-portal-head">
        <div><span>{role.toUpperCase()} PORTAL</span><h1>{cfg.title}</h1><p>{cfg.subtitle}</p></div>
        <div className="role-access-badge"><ShieldCheck size={15}/> Role isolated workspace</div>
      </section>

      <section className="role-portal-metrics">
        {cfg.metrics.map(({label,value,icon:Icon,sub})=><article key={label}><div><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>)}
      </section>

      <section className="role-portal-grid">
        {cfg.sections.map(({id,title,desc,icon:Icon,items})=><article id={id} key={id} className="role-portal-card">
          <div className="role-portal-card-head"><div><Icon size={18}/></div><section><h2>{title}</h2><p>{desc}</p></section></div>
          <div className="role-module-list">{items.map(item=><div key={item}><CheckCircle2 size={13}/><span>{item}</span></div>)}</div>
        </article>)}
      </section>
    </main>
  </CrmShell>;
}
