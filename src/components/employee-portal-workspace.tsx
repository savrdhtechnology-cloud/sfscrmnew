"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3, CheckCircle2, ChevronRight, CircleDot, Clock3, FileText, FolderOpen,
  Headphones, ListChecks, Mail, MessageCircle, MoreHorizontal, Phone, Plus,
  Search, Target, TrendingUp, UploadCloud, UserRoundPlus, Users, X
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";

type View="dashboard"|"leads"|"applications"|"followups"|"customers"|"tasks"|"reports"|"knowledge"|"support";
type Lead={id:string;name:string;mobile:string;email:string;business:string;product:string;amount:number;source:string;stage:string;createdAt:string;nextFollowupAt?:string|null;notes?:string|null};
type App={id:string;applicationNo:string;customer:string;product:string;amount:number;stage:string;createdAt:string};
type Task={id:string;title:string;description:string;priority:string;status:string;dueAt?:string|null;leadId?:string|null;applicationId?:string|null};
type Customer={id:string;name:string;business:string;mobile:string;status:string};

const HASH_TO_VIEW:Record<string,View>={
  "#leads":"leads","#applications":"applications","#followups":"followups","#customers":"customers",
  "#tasks":"tasks","#reports":"reports","#knowledge":"knowledge","#support":"support"
};
const ACTIVE:Record<View,string>={
  dashboard:"Dashboard",leads:"My Leads",applications:"My Applications",followups:"Follow-ups",
  customers:"Customers",tasks:"Tasks",reports:"Reports",knowledge:"Knowledge Base",support:"Support"
};

const demoLeads:Lead[]=[
  {id:"demo-emp-1",name:"Rajesh Patel",mobile:"9876543210",email:"rajesh@example.test",business:"Rice Mill",product:"Term Loan",amount:50000000,source:"Website",stage:"new",createdAt:"2026-09-22T10:30:00+05:30",nextFollowupAt:"2026-09-27T10:30:00+05:30"},
  {id:"demo-emp-2",name:"Neha Gupta",mobile:"9876500002",email:"neha@example.test",business:"Solar Project",product:"Project Loan",amount:10000000,source:"Partner",stage:"follow_up",createdAt:"2026-09-21T11:00:00+05:30",nextFollowupAt:"2026-09-27T12:00:00+05:30"},
  {id:"demo-emp-3",name:"Suresh Jain",mobile:"9876500003",email:"suresh@example.test",business:"Trading",product:"Working Capital",amount:7500000,source:"WhatsApp",stage:"in_process",createdAt:"2026-09-21T12:00:00+05:30"},
  {id:"demo-emp-4",name:"Pooja Mehta",mobile:"9876500005",email:"pooja@example.test",business:"Manufacturing",product:"Equipment Finance",amount:25000000,source:"Direct",stage:"documents_pending",createdAt:"2026-09-20T09:00:00+05:30"},
  {id:"demo-emp-5",name:"Amit Verma",mobile:"9876500010",email:"amit@example.test",business:"Engineering",product:"Term Loan",amount:17500000,source:"Campaign",stage:"qualified",createdAt:"2026-09-19T14:00:00+05:30"}
];

function money(v:number){return "₹ "+Number(v||0).toLocaleString("en-IN")}
function label(v:string){return (v||"new").replaceAll("_"," ").replace(/\b\w/g,x=>x.toUpperCase())}
function stageClass(v:string){return "employee-stage "+(v||"new").toLowerCase().replaceAll("_","-")}

