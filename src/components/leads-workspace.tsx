"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, Download, Filter, MoreHorizontal, Plus, Search,
  SlidersHorizontal, UserCheck, Users, X, XCircle
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { DEMO_LEADS } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

type LeadRow={
  id:string;
  createdAt:string;
  name:string;
  mobile:string;
  email?:string;
  business:string;
  businessType?:string;
  loanType?:string;
  loanNeed:string;
  source:string;
  assignedTo:string;
  stage:string;
};

const STORAGE_KEY="savrdh-crm-leads";

const stageLabel=(value:string)=>{
  const v=(value||"new").toLowerCase().replaceAll("_"," ");
  if(v==="new") return "New";
  if(v==="contacted") return "Follow Up";
  if(v==="qualified") return "Qualified";
  if(v==="in progress") return "In Progress";
  if(v==="converted") return "Converted";
  if(v==="rejected") return "Rejected";
  if(v==="lost") return "Lost";
  return value||"New";
};

const stageClass=(value:string)=>{
  const v=stageLabel(value).toLowerCase().replaceAll(" ","-");
  return "lead-status "+v;
};

function mapDemo():LeadRow[]{
  return DEMO_LEADS.map((r,index)=>({
    ...r,
    email:(r as any).email||"",
    businessType:["Rice Mill","Poultry Farming","Manufacturing","Solar Project","Trading"][index]||"Business",
    loanType:["Term Loan","Project Loan","Working Capital","Business Loan","Equipment Finance"][index]||"Term Loan"
  }));
}

