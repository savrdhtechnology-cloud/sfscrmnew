"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BadgeIndianRupee, BarChart3, CheckCircle2, FileText, Filter,
  Landmark, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal,
  UploadCloud, Users, WalletCards, X
} from "lucide-react";
import type { ModuleDef } from "@/lib/crm-modules";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";
import { DEMO_LEADS } from "@/lib/demo-data";

type Row = Record<string,string> & { id:string; createdAt:string };

function storageKey(key:string){ return `savrdh-crm-${key}`; }

export function CrmModuleWorkspace({
  definition,
  initialAction,
  initialQuery
}:{
  definition:ModuleDef;
  initialAction?:string;
  initialQuery?:string;
}){
  const [rows,setRows]=useState<Row[]>([]);
  const [query,setQuery]=useState(initialQuery??"");
  const [open,setOpen]=useState(Boolean(initialAction && definition.fields?.length));
  const [saved,setSaved]=useState(false);
  const [showFilter,setShowFilter]=useState(false);
  const [compact,setCompact]=useState(false);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        if(definition.key==="applications"){
          const {data,error}=await supabase
            .from("scp_loan_applications")
            .select("id,application_no,product_type,requested_amount,stage,created_at,scp_customers(full_name,business_name)")
            .order("created_at",{ascending:false});
          if(!error && data){
            if(active) setRows((data as any[]).map((row:any)=>({
              id:row.id,
              createdAt:row.created_at,
              customer:row.scp_customers?.full_name||row.scp_customers?.business_name||"Customer",
              product:row.product_type||"",
              amount:row.requested_amount?String(row.requested_amount):"",
              stage:row.stage||"",
              assignedTo:"—",
              applicationNo:row.application_no||""
            })));
            return;
          }
          const raw=localStorage.getItem(storageKey(definition.key));
          if(raw && active) setRows(JSON.parse(raw));
          return;
        }
        if(definition.key==="leads"){
          const {data,error}=await supabase
            .from("scp_leads")
            .select("id,name,mobile,email,business_name,source,requested_amount,stage,created_at")
            .order("created_at",{ascending:false});
          if(error){
            const local=localStorage.getItem(storageKey(definition.key));
            if(local && active) setRows(JSON.parse(local));
            else if(active) setRows(DEMO_LEADS.map(row=>({...row})));
            return;
          }
          if(active) setRows((data||[]).map((row:any)=>({
            id:row.id,
            createdAt:row.created_at,
            name:row.name||"",
            mobile:row.mobile||"",
            email:row.email||"",
            business:row.business_name||"",
            loanNeed:row.requested_amount?String(row.requested_amount):"",
            source:row.source||"",
            assignedTo:"—",
            stage:row.stage||""
          })));
          return;
        }
        const raw=localStorage.getItem(storageKey(definition.key));
        if(raw && active) setRows(JSON.parse(raw));
      }catch(err){
        console.error(err);
      }
    })();
    return ()=>{active=false};
  },[definition.key]);

  function persist(next:Row[]){
    setRows(next);
    try{
      localStorage.setItem(storageKey(definition.key),JSON.stringify(next));
      window.dispatchEvent(new Event("savrdh-crm-update"));
    }catch{}
  }

  function removeRow(id:string){
    if(!window.confirm("Delete this record from work mode?")) return;
    persist(rows.filter(row=>row.id!==id));
  }

  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const data:Record<string,string>={};
    for(const field of definition.fields??[]){
      if(field.type==="file"){
        const file=form.get(field.key);
        data.fileName=file instanceof File ? file.name : "";
        data[field.key]=data.fileName;
      }else{
        data[field.key]=String(form.get(field.key)??"");
      }
    }
    const row:Row={...data,id:crypto.randomUUID(),createdAt:new Date().toISOString()};
    persist([row,...rows]);
    e.currentTarget.reset();
    setOpen(false);
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return rows;
    return rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q)));
  },[rows,query]);

  const activeMap:Record<string,string>={
    leads:"Leads",applications:"Applications",pipeline:"Loan Pipeline",customers:"Customers",
    partners:"Partners",lenders:"Lenders",payments:"Payments",commissions:"Commission",
    documents:"Documents",reports:"Reports",settings:"Settings",team:"Team Management",audit:"Audit & Controls"
  };

  return (
    <CrmShell active={activeMap[definition.key]??""} role="owner">
      <main className="module-page">
        <div className="module-page-head">
          <div>
            <Link href="/portal/owner" className="module-back"><ArrowLeft size={14}/> Dashboard</Link>
            <h1>{definition.title}</h1>
            <p>{definition.subtitle}</p>
          </div>
          <div className="module-head-actions">
            {definition.primaryAction && definition.fields && definition.fields.length>0 && (
              <button className="module-primary" onClick={()=>setOpen(true)}>
                {definition.key==="documents"?<UploadCloud size={15}/>:<Plus size={15}/>} {definition.primaryAction}
              </button>
            )}
          </div>
        </div>

        {saved && <div className="module-success"><CheckCircle2 size={15}/> Saved in this browser preview. Live D1 persistence will replace local preview storage.</div>}

        {definition.key==="pipeline" ? <PipelineBoard/> :
         definition.key==="reports" ? <ReportsPanel/> :
         definition.key==="settings" ? <SettingsPanel/> :
         definition.key==="audit" ? <AuditPanel/> :
         definition.key==="notifications" ? <NotificationsPanel/> :
         definition.key==="communications" ? <CommunicationsPanel/> :
         definition.key==="search" ? <SearchPanel query={query} setQuery={setQuery}/> :
         <section className="module-card">
            <div className="module-toolbar">
              <div className="module-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${definition.title.toLowerCase()}...`}/></div>
              <div className="module-toolbar-actions"><button type="button" onClick={()=>setShowFilter(!showFilter)}><Filter size={14}/> Filter</button><button type="button" onClick={()=>setCompact(!compact)}><SlidersHorizontal size={14}/> {compact?"Comfortable":"Compact"}</button></div>
            </div>
            {showFilter&&<div className="module-filter-row">
              <span>Quick filter</span>
              <button type="button" onClick={()=>setQuery("")}>All</button>
              <button type="button" onClick={()=>setQuery("new")}>New</button>
              <button type="button" onClick={()=>setQuery("active")}>Active</button>
              <button type="button" onClick={()=>setQuery("pending")}>Pending</button>
            </div>}
            <div className={"module-table-wrap"+(compact?" compact":"")}>
              <table className="module-table">
                <thead><tr>{(definition.columns??[]).map(c=><th key={c.key}>{c.label}</th>)}<th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length===0 ? <tr><td colSpan={(definition.columns?.length??0)+2}><EmptyModule title={definition.title}/></td></tr> :
                    filtered.map(row=><tr key={row.id}>
                      {(definition.columns??[]).map(c=><td key={c.key}>{row[c.key]||"—"}</td>)}
                      <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td>{definition.key==="applications"?<Link className="row-open" href={"/crm/applications/"+row.id}>Open</Link>:<button type="button" className="row-delete" onClick={()=>removeRow(row.id)}>Delete</button>}</td>
                    </tr>)
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        {open && <div className="module-modal-backdrop" onMouseDown={()=>setOpen(false)}>
          <div className="module-modal" onMouseDown={e=>e.stopPropagation()}>
            <div className="module-modal-head"><div><h2>{definition.primaryAction}</h2><p>{definition.subtitle}</p></div><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
            <form onSubmit={submit} className="module-form">
              {(definition.fields??[]).map(field=><label key={field.key}>
                <span>{field.label}{field.required?" *":""}</span>
                {field.type==="select" ? <select name={field.key} required={field.required} defaultValue=""><option value="" disabled>Select</option>{field.options?.map(o=><option key={o}>{o}</option>)}</select> :
                 <input name={field.key} type={field.type??"text"} required={field.required} placeholder={field.placeholder}/>}
              </label>)}
              <div className="module-form-note"><ShieldCheck size={14}/> Sensitive financial completion remains Finance controlled.</div>
              <div className="module-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Save {definition.singular}</button></div>
            </form>
          </div>
        </div>}
      </main>
    </CrmShell>
  );
}