export function EmployeePortalWorkspace(){
  const [view,setView]=useState<View>("dashboard");
  const [open,setOpen]=useState(false);
  const [profile,setProfile]=useState({id:"",name:"Amit Sharma",email:"",mobile:""});
  const [leads,setLeads]=useState<Lead[]>([]);
  const [apps,setApps]=useState<App[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [message,setMessage]=useState("");
  const [selectedLead,setSelectedLead]=useState<Lead|null>(null);
  const [query,setQuery]=useState("");

  async function load(){
    let userId="";
    let fullName="Amit Sharma";
    let email="";
    let mobile="";
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(user){
        userId=user.id;
        const {data:p}=await supabase.from("scp_profiles").select("id,full_name,email,mobile").eq("id",user.id).maybeSingle();
        if(p){fullName=p.full_name||fullName;email=p.email||"";mobile=p.mobile||""}
      }
    }catch{}
    setProfile({id:userId,name:fullName,email,mobile});

    let liveLeads:Lead[]=[];
    let liveApps:App[]=[];
    let liveTasks:Task[]=[];
    let liveCustomers:Customer[]=[];

    if(userId){
      try{
        const [{data:l},{data:a},{data:t},{data:c}]=await Promise.all([
          supabase.from("scp_leads").select("id,name,mobile,email,business_name,product_interest,requested_amount,source,stage,created_at,next_followup_at,notes").eq("assigned_to",userId).order("created_at",{ascending:false}),
          supabase.from("scp_loan_applications").select("id,application_no,product_type,requested_amount,stage,created_at,scp_customers(full_name,business_name)").eq("assigned_employee_id",userId).order("created_at",{ascending:false}),
          supabase.from("scp_tasks").select("id,title,description,priority,status,due_at,lead_id,application_id").eq("assigned_to",userId).order("due_at",{ascending:true}),
          supabase.from("scp_customers").select("id,full_name,business_name,mobile,status").eq("assigned_to",userId).order("created_at",{ascending:false})
        ]);
        liveLeads=(l||[]).map((x:any)=>({id:x.id,name:x.name||"Lead",mobile:x.mobile||"",email:x.email||"",business:x.business_name||"",product:x.product_interest||"Business Loan",amount:Number(x.requested_amount||0),source:x.source||"Direct",stage:x.stage||"new",createdAt:x.created_at,nextFollowupAt:x.next_followup_at,notes:x.notes}));
        liveApps=(a||[]).map((x:any)=>({id:x.id,applicationNo:x.application_no||"APP",customer:x.scp_customers?.full_name||x.scp_customers?.business_name||"Customer",product:x.product_type||"Business Loan",amount:Number(x.requested_amount||0),stage:x.stage||"new_application",createdAt:x.created_at}));
        liveTasks=(t||[]).map((x:any)=>({id:x.id,title:x.title,description:x.description||"",priority:x.priority||"medium",status:x.status||"open",dueAt:x.due_at,leadId:x.lead_id,applicationId:x.application_id}));
        liveCustomers=(c||[]).map((x:any)=>({id:x.id,name:x.full_name||x.business_name||"Customer",business:x.business_name||"",mobile:x.mobile||"",status:x.status||"active"}));
      }catch{}
    }

    let local:Lead[]=[];
    try{
      const raw=localStorage.getItem("savrdh-crm-leads");
      const rows=raw?JSON.parse(raw):[];
      if(Array.isArray(rows)) local=rows.map((x:any)=>({id:x.id,name:x.name||"Lead",mobile:x.mobile||"",email:x.email||"",business:x.business||x.businessName||"",product:x.loanType||x.product||"Business Loan",amount:Number(x.loanNeed||x.amount||0),source:x.source||"Direct",stage:x.stage||"new",createdAt:x.createdAt||new Date().toISOString(),nextFollowupAt:x.nextFollowupAt||null,notes:x.notes||null}));
    }catch{}

    const leadMap=new Map<string,Lead>();
    [...demoLeads,...local,...liveLeads].forEach(x=>leadMap.set(x.id,x));
    setLeads(Array.from(leadMap.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    setApps(liveApps);
    setTasks(liveTasks.length?liveTasks:[
      {id:"task-1",title:"Call back - Rajesh Patel",description:"Discuss documents list",priority:"high",status:"open",dueAt:"2026-09-27T10:30:00+05:30",leadId:"demo-emp-1"},
      {id:"task-2",title:"Send documents - Neha Gupta",description:"Share KYC checklist",priority:"medium",status:"open",dueAt:"2026-09-27T12:00:00+05:30",leadId:"demo-emp-2"},
      {id:"task-3",title:"Follow up - Solar Project",description:"Check customer response",priority:"medium",status:"open",dueAt:"2026-09-27T14:00:00+05:30",leadId:"demo-emp-2"}
    ]);
    setCustomers(liveCustomers);
  }

  useEffect(()=>{
    void load();
    const hash=()=>{
      if(window.location.hash==="#add"){setOpen(true);return}
      setView(HASH_TO_VIEW[window.location.hash]||"dashboard");
    };
    const sync=()=>void load();
    window.addEventListener("hashchange",hash);
    window.addEventListener("savrdh-portal-nav",hash as EventListener);
    window.addEventListener("popstate",hash);
    window.addEventListener("savrdh-crm-update",sync);
    hash();
    return()=>{
      window.removeEventListener("hashchange",hash);
      window.removeEventListener("savrdh-portal-nav",hash as EventListener);
      window.removeEventListener("popstate",hash);
      window.removeEventListener("savrdh-crm-update",sync);
    };
  },[]);

  const stats=useMemo(()=>({
    leads:leads.length,
    applications:apps.length,
    approved:apps.filter(a=>/approved|sanction|disburs/i.test(a.stage)).length,
    inProgress:apps.filter(a=>!/approved|sanction|disburs|reject/i.test(a.stage)).length
  }),[leads,apps]);

  const filteredLeads=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return !q?leads:leads.filter(l=>Object.values(l).some(v=>String(v||"").toLowerCase().includes(q)));
  },[leads,query]);

  async function createLead(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);
    const row:Lead={id:crypto.randomUUID(),name:String(fd.get("name")||""),mobile:String(fd.get("mobile")||""),email:String(fd.get("email")||""),business:String(fd.get("business")||""),product:String(fd.get("product")||"Business Loan"),amount:Number(fd.get("amount")||0),source:"Employee",stage:"new",createdAt:new Date().toISOString(),nextFollowupAt:String(fd.get("followup")||"")||null,notes:String(fd.get("notes")||"")};
    let inserted=false;
    if(profile.id){
      try{
        const {data,error}=await supabase.from("scp_leads").insert({name:row.name,mobile:row.mobile||null,email:row.email||null,business_name:row.business||null,product_interest:row.product,requested_amount:row.amount||null,source:"Employee",stage:"new",assigned_to:profile.id,created_by:profile.id,next_followup_at:row.nextFollowupAt||null,notes:row.notes||null}).select("id,created_at").single();
        if(!error&&data){row.id=data.id;row.createdAt=data.created_at;inserted=true}
      }catch{}
    }
    if(!inserted){
      try{
        const raw=localStorage.getItem("savrdh-crm-leads");const arr=raw?JSON.parse(raw):[];
        localStorage.setItem("savrdh-crm-leads",JSON.stringify([{...row,loanType:row.product,loanNeed:String(row.amount),assignedTo:profile.name},...arr]));
      }catch{}
    }
    setLeads(prev=>[row,...prev]);setMessage(inserted?"Lead created and assigned to you.":"Work Mode: lead created and assigned to you.");form.reset();setOpen(false);window.history.replaceState(null,"",window.location.pathname+"#leads");setView("leads");
    window.dispatchEvent(new Event("savrdh-crm-update"));
  }

  async function completeTask(task:Task){
    if(!task.id.startsWith("task-")){
      try{await supabase.from("scp_tasks").update({status:"completed",completed_at:new Date().toISOString()}).eq("id",task.id)}catch{}
    }
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:"completed"}:t));
  }

  return <CrmShell active={open?"Add New Lead":ACTIVE[view]} role="employee" profileName={profile.name} profileSubtitle="Relationship Manager">
    <main className={"employee-dashboard employee-view-"+view}>
      {message&&<div className="module-success employee-message"><span>{message}</span><button onClick={()=>setMessage("")}><X size={14}/></button></div>}
      {view==="dashboard"&&<EmployeeDashboard profile={profile} stats={stats} leads={leads} tasks={tasks} setOpen={setOpen} setView={v=>{setView(v);window.location.hash="#"+v}} setSelectedLead={setSelectedLead}/>}
      {view==="leads"&&<EmployeeLeads leads={filteredLeads} query={query} setQuery={setQuery} selected={selectedLead} setSelected={setSelectedLead} setOpen={setOpen}/>}
      {view==="applications"&&<EmployeeApplications apps={apps}/>}
      {view==="followups"&&<EmployeeFollowups leads={leads}/>}
      {view==="customers"&&<EmployeeCustomers customers={customers}/>}
      {view==="tasks"&&<EmployeeTasks tasks={tasks} completeTask={completeTask}/>}
      {view==="reports"&&<EmployeeReports stats={stats} leads={leads} apps={apps} tasks={tasks}/>}
      {view==="knowledge"&&<EmployeeKnowledge setMessage={setMessage}/>}
      {view==="support"&&<EmployeeSupport/>}
      {open&&<div className="module-modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="module-modal employee-lead-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="module-modal-head"><div><h2>Add New Lead</h2><p>The lead will be assigned to {profile.name}.</p></div><button onClick={()=>setOpen(false)}>×</button></div>
        <form className="module-form" onSubmit={createLead}>
          <label><span>Customer Name *</span><input name="name" required/></label><label><span>Mobile *</span><input name="mobile" required/></label>
          <label><span>Email</span><input name="email" type="email"/></label><label><span>Business / Project</span><input name="business"/></label>
          <label><span>Loan Type</span><select name="product"><option>Term Loan</option><option>Working Capital</option><option>Business Loan</option><option>Project Loan</option><option>Equipment Finance</option></select></label>
          <label><span>Loan Amount ₹</span><input name="amount" type="number" min="0"/></label><label><span>Next Follow-up</span><input name="followup" type="datetime-local"/></label>
          <label><span>Notes</span><textarea name="notes"/></label><div className="module-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Save Lead</button></div>
        </form>
      </div></div>}
    </main>
  </CrmShell>;
}

