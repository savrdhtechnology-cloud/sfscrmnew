"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BadgeIndianRupee, Building2, CalendarDays, Check, CheckCircle2,
  ClipboardList, Clock3, FileCheck2, FileText, Mail, MapPin, MessageSquare,
  NotebookPen, Phone, Plus, Send, UploadCloud, UserRound, Users, XCircle
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { LeadAiPanel } from "@/components/lead-ai-panel";
import { DocumentAiPanel } from "@/components/document-ai-panel";
import { DEMO_LEADS } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

type Lead={
  id:string; leadNo:string; name:string; mobile:string; email:string;
  businessName:string; businessType:string; source:string; requestedAmount:number;
  productInterest:string; stage:string; nextFollowupAt:string|null; createdAt:string;
  assignedTo:string;
};

type ChecklistItem={
  id:string; documentType:string; label:string; required:boolean;
  status:string; documentId:string|null;
};

type Note={id:string; note:string; createdAt:string};
type Activity={id:string; title:string; detail:string; createdAt:string};
type Task={id:string; title:string; status:string; dueAt:string|null};

const LOCAL_LEADS="savrdh-crm-leads";
const LOCAL_APPS="savrdh-crm-applications";

const fallbackChecklist:ChecklistItem[]=[
  {id:"pan",documentType:"pan",label:"PAN Card",required:true,status:"pending",documentId:null},
  {id:"aadhaar",documentType:"aadhaar",label:"Aadhaar / KYC ID",required:true,status:"pending",documentId:null},
  {id:"bank",documentType:"bank_statements",label:"Bank Statements",required:true,status:"pending",documentId:null},
  {id:"itr",documentType:"itr",label:"ITR / Financials",required:true,status:"pending",documentId:null},
  {id:"gst",documentType:"gst",label:"GST Returns / GST Certificate",required:false,status:"pending",documentId:null},
  {id:"reg",documentType:"business_registration",label:"Business Registration",required:true,status:"pending",documentId:null},
  {id:"project",documentType:"project_documents",label:"Project / Quotation Documents",required:false,status:"pending",documentId:null}
];

function prettyStage(value:string){
  const map:Record<string,string>={
    new:"New",contacted:"Contacted",qualified:"Requirement Identified",
    application_created:"Application Created",converted:"Converted / Closed",lost:"Lost"
  };
  return map[value]||value.replaceAll("_"," ");
}

function localLead(id:string):Lead|null{
  try{
    const stored=localStorage.getItem(LOCAL_LEADS);
    const rows=stored?JSON.parse(stored):[];
    const hit=rows.find((r:any)=>r.id===id);
    if(hit){
      return {
        id:hit.id,leadNo:hit.lead_no||hit.leadNo||"WORK-"+hit.id.slice(-6).toUpperCase(),
        name:hit.name||"",mobile:hit.mobile||"",email:hit.email||"",
        businessName:hit.business||hit.business_name||"",businessType:hit.businessType||hit.business_type||"",
        source:hit.source||"Direct",requestedAmount:Number(hit.loanNeed||hit.requested_amount||0),
        productInterest:hit.loanType||hit.product_interest||"Business Loan",
        stage:hit.stage||"new",nextFollowupAt:hit.nextFollowupAt||null,
        createdAt:hit.createdAt||new Date().toISOString(),assignedTo:hit.assignedTo||"Unassigned"
      };
    }
  }catch{}
  const demo=DEMO_LEADS.find(r=>r.id===id);
  if(!demo) return null;
  return {
    id:demo.id,leadNo:"WORK-"+demo.id.toUpperCase(),name:demo.name,mobile:demo.mobile,
    email:demo.email,businessName:demo.business,businessType:"Business",source:demo.source,
    requestedAmount:Number(demo.loanNeed),productInterest:"Term Loan",stage:demo.stage,
    nextFollowupAt:null,createdAt:demo.createdAt,assignedTo:demo.assignedTo
  };
}