export function LeadsWorkspace(){
  const [rows,setRows]=useState<LeadRow[]>([]);
  const [query,setQuery]=useState("");
  const [loanType,setLoanType]=useState("");
  const [status,setStatus]=useState("");
  const [source,setSource]=useState("");
  const [employee,setEmployee]=useState("");
  const [open,setOpen]=useState(false);
  const [saved,setSaved]=useState(false);
  const [page,setPage]=useState(1);
  const pageSize=10;

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const {data,error}=await supabase
          .from("scp_leads")
          .select("id,name,mobile,email,business_name,business_type,source,requested_amount,product_interest,stage,assigned_to,created_at")
          .order("created_at",{ascending:false});
        if(!error && data && data.length){
          if(active) setRows(data.map((r:any)=>({
            id:r.id,
            createdAt:r.created_at,
            name:r.name||"",
            mobile:r.mobile||"",
            email:r.email||"",
            business:r.business_name||"",
            businessType:r.business_type||"",
            loanType:r.product_interest||"Business Loan",
            loanNeed:r.requested_amount?String(r.requested_amount):"",
            source:r.source||"Direct",
            assignedTo:r.assigned_to||"Unassigned",
            stage:r.stage||"new"
          })));
          return;
        }
      }catch{}
      try{
        const local=localStorage.getItem(STORAGE_KEY);
        if(local && active) setRows(JSON.parse(local));
        else if(active) setRows(mapDemo());
      }catch{
        if(active) setRows(mapDemo());
      }
    })();
    return ()=>{active=false};
  },[]);

  function persist(next:LeadRow[]){
    setRows(next);
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); }catch{}
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const row:LeadRow={
      id:crypto.randomUUID(),
      createdAt:new Date().toISOString(),
      name:String(form.get("name")||""),
      mobile:String(form.get("mobile")||""),
      email:String(form.get("email")||""),
      business:String(form.get("business")||""),
      businessType:String(form.get("businessType")||""),
      loanType:String(form.get("loanType")||""),
      loanNeed:String(form.get("loanNeed")||""),
      source:String(form.get("source")||"Direct"),
      assignedTo:String(form.get("assignedTo")||"Unassigned"),
      stage:String(form.get("stage")||"new")
    };

    try{
      await supabase.from("scp_leads").insert({
        name:row.name,
        mobile:row.mobile||null,
        email:row.email||null,
        business_name:row.business||null,
        business_type:row.businessType||null,
        source:row.source,
        requested_amount:row.loanNeed?Number(row.loanNeed):null,
        product_interest:row.loanType||null,
        stage:row.stage
      });
    }catch{}

    persist([row,...rows]);
    e.currentTarget.reset();
    setOpen(false);
    setSaved(true);
    setTimeout(()=>setSaved(false),1800);
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return rows.filter(r=>{
      const queryOk=!q || [r.name,r.mobile,r.email,r.business,r.businessType,r.loanType,r.source,r.assignedTo,r.stage].some(v=>String(v||"").toLowerCase().includes(q));
      const loanOk=!loanType || r.loanType===loanType;
      const statusOk=!status || stageLabel(r.stage)===status;
      const sourceOk=!source || r.source===source;
      const employeeOk=!employee || r.assignedTo===employee;
      return queryOk&&loanOk&&statusOk&&sourceOk&&employeeOk;
    });
  },[rows,query,loanType,status,source,employee]);

  const total=rows.length;
  const newCount=rows.filter(r=>stageLabel(r.stage)==="New").length;
  const progressCount=rows.filter(r=>["Follow Up","In Progress","Qualified"].includes(stageLabel(r.stage))).length;
  const convertedCount=rows.filter(r=>stageLabel(r.stage)==="Converted").length;
  const lostCount=rows.filter(r=>["Lost","Rejected"].includes(stageLabel(r.stage))).length;

  const loanTypes=Array.from(
    new Set(rows.map(r=>r.loanType).filter((value): value is string => Boolean(value)))
  );
  const sources=Array.from(new Set(rows.map(r=>r.source).filter(Boolean)));
  const employees=Array.from(new Set(rows.map(r=>r.assignedTo).filter(Boolean)));

  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const safePage=Math.min(page,pageCount);
  const visible=filtered.slice((safePage-1)*pageSize,safePage*pageSize);

  function resetFilters(){
    setQuery("");setLoanType("");setStatus("");setSource("");setEmployee("");setPage(1);
  }

  function exportCsv(){
    const header=["Name","Mobile","Business","Business Type","Loan Type","Loan Amount","Status","Source","Assigned To","Date"];
    const body=filtered.map(r=>[
      r.name,r.mobile,r.business,r.businessType||"",r.loanType||"",r.loanNeed,stageLabel(r.stage),r.source,r.assignedTo,new Date(r.createdAt).toLocaleDateString("en-IN")
    ]);
    const csv=[header,...body].map(row=>row.map(v=>"\""+String(v??"").replaceAll("\"","\"\"")+"\"").join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="savrdh-leads.csv";a.click();URL.revokeObjectURL(url);
  }

  function removeLead(id:string){
    if(!window.confirm("Delete this lead?")) return;
    persist(rows.filter(r=>r.id!==id));
  }

  const sourceCounts=sources.map(s=>({label:s,count:rows.filter(r=>r.source===s).length})).sort((a,b)=>b.count-a.count).slice(0,6);
  const statusBars=[
    {label:"New",count:newCount},
    {label:"In Progress",count:progressCount},
    {label:"Converted",count:convertedCount},
    {label:"Lost",count:lostCount}
  ];
  const maxStatus=Math.max(1,...statusBars.map(x=>x.count));

  return <CrmShell active="Leads" role="owner">
    <main className="leads-page">
      <section className="leads-title-row">
        <div>
          <div className="leads-crumb">Leads <span>›</span></div>
          <h1>Leads</h1>
          <p>Manage, track and convert your business leads into successful applications.</p>
        </div>
        <div className="leads-quote">“More Leads<br/><em>More Opportunities</em>”</div>
        <button className="lead-add-btn" onClick={()=>setOpen(true)}><Plus size={17}/> Add New Lead</button>
      </section>

      {saved&&<div className="lead-saved"><CheckCircle2 size={15}/> Lead saved successfully.</div>}

      <section className="lead-kpis">
        <Kpi icon={<Users size={23}/>} label="Total Leads" value={total} sub={"Showing "+filtered.length+" records"} tone="gold"/>
        <Kpi icon={<Plus size={23}/>} label="New Leads" value={newCount} sub="Fresh enquiries" tone="blue"/>
        <Kpi icon={<Clock3 size={23}/>} label="In Progress" value={progressCount} sub="Follow-up / qualified" tone="amber"/>
        <Kpi icon={<UserCheck size={23}/>} label="Converted" value={convertedCount} sub="Converted leads" tone="green"/>
        <Kpi icon={<XCircle size={23}/>} label="Lost / Rejected" value={lostCount} sub="Closed without conversion" tone="red"/>
      </section>

      <section className="lead-filter-card">
        <div className="lead-search"><Search size={16}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search by name, mobile, company, location..."/></div>
        <FilterSelect value={loanType} setValue={setLoanType} label="All Loan Types" values={loanTypes}/>
        <FilterSelect value={status} setValue={setStatus} label="All Status" values={["New","Follow Up","In Progress","Qualified","Converted","Rejected","Lost"]}/>
        <FilterSelect value={source} setValue={setSource} label="All Sources" values={sources}/>
        <FilterSelect value={employee} setValue={setEmployee} label="All Employees" values={employees}/>
        <div className="lead-date-filter"><CalendarDays size={15}/><span>This Month</span></div>
        <button className="lead-filter-btn"><Filter size={15}/> Filters</button>
        <button className="lead-reset" onClick={resetFilters}>Reset</button>
      </section>

      <section className="lead-table-card">
        <div className="lead-table-top">
          <div></div>
          <div className="lead-table-tools">
            <button onClick={exportCsv}><Download size={14}/> Export <ChevronDown size={13}/></button>
            <button className="active"><SlidersHorizontal size={14}/></button>
            <button><BarChart3 size={14}/></button>
            <span>Showing {(safePage-1)*pageSize+1}-{Math.min(safePage*pageSize,filtered.length)} of {filtered.length}</span>
            <button disabled={safePage<=1} onClick={()=>setPage(Math.max(1,safePage-1))}><ChevronLeft size={14}/></button>
            <button disabled={safePage>=pageCount} onClick={()=>setPage(Math.min(pageCount,safePage+1))}><ChevronRight size={14}/></button>
          </div>
        </div>
        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead><tr>
              <th><input type="checkbox"/></th><th>#</th><th>Customer Name</th><th>Mobile</th><th>Business Type</th><th>Loan Type</th><th>Loan Amount</th><th>Status</th><th>Source</th><th>Assigned To</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {visible.length===0?<tr><td colSpan={12}><div className="lead-empty">No leads match the selected filters.</div></td></tr>:
              visible.map((row,index)=><tr key={row.id}>
                <td><input type="checkbox"/></td>
                <td>{(safePage-1)*pageSize+index+1}</td>
                <td className="lead-name">{row.name}</td>
                <td>{row.mobile||"—"}</td>
                <td>{row.businessType||row.business||"—"}</td>
                <td>{row.loanType||"—"}</td>
                <td>{row.loanNeed?"₹ "+Number(row.loanNeed).toLocaleString("en-IN"):"—"}</td>
                <td><span className={stageClass(row.stage)}>{stageLabel(row.stage)}</span></td>
                <td>{row.source||"—"}</td>
                <td>{row.assignedTo||"Unassigned"}</td>
                <td>{new Date(row.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                <td><button className="lead-more" onClick={()=>removeLead(row.id)} title="Delete lead"><MoreHorizontal size={17}/></button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lead-bottom-grid">
        <article className="lead-insight-card">
          <h2>Lead Source Distribution</h2>
          <div className="lead-source-content">
            <div className="lead-source-donut"><div><strong>{total}</strong><span>Total Leads</span></div></div>
            <ul>{sourceCounts.length?sourceCounts.map((item,i)=><li key={item.label}><i className={"src s"+(i+1)}></i><span>{item.label}</span><b>{total?Math.round(item.count/total*100):0}%</b></li>):<li><span>No source data</span></li>}</ul>
          </div>
        </article>

        <article className="lead-insight-card">
          <h2>Leads by Status</h2>
          <div className="lead-status-chart">{statusBars.map((item,i)=><div className="lead-bar-wrap" key={item.label}><strong>{item.count}</strong><div className={"lead-bar bar-"+i} style={{height:(28+item.count/maxStatus*78)+"px"}}></div><span>{item.label}</span></div>)}</div>
        </article>

        <article className="lead-insight-card">
          <div className="lead-card-head"><h2>Recent Activities</h2><span>Latest</span></div>
          <div className="lead-activity-list">
            {rows.slice(0,5).map((row,index)=><div key={row.id}><i className={"act a"+((index%4)+1)}></i><p><strong>{index===0?"New lead added":"Lead activity"}</strong><span>{row.name} · {stageLabel(row.stage)}</span></p><small>{index===0?"Just now":(index+1)*15+" min ago"}</small></div>)}
          </div>
        </article>
      </section>

      {open&&<div className="lead-modal-backdrop" onMouseDown={()=>setOpen(false)}>
        <div className="lead-modal" onMouseDown={e=>e.stopPropagation()}>
          <div className="lead-modal-head"><div><h2>Add New Lead</h2><p>Create a new prospect and assign it for follow-up.</p></div><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
          <form className="lead-form" onSubmit={submit}>
            <label><span>Customer Name *</span><input name="name" required placeholder="Full name"/></label>
            <label><span>Mobile *</span><input name="mobile" type="tel" required placeholder="+91"/></label>
            <label><span>Email</span><input name="email" type="email" placeholder="name@email.com"/></label>
            <label><span>Business / Firm</span><input name="business" placeholder="Business name"/></label>
            <label><span>Business Type</span><input name="businessType" placeholder="Rice Mill, Poultry, Manufacturing..."/></label>
            <label><span>Loan Type</span><select name="loanType" defaultValue=""><option value="" disabled>Select</option><option>Term Loan</option><option>Working Capital</option><option>Business Loan</option><option>Project Loan</option><option>Equipment Finance</option></select></label>
            <label><span>Loan Requirement (₹)</span><input name="loanNeed" type="number" placeholder="5000000"/></label>
            <label><span>Lead Source</span><select name="source" defaultValue="Direct"><option>Direct</option><option>Website</option><option>Partner</option><option>WhatsApp</option><option>Referral</option><option>Campaign</option></select></label>
            <label><span>Assigned To</span><input name="assignedTo" placeholder="Employee / Team"/></label>
            <label><span>Status</span><select name="stage" defaultValue="new"><option value="new">New</option><option value="contacted">Follow Up</option><option value="in_progress">In Progress</option><option value="qualified">Qualified</option><option value="converted">Converted</option><option value="rejected">Rejected</option></select></label>
            <div className="lead-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Save Lead</button></div>
          </form>
        </div>
      </div>}
    </main>
  </CrmShell>;
}

function Kpi({icon,label,value,sub,tone}:{icon:React.ReactNode;label:string;value:number;sub:string;tone:string}){
  return <article className="lead-kpi"><div className={"lead-kpi-icon "+tone}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></article>;
}

function FilterSelect({value,setValue,label,values}:{value:string;setValue:(v:string)=>void;label:string;values:string[]}){
  return <div className="lead-select"><select value={value} onChange={e=>setValue(e.target.value)}><option value="">{label}</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select><ChevronDown size={13}/></div>;
}