function Head({title,sub,action}:{title:string;sub:string;action?:React.ReactNode}){return <section className="employee-module-head"><div><span>EMPLOYEE PORTAL</span><h1>{title}</h1><p>{sub}</p></div>{action}</section>}

function EmployeeDashboard({profile,stats,leads,tasks,setOpen,setView,setSelectedLead}:any){
  return <>
    <section className="employee-hero"><div><span>Good Morning 👋</span><h1>{profile.name}!</h1><p>Stay focused. More conversations. More approvals. More success.</p></div><div className="employee-quote">“Small Efforts<br/><em>Create Big Opportunities</em>”</div></section>
    <section className="employee-kpis">
      <EmpKpi icon={<Users/>} label="My Leads" value={stats.leads} sub="Assigned to you"/>
      <EmpKpi icon={<FileText/>} label="My Applications" value={stats.applications} sub="Active portfolio"/>
      <EmpKpi icon={<CheckCircle2/>} label="Approved" value={stats.approved} sub="Sanctioned cases"/>
      <EmpKpi icon={<Clock3/>} label="In Progress" value={stats.inProgress} sub="Cases being processed"/>
    </section>
    <section className="employee-main-grid">
      <article className="employee-card employee-performance"><div className="employee-card-head"><div><h2>My Performance</h2><p>Track your progress towards your targets</p></div><span>This Month</span></div><div className="employee-performance-chart">{[18,30,44,39,64,61].map((h,i)=><i key={i} style={{height:h+"%"}}><b/></i>)}</div><div className="employee-months"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div></article>
      <article className="employee-card employee-source"><div className="employee-card-head"><div><h2>Lead Source</h2><p>Current month</p></div><span>This Month</span></div><div className="employee-source-body"><div className="employee-donut"><div><strong>{stats.leads}</strong><span>Total Leads</span></div></div><ul>{["Website","Partner Referral","Direct Walk-in","WhatsApp","Campaign"].map((x,i)=><li key={x}><i className={"es e"+i}/><span>{x}</span><b>{[35,28,15,12,10][i]}%</b></li>)}</ul></div></article>
      <article className="employee-card employee-tasks"><div className="employee-card-head"><h2>Today's Tasks</h2><button onClick={()=>setView("tasks")}>View All →</button></div>{tasks.slice(0,5).map((t:Task)=><div key={t.id} className={"employee-task-row "+(t.status==="completed"?"done":"")}><CheckCircle2 size={15}/><span><strong>{t.title}</strong><small>{t.description}</small></span><time>{t.dueAt?new Date(t.dueAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"—"}</time></div>)}</article>
    </section>
    <section className="employee-middle-grid">
      <article className="employee-card employee-recent"><div className="employee-card-head"><h2>Recent Leads Assigned to You</h2><button onClick={()=>setView("leads")}>View All →</button></div><table><thead><tr><th>#</th><th>Customer Name</th><th>Loan Type</th><th>Amount</th><th>Source</th><th>Status</th><th>Date</th><th/></tr></thead><tbody>{leads.slice(0,5).map((l:Lead,i:number)=><tr key={l.id} onClick={()=>{setSelectedLead(l);setView("leads")}}><td>{i+1}</td><td>{l.name}</td><td>{l.product}</td><td>{money(l.amount)}</td><td>{l.source}</td><td><span className={stageClass(l.stage)}>{label(l.stage)}</span></td><td>{new Date(l.createdAt).toLocaleDateString("en-IN")}</td><td><MoreHorizontal size={14}/></td></tr>)}</tbody></table></article>
      <article className="employee-card employee-target"><div className="employee-card-head"><h2>Monthly Target</h2><span>This Month</span></div><div className="employee-target-body"><div className="employee-target-ring"><strong>{Math.min(100,Math.round(stats.leads/100*100))}%</strong><span>Lead Target</span></div><div><TargetRow label="Leads Target" value={stats.leads} max={100}/><TargetRow label="Applications Target" value={stats.applications} max={40}/><TargetRow label="Approvals Target" value={stats.approved} max={15}/></div></div></article>
    </section>
    <section className="employee-bottom-grid">
      <article className="employee-card"><div className="employee-card-head"><h2>Quick Actions</h2></div><div className="employee-quick-actions"><button onClick={()=>setOpen(true)}><Plus/><span>Add New Lead</span></button><button onClick={()=>setView("followups")}><Phone/><span>Log Follow-up</span></button><button onClick={()=>setView("applications")}><UploadCloud/><span>Applications</span></button><button onClick={()=>setView("reports")}><BarChart3/><span>View Reports</span></button></div></article>
      <article className="employee-card"><div className="employee-card-head"><h2>Knowledge & Resources</h2><button onClick={()=>setView("knowledge")}>View All →</button></div><div className="employee-resource-list"><div><FileText/><span><strong>Product Brochures</strong><small>Loan product guides</small></span></div><div><FolderOpen/><span><strong>Scheme Details</strong><small>CGTMSE / PMEGP</small></span></div><div><BarChart3/><span><strong>Sales Pitch Deck</strong><small>Presentation material</small></span></div></div></article>
      <article className="employee-card"><div className="employee-card-head"><h2>Announcements</h2><span>Latest</span></div><div className="employee-announcements"><div>New scheme added - AHIDF</div><div>Indifi channel training update</div><div>Monthly review schedule</div></div></article>
    </section>
  </>;
}

