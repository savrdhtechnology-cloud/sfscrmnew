"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee, Building2, CheckCircle2, ChevronDown, FileCheck2,
  FileText, Filter, Grid2X2, List, MoreHorizontal, Plus, Search,
  ShieldCheck, UserRound, Users, X
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";
import { DEMO_APPLICATIONS } from "@/components/applications-workspace";

type CustomerRow={
  id:string;
  createdAt:string;
  name:string;
  business:string;
  type:string;
  mobile:string;
  email:string;
  pan:string;
  gstin:string;
  constitution:string;
  businessType:string;
  totalLoan:number;
  applications:number;
  status:string;
  assignedTo:string;
  source:string;
  leadId?:string;
  applicationIds:string[];
};

const STORAGE_KEY="savrdh-crm-customers";

const demoMeta=[
  {business:"Patel Rice Mill",type:"Company",mobile:"9876543210",businessType:"Rice Mill",constitution:"Proprietorship",assignedTo:"Amit Sharma",source:"Partner"},
  {business:"Gupta Solar Projects",type:"Company",mobile:"9876500002",businessType:"Solar EPC",constitution:"Proprietorship",assignedTo:"Rakesh Verma",source:"Website"},
  {business:"Jain Trading",type:"Individual",mobile:"9876500003",businessType:"Trading",constitution:"Proprietorship",assignedTo:"Pooja Singh",source:"Direct"},
  {business:"Mishra Poultry",type:"Company",mobile:"9876500004",businessType:"Poultry Farming",constitution:"Proprietorship",assignedTo:"Amit Sharma",source:"WhatsApp"},
  {business:"Mehta Manufacturing",type:"Company",mobile:"9876500005",businessType:"Manufacturing",constitution:"Private Limited",assignedTo:"Neha Gupta",source:"Partner"},
  {business:"Malhotra Enterprises",type:"Company",mobile:"9876500006",businessType:"Services",constitution:"Proprietorship",assignedTo:"Rakesh Verma",source:"Website"},
  {business:"Singh Hospitality",type:"Individual",mobile:"9876500007",businessType:"Hospitality",constitution:"Proprietorship",assignedTo:"Pooja Singh",source:"Referral"},
  {business:"Reddy Transport",type:"Company",mobile:"9876500008",businessType:"Transport",constitution:"Proprietorship",assignedTo:"Amit Sharma",source:"Direct"},
  {business:"Yadav Food Processing",type:"Company",mobile:"9876500009",businessType:"Food Processing",constitution:"Proprietorship",assignedTo:"Neha Gupta",source:"Partner"},
  {business:"Sharma Education",type:"Individual",mobile:"9876500010",businessType:"Education",constitution:"Proprietorship",assignedTo:"Rakesh Verma",source:"Direct"}
];

function demoCustomers():CustomerRow[]{
  const byName=new Map<string,CustomerRow>();
  DEMO_APPLICATIONS.forEach((app,index)=>{
    const meta=demoMeta[index]||demoMeta[0];
    const existing=byName.get(app.customer);
    if(existing){
      existing.totalLoan+=Number(app.amount||0);
      existing.applications+=1;
      existing.applicationIds.push(app.id);
      return;
    }
    byName.set(app.customer,{
      id:"demo-customer-"+(index+1),
      createdAt:app.createdAt,
      name:app.customer,
      business:meta.business,
      type:meta.type,
      mobile:meta.mobile,
      email:app.customer.toLowerCase().replaceAll(" ",".")+"@demo.savrdh.test",
      pan:"DEMO-PAN-"+String(index+1).padStart(3,"0"),
      gstin:meta.type==="Company"?"DEMO-GST-"+String(index+1).padStart(3,"0"):"—",
      constitution:meta.constitution,
      businessType:meta.businessType,
      totalLoan:Number(app.amount||0),
      applications:1,
      status:app.status==="Rejected"?"Closed":app.status==="Disbursed"?"Disbursed":app.status==="Approved"?"Sanctioned":"In Process",
      assignedTo:meta.assignedTo,
      source:meta.source,
      applicationIds:[app.id]
    });
  });
  return Array.from(byName.values());
}

