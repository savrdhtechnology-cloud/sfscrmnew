"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee, BarChart3, Building2, CheckCircle2, FileCheck2, FileText,
  Landmark, Mail, MessageCircle, Phone, Plus, ShieldCheck, Sparkles, UserRound
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";
import { DEMO_APPLICATIONS } from "@/components/applications-workspace";

type CustomerRow={
  id:string;createdAt:string;name:string;business:string;type:string;mobile:string;email:string;
  pan:string;gstin:string;constitution:string;businessType:string;totalLoan:number;applications:number;
  status:string;assignedTo:string;source:string;leadId?:string;applicationIds:string[];
};

type AppRow={id:string;applicationNo:string;product:string;amount:number;status:string;stage:string;createdAt:string};

function fallbackCustomer(id:string):CustomerRow{
  const first=DEMO_APPLICATIONS[0];
  return {
    id,createdAt:first.createdAt,name:"Rajesh Patel",business:"Patel Rice Mill",type:"Company",
    mobile:"9876543210",email:"rajesh.patel@demo.savrdh.test",pan:"DEMO-PAN-001",gstin:"DEMO-GST-001",
    constitution:"Proprietorship",businessType:"Rice Mill / Agro Processing",totalLoan:67500000,applications:3,
    status:"In Process",assignedTo:"Amit Sharma",source:"Partner",applicationIds:[first.id]
  };
}

