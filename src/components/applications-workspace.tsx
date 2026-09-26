"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee, BarChart3, CalendarDays, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Clock3, Download, FileCheck2, FileText,
  Filter, Grid2X2, List, MoreHorizontal, Plus, Search, X, XCircle
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";

export type ApplicationRow={
  id:string;
  createdAt:string;
  applicationNo:string;
  customer:string;
  product:string;
  amount:string;
  status:string;
  stage:string;
  source:string;
  assignedTo:string;
};

const STORAGE_KEY="savrdh-crm-applications";

export const DEMO_APPLICATIONS:ApplicationRow[]=[
  {id:"a373183c-a174-4a6c-a31b-1641689fa404",createdAt:"2026-09-22T10:30:00Z",applicationNo:"APP20260922001",customer:"Rajesh Patel",product:"Term Loan",amount:"50000000",status:"In Process",stage:"Document Verification",source:"Partner",assignedTo:"Amit Sharma"},
  {id:"demo-app-2",createdAt:"2026-09-21T09:20:00Z",applicationNo:"APP20260921035",customer:"Neha Gupta",product:"Project Loan",amount:"10000000",status:"Approved",stage:"Sanctioned",source:"Website",assignedTo:"Rakesh Verma"},
  {id:"demo-app-3",createdAt:"2026-09-21T08:40:00Z",applicationNo:"APP20260921034",customer:"Suresh Jain",product:"Working Capital",amount:"7500000",status:"Under Review",stage:"Credit Appraisal",source:"Direct",assignedTo:"Pooja Singh"},
  {id:"demo-app-4",createdAt:"2026-09-20T12:00:00Z",applicationNo:"APP20260920021",customer:"Manoj Mishra",product:"Term Loan",amount:"17500000",status:"Document Pending",stage:"Awaiting Documents",source:"WhatsApp",assignedTo:"Amit Sharma"},
  {id:"demo-app-5",createdAt:"2026-09-19T11:15:00Z",applicationNo:"APP20260919018",customer:"Pooja Mehta",product:"Equipment Finance",amount:"25000000",status:"Disbursed",stage:"Disbursed",source:"Partner",assignedTo:"Neha Gupta"},
  {id:"demo-app-6",createdAt:"2026-09-18T15:00:00Z",applicationNo:"APP20260918012",customer:"Karan Malhotra",product:"Business Loan",amount:"30000000",status:"In Process",stage:"Credit Appraisal",source:"Website",assignedTo:"Rakesh Verma"},
  {id:"demo-app-7",createdAt:"2026-09-18T10:10:00Z",applicationNo:"APP20260918011",customer:"Alka Singh",product:"Working Capital",amount:"5000000",status:"Rejected",stage:"Declined by Lender",source:"Referral",assignedTo:"Pooja Singh"},
  {id:"demo-app-8",createdAt:"2026-09-17T14:30:00Z",applicationNo:"APP20260917009",customer:"Vikram Reddy",product:"Term Loan",amount:"12000000",status:"Approved",stage:"Sanctioned",source:"Direct",assignedTo:"Amit Sharma"},
  {id:"demo-app-9",createdAt:"2026-09-16T09:50:00Z",applicationNo:"APP20260916007",customer:"Sunita Yadav",product:"CGTMSE Loan",amount:"9000000",status:"In Process",stage:"Document Verification",source:"Partner",assignedTo:"Neha Gupta"},
  {id:"demo-app-10",createdAt:"2026-09-15T13:10:00Z",applicationNo:"APP20260915005",customer:"Deepak Sharma",product:"Business Loan",amount:"15000000",status:"Disbursed",stage:"Disbursed",source:"Direct",assignedTo:"Rakesh Verma"}
];

function normalizeStage(value:string){
  const v=(value||"").toLowerCase().replaceAll("_"," ");
  if(v.includes("disbursed")) return "Disbursed";
  if(v.includes("sanction")) return "Sanctioned";
  if(v.includes("credit")) return "Credit Appraisal";
  if(v.includes("document")||v.includes("kyc")) return "Document Verification";
  if(v.includes("lender")||v.includes("bank")) return "Credit Appraisal";
  if(v.includes("new")) return "Received";
  return value?value.replaceAll("_"," "):"Received";
}