function mergeCustomers(...groups:CustomerRow[][]){
  const map=new Map<string,CustomerRow>();
  for(const group of groups){
    for(const row of group){
      const key=row.id||row.name+"|"+row.mobile;
      map.set(key,{...(map.get(key)||{}),...row});
    }
  }
  return Array.from(map.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}

export function CustomersWorkspace(){
  const [rows,setRows]=useState<CustomerRow[]>([]);
  const [query,setQuery]=useState("");
  const [type,setType]=useState("");
  const [status,setStatus]=useState("");
  const [source,setSource]=useState("");
  const [assigned,setAssigned]=useState("");
  const [selected,setSelected]=useState<CustomerRow|null>(null);
  const [open,setOpen]=useState(false);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      let localRows:CustomerRow[]=[];
      let localApps:any[]=[];
      try{
        const raw=localStorage.getItem(STORAGE_KEY);
        const parsed=raw?JSON.parse(raw):[];
        if(Array.isArray(parsed)){
          const appsRaw=localStorage.getItem("savrdh-crm-applications");
          localApps=appsRaw?JSON.parse(appsRaw):[];
          localRows=parsed.map((r:any)=>({
            id:r.id,
            createdAt:r.createdAt||new Date().toISOString(),
            name:r.name||r.fullName||"Customer",
            business:r.business||r.businessName||"",
            type:r.type||"Company",
            mobile:r.mobile||"",
            email:r.email||"",
            pan:r.pan||"—",
            gstin:r.gstin||"—",
            constitution:r.constitution||"Proprietorship",
            businessType:r.businessType||r.business||"Business",
            totalLoan:localApps.filter((a:any)=>a.customerId===r.id||a.leadId===r.leadId).reduce((s:number,a:any)=>s+Number(a.amount||0),0),
            applications:localApps.filter((a:any)=>a.customerId===r.id||a.leadId===r.leadId).length,
            status:r.status==="active"?"In Process":r.status||"Active",
            assignedTo:r.assignedTo||"Amit Sharma",
            source:r.source||"Direct",
            leadId:r.leadId,
            applicationIds:localApps.filter((a:any)=>a.customerId===r.id||a.leadId===r.leadId).map((a:any)=>a.id)
          }));
        }
      }catch{}

      let liveRows:CustomerRow[]=[];
      try{
        const {data,error}=await supabase
          .from("scp_customers")
          .select("id,customer_code,full_name,business_name,mobile,email,pan,gstin,constitution,source,status,created_at")
          .order("created_at",{ascending:false});
        if(!error&&data){
          for(const row of data as any[]){
            const {data:apps}=await supabase.from("scp_loan_applications")
              .select("id,requested_amount,stage").eq("customer_id",row.id);
            liveRows.push({
              id:row.id,createdAt:row.created_at,name:row.full_name||row.business_name||"Customer",
              business:row.business_name||"",type:row.business_name?"Company":"Individual",
              mobile:row.mobile||"",email:row.email||"",pan:row.pan||"—",gstin:row.gstin||"—",
              constitution:row.constitution||"—",businessType:"Business",
              totalLoan:(apps||[]).reduce((s:number,a:any)=>s+Number(a.requested_amount||0),0),
              applications:(apps||[]).length,status:row.status==="active"?"In Process":row.status||"Active",
              assignedTo:"Unassigned",source:row.source||"Direct",applicationIds:(apps||[]).map((a:any)=>a.id)
            });
          }
        }
      }catch{}

      if(active){
        const next=mergeCustomers(demoCustomers(),localRows,liveRows);
        setRows(next);
        if(selected){
          const fresh=next.find(r=>r.id===selected.id);
          if(fresh) setSelected(fresh);
        }
      }
    };
    void load();
    const sync=()=>{void load();};
    window.addEventListener("savrdh-crm-update",sync);
    window.addEventListener("storage",sync);
    return()=>{active=false;window.removeEventListener("savrdh-crm-update",sync);window.removeEventListener("storage",sync)};
  },[]);

  const types=Array.from(new Set(rows.map(r=>r.type)));
  const sources=Array.from(new Set(rows.map(r=>r.source)));
  const assignees=Array.from(new Set(rows.map(r=>r.assignedTo)));

  const filtered=useMemo(()=>{
    const q=query.toLowerCase().trim();
    return rows.filter(r=>
      (!q||Object.values(r).some(v=>String(v).toLowerCase().includes(q)))&&
      (!type||r.type===type)&&(!status||r.status===status)&&(!source||r.source===source)&&(!assigned||r.assignedTo===assigned)
    );
  },[rows,query,type,status,source,assigned]);

  const totalLoan=rows.reduce((s,r)=>s+r.totalLoan,0);
  const activeApps=rows.reduce((s,r)=>s+r.applications,0);
  const sanctioned=rows.filter(r=>r.status==="Sanctioned").length;
  const inProcess=rows.filter(r=>r.status==="In Process").length;
  const closed=rows.filter(r=>r.status==="Closed"||r.status==="Disbursed").length;

  function persist(next:CustomerRow[]){
    setRows(next);
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      window.dispatchEvent(new Event("savrdh-crm-update"));
    }catch{}
  }

  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const id=crypto.randomUUID();
    const row:CustomerRow={
      id,createdAt:new Date().toISOString(),
      name:String(fd.get("name")||""),business:String(fd.get("business")||""),
      type:String(fd.get("type")||"Company"),mobile:String(fd.get("mobile")||""),
      email:String(fd.get("email")||""),pan:String(fd.get("pan")||"—"),gstin:String(fd.get("gstin")||"—"),
      constitution:String(fd.get("constitution")||"Proprietorship"),
      businessType:String(fd.get("businessType")||"Business"),totalLoan:0,applications:0,
      status:"New",assignedTo:String(fd.get("assignedTo")||"Unassigned"),source:"Direct",applicationIds:[]
    };
    persist([row,...rows]);setOpen(false);setSaved(true);setTimeout(()=>setSaved(false),1800);
  }

  function reset(){setQuery("");setType("");setStatus("");setSource("");setAssigned("");}

  return <CrmShell active="Customers" role="owner">
    <main className="customers-page">
      <section className="customers-head">
        <div><h1>Customers</h1><p>Manage all borrowers and their complete financial, credit and application profile.</p></div>
        <button onClick={()=>setOpen(true)}><Plus size={17}/> Add Customer</button>
      </section>

      {saved&&<div className="module-success"><CheckCircle2 size={15}/> Customer saved in Work Mode.</div>}

      <section className="customer-kpis">
        <CustomerKpi icon={<Users size={20}/>} label="Total Customers" value={String(rows.length)} sub="Borrower profiles"/>
        <CustomerKpi icon={<UserRound size={20}/>} label="Individuals" value={String(rows.filter(r=>r.type==="Individual").length)} sub="Personal borrowers"/>
        <CustomerKpi icon={<Building2 size={20}/>} label="Companies" value={String(rows.filter(r=>r.type==="Company").length)} sub="Business borrowers"/>
        <CustomerKpi icon={<BadgeIndianRupee size={20}/>} label="Total Loan Amount" value={"₹ "+formatCrore(totalLoan)} sub="Across applications"/>
        <CustomerKpi icon={<FileText size={20}/>} label="Active Applications" value={String(activeApps)} sub="Linked applications"/>
        <CustomerKpi icon={<CheckCircle2 size={20}/>} label="Sanctioned" value={String(sanctioned)} sub="Approved cases"/>
        <CustomerKpi icon={<FileCheck2 size={20}/>} label="In Process" value={String(inProcess)} sub="Active processing"/>
        <CustomerKpi icon={<ShieldCheck size={20}/>} label="Closed" value={String(closed)} sub="Closed / disbursed"/>
      </section>

      <section className="customer-filterbar">
        <div className="customer-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, mobile, PAN, GST, company, email..."/></div>
        <CSelect label="Customer Type" value={type} setValue={setType} values={types}/>
        <CSelect label="Status" value={status} setValue={setStatus} values={["New","In Process","Sanctioned","Disbursed","Closed"]}/>
        <CSelect label="Source" value={source} setValue={setSource} values={sources}/>
        <CSelect label="Assigned To" value={assigned} setValue={setAssigned} values={assignees}/>
        <button className="customer-filter-btn"><Filter size={14}/> Filter</button>
        <button className="customer-reset" onClick={reset}>Reset</button>
      </section>

      <section className="customer-status-tabs">
        {[
          ["All",rows.length],["New",rows.filter(r=>r.status==="New").length],
          ["KYC Pending",rows.filter(r=>r.applications===0).length],
          ["Application Created",rows.filter(r=>r.applications>0).length],
          ["In Process",inProcess],["Sanctioned",sanctioned],
          ["Disbursed",rows.filter(r=>r.status==="Disbursed").length],["Closed",closed]
        ].map(([label,count])=><button key={String(label)} onClick={()=>label==="All"?setStatus(""):setStatus(String(label==="Application Created"?"":label==="KYC Pending"?"":label))}><span>{label}</span><b>{count}</b></button>)}
      </section>

      <section className="customers-workspace-grid">
        <article className="customers-table-card">
          <div className="customers-table-tools"><div><button className="active"><List size={14}/></button><button><Grid2X2 size={14}/></button></div><span>Showing {filtered.length} customers</span></div>
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead><tr><th>#</th><th>Name / Company</th><th>Type</th><th>Mobile</th><th>PAN / GST</th><th>Business Type</th><th>Total Loan</th><th>Applications</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((row,index)=><tr key={row.id} className={selected?.id===row.id?"selected":""} onClick={()=>setSelected(row)}>
                  <td>{index+1}</td>
                  <td><div className="customer-name-cell"><div className="customer-avatar">{row.name.slice(0,1)}</div><div><Link href={"/crm/customers/"+row.id}>{row.name}</Link><span>{row.business}</span></div></div></td>
                  <td><span className="customer-type">{row.type}</span></td>
                  <td>{row.mobile||"—"}</td>
                  <td><div className="customer-pan">{row.pan}<small>{row.gstin!=="—"?row.gstin:""}</small></div></td>
                  <td>{row.businessType}</td>
                  <td>₹ {row.totalLoan.toLocaleString("en-IN")}</td>
                  <td>{row.applications}</td>
                  <td><span className={"customer-status "+row.status.toLowerCase().replaceAll(" ","-")}>{row.status}</span></td>
                  <td>{row.assignedTo}</td>
                  <td><Link href={"/crm/customers/"+row.id} className="customer-open">Open</Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </article>

        <aside className={"customer-preview"+(selected?" open":"")}>
          {selected?<CustomerPreview customer={selected}/>:<div className="customer-preview-empty"><UserRound size={28}/><strong>Select a customer</strong><span>Customer profile summary will appear here.</span></div>}
        </aside>
      </section>

      {open&&<div className="module-modal-backdrop" onMouseDown={()=>setOpen(false)}>
        <div className="module-modal" onMouseDown={e=>e.stopPropagation()}>
          <div className="module-modal-head"><div><h2>Add Customer</h2><p>Create a borrower profile.</p></div><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
          <form className="module-form" onSubmit={submit}>
            <label><span>Customer Name *</span><input name="name" required/></label>
            <label><span>Business / Firm</span><input name="business"/></label>
            <label><span>Type</span><select name="type" defaultValue="Company"><option>Company</option><option>Individual</option></select></label>
            <label><span>Mobile *</span><input name="mobile" required/></label>
            <label><span>Email</span><input name="email" type="email"/></label>
            <label><span>Business Type</span><input name="businessType"/></label>
            <label><span>PAN</span><input name="pan"/></label>
            <label><span>GSTIN</span><input name="gstin"/></label>
            <label><span>Constitution</span><select name="constitution" defaultValue="Proprietorship"><option>Proprietorship</option><option>Partnership</option><option>LLP</option><option>Private Limited</option><option>Individual</option></select></label>
            <label><span>Assigned To</span><input name="assignedTo"/></label>
            <div className="module-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Save Customer</button></div>
          </form>
        </div>
      </div>}
    </main>
  </CrmShell>;
}

