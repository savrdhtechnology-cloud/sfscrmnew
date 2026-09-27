"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Users, FileText, CheckCircle2, BadgeIndianRupee } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";

type Referral={id:string;name:string;business:string;amount:number;product:string;status:string;createdAt:string};

export function PartnerPortalWorkspace(){
  const [open,setOpen]=useState(false);
  const [rows,setRows]=useState<Referral[]>([]);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const load=async()=>{
      let local:Referral[]=[];
      try{
        const raw=localStorage.getItem("savrdh-partner-referrals");
        local=raw?JSON.parse(raw):[];
      }catch{}
      let live:Referral[]=[];
      try{
        const {data,error}=await supabase
          .from("scp_partner_referrals")
          .select("id,status,created_at,lead_id,scp_leads(name,business_name,requested_amount,product_interest)")
          .order("created_at",{ascending:false});
        if(!error&&data){
          live=(data as any[]).map(r=>({
            id:r.id,name:r.scp_leads?.name||"Lead",business:r.scp_leads?.business_name||"",
            amount:Number(r.scp_leads?.requested_amount||0),product:r.scp_leads?.product_interest||"Business Loan",
            status:r.status||"referred",createdAt:r.created_at
          }));
        }
      }catch{}
      setRows([...live,...local.filter(x=>!live.some(y=>y.id===x.id))]);
    };
    void load();
  },[]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    const fd=new FormData(e.currentTarget);
    const payload={
      name:String(fd.get("name")||""),
      mobile:String(fd.get("mobile")||""),
      email:String(fd.get("email")||""),
      business_name:String(fd.get("business")||""),
      business_type:String(fd.get("businessType")||""),
      requested_amount:Number(fd.get("amount")||0),
      product_interest:String(fd.get("product")||"Business Loan"),
      notes:String(fd.get("notes")||"")
    };
    try{
      const {data,error}=await supabase.rpc("scp_submit_partner_lead",{
        p_name:payload.name,p_mobile:payload.mobile||null,p_email:payload.email||null,
        p_business_name:payload.business_name||null,p_business_type:payload.business_type||null,
        p_requested_amount:payload.requested_amount||null,p_product_interest:payload.product_interest||null,
        p_notes:payload.notes||null
      });
      if(error) throw error;
      const row:Referral={id:data?.lead_id||crypto.randomUUID(),name:payload.name,business:payload.business_name,amount:payload.requested_amount,product:payload.product_interest,status:"referred",createdAt:new Date().toISOString()};
      setRows(prev=>[row,...prev]);setMessage("Referral submitted to CRM Leads.");
    }catch{
      const id=crypto.randomUUID();
      const row:Referral={id,name:payload.name,business:payload.business_name,amount:payload.requested_amount,product:payload.product_interest,status:"referred",createdAt:new Date().toISOString()};
      try{
        const raw=localStorage.getItem("savrdh-partner-referrals");const refs=raw?JSON.parse(raw):[];
        localStorage.setItem("savrdh-partner-referrals",JSON.stringify([row,...refs]));
        const rawLeads=localStorage.getItem("savrdh-crm-leads");const leads=rawLeads?JSON.parse(rawLeads):[];
        localStorage.setItem("savrdh-crm-leads",JSON.stringify([{
          id,createdAt:row.createdAt,name:payload.name,mobile:payload.mobile,email:payload.email,
          business:payload.business_name,businessType:payload.business_type,loanType:payload.product_interest,
          loanNeed:String(payload.requested_amount),source:"Partner",assignedTo:"Unassigned",stage:"new"
        },...leads]));
        const rawN=localStorage.getItem("savrdh-crm-notifications");const ns=rawN?JSON.parse(rawN):[];
        localStorage.setItem("savrdh-crm-notifications",JSON.stringify([{id:crypto.randomUUID(),title:"New Partner Lead",body:payload.name+(payload.business_name?" · "+payload.business_name:""),entityType:"lead",entityId:id,createdAt:row.createdAt,read:false},...ns]));
        window.dispatchEvent(new Event("savrdh-crm-update"));
        window.dispatchEvent(new Event("savrdh-notification-update"));
      }catch{}
      setRows(prev=>[row,...prev]);setMessage("Work Mode: referral added to CRM Leads.");
    }
    e.currentTarget.reset();setOpen(false);
  }

  return <CrmShell active="Partners" role="partner">
    <main className="module-page">
      <div className="module-page-head"><div><span>Partner Portal</span><h1>Referral Dashboard</h1><p>Refer borrowers and track their progress in SAVRDH CRM.</p></div><button className="module-primary" onClick={()=>setOpen(true)}><Plus size={16}/> Refer New Lead</button></div>
      {message&&<div className="module-success">{message}</div>}
      <section className="report-grid">
        <article className="report-card"><Users/><span>Total Referrals</span><strong>{rows.length}</strong></article>
        <article className="report-card"><FileText/><span>In Process</span><strong>{rows.filter(r=>r.status==="referred"||r.status==="qualified").length}</strong></article>
        <article className="report-card"><CheckCircle2/><span>Applications</span><strong>{rows.filter(r=>r.status==="application_created").length}</strong></article>
        <article className="report-card"><BadgeIndianRupee/><span>Disbursed</span><strong>{rows.filter(r=>r.status==="disbursed").length}</strong></article>
      </section>
      <section className="module-card">
        <h2>My Referrals</h2>
        <table className="module-table"><thead><tr><th>Lead</th><th>Business</th><th>Loan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{rows.length?rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.business||"—"}</td><td>{r.product}</td><td>₹ {r.amount.toLocaleString("en-IN")}</td><td>{r.status.replaceAll("_"," ")}</td><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td></tr>):<tr><td colSpan={6}>No referrals yet.</td></tr>}</tbody></table>
      </section>
      {open&&<div className="module-modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="module-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="module-modal-head"><div><h2>Refer New Lead</h2><p>This lead will appear in SAVRDH CRM automatically.</p></div><button onClick={()=>setOpen(false)}>×</button></div>
        <form className="module-form" onSubmit={submit}>
          <label><span>Customer Name *</span><input name="name" required/></label>
          <label><span>Mobile *</span><input name="mobile" required/></label>
          <label><span>Email</span><input name="email" type="email"/></label>
          <label><span>Business / Firm</span><input name="business"/></label>
          <label><span>Business Type</span><input name="businessType"/></label>
          <label><span>Loan Type</span><select name="product"><option>Term Loan</option><option>Working Capital</option><option>Business Loan</option><option>Project Loan</option></select></label>
          <label><span>Loan Amount ₹</span><input name="amount" type="number"/></label>
          <label><span>Notes</span><textarea name="notes"/></label>
          <div className="module-form-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="submit">Submit Referral</button></div>
        </form>
      </div></div>}
    </main>
  </CrmShell>;
}
