"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee, BarChart3, CheckCircle2, Copy, FileCheck2, FileText,
  FolderOpen, Handshake, Headphones, Landmark, MessageCircle, MoreHorizontal,
  Plus, QrCode, ShieldCheck, TrendingUp, UserRoundPlus, Users, WalletCards,
  Clock3, CircleDot, Building2, Mail, Phone, Save, X
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";

type View="dashboard"|"leads"|"customers"|"commissions"|"payouts"|"marketing"|"resources"|"support"|"profile";

type Referral={
  id:string;
  leadId?:string;
  customerId?:string|null;
  applicationId?:string|null;
  name:string;
  business:string;
  mobile?:string;
  email?:string;
  amount:number;
  product:string;
  status:string;
  createdAt:string;
  leadStage?:string;
  leadUpdatedAt?:string|null;
  nextFollowupAt?:string|null;
  notes?:string|null;
  applicationNo?:string|null;
  applicationStage?:string|null;
  applicationCreatedAt?:string|null;
  applicationUpdatedAt?:string|null;
  lenderStatus?:string|null;
  lenderSubmittedAt?:string|null;
};

type Commission={
  id:string;
  applicationId?:string;
  amount:number;
  status:string;
  createdAt:string;
};

type PartnerProfile={
  id?:string;
  name:string;
  code:string;
  mobile?:string;
  email?:string;
  status?:string;
};

const REF_KEY="savrdh-partner-referrals";
const COMM_KEY="savrdh-partner-commissions";

const HASH_TO_VIEW:Record<string,View>={
  "#leads":"leads",
  "#customers":"customers",
  "#commissions":"commissions",
  "#payouts":"payouts",
  "#marketing":"marketing",
  "#resources":"resources",
  "#support":"support",
  "#profile":"profile"
};

const ACTIVE_LABEL:Record<View,string>={
  dashboard:"Dashboard",
  leads:"My Leads",
  customers:"My Customers",
  commissions:"My Commissions",
  payouts:"Payouts",
  marketing:"Marketing Tools",
  resources:"Resources",
  support:"Support",
  profile:"My Profile"
};

function statusLabel(value:string){
  const v=(value||"referred").replaceAll("_"," ").toLowerCase();
  if(v==="application created") return "Application Created";
  if(v==="converted") return "Converted";
  if(v==="qualified") return "Qualified";
  if(v==="disbursed") return "Disbursed";
  if(v==="approved"||v==="sanctioned") return "Approved";
  if(v==="rejected") return "Rejected";
  return v.replace(/\b\w/g,x=>x.toUpperCase());
}

function statusClass(value:string){
  const v=(value||"referred").toLowerCase().replaceAll("_","-");
  return "partner-status "+v;
}

function formatMoney(v:number){
  return "₹ "+Number(v||0).toLocaleString("en-IN");
}

function laterStage(stage:string|undefined|null,targets:string[]){
  const s=(stage||"").toLowerCase().replaceAll(" ","_");
  return targets.some(t=>s.includes(t));
}

function timelineFor(r:Referral){
  const appStage=(r.applicationStage||"").toLowerCase();
  const lender=(r.lenderStatus||"").toLowerCase();
  const leadStage=(r.leadStage||r.status||"").toLowerCase();
  const appCreated=Boolean(r.applicationId||r.applicationNo);
  const creditDone=appCreated&&laterStage(appStage,["credit","bank","lender","sanction","approve","disburs"]);
  const lenderDone=Boolean(r.lenderStatus)||laterStage(appStage,["bank","lender","sanction","approve","disburs"]);
  const sanctionDone=laterStage(appStage,["sanction","approve","disburs"])||["approved","sanctioned","disbursed"].includes(lender);
  const disbursed=laterStage(appStage,["disburs"])||r.status==="disbursed"||lender==="disbursed";
  const contacted=!["","new","referred"].includes(leadStage)||appCreated;

  const steps=[
    {title:"Referral Submitted",desc:"Lead submitted from Partner Portal.",done:true,time:r.createdAt},
    {title:"CRM Lead Received",desc:"Lead is visible to the SAVRDH CRM team.",done:true,time:r.createdAt},
    {title:"Contact / Qualification",desc:contacted?"CRM team has progressed the lead.":"Waiting for CRM qualification / follow-up.",done:contacted,time:r.leadUpdatedAt},
    {title:"Application Created",desc:appCreated?(r.applicationNo?"Application "+r.applicationNo+" created.":"Loan application created."):"Lead has not been converted to an application yet.",done:appCreated,time:r.applicationCreatedAt},
    {title:"Credit Review",desc:creditDone?"Application moved through credit analysis.":"Credit review starts after application/document readiness.",done:creditDone,time:r.applicationUpdatedAt},
    {title:"Lender Submission",desc:lenderDone?(r.lenderStatus?"Lender status: "+statusLabel(r.lenderStatus):"Application moved to lender workflow."):"Not submitted to a lender yet.",done:lenderDone,time:r.lenderSubmittedAt},
    {title:"Sanction / Approval",desc:sanctionDone?"Loan reached sanction/approval stage.":"Awaiting lender approval.",done:sanctionDone,time:r.applicationUpdatedAt},
    {title:"Disbursement",desc:disbursed?"Loan disbursement stage completed.":"Disbursement pending.",done:disbursed,time:r.applicationUpdatedAt}
  ];
  const firstPending=steps.findIndex(s=>!s.done);
  return steps.map((s,i)=>({...s,current:firstPending===i}));
}