function EmployeeLeads({leads,query,setQuery,selected,setSelected,setOpen}:any){
  const active=selected||leads[0]||null;return <><Head title="My Leads" sub="Work on leads assigned to your employee account." action={<button className="employee-primary" onClick={()=>setOpen(true)}><Plus size={15}/> Add New Lead</button>}/><div className="employee-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search assigned leads..."/></div><section className={"employee-lead-workspace"+(active?" detail":"")}><article className="employee-card employee-lead-table"><table><thead><tr><th>Customer</th><th>Business</th><th>Loan</th><th>Amount</th><th>Stage</th></tr></thead><tbody>{leads.map((l:Lead)=><tr key={l.id} className={active?.id===l.id?"selected":""} onClick={()=>setSelected(l)}><td><strong>{l.name}</strong><small>{l.mobile}</small></td><td>{l.business||"—"}</td><td>{l.product}</td><td>{money(l.amount)}</td><td><span className={stageClass(l.stage)}>{label(l.stage)}</span></td></tr>)}</tbody></table></article>{active&&<aside className="employee-card employee-lead-preview"><span>LEAD WORKSPACE</span><h2>{active.name}</h2><p>{active.business||active.product}</p><div className="employee-lead-info"><div><span>Mobile</span><strong>{active.mobile||"—"}</strong></div><div><span>Email</span><strong>{active.email||"—"}</strong></div><div><span>Requirement</span><strong>{money(active.amount)}</strong></div><div><span>Next Follow-up</span><strong>{active.nextFollowupAt?new Date(active.nextFollowupAt).toLocaleString("en-IN"):"Not scheduled"}</strong></div></div><div className="employee-workflow"><Step done title="Lead Assigned"/><Step done={active.stage!=="new"} title="Contacted / Follow-up"/><Step done={/qualified|application|document|credit|bank|sanction|disburs/i.test(active.stage)} title="Qualified"/><Step done={/application|document|credit|bank|sanction|disburs/i.test(active.stage)} title="Application Created"/><Step done={/credit|bank|sanction|disburs/i.test(active.stage)} title="Credit Processing"/></div><a href={"/crm/leads/"+active.id}>Open Lead 360° View →</a></aside>}</section></>
}