function normalizeStatus(stage:string){
  const v=(stage||"").toLowerCase();
  if(v.includes("disbursed")) return "Disbursed";
  if(v.includes("rejected")||v.includes("declined")||v.includes("lost")) return "Rejected";
  if(v.includes("sanction")) return "Approved";
  if(v.includes("credit")) return "Under Review";
  if(v.includes("document")||v.includes("kyc")) return "In Process";
  return "In Process";
}

function mergeApps(...groups:ApplicationRow[][]){
  const map=new Map<string,ApplicationRow>();
  for(const group of groups){
    for(const row of group) map.set(row.id,{...(map.get(row.id)||{}),...row});
  }
  return Array.from(map.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}

export function ApplicationsWorkspace(){
  const [rows,setRows]=useState<ApplicationRow[]>([]);
  const [query,setQuery]=useState("");
  const [loanType,setLoanType]=useState("");
  const [status,setStatus]=useState("");
  const [source,setSource]=useState("");
  const [employee,setEmployee]=useState("");
  const [tab,setTab]=useState("All Applications");
  const [page,setPage]=useState(1);
  const [open,setOpen]=useState(false);
  const [saved,setSaved]=useState(false);
  const pageSize=10;

  useEffect(()=>{
    let active=true;
    (async()=>{
      let localRows:ApplicationRow[]=[];
      try{
        const raw=localStorage.getItem(STORAGE_KEY);
        const parsed=raw?JSON.parse(raw):[];
        if(Array.isArray(parsed)) localRows=parsed.map((r:any)=>({
          id:r.id,createdAt:r.createdAt||new Date().toISOString(),
          applicationNo:r.applicationNo||r.application_no||"WORK-"+String(r.id).slice(-6).toUpperCase(),
          customer:r.customer||"Customer",product:r.product||"Business Loan",amount:String(r.amount||""),
          status:r.status||normalizeStatus(r.stage||""),stage:r.stage||"Received",
          source:r.source||"Direct",assignedTo:r.assignedTo||"Unassigned"
        }));
      }catch{}

      let liveRows:ApplicationRow[]=[];
      try{
        const {data,error}=await supabase
          .from("scp_loan_applications")
          .select("id,application_no,product_type,requested_amount,stage,source_channel,created_at,scp_customers(full_name,business_name)")
          .order("created_at",{ascending:false});
        if(!error && data){
          liveRows=(data as any[]).map((r:any)=>({
            id:r.id,createdAt:r.created_at,applicationNo:r.application_no||"APP",
            customer:r.scp_customers?.full_name||r.scp_customers?.business_name||"Customer",
            product:r.product_type||"Business Loan",amount:String(r.requested_amount||""),
            status:normalizeStatus(r.stage||""),stage:normalizeStage(r.stage||""),
            source:r.source_channel||"Direct",assignedTo:"Unassigned"
          }));
        }
      }catch{}

      if(active) setRows(mergeApps(DEMO_APPLICATIONS,localRows,liveRows));
    })();
    return ()=>{active=false};
  },[]);

  function persist(next:ApplicationRow[]){
    setRows(next);
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      window.dispatchEvent(new Event("savrdh-crm-update"));
    }catch{}
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const row:ApplicationRow={
      id:crypto.randomUUID(),createdAt:new Date().toISOString(),
      applicationNo:"APP"+new Date().toISOString().replace(/\D/g,"").slice(0,14),
      customer:String(fd.get("customer")||""),
      product:String(fd.get("product")||"Business Loan"),
      amount:String(fd.get("amount")||""),
      status:"In Process",
      stage:String(fd.get("stage")||"Received"),
      source:String(fd.get("source")||"Direct"),
      assignedTo:String(fd.get("assignedTo")||"Unassigned")
    };

    try{
      await supabase.from("scp_loan_applications").insert({
        product_type:row.product,
        requested_amount:Number(row.amount||0),
        stage:"new_application",
        source_channel:row.source
      });
    }catch{}

    persist([row,...rows]);
    setOpen(false);setSaved(true);e.currentTarget.reset();
    setTimeout(()=>setSaved(false),1800);
  }

  const loanTypes=Array.from(new Set(rows.map(r=>r.product).filter(Boolean)));
  const sources=Array.from(new Set(rows.map(r=>r.source).filter(Boolean)));
  const employees=Array.from(new Set(rows.map(r=>r.assignedTo).filter(Boolean)));

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return rows.filter(r=>{
      const qOk=!q||Object.values(r).some(v=>String(v).toLowerCase().includes(q));
      const loanOk=!loanType||r.product===loanType;
      const statusOk=!status||r.status===status;
      const sourceOk=!source||r.source===source;
      const employeeOk=!employee||r.assignedTo===employee;
      let tabOk=true;
      if(tab==="Document Verification") tabOk=r.stage==="Document Verification"||r.stage==="Awaiting Documents";
      if(tab==="Under Review") tabOk=r.status==="Under Review"||r.stage==="Credit Appraisal";
      if(tab==="Approved") tabOk=r.status==="Approved";
      if(tab==="Disbursed") tabOk=r.status==="Disbursed";
      if(tab==="Rejected") tabOk=r.status==="Rejected";
      return qOk&&loanOk&&statusOk&&sourceOk&&employeeOk&&tabOk;
    });
  },[rows,query,loanType,status,source,employee,tab]);

  const total=rows.length;
  const inProcess=rows.filter(r=>["In Process","Under Review","Document Pending"].includes(r.status)).length;
  const approved=rows.filter(r=>r.status==="Approved").length;
  const disbursed=rows.filter(r=>r.status==="Disbursed").length;
  const rejected=rows.filter(r=>r.status==="Rejected").length;

  const received=total;
  const docVerify=rows.filter(r=>r.stage==="Document Verification"||r.stage==="Awaiting Documents").length;
  const credit=rows.filter(r=>r.stage==="Credit Appraisal").length;
  const sanctioned=rows.filter(r=>r.stage==="Sanctioned").length;

  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const safePage=Math.min(page,pageCount);
  const visible=filtered.slice((safePage-1)*pageSize,safePage*pageSize);

  const loanMix=loanTypes.map(type=>({type,count:rows.filter(r=>r.product===type).length}))
    .sort((a,b)=>b.count-a.count).slice(0,6);
  const topEmployees=employees.map(name=>{
    const own=rows.filter(r=>r.assignedTo===name);
    return {name,applications:own.length,approved:own.filter(r=>r.status==="Approved").length,disbursed:own.filter(r=>r.status==="Disbursed").length};
  }).sort((a,b)=>b.applications-a.applications).slice(0,5);

  function reset(){
    setQuery("");setLoanType("");setStatus("");setSource("");setEmployee("");setTab("All Applications");setPage(1);
  }

  function exportCsv(){
    const header=["Application No","Customer","Loan Type","Amount","Status","Stage","Source","Assigned To","Created"];
    const body=filtered.map(r=>[r.applicationNo,r.customer,r.product,r.amount,r.status,r.stage,r.source,r.assignedTo,new Date(r.createdAt).toLocaleDateString("en-IN")]);
    const csv=[header,...body].map(row=>row.map(v=>"\""+String(v??"").replaceAll("\"","\"\"")+"\"").join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="savrdh-applications.csv";a.click();URL.revokeObjectURL(url);
  }

  return <CrmShell active="Applications" role="owner">
    <main className="applications-page">
      <section className="applications-title-row">
        <div>
          <div className="applications-crumb">Applications <span>›</span> All Applications</div>
          <h1>Applications</h1>
          <p>Track and manage loan applications from lead to disbursement.</p>
        </div>
        <div className="applications-quote">“From Application<br/><em>to Approval</em>”</div>
        <button className="application-add-btn" onClick={()=>setOpen(true)}><Plus size={17}/> New Application</button>
      </section>

      {saved&&<div className="lead-saved"><CheckCircle2 size={15}/> Application saved successfully.</div>}

      <section className="application-kpis">
        <AppKpi icon={<FileText size={23}/>} label="Total Applications" value={total} sub={"This Month: "+total} tone="blue"/>
        <AppKpi icon={<Clock3 size={23}/>} label="In Process" value={inProcess} sub="Active processing" tone="amber"/>
        <AppKpi icon={<CheckCircle2 size={23}/>} label="Approved" value={approved} sub="Sanctioned cases" tone="green"/>
        <AppKpi icon={<BadgeIndianRupee size={23}/>} label="Disbursed" value={disbursed} sub="Completed disbursement" tone="violet"/>
        <AppKpi icon={<XCircle size={23}/>} label="Rejected" value={rejected} sub="Closed / declined" tone="red"/>
      </section>

      <section className="application-filters">
        <div className="application-search"><Search size={15}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search by application no, customer name, mobile, loan type..."/></div>
        <AppSelect label="All Loan Types" value={loanType} setValue={setLoanType} values={loanTypes}/>
        <AppSelect label="All Status" value={status} setValue={setStatus} values={["In Process","Under Review","Approved","Disbursed","Rejected","Document Pending"]}/>
        <AppSelect label="All Sources" value={source} setValue={setSource} values={sources}/>
        <AppSelect label="All Employees" value={employee} setValue={setEmployee} values={employees}/>
        <div className="application-date"><CalendarDays size={15}/><span>This Month</span></div>
        <button className="application-filter-btn"><Filter size={14}/> Filters</button>
        <button className="application-reset" onClick={reset}>Reset</button>
      </section>

      <section className="application-stage-strip">
        <StageStep index={1} label="Received" count={received} active/>
        <StageStep index={2} label="Document Verification" count={docVerify}/>
        <StageStep index={3} label="Credit Appraisal" count={credit}/>
        <StageStep index={4} label="Sanctioned" count={sanctioned}/>
        <StageStep index={5} label="Disbursed" count={disbursed} last/>
      </section>

      <section className="application-table-card">
        <div className="application-tabs-row">
          <div className="application-tabs">
            {["All Applications","Document Verification","Under Review","Approved","Disbursed","Rejected"].map(item=><button key={item} className={tab===item?"active":""} onClick={()=>{setTab(item);setPage(1)}}>{item}</button>)}
          </div>
          <div className="application-table-tools">
            <button onClick={exportCsv}><Download size={13}/> Export <ChevronDown size={12}/></button>
            <button className="active"><List size={13}/></button>
            <button><Grid2X2 size={13}/></button>
            <span>Showing {filtered.length?((safePage-1)*pageSize+1):0}-{Math.min(safePage*pageSize,filtered.length)} of {filtered.length}</span>
            <button disabled={safePage<=1} onClick={()=>setPage(Math.max(1,safePage-1))}><ChevronLeft size={13}/></button>
            <button disabled={safePage>=pageCount} onClick={()=>setPage(Math.min(pageCount,safePage+1))}><ChevronRight size={13}/></button>
          </div>
        </div>

        <div className="application-table-wrap">
          <table className="application-table">
            <thead><tr><th><input type="checkbox"/></th><th>#</th><th>Application No</th><th>Customer Name</th><th>Loan Type</th><th>Loan Amount</th><th>Status</th><th>Current Stage</th><th>Assigned To</th><th>Created Date</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.length===0?<tr><td colSpan={11}><div className="application-empty">No applications match the selected filters.</div></td></tr>:
              visible.map((row,index)=><tr key={row.id}>
                <td><input type="checkbox"/></td>
                <td>{(safePage-1)*pageSize+index+1}</td>
                <td className="application-number"><Link href={"/crm/applications/"+row.id}>{row.applicationNo}</Link></td>
                <td>{row.customer}</td>
                <td>{row.product}</td>
                <td>₹ {Number(row.amount||0).toLocaleString("en-IN")}</td>
                <td><span className={"application-status "+row.status.toLowerCase().replaceAll(" ","-")}>{row.status}</span></td>
                <td><span className={"application-stage-badge "+row.stage.toLowerCase().replaceAll(" ","-")}>{row.stage}</span></td>
                <td>{row.assignedTo}</td>
                <td>{new Date(row.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                <td><div className="application-actions"><Link href={"/crm/applications/"+row.id}>Open</Link><MoreHorizontal size={16}/></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="application-bottom-grid">
        <article className="application-insight-card">
          <h2>Applications by Loan Type</h2>
          <div className="application-loan-mix">
            <div className="application-donut"><div><strong>{total}</strong><span>Applications</span></div></div>
            <ul>{loanMix.map((item,i)=><li key={item.type}><i className={"mix mix-"+i}></i><span>{item.type}</span><b>{total?Math.round(item.count/total*100):0}%</b></li>)}</ul>
          </div>
        </article>

        <article className="application-insight-card">
          <h2>Application Trend</h2>
          <div className="application-trend-legend"><span><i className="received"></i>Received</span><span><i className="approved"></i>Approved</span><span><i className="disbursed"></i>Disbursed</span></div>
          <svg className="application-trend-chart" viewBox="0 0 420 150" role="img" aria-label="Application trend">
            <line x1="30" y1="125" x2="405" y2="125" stroke="#dfe4ea"/><line x1="30" y1="25" x2="30" y2="125" stroke="#dfe4ea"/>
            <polyline points="35,110 105,86 175,90 245,58 315,45 390,78" fill="none" stroke="currentColor" className="trend-received" strokeWidth="3"/>
            <polyline points="35,122 105,108 175,105 245,88 315,70 390,96" fill="none" stroke="currentColor" className="trend-approved" strokeWidth="3"/>
            <polyline points="35,128 105,121 175,119 245,108 315,96 390,116" fill="none" stroke="currentColor" className="trend-disbursed" strokeWidth="3"/>
            {["Apr","May","Jun","Jul","Aug","Sep"].map((m,i)=><text key={m} x={35+i*71} y="145" fontSize="8" fill="#7c8999">{m}</text>)}
          </svg>
        </article>

        <article className="application-insight-card">
          <div className="application-card-head"><h2>Top Performing Executives</h2><span>This Month</span></div>
          <table className="performer-table"><thead><tr><th>#</th><th>Employee</th><th>Applications</th><th>Approved</th><th>Disbursed</th></tr></thead><tbody>
            {topEmployees.map((item,index)=><tr key={item.name}><td>{index+1}</td><td>{item.name}</td><td>{item.applications}</td><td>{item.approved}</td><td>{item.disbursed}</td></tr>)}
          </tbody></table>
        </article>
      </section>

      {open&&<div className="lead-modal-backdrop" onMouseDown={()=>setOpen(false)}>
        <div className="lead-modal" onMouseDown={e=>e.stopPropagation()}>
          <div className="lead-modal-head"><div><h2>New Application</h2><p>Create a new loan application in Work Mode.</p></div><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
          <form className="lead-form" onSubmit={submit}>
            <label><span>Customer *</span><input name="customer" required placeholder="Customer / Business"/></label>
            <label><span>Loan Type *</span><select name="product" required defaultValue=""><option value="" disabled>Select</option><option>Term Loan</option><option>Working Capital</option><option>Project Loan</option><option>Business Loan</option><option>Equipment Finance</option><option>CGTMSE Loan</option></select></label>
            <label><span>Loan Amount (₹) *</span><input name="amount" type="number" required/></label>
            <label><span>Current Stage</span><select name="stage" defaultValue="Received"><option>Received</option><option>Document Verification</option><option>Credit Appraisal</option><option>Sanctioned</option><option>Disbursed</option></select></label>
            <label><span>Source</span><select name="source" defaultValue="Direct"><option>Direct</option><option>Partner</option><option>Website</option><option>WhatsApp</option><option>Referral</option></select></label>
            <label><span>Assigned To</span><input name="assignedTo" placeholder="Employee"/></label>
            <div className="lead-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Save Application</button></div>
          </form>
        </div>
      </div>}
    </main>
  </CrmShell>;
}

function AppKpi({icon,label,value,sub,tone}:{icon:React.ReactNode;label:string;value:number;sub:string;tone:string}){
  return <article className="application-kpi"><div className={"application-kpi-icon "+tone}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></article>;
}

function AppSelect({label,value,setValue,values}:{label:string;value:string;setValue:(v:string)=>void;values:string[]}){
  return <div className="application-select"><select value={value} onChange={e=>setValue(e.target.value)}><option value="">{label}</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select><ChevronDown size={12}/></div>;
}

function StageStep({index,label,count,active,last}:{index:number;label:string;count:number;active?:boolean;last?:boolean}){
  return <div className={"application-stage-step"+(active?" active":"")}><b>{index}</b><div><span>{label}</span><strong>{count}</strong></div>{!last&&<i/>}</div>;
}