export function PartnerPortalWorkspace(){
  const [open,setOpen]=useState(false);
  const [view,setView]=useState<View>("dashboard");
  const [rows,setRows]=useState<Referral[]>([]);
  const [selectedLead,setSelectedLead]=useState<Referral|null>(null);
  const [commissions,setCommissions]=useState<Commission[]>([]);
  const [profile,setProfile]=useState<PartnerProfile>({name:"Channel Partner",code:"PARTNER"});
  const [message,setMessage]=useState("");
  const [copied,setCopied]=useState(false);
  const [profileSaving,setProfileSaving]=useState(false);

  async function load(){
    let localRefs:Referral[]=[];
    let localComms:Commission[]=[];
    try{
      const raw=localStorage.getItem(REF_KEY);
      localRefs=raw?JSON.parse(raw):[];
      const rawC=localStorage.getItem(COMM_KEY);
      localComms=rawC?JSON.parse(rawC):[];
    }catch{}

    let liveRefs:Referral[]=[];
    let liveComms:Commission[]=[];
    let liveProfile:PartnerProfile|null=null;

    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(user){
        const {data:p}=await supabase
          .from("scp_partners")
          .select("id,partner_code,name,mobile,email,status")
          .eq("auth_user_id",user.id)
          .maybeSingle();

        if(p){
          liveProfile={
            id:p.id,name:p.name||"Channel Partner",code:p.partner_code||"PARTNER",
            mobile:p.mobile||"",email:p.email||"",status:p.status||"active"
          };

          const {data:r}=await supabase
            .from("scp_partner_referrals")
            .select("id,status,created_at,lead_id,customer_id,application_id,scp_leads(name,business_name,mobile,email,requested_amount,product_interest,stage,updated_at,next_followup_at,notes,customer_id)")
            .eq("partner_id",p.id)
            .order("created_at",{ascending:false});

          const {data:apps}=await supabase
            .from("scp_loan_applications")
            .select("id,lead_id,customer_id,application_no,stage,created_at,updated_at")
            .eq("partner_id",p.id)
            .order("created_at",{ascending:false});

          const appRows=(apps||[]) as any[];
          const appById=new Map(appRows.map(a=>[a.id,a]));
          const appByLead=new Map(appRows.filter(a=>a.lead_id).map(a=>[a.lead_id,a]));
          const appIds=appRows.map(a=>a.id);

          let submissions:any[]=[];
          if(appIds.length){
            const {data:subs}=await supabase
              .from("scp_lender_submissions")
              .select("id,application_id,status,submitted_at,last_status_at")
              .in("application_id",appIds)
              .order("created_at",{ascending:false});
            submissions=(subs||[]) as any[];
          }
          const subByApp=new Map<string,any>();
          submissions.forEach(s=>{if(!subByApp.has(s.application_id)) subByApp.set(s.application_id,s)});

          if(r){
            liveRefs=(r as any[]).map(x=>{
              const app=appById.get(x.application_id)||appByLead.get(x.lead_id);
              const sub=app?subByApp.get(app.id):null;
              return {
                id:x.id,
                leadId:x.lead_id||undefined,
                customerId:x.customer_id||x.scp_leads?.customer_id||app?.customer_id||null,
                applicationId:app?.id||x.application_id||null,
                name:x.scp_leads?.name||"Lead",
                business:x.scp_leads?.business_name||"",
                mobile:x.scp_leads?.mobile||"",
                email:x.scp_leads?.email||"",
                amount:Number(x.scp_leads?.requested_amount||0),
                product:x.scp_leads?.product_interest||"Business Loan",
                status:x.status||"referred",
                createdAt:x.created_at,
                leadStage:x.scp_leads?.stage||x.status||"referred",
                leadUpdatedAt:x.scp_leads?.updated_at||null,
                nextFollowupAt:x.scp_leads?.next_followup_at||null,
                notes:x.scp_leads?.notes||null,
                applicationNo:app?.application_no||null,
                applicationStage:app?.stage||null,
                applicationCreatedAt:app?.created_at||null,
                applicationUpdatedAt:app?.updated_at||null,
                lenderStatus:sub?.status||null,
                lenderSubmittedAt:sub?.last_status_at||sub?.submitted_at||null
              } as Referral;
            });
          }

          const {data:c}=await supabase
            .from("scp_commission_ledger")
            .select("id,application_id,commission_amount,status,created_at")
            .eq("partner_id",p.id)
            .order("created_at",{ascending:false});
          if(c){
            liveComms=(c as any[]).map(x=>({
              id:x.id,applicationId:x.application_id,amount:Number(x.commission_amount||0),
              status:x.status||"pending",createdAt:x.created_at
            }));
          }
        }
      }
    }catch{}

    const refMap=new Map<string,Referral>();
    [...localRefs,...liveRefs].forEach(r=>refMap.set(r.id,{...(refMap.get(r.id)||{}),...r} as Referral));
    const commMap=new Map<string,Commission>();
    [...localComms,...liveComms].forEach(r=>commMap.set(r.id,{...(commMap.get(r.id)||{}),...r}));

    const merged=Array.from(refMap.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    setRows(merged);
    setCommissions(Array.from(commMap.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    if(liveProfile) setProfile(liveProfile);
    setSelectedLead(prev=>prev?merged.find(x=>x.id===prev.id)||prev:null);
  }

  useEffect(()=>{
    void load();

    const hashAction=()=>{
      const h=window.location.hash;
      if(h==="#add"){
        setOpen(true);
        return;
      }
      setView(HASH_TO_VIEW[h]||"dashboard");
    };
    const sync=()=>void load();

    window.addEventListener("savrdh-crm-update",sync);
    window.addEventListener("storage",sync);
    window.addEventListener("hashchange",hashAction);
    window.addEventListener("savrdh-portal-nav",hashAction as EventListener);
    window.addEventListener("popstate",hashAction);
    hashAction();
    return()=>{
      window.removeEventListener("savrdh-crm-update",sync);
      window.removeEventListener("storage",sync);
      window.removeEventListener("hashchange",hashAction);
      window.removeEventListener("savrdh-portal-nav",hashAction as EventListener);
      window.removeEventListener("popstate",hashAction);
    };
  },[]);

  const stats=useMemo(()=>{
    const applications=rows.filter(r=>r.applicationId||["application_created","approved","sanctioned","disbursed"].includes(r.status)).length;
    const approved=rows.filter(r=>["approved","sanctioned","disbursed"].includes(r.status)||laterStage(r.applicationStage,["approve","sanction","disburs"])).length;
    const disbursed=rows.filter(r=>r.status==="disbursed"||laterStage(r.applicationStage,["disburs"])).length;
    const earned=commissions.filter(c=>["approved","paid","accrued"].includes(c.status)).reduce((s,c)=>s+c.amount,0);
    const pending=commissions.filter(c=>!["paid"].includes(c.status)).reduce((s,c)=>s+c.amount,0);
    return {applications,approved,disbursed,earned,pending};
  },[rows,commissions]);

  const referralLink=useMemo(()=>{
    const slug=(profile.code||profile.name||"partner").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    return "https://savrdh.in/partner/"+slug;
  },[profile]);

  function closeAdd(){
    setOpen(false);
    if(typeof window!=="undefined"&&window.location.hash==="#add"){
      window.history.replaceState(null,"",window.location.pathname);
      setView("dashboard");
    }
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    setMessage("");
    const fd=new FormData(form);
    const payload={
      name:String(fd.get("name")||"").trim(),
      mobile:String(fd.get("mobile")||"").trim(),
      email:String(fd.get("email")||"").trim(),
      business_name:String(fd.get("business")||"").trim(),
      business_type:String(fd.get("businessType")||"").trim(),
      requested_amount:Number(fd.get("amount")||0),
      product_interest:String(fd.get("product")||"Business Loan"),
      notes:String(fd.get("notes")||"").trim()
    };

    try{
      const {data,error}=await supabase.rpc("scp_submit_partner_lead",{
        p_name:payload.name,p_mobile:payload.mobile||null,p_email:payload.email||null,
        p_business_name:payload.business_name||null,p_business_type:payload.business_type||null,
        p_requested_amount:payload.requested_amount||null,p_product_interest:payload.product_interest||null,
        p_notes:payload.notes||null
      });
      if(error) throw error;

      const row:Referral={
        id:data?.lead_id||crypto.randomUUID(),leadId:data?.lead_id||undefined,
        name:payload.name,business:payload.business_name,mobile:payload.mobile,email:payload.email,
        amount:payload.requested_amount,product:payload.product_interest,
        status:"referred",leadStage:"new",createdAt:new Date().toISOString(),notes:payload.notes
      };
      setRows(prev=>[row,...prev]);
      setMessage("Referral submitted successfully. It is now visible in CRM Leads.");
    }catch{
      const id=crypto.randomUUID();
      const row:Referral={
        id,leadId:id,name:payload.name,business:payload.business_name,mobile:payload.mobile,email:payload.email,
        amount:payload.requested_amount,product:payload.product_interest,status:"referred",leadStage:"new",
        createdAt:new Date().toISOString(),notes:payload.notes
      };
      try{
        const raw=localStorage.getItem(REF_KEY);const refs=raw?JSON.parse(raw):[];
        localStorage.setItem(REF_KEY,JSON.stringify([row,...refs]));

        const rawLeads=localStorage.getItem("savrdh-crm-leads");const leads=rawLeads?JSON.parse(rawLeads):[];
        localStorage.setItem("savrdh-crm-leads",JSON.stringify([{
          id,createdAt:row.createdAt,name:payload.name,mobile:payload.mobile,email:payload.email,
          business:payload.business_name,businessType:payload.business_type,loanType:payload.product_interest,
          loanNeed:String(payload.requested_amount),source:"Partner",assignedTo:"Unassigned",stage:"new",
          partnerCode:profile.code,notes:payload.notes
        },...leads]));

        const rawN=localStorage.getItem("savrdh-crm-notifications");const ns=rawN?JSON.parse(rawN):[];
        localStorage.setItem("savrdh-crm-notifications",JSON.stringify([{
          id:crypto.randomUUID(),title:"New Partner Lead",
          body:payload.name+(payload.business_name?" · "+payload.business_name:""),
          entityType:"lead",entityId:id,createdAt:row.createdAt,read:false,audience:"owner"
        },...ns]));
        window.dispatchEvent(new Event("savrdh-crm-update"));
        window.dispatchEvent(new Event("savrdh-notification-update"));
      }catch{}
      setRows(prev=>[row,...prev]);
      setMessage("Work Mode: referral added to CRM Leads.");
    }

    form.reset();
    closeAdd();
    setView("leads");
    if(typeof window!=="undefined") window.history.replaceState(null,"",window.location.pathname+"#leads");
  }

  async function copyReferral(){
    try{await navigator.clipboard.writeText(referralLink);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{}
  }

  function shareWhatsApp(){
    window.open("https://wa.me/?text="+encodeURIComponent("Apply through my SAVRDH referral link: "+referralLink),"_blank","noopener,noreferrer");
  }

  async function saveProfile(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const next={...profile,name:String(fd.get("name")||profile.name),mobile:String(fd.get("mobile")||""),email:String(fd.get("email")||"")};
    setProfileSaving(true);
    try{
      if(profile.id){
        const {error}=await supabase.from("scp_partners").update({name:next.name,mobile:next.mobile||null,email:next.email||null}).eq("id",profile.id);
        if(error) throw error;
      }else{
        localStorage.setItem("savrdh-partner-profile",JSON.stringify(next));
      }
      setProfile(next);setMessage("Partner profile updated.");
    }catch{
      try{localStorage.setItem("savrdh-partner-profile",JSON.stringify(next));}catch{}
      setProfile(next);setMessage("Work Mode: profile saved locally.");
    }finally{setProfileSaving(false)}
  }

  function downloadResource(title:string){
    setMessage(title+" is selected. Admin-uploaded resource file will open here when available.");
  }

  const recent=rows.slice(0,5);

  return <CrmShell active={open?"Add New Lead":ACTIVE_LABEL[view]} role="partner" profileName={profile.name} profileSubtitle="Channel Partner">
    <main className={"partner-dashboard partner-view-"+view}>
      {message&&<div className="module-success partner-global-message"><span>{message}</span><button onClick={()=>setMessage("")}><X size={14}/></button></div>}

      {view==="dashboard"&&<DashboardView
        profile={profile} stats={stats} rows={rows} recent={recent}
        referralLink={referralLink} copied={copied} copyReferral={copyReferral}
        shareWhatsApp={shareWhatsApp} setOpen={setOpen} setSelectedLead={(r)=>{setSelectedLead(r);window.location.hash="#leads";}}
      />}

      {view==="leads"&&<LeadsView rows={rows} selectedLead={selectedLead} setSelectedLead={setSelectedLead} setOpen={setOpen}/>}
      {view==="customers"&&<CustomersView rows={rows}/>}
      {view==="commissions"&&<CommissionsView commissions={commissions}/>}
      {view==="payouts"&&<PayoutsView commissions={commissions} earned={stats.earned} pending={stats.pending}/>}
      {view==="marketing"&&<MarketingView referralLink={referralLink} copied={copied} copyReferral={copyReferral} shareWhatsApp={shareWhatsApp}/>}
      {view==="resources"&&<ResourcesView downloadResource={downloadResource}/>}
      {view==="support"&&<SupportView/>}
      {view==="profile"&&<ProfileView profile={profile} saveProfile={saveProfile} saving={profileSaving}/>}

      {open&&<div className="module-modal-backdrop" onMouseDown={closeAdd}><div className="module-modal partner-lead-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="module-modal-head"><div><h2>Add New Lead</h2><p>This referral will appear in SAVRDH CRM automatically.</p></div><button onClick={closeAdd}>×</button></div>
        <form className="module-form" onSubmit={submit}>
          <label><span>Customer Name *</span><input name="name" required/></label>
          <label><span>Mobile *</span><input name="mobile" required/></label>
          <label><span>Email</span><input name="email" type="email"/></label>
          <label><span>Business / Firm</span><input name="business"/></label>
          <label><span>Business Type</span><input name="businessType"/></label>
          <label><span>Loan Type</span><select name="product"><option>Term Loan</option><option>Working Capital</option><option>Business Loan</option><option>Project Loan</option><option>Equipment Finance</option></select></label>
          <label><span>Loan Amount ₹</span><input name="amount" type="number" min="0"/></label>
          <label><span>Notes</span><textarea name="notes"/></label>
          <div className="module-form-actions"><button type="button" onClick={closeAdd}>Cancel</button><button type="submit">Submit Referral</button></div>
        </form>
      </div></div>}
    </main>
  </CrmShell>;
}

function ModuleHead({eyebrow,title,sub,action}:{eyebrow:string;title:string;sub:string;action?:React.ReactNode}){
  return <section className="partner-module-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div>{action}</section>;
}

function DashboardView({profile,stats,rows,recent,referralLink,copied,copyReferral,shareWhatsApp,setOpen,setSelectedLead}:any){
  return <>
    <section className="partner-hero">
      <div><span>PARTNER PORTAL</span><h1>Welcome Back, <em>{profile.name.split(" ")[0]||"Partner"}!</em></h1><p>Keep referring. Keep earning. Let's grow together.</p></div>
      <div className="partner-quote">“Partnership<br/><em>Builds Possibilities</em>”</div>
      <article className="partner-earnings-card"><WalletCards size={22}/><div><span>Total Earnings (Lifetime)</span><strong>{formatMoney(stats.earned)}</strong><small>Next payout milestone</small></div><b>→</b><i><span style={{width:Math.min(100,stats.earned?75:12)+"%"}}/></i></article>
    </section>

    <section className="partner-kpis">
      <PartnerKpi icon={<Users/>} label="Total Leads Submitted" value={String(rows.length)} sub="All referrals"/>
      <PartnerKpi icon={<FileText/>} label="Active Applications" value={String(stats.applications)} sub="Under processing"/>
      <PartnerKpi icon={<BadgeIndianRupee/>} label="Approved Loans" value={String(stats.approved)} sub="Sanctioned / disbursed"/>
      <PartnerKpi icon={<Handshake/>} label="Commission Earned" value={formatMoney(stats.earned)} sub={"Pending: "+formatMoney(stats.pending)}/>
    </section>

    <section className="partner-main-grid">
      <article className="partner-card partner-performance">
        <div className="partner-card-head"><div><h2>Lead Performance</h2><p>Track your submitted leads and their progress</p></div><span>Last 6 Months</span></div>
        <div className="partner-line-chart">{[22,30,38,34,51,46].map((v,i)=><i key={i} style={{height:v+"%"}}><b/></i>)}</div>
        <div className="partner-months"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div>
      </article>

      <article className="partner-card partner-status-card">
        <div className="partner-card-head"><div><h2>Application Status</h2><p>Current referral conversion</p></div><span>This Month</span></div>
        <div className="partner-status-content">
          <div className="partner-donut"><div><strong>{stats.applications}</strong><span>Applications</span></div></div>
          <ul>{[
            ["In Review",rows.filter((r:Referral)=>["referred","qualified"].includes(r.status)).length],
            ["Application",stats.applications],["Approved",stats.approved],["Disbursed",stats.disbursed]
          ].map(([label,count],i)=><li key={String(label)}><i className={"pd p"+i}/><span>{label}</span><b>{count}</b></li>)}</ul>
        </div>
      </article>

      <article className="partner-card partner-referral-card">
        <h2>Your Referral Link</h2><p>Share this link with your network</p>
        <div className="partner-ref-link"><span>{referralLink}</span><button onClick={copyReferral}><Copy size={15}/></button></div>
        <button className="partner-wa-share" onClick={shareWhatsApp}><MessageCircle size={16}/> {copied?"Copied":"Share on WhatsApp"}</button>
        <div className="partner-share-icons"><button onClick={shareWhatsApp}>WA</button><button onClick={copyReferral}>in</button><button onClick={copyReferral}>f</button><button onClick={copyReferral}>X</button><button onClick={copyReferral}>@</button><button onClick={copyReferral}><QrCode size={14}/></button></div>
      </article>
    </section>

    <section className="partner-secondary-grid">
      <article className="partner-card partner-recent-leads">
        <div className="partner-card-head"><h2>Recent Leads</h2><button onClick={()=>window.location.hash="#leads"}>View All →</button></div>
        <table><thead><tr><th>#</th><th>Customer Name</th><th>Loan Type</th><th>Loan Amount</th><th>Status</th><th>Date</th><th/></tr></thead>
        <tbody>{recent.length?recent.map((r:Referral,i:number)=><tr key={r.id} onClick={()=>setSelectedLead(r)} className="partner-click-row"><td>{i+1}</td><td>{r.name}</td><td>{r.product}</td><td>{formatMoney(r.amount)}</td><td><span className={statusClass(r.applicationStage||r.status)}>{statusLabel(r.applicationStage||r.status)}</span></td><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td><td><MoreHorizontal size={15}/></td></tr>):<tr><td colSpan={7}>No leads submitted yet.</td></tr>}</tbody></table>
      </article>

      <article className="partner-card partner-commission-breakdown">
        <div className="partner-card-head"><div><h2>Commission Breakdown</h2><p>Verified earnings only</p></div><span>This Month</span></div>
        <strong>{formatMoney(stats.earned)}</strong>
        <div className="partner-commission-bars">{[68,54,45,36,28].map((v,i)=><div key={i}><b style={{height:v+"%"}}/><span>{["Term Loan","Working Cap","Business Loan","OD/CC","Others"][i]}</span></div>)}</div>
      </article>
    </section>

    <section className="partner-dashboard-actions">
      <button onClick={()=>setOpen(true)}><UserRoundPlus size={18}/><span><strong>Add New Lead</strong><small>Refer a new borrower</small></span></button>
      <button onClick={()=>window.location.hash="#leads"}><Clock3 size={18}/><span><strong>Track Lead Timeline</strong><small>See CRM progress</small></span></button>
      <button onClick={()=>window.location.hash="#commissions"}><BadgeIndianRupee size={18}/><span><strong>My Commission</strong><small>Verified earnings</small></span></button>
      <button onClick={()=>window.location.hash="#resources"}><FolderOpen size={18}/><span><strong>Resources</strong><small>Partner material</small></span></button>
    </section>
  </>;
}

function LeadsView({rows,selectedLead,setSelectedLead,setOpen}:{rows:Referral[];selectedLead:Referral|null;setSelectedLead:(r:Referral|null)=>void;setOpen:(v:boolean)=>void}){
  const active=selectedLead||rows[0]||null;
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="My Leads" sub="Track every referral and see exactly what is happening in CRM."
      action={<button className="partner-primary-btn" onClick={()=>setOpen(true)}><Plus size={15}/> Add New Lead</button>}/>
    <section className={"partner-leads-workspace"+(active?" has-detail":"")}>
      <article className="partner-card partner-lead-list">
        <div className="partner-card-head"><div><h2>Submitted Leads</h2><p>{rows.length} total referrals</p></div><span>Live status</span></div>
        <div className="partner-table-wrap"><table>
          <thead><tr><th>Lead</th><th>Business</th><th>Loan</th><th>Amount</th><th>CRM Stage</th><th>Application</th></tr></thead>
          <tbody>{rows.length?rows.map(r=><tr key={r.id} onClick={()=>setSelectedLead(r)} className={"partner-click-row "+(active?.id===r.id?"selected":"")}>
            <td><strong>{r.name}</strong><small>{r.mobile||"—"}</small></td>
            <td>{r.business||"—"}</td><td>{r.product}</td><td>{formatMoney(r.amount)}</td>
            <td><span className={statusClass(r.applicationStage||r.leadStage||r.status)}>{statusLabel(r.applicationStage||r.leadStage||r.status)}</span></td>
            <td>{r.applicationNo||"Not created"}</td>
          </tr>):<tr><td colSpan={6}>No leads submitted yet.</td></tr>}</tbody>
        </table></div>
      </article>
      {active&&<LeadTimelinePanel lead={active}/>}
    </section>
  </>;
}

function LeadTimelinePanel({lead}:{lead:Referral}){
  const timeline=timelineFor(lead);
  const completed=timeline.filter(x=>x.done).length;
  const pct=Math.round(completed/timeline.length*100);
  return <aside className="partner-card partner-lead-detail">
    <div className="partner-lead-detail-head">
      <div><span>LEAD PROGRESS</span><h2>{lead.name}</h2><p>{lead.business||lead.product}</p></div>
      <span className={statusClass(lead.applicationStage||lead.leadStage||lead.status)}>{statusLabel(lead.applicationStage||lead.leadStage||lead.status)}</span>
    </div>
    <div className="partner-lead-progress"><div><span style={{width:pct+"%"}}/></div><strong>{pct}% workflow progress</strong></div>

    <div className="partner-lead-facts">
      <div><span>Lead ID</span><strong>{lead.leadId?lead.leadId.slice(0,8).toUpperCase():"—"}</strong></div>
      <div><span>Application</span><strong>{lead.applicationNo||"Not created"}</strong></div>
      <div><span>Loan Amount</span><strong>{formatMoney(lead.amount)}</strong></div>
      <div><span>Next Follow-up</span><strong>{lead.nextFollowupAt?new Date(lead.nextFollowupAt).toLocaleString("en-IN"):"Not scheduled"}</strong></div>
    </div>

    {lead.notes&&<div className="partner-lead-note"><strong>CRM Note</strong><span>{lead.notes}</span></div>}

    <div className="partner-timeline">
      {timeline.map((step,i)=><div key={step.title} className={(step.done?"done ":"")+(step.current?"current":"")}>
        <div className="partner-timeline-dot">{step.done?<CheckCircle2 size={14}/>:step.current?<CircleDot size={14}/>:<Clock3 size={13}/>}</div>
        <div><strong>{step.title}</strong><span>{step.desc}</span>{step.time&&<small>{new Date(step.time).toLocaleString("en-IN")}</small>}</div>
      </div>)}
    </div>
  </aside>;
}

function CustomersView({rows}:{rows:Referral[]}){
  const customers=rows.filter(r=>r.customerId);
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="My Customers" sub="Customers converted from your referred leads."/>
    <section className="partner-card partner-module-table">
      <div className="partner-card-head"><div><h2>Converted Customers</h2><p>Linked to your referral record</p></div><span>{customers.length} customers</span></div>
      <table><thead><tr><th>Customer</th><th>Business</th><th>Loan Type</th><th>Application</th><th>Current Stage</th></tr></thead>
      <tbody>{customers.length?customers.map(r=><tr key={r.id}><td><strong>{r.name}</strong><small>{r.mobile||"—"}</small></td><td>{r.business||"—"}</td><td>{r.product}</td><td>{r.applicationNo||"—"}</td><td><span className={statusClass(r.applicationStage||r.status)}>{statusLabel(r.applicationStage||r.status)}</span></td></tr>):<tr><td colSpan={5}>No referred lead has been converted to a customer yet.</td></tr>}</tbody></table>
    </section>
  </>;
}

function CommissionsView({commissions}:{commissions:Commission[]}){
  const total=commissions.reduce((s,c)=>s+c.amount,0);
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="My Commissions" sub="Commission entries linked to verified applications and transactions."/>
    <section className="partner-kpis partner-module-kpis">
      <PartnerKpi icon={<BadgeIndianRupee/>} label="Total Commission" value={formatMoney(total)} sub="All ledger entries"/>
      <PartnerKpi icon={<CheckCircle2/>} label="Paid" value={formatMoney(commissions.filter(c=>c.status==="paid").reduce((s,c)=>s+c.amount,0))} sub="Completed payout"/>
      <PartnerKpi icon={<Clock3/>} label="Pending" value={formatMoney(commissions.filter(c=>c.status!=="paid").reduce((s,c)=>s+c.amount,0))} sub="Awaiting payout"/>
      <PartnerKpi icon={<FileCheck2/>} label="Entries" value={String(commissions.length)} sub="Commission ledger"/>
    </section>
    <section className="partner-card partner-module-table"><table><thead><tr><th>Date</th><th>Application</th><th>Amount</th><th>Status</th></tr></thead><tbody>{commissions.length?commissions.map(c=><tr key={c.id}><td>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td><td>{c.applicationId?.slice(0,8).toUpperCase()||"—"}</td><td>{formatMoney(c.amount)}</td><td><span className={statusClass(c.status)}>{statusLabel(c.status)}</span></td></tr>):<tr><td colSpan={4}>No commission entries yet.</td></tr>}</tbody></table></section>
  </>;
}

function PayoutsView({commissions,earned,pending}:{commissions:Commission[];earned:number;pending:number}){
  const paid=commissions.filter(c=>c.status==="paid");
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="Payouts" sub="Track finance-verified partner payouts."/>
    <section className="partner-payout-big">
      <article><span>Total Earned</span><strong>{formatMoney(earned)}</strong><small>Approved / accrued commissions</small></article>
      <article><span>Pending Payout</span><strong>{formatMoney(pending)}</strong><small>Awaiting finance completion</small></article>
      <article><span>Paid Entries</span><strong>{paid.length}</strong><small>Completed payouts</small></article>
    </section>
    <section className="partner-card partner-module-table"><div className="partner-card-head"><h2>Payout History</h2><span>Finance verified</span></div><table><thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>{paid.length?paid.map(c=><tr key={c.id}><td>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td><td>{c.id.slice(0,8).toUpperCase()}</td><td>{formatMoney(c.amount)}</td><td><span className="partner-status disbursed">Paid</span></td></tr>):<tr><td colSpan={4}>No completed payouts yet.</td></tr>}</tbody></table></section>
  </>;
}

function MarketingView({referralLink,copied,copyReferral,shareWhatsApp}:{referralLink:string;copied:boolean;copyReferral:()=>void;shareWhatsApp:()=>void}){
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="Marketing Tools" sub="Share your referral link and generate new opportunities."/>
    <section className="partner-marketing-grid">
      <article className="partner-card partner-referral-card partner-referral-large"><h2>Your Referral Link</h2><p>Every lead submitted through this link can be associated with your partner account.</p><div className="partner-ref-link"><span>{referralLink}</span><button onClick={copyReferral}><Copy size={16}/></button></div><button className="partner-wa-share" onClick={shareWhatsApp}><MessageCircle size={16}/> Share on WhatsApp</button><small>{copied?"Referral link copied.":"Use copy or WhatsApp share."}</small></article>
      <article className="partner-card"><div className="partner-card-head"><h2>Share Channels</h2><span>Quick actions</span></div><div className="partner-marketing-actions"><button onClick={shareWhatsApp}>WhatsApp</button><button onClick={copyReferral}>Copy Link</button><button onClick={()=>window.location.href="mailto:?subject=SAVRDH Loan Referral&body="+encodeURIComponent(referralLink)}>Email</button><button onClick={copyReferral}><QrCode size={15}/> QR Link</button></div></article>
    </section>
  </>;
}

function ResourcesView({downloadResource}:{downloadResource:(title:string)=>void}){
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="Resources" sub="Partner sales, product and compliance material."/>
    <section className="partner-card"><div className="partner-resource-grid partner-resource-page">
      <Resource icon={<FileText/>} title="Product Brochure" sub="Download / open" action={()=>downloadResource("Product Brochure")}/>
      <Resource icon={<FileCheck2/>} title="Scheme Details" sub="Product guide" action={()=>downloadResource("Scheme Details")}/>
      <Resource icon={<BarChart3/>} title="Client Presentation" sub="Sales presentation" action={()=>downloadResource("Client Presentation")}/>
      <Resource icon={<CheckCircle2/>} title="KYC Checklist" sub="Required documents" action={()=>downloadResource("KYC Checklist")}/>
      <Resource icon={<FolderOpen/>} title="Marketing Creatives" sub="Posters & creatives" action={()=>downloadResource("Marketing Creatives")}/>
      <Resource icon={<TrendingUp/>} title="Training Videos" sub="Partner training" action={()=>downloadResource("Training Videos")}/>
    </div></section>
  </>;
}

function SupportView(){
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="Support" sub="Get help with referrals, applications, commission or portal access."/>
    <section className="partner-support-grid">
      <article className="partner-card"><Headphones size={25}/><h2>Partner Helpdesk</h2><p>Email the SAVRDH support team for portal and referral assistance.</p><button onClick={()=>window.location.href="mailto:support@savrdhfinancialservices.com?subject=Partner Portal Support"}><Mail size={15}/> Email Support</button></article>
      <article className="partner-card"><MessageCircle size={25}/><h2>Application Support</h2><p>For a specific lead, open My Leads and review its timeline before raising a query.</p><button onClick={()=>window.location.hash="#leads"}>Open My Leads</button></article>
    </section>
  </>;
}

function ProfileView({profile,saveProfile,saving}:{profile:PartnerProfile;saveProfile:(e:FormEvent<HTMLFormElement>)=>void;saving:boolean}){
  return <>
    <ModuleHead eyebrow="PARTNER PORTAL" title="My Profile" sub="Partner identity and contact information."/>
    <section className="partner-profile-grid">
      <article className="partner-card partner-profile-summary"><div className="partner-profile-big-avatar">{profile.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><h2>{profile.name}</h2><span>{profile.code}</span><p><ShieldCheck size={14}/> {statusLabel(profile.status||"active")} partner account</p></article>
      <article className="partner-card"><div className="partner-card-head"><h2>Edit Contact Details</h2><span>Partner profile</span></div><form className="partner-profile-form" onSubmit={saveProfile}><label><span>Name</span><input name="name" defaultValue={profile.name}/></label><label><span>Partner Code</span><input value={profile.code} disabled/></label><label><span>Mobile</span><input name="mobile" defaultValue={profile.mobile||""}/></label><label><span>Email</span><input name="email" type="email" defaultValue={profile.email||""}/></label><button type="submit" disabled={saving}><Save size={15}/>{saving?"Saving...":"Save Profile"}</button></form></article>
    </section>
  </>;
}

function PartnerKpi({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){
  return <article><div>{icon}</div><section><span>{label}</span><strong>{value}</strong><small>{sub}</small></section></article>;
}

function Resource({icon,title,sub,action}:{icon:React.ReactNode;title:string;sub:string;action?:()=>void}){
  return <button onClick={action}><div>{icon}</div><span><strong>{title}</strong><small>{sub}</small></span></button>;
}