function EmptyModule({title}:{title:string}){
  return <div className="module-empty"><FileText size={24}/><strong>No {title.toLowerCase()} yet</strong><span>Create the first record using the action above.</span></div>;
}

function PipelineBoard(){
  const stages=["New Application","KYC / Documents","Credit Analysis","Bank Assigned","Sanctioned","Disbursement Pending"];
  const [apps,setApps]=useState<Row[]>([]);
  useEffect(()=>{
    const load=()=>{
      try{
        const raw=localStorage.getItem(storageKey("applications"));
        setApps(raw?JSON.parse(raw):[]);
      }catch{setApps([])}
    };
    load();
    window.addEventListener("savrdh-crm-update",load);
    return ()=>window.removeEventListener("savrdh-crm-update",load);
  },[]);
  return <div className="pipeline-board">{stages.map(stage=>{
    const items=apps.filter(app=>(app.stage||"New Application")===stage);
    return <section className="pipeline-column" key={stage}>
      <header><span>{stage}</span><b>{items.length}</b></header>
      <div className="pipeline-dropzone">
        {items.length===0?<><FileText size={18}/><small>No applications</small></>:items.map(item=><div className="pipeline-item" key={item.id}><strong>{item.customer||"Application"}</strong><span>{item.product||"Loan"}</span></div>)}
      </div>
    </section>;
  })}</div>;
}