function EmployeeApplications({apps}:{apps:App[]}){return <><Head title="My Applications" sub="Applications assigned to you for processing."/><section className="employee-card employee-module-table"><table><thead><tr><th>Application</th><th>Customer</th><th>Loan Type</th><th>Amount</th><th>Stage</th><th>Date</th></tr></thead><tbody>{apps.length?apps.map(a=><tr key={a.id} onClick={()=>window.location.href="/crm/applications/"+a.id}><td><strong>{a.applicationNo}</strong></td><td>{a.customer}</td><td>{a.product}</td><td>{money(a.amount)}</td><td><span className={stageClass(a.stage)}>{label(a.stage)}</span></td><td>{new Date(a.createdAt).toLocaleDateString("en-IN")}</td></tr>):<tr><td colSpan={6}>No live applications are assigned to this employee yet.</td></tr>}</tbody></table></section></>}

function EmployeeFollowups({leads}:{leads:Lead[]}){const rows=leads.filter(l=>l.nextFollowupAt);return <><Head title="Follow-ups" sub="Scheduled customer calls and next actions."/><section className="employee-card employee-followups">{rows.length?rows.map(l=><div key={l.id}><Clock3/><span><strong>{l.name}</strong><small>{l.business||l.product}</small></span><time>{new Date(l.nextFollowupAt!).toLocaleString("en-IN")}</time><a href={"/crm/leads/"+l.id}>Open</a></div>):<div className="employee-empty">No follow-ups scheduled.</div>}</section></>}

