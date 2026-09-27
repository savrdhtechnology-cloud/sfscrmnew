"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeIndianRupee, BarChart3, CheckCircle2, Copy, Download, FileCheck2, FileText,
  FolderOpen, Handshake, Headphones, Link2, MessageCircle, MoreHorizontal, Plus,
  QrCode, Share2, ShieldCheck, TrendingUp, UserRoundPlus, Users, WalletCards
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";

type Referral={
  id:string;
  leadId?:string;
  customerId?:string|null;
  applicationId?:string|null;
  name:string;
  business:string;
  mobile?:string;
  amount:number;
  product:string;
  status:string;
  createdAt:string;
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

export function PartnerPortalWorkspace(){
  const [open,setOpen]=useState(false);
  const [rows,setRows]=useState<Referral[]>([]);
  const [commissions,setCommissions]=useState<Commission[]>([]);
  const [profile,setProfile]=useState<PartnerProfile>({name:"Channel Partner",code:"PARTNER"});
  const [message,setMessage]=useState("");
  const [copied,setCopied]=useState(false);
  const formRef=useRef<HTMLFormElement|null>(null);

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
          liveProfile={id:p.id,name:p.name||"Channel Partner",code:p.partner_code||"PARTNER",mobile:p.mobile||"",email:p.email||"",status:p.status||"active"};
          const {data:r}=await supabase
            .from("scp_partner_referrals")
            .select("id,status,created_at,lead_id,customer_id,application_id,scp_leads(name,business_name,mobile,requested_amount,product_interest)")
            .eq("partner_id",p.id)
            .order("created_at",{ascending:false});

          if(r){
            liveRefs=(r as any[]).map(x=>({
              id:x.id,
              leadId:x.lead_id||undefined,
              customerId:x.customer_id||null,
              applicationId:x.application_id||null,
              name:x.scp_leads?.name||"Lead",
              business:x.scp_leads?.business_name||"",
              mobile:x.scp_leads?.mobile||"",
              amount:Number(x.scp_leads?.requested_amount||0),
              product:x.scp_leads?.product_interest||"Business Loan",
              status:x.status||"referred",
              createdAt:x.created_at
            }));
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
    [...liveRefs,...localRefs].forEach(r=>refMap.set(r.id,r));
    const commMap=new Map<string,Commission>();
    [...liveComms,...localComms].forEach(r=>commMap.set(r.id,r));

    setRows(Array.from(refMap.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    setCommissions(Array.from(commMap.values()).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    if(liveProfile) setProfile(liveProfile);
  }

  useEffect(()=>{
    void load();
    const sync=()=>void load();
    window.addEventListener("savrdh-crm-update",sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("savrdh-crm-update",sync);window.removeEventListener("storage",sync)};
  },[]);

  const stats=useMemo(()=>{
    const applications=rows.filter(r=>r.applicationId||["application_created","approved","sanctioned","disbursed"].includes(r.status)).length;
    const approved=rows.filter(r=>["approved","sanctioned","disbursed"].includes(r.status)).length;
    const disbursed=rows.filter(r=>r.status==="disbursed").length;
    const earned=commissions.filter(c=>["approved","paid","accrued"].includes(c.status)).reduce((s,c)=>s+c.amount,0);
    const pending=commissions.filter(c=>!["paid"].includes(c.status)).reduce((s,c)=>s+c.amount,0);
    return {applications,approved,disbursed,earned,pending};
  },[rows,commissions]);

  const referralLink=useMemo(()=>{
    const slug=(profile.code||profile.name||"partner").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    return "https://savrdh.in/partner/"+slug;
  },[profile]);

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
        name:payload.name,business:payload.business_name,mobile:payload.mobile,
        amount:payload.requested_amount,product:payload.product_interest,
        status:"referred",createdAt:new Date().toISOString()
      };
      setRows(prev=>[row,...prev]);
      setMessage("Referral submitted successfully. It is now visible in CRM Leads.");
    }catch{
      const id=crypto.randomUUID();
      const row:Referral={
        id,leadId:id,name:payload.name,business:payload.business_name,mobile:payload.mobile,
        amount:payload.requested_amount,product:payload.product_interest,status:"referred",
        createdAt:new Date().toISOString()
      };
      try{
        const raw=localStorage.getItem(REF_KEY);const refs=raw?JSON.parse(raw):[];
        localStorage.setItem(REF_KEY,JSON.stringify([row,...refs]));

        const rawLeads=localStorage.getItem("savrdh-crm-leads");const leads=rawLeads?JSON.parse(rawLeads):[];
        localStorage.setItem("savrdh-crm-leads",JSON.stringify([{
          id,createdAt:row.createdAt,name:payload.name,mobile:payload.mobile,email:payload.email,
          business:payload.business_name,businessType:payload.business_type,loanType:payload.product_interest,
          loanNeed:String(payload.requested_amount),source:"Partner",assignedTo:"Unassigned",stage:"new",
          partnerCode:profile.code
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
    setOpen(false);
  }

  async function copyReferral(){
    try{await navigator.clipboard.writeText(referralLink);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{}
  }

  function shareWhatsApp(){
    window.open("https://wa.me/?text="+encodeURIComponent("Apply through my SAVRDH referral link: "+referralLink),"_blank","noopener,noreferrer");
  }

  const recent=rows.slice(0,5);

  return <CrmShell active="Dashboard" role="partner" profileName={profile.name} profileSubtitle="Channel Partner">
    <main className="partner-dashboard">
      <section className="partner-hero">
        <div>
          <span>PARTNER PORTAL</span>
          <h1>Welcome Back, <em>{profile.name.split(" ")[0]||"Partner"}!</em></h1>
          <p>Keep referring. Keep earning. Let's grow together.</p>
        </div>
        <div className="partner-quote">“Partnership<br/><em>Builds Possibilities</em>”</div>
        <article className="partner-earnings-card">
          <WalletCards size={22}/>
          <div><span>Total Earnings (Lifetime)</span><strong>{formatMoney(stats.earned)}</strong><small>Next payout milestone</small></div>
          <b>→</b>
          <i><span style={{width:Math.min(100,stats.earned?75:12)+"%"}}/></i>
        </article>
      </section>

      {message&&<div className="module-success">{message}</div>}

      <section className="partner-kpis">
        <PartnerKpi icon={<Users/>} label="Total Leads Submitted" value={String(rows.length)} sub="All referrals"/>
        <PartnerKpi icon={<FileText/>} label="Active Applications" value={String(stats.applications)} sub="Under processing"/>
        <PartnerKpi icon={<BadgeIndianRupee/>} label="Approved Loans" value={String(stats.approved)} sub="Sanctioned / disbursed"/>
        <PartnerKpi icon={<Handshake/>} label="Commission Earned" value={formatMoney(stats.earned)} sub={"Pending: "+formatMoney(stats.pending)}/>
      </section>

      <section className="partner-main-grid">
        <article className="partner-card partner-performance">
          <div className="partner-card-head"><div><h2>Lead Performance</h2><p>Track your submitted leads and their progress</p></div><span>Last 6 Months</span></div>
          <div className="partner-line-chart">
            {[22,30,38,34,51,46].map((v,i)=><i key={i} style={{height:v+"%"}}><b/></i>)}
          </div>
          <div className="partner-months"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div>
        </article>

        <article className="partner-card partner-status-card" id="applications">
          <div className="partner-card-head"><div><h2>Application Status</h2><p>Current referral conversion</p></div><span>This Month</span></div>
          <div className="partner-status-content">
            <div className="partner-donut"><div><strong>{stats.applications}</strong><span>Applications</span></div></div>
            <ul>
              {[
                ["In Review",rows.filter(r=>["referred","qualified"].includes(r.status)).length],
                ["Application",stats.applications],
                ["Approved",stats.approved],
                ["Disbursed",stats.disbursed]
              ].map(([label,count],i)=><li key={String(label)}><i className={"pd p"+i}/><span>{label}</span><b>{count}</b></li>)}
            </ul>
          </div>
        </article>

        <article className="partner-card partner-referral-card" id="marketing">
          <h2>Your Referral Link</h2>
          <p>Share this link with your network</p>
          <div className="partner-ref-link"><span>{referralLink}</span><button onClick={copyReferral}><Copy size={15}/></button></div>
          <button className="partner-wa-share" onClick={shareWhatsApp}><MessageCircle size={16}/> {copied?"Copied":"Share on WhatsApp"}</button>
          <div className="partner-share-icons">
            <button onClick={shareWhatsApp}>WA</button><button onClick={copyReferral}>in</button><button onClick={copyReferral}>f</button><button onClick={copyReferral}>X</button><button onClick={copyReferral}>@</button><button onClick={copyReferral}><QrCode size={14}/></button>
          </div>
        </article>
      </section>

      <section className="partner-secondary-grid">
        <article className="partner-card partner-recent-leads" id="leads">
          <div className="partner-card-head"><h2>Recent Leads</h2><button onClick={()=>document.getElementById("all-referrals")?.scrollIntoView({behavior:"smooth"})}>View All →</button></div>
          <table>
            <thead><tr><th>#</th><th>Customer Name</th><th>Loan Type</th><th>Loan Amount</th><th>Status</th><th>Date</th><th/></tr></thead>
            <tbody>{recent.length?recent.map((r,i)=><tr key={r.id}>
              <td>{i+1}</td><td>{r.name}</td><td>{r.product}</td><td>{formatMoney(r.amount)}</td>
              <td><span className={statusClass(r.status)}>{statusLabel(r.status)}</span></td>
              <td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td><td><MoreHorizontal size={15}/></td>
            </tr>):<tr><td colSpan={7}>No leads submitted yet.</td></tr>}</tbody>
          </table>
        </article>

        <article className="partner-card partner-commission-breakdown" id="commissions">
          <div className="partner-card-head"><div><h2>Commission Breakdown</h2><p>Verified earnings only</p></div><span>This Month</span></div>
          <strong>{formatMoney(stats.earned)}</strong>
          <div className="partner-commission-bars">{[68,54,45,36,28].map((v,i)=><div key={i}><b style={{height:v+"%"}}/><span>{["Term Loan","Working Cap","Business Loan","OD/CC","Others"][i]}</span></div>)}</div>
        </article>
      </section>

      <section className="partner-bottom-grid">
        <article className="partner-card" id="resources">
          <div className="partner-card-head"><h2>Partner Resources</h2><span>Useful material</span></div>
          <div className="partner-resource-grid">
            <Resource icon={<FileText/>} title="Product Brochure" sub="Download Now"/>
            <Resource icon={<FileCheck2/>} title="Scheme Details" sub="PDF Guide"/>
            <Resource icon={<BarChart3/>} title="Client Presentation" sub="PPT File"/>
            <Resource icon={<CheckCircle2/>} title="KYC Checklist" sub="View Document"/>
            <Resource icon={<FolderOpen/>} title="Marketing Creatives" sub="Download"/>
            <Resource icon={<TrendingUp/>} title="Training Videos" sub="Watch Now"/>
          </div>
        </article>

        <article className="partner-card" id="payouts">
          <div className="partner-card-head"><h2>Payouts</h2><span>Finance verified</span></div>
          <div className="partner-payout-summary"><div><span>Earned</span><strong>{formatMoney(stats.earned)}</strong></div><div><span>Pending</span><strong>{formatMoney(stats.pending)}</strong></div></div>
          <p className="partner-note">Partner payouts are created only from verified commission ledger records.</p>
        </article>
      </section>

      <section className="partner-full-grid">
        <article className="partner-card" id="all-referrals">
          <div className="partner-card-head"><h2>My Leads</h2><button onClick={()=>setOpen(true)}><Plus size={14}/> Add New Lead</button></div>
          <div className="partner-table-wrap"><table>
            <thead><tr><th>Lead</th><th>Business</th><th>Loan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{rows.length?rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.business||"—"}</td><td>{r.product}</td><td>{formatMoney(r.amount)}</td><td><span className={statusClass(r.status)}>{statusLabel(r.status)}</span></td><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td></tr>):<tr><td colSpan={6}>No referrals yet.</td></tr>}</tbody>
          </table></div>
        </article>

        <article className="partner-card" id="customers">
          <div className="partner-card-head"><h2>My Customers</h2><span>{rows.filter(r=>r.customerId).length} converted</span></div>
          <p className="partner-note">Customers appear here after your referred lead is converted by the CRM team.</p>
          <div className="partner-simple-list">{rows.filter(r=>r.customerId).slice(0,6).map(r=><div key={r.id}><Users size={16}/><span><strong>{r.name}</strong><small>{r.business||r.product}</small></span></div>)}</div>
        </article>

        <article className="partner-card" id="support">
          <div className="partner-card-head"><h2>Support</h2><span>Partner helpdesk</span></div>
          <div className="partner-action-list"><button onClick={shareWhatsApp}><Headphones size={16}/> WhatsApp Support</button><button onClick={()=>window.location.href="mailto:support@savrdhfinancialservices.com"}><MessageCircle size={16}/> Email Support</button></div>
        </article>

        <article className="partner-card" id="profile">
          <div className="partner-card-head"><h2>My Profile</h2><span>{profile.status||"active"}</span></div>
          <dl className="partner-profile-dl"><dt>Name</dt><dd>{profile.name}</dd><dt>Partner Code</dt><dd>{profile.code}</dd><dt>Mobile</dt><dd>{profile.mobile||"—"}</dd><dt>Email</dt><dd>{profile.email||"—"}</dd></dl>
        </article>
      </section>

      <span id="add"/>
      {open&&<div className="module-modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="module-modal partner-lead-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="module-modal-head"><div><h2>Add New Lead</h2><p>This referral will appear in SAVRDH CRM automatically.</p></div><button onClick={()=>setOpen(false)}>×</button></div>
        <form ref={formRef} className="module-form" onSubmit={submit}>
          <label><span>Customer Name *</span><input name="name" required/></label>
          <label><span>Mobile *</span><input name="mobile" required/></label>
          <label><span>Email</span><input name="email" type="email"/></label>
          <label><span>Business / Firm</span><input name="business"/></label>
          <label><span>Business Type</span><input name="businessType"/></label>
          <label><span>Loan Type</span><select name="product"><option>Term Loan</option><option>Working Capital</option><option>Business Loan</option><option>Project Loan</option><option>Equipment Finance</option></select></label>
          <label><span>Loan Amount ₹</span><input name="amount" type="number" min="0"/></label>
          <label><span>Notes</span><textarea name="notes"/></label>
          <div className="module-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Submit Referral</button></div>
        </form>
      </div></div>}
    </main>
  </CrmShell>;
}

function PartnerKpi({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){
  return <article><div>{icon}</div><section><span>{label}</span><strong>{value}</strong><small>{sub}</small></section></article>;
}
function Resource({icon,title,sub}:{icon:React.ReactNode;title:string;sub:string}){
  return <button><div>{icon}</div><span><strong>{title}</strong><small>{sub}</small></span></button>;
}