function CustomerKpi({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){
  return <article className="customer-kpi"><div>{icon}</div><section><span>{label}</span><strong>{value}</strong><small>{sub}</small></section></article>;
}
function CSelect({label,value,setValue,values}:{label:string;value:string;setValue:(v:string)=>void;values:string[]}){
  return <div className="customer-select"><select value={value} onChange={e=>setValue(e.target.value)}><option value="">{label}</option>{values.map(v=><option key={v}>{v}</option>)}</select><ChevronDown size={12}/></div>;
}
function CustomerPreview({customer}:{customer:CustomerRow}){
  return <>
    <div className="customer-preview-head"><span>Customer Details</span><Link href={"/crm/customers/"+customer.id}>Full Profile →</Link></div>
    <div className="customer-preview-person">
      <div className="customer-avatar large">{customer.name.slice(0,1)}</div>
      <div><h3>{customer.name}</h3><span>{customer.type} · {customer.constitution}</span><small>{customer.mobile} · {customer.email}</small></div>
    </div>
    <div className="customer-preview-tabs"><b>Overview</b><span>Applications</span><span>Documents</span><span>Credit</span></div>
    <div className="customer-preview-card"><h4>Basic Information</h4><dl><dt>Business Name</dt><dd>{customer.business}</dd><dt>Business Type</dt><dd>{customer.businessType}</dd><dt>Constitution</dt><dd>{customer.constitution}</dd><dt>Source</dt><dd>{customer.source}</dd><dt>PAN</dt><dd>{customer.pan}</dd><dt>GST</dt><dd>{customer.gstin}</dd></dl></div>
    <div className="customer-preview-two"><div><span>Total Loan Amount</span><strong>₹ {customer.totalLoan.toLocaleString("en-IN")}</strong><small>{customer.applications} Applications</small></div><div><span>Current Status</span><strong>{customer.status}</strong><small>RM: {customer.assignedTo}</small></div></div>
    <div className="customer-preview-actions"><Link href={"/crm/applications?action=new&q="+encodeURIComponent(customer.name)}>Create Application</Link><Link href={"/crm/customers/"+customer.id}>View Full Profile</Link></div>
  </>;
}
function formatCrore(value:number){
  if(value>=10000000) return (value/10000000).toFixed(value>=100000000?1:2)+" Cr";
  return value.toLocaleString("en-IN");
}