function ReportsPanel(){
  const cards=[
    ["Lead Conversion","Lead-to-application funnel",Users],
    ["Credit Pipeline","Stage-wise portfolio movement",BarChart3],
    ["Lender Performance","Sanctions and turnaround",Landmark],
    ["Finance Reconciliation","Verified payments and disbursements",WalletCards],
    ["Commission Summary","Verified-basis commission reporting",BadgeIndianRupee],
    ["Audit Controls","Sensitive action traceability",ShieldCheck]
  ] as const;
  const hrefs=["/crm/leads","/crm/pipeline","/crm/lenders","/crm/payments","/crm/commissions","/crm/audit"];
  return <div className="report-grid">{cards.map(([title,desc,Icon],index)=><Link href={hrefs[index]} className="report-card" key={title}><Icon size={20}/><div><strong>{title}</strong><span>{desc}</span></div><em>Open →</em></Link>)}</div>;
}

function SettingsPanel(){
  const [rules,setRules]=useState({finance:true,utr:true,commission:true,audit:true});
  return <section className="module-card settings-card"><h2>Business Controls</h2>{Object.entries(rules).map(([key,value])=><div className="setting-row" key={key}><div><strong>{({finance:"Finance-only disbursement verification",utr:"Duplicate UTR protection",commission:"Verified commission basis",audit:"Sensitive action audit"} as Record<string,string>)[key]}</strong><span>Core financial control</span></div><button className={value?"on":""} onClick={()=>setRules({...rules,[key]:!value})}>{value?"ON":"OFF"}</button></div>)}</section>;
}

function AuditPanel(){
  return <section className="module-card"><div className="audit-banner"><ShieldCheck size={20}/><div><strong>Audit logging ready</strong><span>Live sensitive-action records will appear once backend persistence is connected.</span></div></div><EmptyModule title="audit events"/></section>;
}

function NotificationsPanel(){
  return <section className="module-card"><div className="notification-list"><div><CheckCircle2 size={16}/><p><strong>CRM ready</strong><span>Your premium workspace is active.</span></p><small>Now</small></div><div><Settings2 size={16}/><p><strong>Backend pending</strong><span>Connect D1/API to receive live workflow alerts.</span></p><small>System</small></div></div></section>;
}

function CommunicationsPanel(){
  return <section className="module-card communications-placeholder"><div className="comm-icon">W</div><h2>WhatsApp Integration Workspace</h2><p>Conversation sync, templates and automated follow-ups can connect here without redesigning the CRM.</p><button disabled>Connect provider after backend setup</button></section>;
}

function SearchPanel({query,setQuery}:{query:string;setQuery:(v:string)=>void}){
  const [results,setResults]=useState<Array<{module:string;label:string;detail:string}>>([]);
  useEffect(()=>{
    const q=query.trim().toLowerCase();
    if(!q){setResults([]);return;}
    const found:Array<{module:string;label:string;detail:string}>=[];
    const keys=["leads","applications","customers","partners","lenders","payments","documents","team"];
    for(const key of keys){
      let rows:any[]=[];
      try{
        const raw=localStorage.getItem(storageKey(key));
        rows=raw?JSON.parse(raw):[];
      }catch{}
      if(key==="leads" && rows.length===0) rows=DEMO_LEADS.map(row=>({...row}));
      for(const row of rows){
        const text=Object.values(row).join(" ").toLowerCase();
        if(text.includes(q)){
          found.push({
            module:key,
            label:String(row.name||row.customer||row.business||row.owner||row.email||"Record"),
            detail:String(row.stage||row.status||row.product||row.source||"")
          });
        }
      }
    }
    setResults(found.slice(0,50));
  },[query]);

  return <section className="module-card search-panel">
    <div className="module-search large"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search CRM..."/></div>
    {query&&!results.length?<div className="module-empty"><Search size={22}/><strong>No matching records</strong><span>Try another name, business, stage or status.</span></div>:
      <div className="search-results">{results.map((r,i)=><Link key={i} href={"/crm/"+r.module} className="search-result"><div><strong>{r.label}</strong><span>{r.module} · {r.detail}</span></div><em>Open →</em></Link>)}</div>}
  </section>;
}