function EmployeeCustomers({customers}:{customers:Customer[]}){return <><Head title="Customers" sub="Customers assigned to your employee account."/><section className="employee-card employee-module-table"><table><thead><tr><th>Customer</th><th>Business</th><th>Mobile</th><th>Status</th></tr></thead><tbody>{customers.length?customers.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.business||"—"}</td><td>{c.mobile||"—"}</td><td>{label(c.status)}</td></tr>):<tr><td colSpan={4}>No customers assigned yet.</td></tr>}</tbody></table></section></>}

function EmployeeTasks({tasks,completeTask}:{tasks:Task[];completeTask:(t:Task)=>void}){return <><Head title="Tasks" sub="Complete your operational work queue."/><section className="employee-card employee-task-page">{tasks.map(t=><div key={t.id} className={t.status==="completed"?"done":""}><button onClick={()=>completeTask(t)}><CheckCircle2/></button><span><strong>{t.title}</strong><small>{t.description}</small></span><em>{label(t.priority)}</em><time>{t.dueAt?new Date(t.dueAt).toLocaleString("en-IN"):"No due date"}</time></div>)}</section></>}

function EmployeeReports({stats,leads,apps,tasks}:any){return <><Head title="Reports" sub="Your personal CRM performance summary."/><section className="employee-report-grid"><article><span>Lead Conversion</span><strong>{stats.leads?Math.round(stats.applications/stats.leads*100):0}%</strong></article><article><span>Approval Ratio</span><strong>{stats.applications?Math.round(stats.approved/stats.applications*100):0}%</strong></article><article><span>Open Tasks</span><strong>{tasks.filter((t:Task)=>t.status!=="completed").length}</strong></article><article><span>Pipeline Value</span><strong>{money(apps.reduce((s:number,a:App)=>s+a.amount,0))}</strong></article></section></>}

function EmployeeKnowledge({setMessage}:{setMessage:(s:string)=>void}){return <><Head title="Knowledge Base" sub="Product and sales resources for daily work."/><section className="employee-knowledge-grid">{["Product Brochures","Scheme Details (CGTMSE, PMEGP)","Sales Pitch Deck","KYC Checklist","Bank Criteria Guide","Training Videos"].map(x=><button key={x} onClick={()=>setMessage(x+" selected. Admin-uploaded resource will open here when available.")}><FileText/><span><strong>{x}</strong><small>Open resource</small></span><ChevronRight/></button>)}</section></>}

function EmployeeSupport(){return <><Head title="Support" sub="Get operational or portal support."/><section className="employee-support-grid"><article className="employee-card"><Headphones/><h2>CRM Support</h2><p>For access, assignment or workflow issues.</p><button onClick={()=>window.location.href="mailto:support@savrdhfinancialservices.com?subject=Employee CRM Support"}><Mail/> Email Support</button></article><article className="employee-card"><MessageCircle/><h2>Customer Follow-up Help</h2><p>Open My Leads to see customer details and next action.</p><button onClick={()=>window.location.hash="#leads"}><Users/> Open My Leads</button></article></section></>}

function EmpKpi({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:number;sub:string}){return <article><div>{icon}</div><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>}
function TargetRow({label:txt,value,max}:{label:string;value:number;max:number}){return <div className="employee-target-row"><span>{txt}<b>{max}</b></span><i><b style={{width:Math.min(100,value/max*100)+"%"}}/></i><small>{value} / {max}</small></div>}
function Step({done,title}:{done:boolean;title:string}){return <div className={done?"done":""}><CircleDot/><span>{title}</span></div>}