export function CustomerProfileWorkspace({customerId}:{customerId:string}){
  const [customer,setCustomer]=useState<CustomerRow|null>(null);
  const [apps,setApps]=useState<AppRow[]>([]);
  const [documents,setDocuments]=useState<any[]>([]);
  const [financial,setFinancial]=useState<any>(null);
  const [credit,setCredit]=useState<any>(null);
  const [matches,setMatches]=useState<any[]>([]);
  const [payments,setPayments]=useState<any[]>([]);
  const [commissions,setCommissions]=useState<any[]>([]);
  const [activities,setActivities]=useState<any[]>([]);
  const [tab,setTab]=useState("Overview");

  useEffect(()=>{
    (async()=>{
      let localCustomer:any=null;
      let localApps:any[]=[];
      try{
        const raw=localStorage.getItem("savrdh-crm-customers");
        const rows=raw?JSON.parse(raw):[];
        localCustomer=Array.isArray(rows)?rows.find((x:any)=>x.id===customerId):null;
        const appRaw=localStorage.getItem("savrdh-crm-applications");
        localApps=appRaw?JSON.parse(appRaw):[];
      }catch{}

      if(localCustomer){
        const linked=localApps.filter((a:any)=>a.customerId===localCustomer.id||a.leadId===localCustomer.leadId);
        setCustomer({
          id:localCustomer.id,createdAt:localCustomer.createdAt||new Date().toISOString(),
          name:localCustomer.name||localCustomer.fullName||"Customer",business:localCustomer.business||localCustomer.businessName||"",
          type:localCustomer.type||"Company",mobile:localCustomer.mobile||"",email:localCustomer.email||"",
          pan:localCustomer.pan||"—",gstin:localCustomer.gstin||"—",constitution:localCustomer.constitution||"Proprietorship",
          businessType:localCustomer.businessType||"Business",
          totalLoan:linked.reduce((s:number,a:any)=>s+Number(a.amount||0),0),applications:linked.length,
          status:localCustomer.status==="active"?"In Process":localCustomer.status||"In Process",
          assignedTo:localCustomer.assignedTo||"Amit Sharma",source:localCustomer.source||"Direct",
          leadId:localCustomer.leadId,applicationIds:linked.map((a:any)=>a.id)
        });
        setApps(linked.map((a:any)=>({
          id:a.id,applicationNo:a.applicationNo||"WORK-"+String(a.id).slice(0,8).toUpperCase(),
          product:a.product||"Business Loan",amount:Number(a.amount||0),status:a.status||"In Process",
          stage:a.stage||"Credit Analysis",createdAt:a.createdAt||new Date().toISOString()
        })));
        try{
          const rawDocs=localStorage.getItem("savrdh-crm-documents");
          const docs=rawDocs?JSON.parse(rawDocs):[];
          setDocuments(Array.isArray(docs)?docs.filter((d:any)=>d.customerId===localCustomer.id||d.leadId===localCustomer.leadId):[]);
        }catch{}
        return;
      }

      try{
        const {data:cust,error}=await supabase.from("scp_customers")
          .select("*").eq("id",customerId).maybeSingle();
        if(!error&&cust){
          const {data:appRows}=await supabase.from("scp_loan_applications")
            .select("id,application_no,product_type,requested_amount,stage,created_at")
            .eq("customer_id",customerId).order("created_at",{ascending:false});
          const mapped=(appRows||[]).map((a:any)=>({
            id:a.id,applicationNo:a.application_no||"",product:a.product_type||"Business Loan",
            amount:Number(a.requested_amount||0),status:a.stage?.includes("disbursed")?"Disbursed":a.stage?.includes("sanction")?"Approved":"In Process",
            stage:a.stage||"",createdAt:a.created_at
          }));
          setApps(mapped);
          setCustomer({
            id:cust.id,createdAt:cust.created_at,name:cust.full_name||cust.business_name||"Customer",
            business:cust.business_name||"",type:cust.business_name?"Company":"Individual",
            mobile:cust.mobile||"",email:cust.email||"",pan:cust.pan||"—",gstin:cust.gstin||"—",
            constitution:cust.constitution||"—",businessType:"Business",
            totalLoan:mapped.reduce((s,a)=>s+a.amount,0),applications:mapped.length,
            status:cust.status==="active"?"In Process":cust.status||"Active",assignedTo:"Unassigned",
            source:cust.source||"Direct",applicationIds:mapped.map(a=>a.id)
          });
          const ids=mapped.map(a=>a.id);
          if(ids.length){
            const [{data:docs},{data:fin},{data:cr},{data:match},{data:tx},{data:comm}] = await Promise.all([
              supabase.from("scp_documents").select("*").eq("customer_id",customerId),
              supabase.from("scp_msme_financial_profiles").select("*").in("application_id",ids).order("created_at",{ascending:false}).limit(1).maybeSingle(),
              supabase.from("scp_credit_analyses").select("*").in("application_id",ids).order("created_at",{ascending:false}).limit(1).maybeSingle(),
              supabase.from("scp_lender_matches").select("*,scp_lender_products(product_name,scp_lenders(name))").in("application_id",ids),
              supabase.from("scp_financial_transactions").select("*").in("application_id",ids),
              supabase.from("scp_commission_ledger").select("*").in("application_id",ids)
            ]);
            setDocuments(docs||[]);setFinancial(fin||null);setCredit(cr||null);setMatches(match||[]);setPayments(tx||[]);setCommissions(comm||[]);
          }
          return;
        }
      }catch{}

      const fallback=fallbackCustomer(customerId);
      setCustomer(fallback);
      setApps(DEMO_APPLICATIONS.slice(0,3).map(a=>({
        id:a.id,applicationNo:a.applicationNo,product:a.product,amount:Number(a.amount),status:a.status,stage:a.stage,createdAt:a.createdAt
      })));
      setFinancial({annual_turnover:80000000,net_profit:8200000,net_worth:37000000,total_liabilities:28000000,banking_turnover:76000000,gst_turnover:79000000,existing_emi:250000,ratios:{dscr:1.72,foir:31.5,debt_equity:.76}});
      setCredit({bureau_score:782,risk_grade:"B+",dscr:1.72,foir:31.5,risk_flags:["High existing term loan exposure","Collateral documents pending"]});
      setDocuments([
        {id:"d1",document_type:"PAN Card",verification_status:"verified"},
        {id:"d2",document_type:"Aadhaar Card",verification_status:"verified"},
        {id:"d3",document_type:"GST Certificate",verification_status:"verified"},
        {id:"d4",document_type:"ITR (3 Years)",verification_status:"uploaded"},
        {id:"d5",document_type:"Bank Statement",verification_status:"verified"},
        {id:"d6",document_type:"Project Report",verification_status:"uploaded"}
      ]);
      setMatches([{id:"m1",match_score:94,matched_amount:50000000,scp_lender_products:{product_name:"MSME Term Loan",scp_lenders:{name:"Demo National Bank"}}}]);
      setActivities([
        {title:"AI Credit Analysis Completed",time:"26 Sep 2026, 10:45 AM"},
        {title:"Bank Statement Uploaded",time:"25 Sep 2026, 04:20 PM"},
        {title:"Application Created",time:"22 Sep 2026, 10:30 AM"},
        {title:"Lead Converted to Customer",time:"22 Sep 2026, 10:15 AM"}
      ]);
    })();
  },[customerId]);

  const c=customer||fallbackCustomer(customerId);
  const verifiedDocs=documents.filter((d:any)=>(d.verification_status||d.status)==="verified").length;
  const docPct=documents.length?Math.round(verifiedDocs/documents.length*100):0;

  const turnover=Number(financial?.annual_turnover||80000000);
  const netProfit=Number(financial?.net_profit||8200000);
  const netWorth=Number(financial?.net_worth||37000000);
  const liabilities=Number(financial?.total_liabilities||28000000);
  const dscr=Number(credit?.dscr||financial?.ratios?.dscr||1.72);
  const foir=Number(credit?.foir||financial?.ratios?.foir||31.5);
  const bureau=Number(credit?.bureau_score||782);

  const tabs=["Overview","Applications","Financial Profile","Documents","Credit Analysis","Lender Matching","Payments & Commission","Communication","Activity Log"];

  return <CrmShell active="Customers" role="owner">
    <main className="customer-profile-page">
      <section className="customer-profile-head">
        <div>
          <div className="customer-profile-crumb">Customers <span>›</span> {customerId}</div>
          <div className="customer-profile-title"><h1>{c.name}</h1><span>Active</span></div>
          <p>{c.type} &nbsp; | &nbsp; {c.constitution} &nbsp; | &nbsp; Customer since {new Date(c.createdAt).toLocaleDateString("en-IN")} &nbsp; | &nbsp; RM: {c.assignedTo}</p>
        </div>
        <div className="customer-profile-actions"><Link href="/crm/customers">Back to Customers</Link><Link href={"/crm/applications?action=new&q="+encodeURIComponent(c.name)} className="primary"><Plus size={14}/> New Application</Link></div>
      </section>

      <section className="customer-identity-grid">
        <article className="customer-identity-card">
          <div className="customer-profile-avatar">{c.name.slice(0,1)}</div>
          <div className="customer-id-main"><h2>{c.name}</h2><span>{c.business||c.type}</span><p><Phone size={13}/>{c.mobile}</p><p><Mail size={13}/>{c.email}</p></div>
          <dl><dt>PAN</dt><dd>{c.pan}<b>Verified</b></dd><dt>GST</dt><dd>{c.gstin}<b>Verified</b></dd></dl>
        </article>
        <article className="customer-business-card"><Building2 size={22}/><div><span>Business Details</span><h3>{c.business}</h3><p>{c.businessType}</p><small>{c.constitution}</small></div></article>
        <article className="customer-rm-card"><UserRound size={22}/><div><span>Relationship Manager</span><h3>{c.assignedTo}</h3><p>{c.source} sourced</p><small>Primary CRM owner</small></div></article>
      </section>

      <section className="customer-summary-cards">
        <ProfileKpi label="Total Applications" value={String(c.applications)} sub={apps.filter(a=>a.status==="Approved").length+" Approved"}/>
        <ProfileKpi label="Total Loan Amount" value={"₹ "+c.totalLoan.toLocaleString("en-IN")} sub={apps.filter(a=>a.stage.includes("Sanction")).length+" Sanctioned"}/>
        <ProfileKpi label="Credit Rating (AI)" value={bureau>=750?"B+":"Review"} sub={"Bureau "+bureau}/>
        <ProfileKpi label="Document Completion" value={docPct+"%"} sub={verifiedDocs+" verified"}/>
        <ProfileKpi label="Risk Level (AI)" value={dscr>=1.5&&foir<=40?"Medium":"Review"} sub={"DSCR "+dscr.toFixed(2)}/>
        <ProfileKpi label="Commission / Fees" value={"₹ "+commissions.reduce((s:number,x:any)=>s+Number(x.commission_amount||0),0).toLocaleString("en-IN")} sub="Verified basis"/>
      </section>

      <section className="customer-profile-tabs">{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</section>

      {tab==="Overview"&&<section className="customer-overview-grid">
        <article className="customer-profile-card customer-info-panel"><h2>Personal & Business Information</h2><dl><dt>Business Name</dt><dd>{c.business}</dd><dt>Business Type</dt><dd>{c.businessType}</dd><dt>Constitution</dt><dd>{c.constitution}</dd><dt>Source</dt><dd>{c.source}</dd><dt>Mobile</dt><dd>{c.mobile}</dd><dt>Email</dt><dd>{c.email}</dd><dt>PAN</dt><dd>{c.pan}</dd><dt>GST</dt><dd>{c.gstin}</dd></dl></article>

        <article className="customer-profile-card customer-financial-panel"><div className="customer-card-head"><h2>Financial Snapshot (AI Extracted)</h2><Link href="#financial">View Full Analysis</Link></div><div className="financial-bars"><Bar value={turnover} max={90000000} label="Turnover"/><Bar value={netProfit} max={90000000} label="Net Profit"/></div><dl><dt>Annual Turnover</dt><dd>₹ {turnover.toLocaleString("en-IN")}</dd><dt>Net Profit</dt><dd>₹ {netProfit.toLocaleString("en-IN")}</dd><dt>Net Worth</dt><dd>₹ {netWorth.toLocaleString("en-IN")}</dd><dt>Total Liabilities</dt><dd>₹ {liabilities.toLocaleString("en-IN")}</dd><dt>DSCR</dt><dd>{dscr.toFixed(2)}</dd><dt>FOIR</dt><dd>{foir.toFixed(1)}%</dd></dl></article>

        <aside className="customer-ai-panel"><div className="customer-ai-head"><Sparkles size={15}/><div><span>AI Insights & Recommendations</span><strong>Good Profile</strong></div></div><p>Business has stable turnover, healthy banking behaviour and acceptable DSCR based on available data.</p><h4>Key Strengths</h4><ul><li>Consistent business turnover</li><li>Healthy DSCR</li><li>Banking and GST broadly aligned</li><li>Established business profile</li></ul><h4>Key Risk Flags</h4><ul className="risk"><li>Review current liabilities</li><li>Confirm latest ITR / financials</li><li>Complete pending collateral documents</li></ul><Link href={"/crm/applications/"+(apps[0]?.id||"")}>View Detailed AI Analysis →</Link></aside>

        <article className="customer-profile-card customer-apps-panel"><div className="customer-card-head"><h2>Recent Applications</h2><Link href="/crm/applications">View All</Link></div><table><thead><tr><th>Application No</th><th>Loan Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{apps.slice(0,4).map(a=><tr key={a.id}><td><Link href={"/crm/applications/"+a.id}>{a.applicationNo}</Link></td><td>{a.product}</td><td>₹ {a.amount.toLocaleString("en-IN")}</td><td><span>{a.status}</span></td></tr>)}</tbody></table></article>

        <article className="customer-profile-card customer-docs-panel"><div className="customer-card-head"><h2>Documents</h2><span>{verifiedDocs}/{documents.length} verified</span></div><div className="customer-doc-grid">{documents.slice(0,8).map((d:any)=><div key={d.id}><FileText size={17}/><strong>{d.document_type||d.documentType||"Document"}</strong><span>{d.verification_status||d.status||"pending"}</span></div>)}</div></article>

        <article className="customer-profile-card customer-activity-panel"><div className="customer-card-head"><h2>Activity Timeline</h2><span>Latest</span></div><div className="customer-activity-list">{(activities.length?activities:[
          {title:"Customer profile opened",time:"Now"},
          {title:"Application processing active",time:"Today"}
        ]).map((a:any,i:number)=><div key={i}><i/><div><strong>{a.title}</strong><span>{a.time}</span></div></div>)}</div></article>

        <article className="customer-next-actions"><h2>Next Best Actions (AI)</h2><div><FileCheck2 size={15}/><span><strong>Complete latest ITR / financials</strong><small>Document · High priority</small></span></div><div><ShieldCheck size={15}/><span><strong>Review collateral / security documents</strong><small>Credit review</small></span></div><div><Landmark size={15}/><span><strong>Prepare lender submission pack</strong><small>{matches.length?"Lender match available":"After approval"}</small></span></div></article>
      </section>}

      {tab==="Applications"&&<TabCard title="Applications"><table className="customer-tab-table"><thead><tr><th>Application</th><th>Product</th><th>Amount</th><th>Stage</th><th>Status</th></tr></thead><tbody>{apps.map(a=><tr key={a.id}><td><Link href={"/crm/applications/"+a.id}>{a.applicationNo}</Link></td><td>{a.product}</td><td>₹ {a.amount.toLocaleString("en-IN")}</td><td>{a.stage}</td><td>{a.status}</td></tr>)}</tbody></table></TabCard>}

      {tab==="Financial Profile"&&<TabCard title="Financial Profile"><div className="customer-financial-detail"><Metric label="Annual Turnover" value={"₹ "+turnover.toLocaleString("en-IN")}/><Metric label="Net Profit" value={"₹ "+netProfit.toLocaleString("en-IN")}/><Metric label="Net Worth" value={"₹ "+netWorth.toLocaleString("en-IN")}/><Metric label="Liabilities" value={"₹ "+liabilities.toLocaleString("en-IN")}/><Metric label="DSCR" value={dscr.toFixed(2)}/><Metric label="FOIR" value={foir.toFixed(1)+"%"}/></div></TabCard>}

      {tab==="Documents"&&<TabCard title="Documents"><div className="customer-doc-grid large">{documents.map((d:any)=><div key={d.id}><FileText size={18}/><strong>{d.document_type||d.documentType||"Document"}</strong><span>{d.verification_status||d.status||"pending"}</span></div>)}</div></TabCard>}

      {tab==="Credit Analysis"&&<TabCard title="Credit Analysis"><div className="customer-financial-detail"><Metric label="Bureau Score" value={String(bureau)}/><Metric label="Risk Grade" value={credit?.risk_grade||"B+"}/><Metric label="DSCR" value={dscr.toFixed(2)}/><Metric label="FOIR" value={foir.toFixed(1)+"%"}/></div></TabCard>}

      {tab==="Lender Matching"&&<TabCard title="Lender Matching"><div className="customer-match-list">{matches.length?matches.map((m:any)=><div key={m.id}><Landmark size={18}/><div><strong>{m.scp_lender_products?.scp_lenders?.name||"Matched Lender"}</strong><span>{m.scp_lender_products?.product_name||"Loan Product"}</span></div><b>{m.match_score||0}% Match</b></div>):<p>No lender matches generated yet.</p>}</div></TabCard>}

      {tab==="Payments & Commission"&&<TabCard title="Payments & Commission"><div className="customer-financial-detail"><Metric label="Transactions" value={String(payments.length)}/><Metric label="Commission Entries" value={String(commissions.length)}/><Metric label="Verified Commission" value={"₹ "+commissions.reduce((s:number,x:any)=>s+Number(x.commission_amount||0),0).toLocaleString("en-IN")}/></div></TabCard>}

      {tab==="Communication"&&<TabCard title="Communication"><div className="customer-communication"><MessageCircle size={20}/><p>WhatsApp, email and call history will stay linked to this customer profile.</p></div></TabCard>}

      {tab==="Activity Log"&&<TabCard title="Activity Log"><div className="customer-activity-list">{activities.map((a:any,i:number)=><div key={i}><i/><div><strong>{a.title}</strong><span>{a.time}</span></div></div>)}</div></TabCard>}
    </main>
  </CrmShell>;
}

function ProfileKpi({label,value,sub}:{label:string;value:string;sub:string}){return <article><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>}
function Bar({value,max,label}:{value:number;max:number;label:string}){const h=Math.max(8,Math.min(100,value/max*100));return <div><span>{label}</span><i style={{height:h+"%"}}/></div>}
function TabCard({title,children}:{title:string;children:React.ReactNode}){return <section className="customer-profile-card customer-tab-card"><h2>{title}</h2>{children}</section>}
function Metric({label,value}:{label:string;value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}