export function LeadDetailWorkspace({leadId}:{leadId:string}){
  const router=useRouter();
  const [lead,setLead]=useState<Lead|null>(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("overview");
  const [checklist,setChecklist]=useState<ChecklistItem[]>(fallbackChecklist);
  const [notes,setNotes]=useState<Note[]>([]);
  const [activities,setActivities]=useState<Activity[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [existingApplication,setExistingApplication]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [localMode,setLocalMode]=useState(false);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const {data,error}=await supabase
          .from("scp_leads")
          .select("id,lead_no,name,mobile,email,business_name,business_type,source,requested_amount,product_interest,stage,next_followup_at,created_at,assigned_to")
          .eq("id",leadId).maybeSingle();
        if(!error && data){
          if(!active) return;
          setLead({
            id:data.id,leadNo:data.lead_no,name:data.name,mobile:data.mobile||"",email:data.email||"",
            businessName:data.business_name||"",businessType:data.business_type||"",source:data.source||"Direct",
            requestedAmount:Number(data.requested_amount||0),productInterest:data.product_interest||"Business Loan",
            stage:data.stage||"new",nextFollowupAt:data.next_followup_at,createdAt:data.created_at,
            assignedTo:data.assigned_to||"Unassigned"
          });

          const [c,n,a,t,app]=await Promise.all([
            supabase.from("scp_document_checklist").select("id,document_type,label,required,status,document_id").eq("lead_id",leadId).order("created_at"),
            supabase.from("scp_lead_notes").select("id,note,created_at").eq("lead_id",leadId).order("created_at",{ascending:false}),
            supabase.from("scp_lead_activities").select("id,title,detail,created_at").eq("lead_id",leadId).order("created_at",{ascending:false}),
            supabase.from("scp_tasks").select("id,title,status,due_at").eq("lead_id",leadId).order("created_at",{ascending:false}),
            supabase.from("scp_loan_applications").select("id").eq("lead_id",leadId).order("created_at",{ascending:false}).limit(1).maybeSingle()
          ]);

          if(c.data?.length) setChecklist(c.data.map((x:any)=>({id:x.id,documentType:x.document_type,label:x.label,required:x.required,status:x.status,documentId:x.document_id})));
          if(n.data) setNotes(n.data.map((x:any)=>({id:x.id,note:x.note,createdAt:x.created_at})));
          if(a.data) setActivities(a.data.map((x:any)=>({id:String(x.id),title:x.title,detail:x.detail||"",createdAt:x.created_at})));
          if(t.data) setTasks(t.data.map((x:any)=>({id:x.id,title:x.title,status:x.status,dueAt:x.due_at})));
          if(app.data?.id) setExistingApplication(app.data.id);
          setLocalMode(false);
          setLoading(false);
          return;
        }
      }catch{}

      if(!active) return;
      const fallback=localLead(leadId);
      setLead(fallback);
      setLocalMode(true);
      try{
        const c=localStorage.getItem("lead-checklist-"+leadId);
        if(c) setChecklist(JSON.parse(c));
        const n=localStorage.getItem("lead-notes-"+leadId);
        if(n) setNotes(JSON.parse(n));
        const t=localStorage.getItem("lead-tasks-"+leadId);
        if(t) setTasks(JSON.parse(t));
      }catch{}
      setActivities([{id:"created",title:"Lead created",detail:fallback?.source?"Source: "+fallback.source:"",createdAt:fallback?.createdAt||new Date().toISOString()}]);
      setLoading(false);
    })();
    return ()=>{active=false};
  },[leadId]);

  const requiredComplete=useMemo(
    ()=>checklist.filter(x=>x.required).every(x=>x.status==="verified"||x.status==="waived"),
    [checklist]
  );

  const uploadedCount=checklist.filter(x=>x.status==="uploaded"||x.status==="verified").length;
  const verifiedCount=checklist.filter(x=>x.status==="verified").length;

  function saveLocalChecklist(next:ChecklistItem[]){
    setChecklist(next);
    try{localStorage.setItem("lead-checklist-"+leadId,JSON.stringify(next));}catch{}
  }

  async function uploadDocument(item:ChecklistItem,e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file) return;
    setBusy(true);setMessage("");
    try{
      if(!localMode){
        const {data:{user}}=await supabase.auth.getUser();
        if(!user) throw new Error("Sign in is required to upload documents.");
        const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
        const path=user.id+"/lead/"+leadId+"/"+Date.now()+"-"+safe;
        const {error:uploadError}=await supabase.storage.from("scp-documents").upload(path,file,{upsert:false});
        if(uploadError) throw uploadError;
        const {data:doc,error:docError}=await supabase.from("scp_documents").insert({
          lead_id:leadId,document_type:item.documentType,file_name:file.name,
          storage_bucket:"scp-documents",storage_path:path,mime_type:file.type||null,
          file_size:file.size,uploaded_by:user.id
        }).select("id").single();
        if(docError) throw docError;
        const {error:checkError}=await supabase.from("scp_document_checklist")
          .update({status:"uploaded",document_id:doc.id}).eq("id",item.id);
        if(checkError) throw checkError;
      }
      const next=checklist.map(x=>x.id===item.id?{...x,status:"uploaded",documentId:x.documentId||"local-"+Date.now()}:x);
      saveLocalChecklist(next);
      setMessage(item.label+" uploaded.");
    }catch(err:any){
      setMessage(err?.message||"Upload failed.");
    }finally{setBusy(false);e.target.value="";}
  }

  async function verifyDocument(item:ChecklistItem){
    setBusy(true);setMessage("");
    try{
      if(!localMode){
        const {error}=await supabase.from("scp_document_checklist")
          .update({status:"verified",verified_at:new Date().toISOString()}).eq("id",item.id);
        if(error) throw error;
      }
      const next=checklist.map(x=>x.id===item.id?{...x,status:"verified"}:x);
      saveLocalChecklist(next);
      setMessage(item.label+" verified.");
    }catch(err:any){setMessage(err?.message||"Verification failed.");}
    finally{setBusy(false);}
  }

  async function addNote(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const note=String(form.get("note")||"").trim();
    if(!note) return;
    const local:Note={id:crypto.randomUUID(),note,createdAt:new Date().toISOString()};
    try{
      if(!localMode){
        const {data,error}=await supabase.from("scp_lead_notes").insert({lead_id:leadId,note}).select("id,note,created_at").single();
        if(error) throw error;
        setNotes(prev=>[{id:data.id,note:data.note,createdAt:data.created_at},...prev]);
      }else{
        const next=[local,...notes];setNotes(next);localStorage.setItem("lead-notes-"+leadId,JSON.stringify(next));
      }
      e.currentTarget.reset();
    }catch(err:any){setMessage(err?.message||"Could not save note.");}
  }

  async function addTask(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const title=String(form.get("title")||"").trim();
    const due=String(form.get("due")||"");
    if(!title) return;
    const local:Task={id:crypto.randomUUID(),title,status:"open",dueAt:due?new Date(due).toISOString():null};
    try{
      if(!localMode){
        const {data,error}=await supabase.from("scp_tasks").insert({lead_id:leadId,title,due_at:local.dueAt}).select("id,title,status,due_at").single();
        if(error) throw error;
        setTasks(prev=>[{id:data.id,title:data.title,status:data.status,dueAt:data.due_at},...prev]);
      }else{
        const next=[local,...tasks];setTasks(next);localStorage.setItem("lead-tasks-"+leadId,JSON.stringify(next));
      }
      e.currentTarget.reset();
    }catch(err:any){setMessage(err?.message||"Could not add task.");}
  }

  async function convertToApplication(){
    if(!lead) return;
    if(!requiredComplete){
      setMessage("Verify all required documents before converting this lead to an application.");
      setTab("documents");
      return;
    }
    if(existingApplication){
      router.push("/crm/applications?q="+existingApplication);
      return;
    }

    setBusy(true);setMessage("");
    try{
      if(!localMode){
        const {data,error}=await supabase.rpc("scp_convert_lead_to_application",{
          p_lead_id:lead.id,
          p_product_type:lead.productInterest,
          p_requested_amount:lead.requestedAmount,
          p_purpose:null
        });
        if(error) throw error;
        setExistingApplication(String(data));
      }else{
        const app={
          id:crypto.randomUUID(),createdAt:new Date().toISOString(),customer:lead.name,
          product:lead.productInterest,amount:String(lead.requestedAmount),
          stage:"Credit Analysis",assignedTo:lead.assignedTo,source:lead.source,leadId:lead.id
        };
        const raw=localStorage.getItem(LOCAL_APPS);
        const apps=raw?JSON.parse(raw):[];
        localStorage.setItem(LOCAL_APPS,JSON.stringify([app,...apps]));
        setExistingApplication(app.id);
        try{
          const rawLeads=localStorage.getItem(LOCAL_LEADS);
          const leads=rawLeads?JSON.parse(rawLeads):[];
          localStorage.setItem(LOCAL_LEADS,JSON.stringify(leads.map((x:any)=>x.id===lead.id?{...x,stage:"converted"}:x)));
        }catch{}
      }
      setMessage("Lead converted successfully. Application moved to Credit Analysis.");
      setTimeout(()=>router.push("/crm/applications"),700);
    }catch(err:any){
      setMessage(err?.message||"Could not convert lead.");
    }finally{setBusy(false);}
  }

  if(loading) return <CrmShell active="Leads" role="owner"><main className="lead-detail-loading">Loading lead...</main></CrmShell>;
  if(!lead) return <CrmShell active="Leads" role="owner"><main className="lead-detail-loading"><XCircle size={24}/> Lead not found.</main></CrmShell>;

  const stages=["New","Contacted","Requirement Identified","Documents Pending","In Review","Converted / Closed"];
  const currentIndex=existingApplication||lead.stage==="converted"?5:requiredComplete?4:uploadedCount>0?3:lead.stage==="qualified"?2:lead.stage==="contacted"?1:0;

  return <CrmShell active="Leads" role="owner">
    <main className="lead-detail-page">
      <div className="lead-detail-head">
        <div>
          <div className="lead-detail-crumb"><Link href="/crm/leads">Leads</Link><span>›</span>Lead Details</div>
          <div className="lead-title-line"><h1>{lead.name}</h1><span className="lead-new-badge">{prettyStage(lead.stage)}</span></div>
          <p>Lead ID: {lead.leadNo} <i/> Created on: {new Date(lead.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="lead-detail-actions">
          <Link href="/crm/leads"><ArrowLeft size={14}/> Back to Leads</Link>
          <button onClick={()=>setTab("overview")}>Edit</button>
          <button onClick={()=>setTab("tasks")}><Users size={14}/> Assign / Task</button>
          <button className="convert" onClick={convertToApplication} disabled={busy}>
            <Send size={14}/> {existingApplication?"Open Application":"Convert to Application"}
          </button>
        </div>
      </div>

      {message&&<div className={message.toLowerCase().includes("success")?"lead-detail-alert success":"lead-detail-alert"}>{message}</div>}

      <section className="lead-summary-grid">
        <article><UserRound size={24}/><div><strong>{lead.name}</strong><span>{lead.mobile||"No mobile"}</span><span>{lead.email||"No email"}</span></div></article>
        <article><Building2 size={24}/><div><small>Business Name</small><strong>{lead.businessName||"Not provided"}</strong><span>{lead.businessType||"Business type pending"}</span></div></article>
        <article><BadgeIndianRupee size={24}/><div><small>Loan Requirement</small><strong>₹ {lead.requestedAmount.toLocaleString("en-IN")}</strong><span>{lead.productInterest}</span></div></article>
        <article><Clock3 size={24}/><div><small>Lead Source</small><strong>{lead.source}</strong><span>{lead.nextFollowupAt?"Follow-up "+new Date(lead.nextFollowupAt).toLocaleDateString("en-IN"):"Follow-up not scheduled"}</span></div></article>
      </section>

      <section className="lead-process-strip">
        {stages.map((stage,index)=><div className={index<=currentIndex?"done":""} key={stage}><b>{index<currentIndex?<Check size={13}/>:index+1}</b><span>{stage}</span>{index<stages.length-1&&<i/>}</div>)}
      </section>

      <div className="lead-detail-layout">
        <section className="lead-detail-main">
          <nav className="lead-tabs">
            {[
              ["overview","Overview"],["communication","Communication"],["documents","Documents"],
              ["tasks","Tasks"],["applications","Applications"],["notes","Notes"],["activity","Activity Log"]
            ].map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}
          </nav>

          {tab==="overview"&&<>
          <LeadAiPanel
            lead={{
              id:lead.id,name:lead.name,businessName:lead.businessName,businessType:lead.businessType,
              source:lead.source,requestedAmount:lead.requestedAmount,productInterest:lead.productInterest,
              mobile:lead.mobile,email:lead.email
            }}
            workMode={localMode}
          />
          <div className="lead-overview-grid">
            <article className="lead-info-card">
              <h2><UserRound size={16}/> Customer Information</h2>
              <dl><dt>Full Name</dt><dd>{lead.name}</dd><dt>Mobile Number</dt><dd>{lead.mobile||"—"}</dd><dt>Email Address</dt><dd>{lead.email||"—"}</dd><dt>Source</dt><dd>{lead.source}</dd></dl>
            </article>
            <article className="lead-info-card">
              <h2><Building2 size={16}/> Business Information</h2>
              <dl><dt>Business Name</dt><dd>{lead.businessName||"—"}</dd><dt>Business Type</dt><dd>{lead.businessType||"—"}</dd><dt>Assigned To</dt><dd>{lead.assignedTo}</dd><dt>Current Stage</dt><dd>{prettyStage(lead.stage)}</dd></dl>
            </article>
            <article className="lead-info-card">
              <h2><BadgeIndianRupee size={16}/> Loan Requirement</h2>
              <dl><dt>Loan Type</dt><dd>{lead.productInterest}</dd><dt>Loan Amount</dt><dd>₹ {lead.requestedAmount.toLocaleString("en-IN")}</dd><dt>Documents</dt><dd>{verifiedCount}/{checklist.filter(x=>x.required).length} required verified</dd></dl>
            </article>
            <article className="lead-info-card">
              <h2><ClipboardList size={16}/> Processing Readiness</h2>
              <div className="readiness-row"><span>Required documents</span><strong>{requiredComplete?"Complete":"Pending"}</strong></div>
              <div className="readiness-row"><span>Application</span><strong>{existingApplication?"Created":"Not created"}</strong></div>
              <button className="lead-card-action" onClick={()=>setTab("documents")}>Review document checklist</button>
            </article>
          </div>
          </>}

          {tab==="documents"&&<div className="lead-doc-workspace">
            <div className="lead-section-head"><div><h2>Document Collection & Verification</h2><p>Required documents must be verified before application conversion.</p></div><strong>{verifiedCount}/{checklist.filter(x=>x.required).length} required verified</strong></div>
            <div className="lead-doc-list">
              {checklist.map(item=><div className="lead-doc-row" key={item.id}>
                <div className={"doc-state "+item.status}>{item.status==="verified"?<CheckCircle2 size={17}/>:<FileText size={17}/>}</div>
                <div><strong>{item.label}{item.required&&<em>Required</em>}</strong><span>{item.status==="pending"?"Not uploaded":item.status==="uploaded"?"Uploaded — verification pending":item.status==="verified"?"Verified":"Status: "+item.status}</span></div>
                <label className="doc-upload"><UploadCloud size={14}/> Upload<input type="file" onChange={e=>uploadDocument(item,e)} disabled={busy}/></label>
                <button className="doc-verify" onClick={()=>verifyDocument(item)} disabled={busy||item.status==="verified"||item.status==="pending"}>Verify</button>
              </div>)}
            </div>
            <div className={requiredComplete?"doc-gate ready":"doc-gate"}><FileCheck2 size={18}/><div><strong>{requiredComplete?"Ready for Application":"Application conversion locked"}</strong><span>{requiredComplete?"All required documents are verified.":"Verify every required document to enable conversion."}</span></div></div>
            <DocumentAiPanel
              applicationId={existingApplication}
              leadId={lead.id}
              items={checklist}
              workMode={localMode}
            />
          </div>}

          {tab==="tasks"&&<div className="lead-two-column">
            <article className="lead-info-card">
              <h2><CalendarDays size={16}/> Add Follow-up / Task</h2>
              <form className="lead-inline-form" onSubmit={addTask}><input name="title" required placeholder="Call customer / collect GST / bank statement..."/><input name="due" type="datetime-local"/><button type="submit"><Plus size={14}/> Add Task</button></form>
            </article>
            <article className="lead-info-card">
              <h2><ClipboardList size={16}/> Open Tasks</h2>
              <div className="mini-list">{tasks.length?tasks.map(t=><div key={t.id}><strong>{t.title}</strong><span>{t.dueAt?new Date(t.dueAt).toLocaleString("en-IN"):"No due date"} · {t.status}</span></div>):<p>No tasks yet.</p>}</div>
            </article>
          </div>}

          {tab==="notes"&&<div className="lead-two-column">
            <article className="lead-info-card">
              <h2><NotebookPen size={16}/> Add Internal Note</h2>
              <form className="lead-note-form" onSubmit={addNote}><textarea name="note" required placeholder="Credit observations, customer conversation, pending requirements..."/><button type="submit">Add Note</button></form>
            </article>
            <article className="lead-info-card"><h2>Internal Notes</h2><div className="mini-list">{notes.length?notes.map(n=><div key={n.id}><strong>{n.note}</strong><span>{new Date(n.createdAt).toLocaleString("en-IN")}</span></div>):<p>No notes yet.</p>}</div></article>
          </div>}

          {tab==="communication"&&<div className="lead-info-card lead-empty-tab"><MessageSquare size={26}/><h2>Communication Timeline</h2><p>Calls, emails, WhatsApp and meetings will appear here as the lead is processed.</p><div className="comm-shortcuts"><a href={lead.mobile?"tel:"+lead.mobile:"#"}><Phone size={14}/> Call</a><a href={lead.email?"mailto:"+lead.email:"#"}><Mail size={14}/> Email</a></div></div>}

          {tab==="applications"&&<div className="lead-info-card lead-empty-tab"><FileCheck2 size={26}/><h2>{existingApplication?"Application Created":"No Application Yet"}</h2><p>{existingApplication?"This lead has moved to the Applications module for credit analysis and lender matching.":"Complete and verify required documents, then convert the lead."}</p>{existingApplication?<Link className="detail-primary-link" href={"/crm/applications?q="+existingApplication}>Open Application</Link>:<button className="detail-primary-link" onClick={convertToApplication}>Convert to Application</button>}</div>}

          {tab==="activity"&&<div className="lead-info-card"><h2>Activity Log</h2><div className="activity-timeline">{activities.length?activities.map(a=><div key={a.id}><i/><div><strong>{a.title}</strong><span>{a.detail}</span></div><small>{new Date(a.createdAt).toLocaleString("en-IN")}</small></div>):<p>No activity recorded yet.</p>}</div></div>}
        </section>

        <aside className="lead-detail-side">
          <article className="followup-card">
            <div className="side-card-head"><h2><CalendarDays size={16}/> Follow Up & Next Action</h2><button onClick={()=>setTab("tasks")}><Plus size={13}/> Add Task</button></div>
            {tasks[0]?<div className="next-task"><small>Next Action</small><strong>{tasks[0].title}</strong><span>{tasks[0].dueAt?new Date(tasks[0].dueAt).toLocaleString("en-IN"):"No due date"}</span></div>:<div className="side-empty">No follow-up scheduled.</div>}
            <button className="side-gold" onClick={()=>setTab("tasks")}>Manage Follow-up</button>
          </article>

          <article className="side-card">
            <div className="side-card-head"><h2><FileCheck2 size={16}/> Processing Status</h2></div>
            <div className="process-mini"><span>Documents uploaded <b>{uploadedCount}/{checklist.length}</b></span><span>Required verified <b>{verifiedCount}/{checklist.filter(x=>x.required).length}</b></span><span>Application <b>{existingApplication?"Created":"Pending"}</b></span></div>
          </article>

          <article className="side-card">
            <div className="side-card-head"><h2><NotebookPen size={16}/> Internal Notes</h2><button onClick={()=>setTab("notes")}>Add Note</button></div>
            {notes[0]?<div className="side-note"><strong>Latest Note</strong><p>{notes[0].note}</p><small>{new Date(notes[0].createdAt).toLocaleString("en-IN")}</small></div>:<div className="side-empty">No internal notes yet.</div>}
          </article>

          <article className="side-card lender-next">
            <div className="side-card-head"><h2><Building2 size={16}/> Next after Conversion</h2></div>
            <ol><li>Credit analysis & financial profile</li><li>Lender-product criteria matching</li><li>Select suitable Bank/NBFC</li><li>Submit & track lender application</li></ol>
          </article>
        </aside>
      </div>
    </main>
  </CrmShell>;
}
