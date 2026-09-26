"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft, BadgeIndianRupee, Building2, CheckCircle2, ClipboardCheck,
  FileSearch, Landmark, Send, ShieldCheck, TrendingUp
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";

type AppRow={
  id:string; applicationNo:string; customerId:string; customerName:string; businessName:string;
  productType:string; requestedAmount:number; stage:string; leadId:string|null; createdAt:string;
};
type MatchRow={
  id:string; score:number; amount:number; status:string; reasons:string[];
  productId:string; productName:string; lenderId:string; lenderName:string;
};
type Submission={id:string;lenderName:string;status:string;submittedAt:string|null;externalReference:string|null};

export function ApplicationDetailWorkspace({applicationId}:{applicationId:string}){
  const [app,setApp]=useState<AppRow|null>(null);
  const [matches,setMatches]=useState<MatchRow[]>([]);
  const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [bureau,setBureau]=useState("");
  const [turnover,setTurnover]=useState("");
  const [netProfit,setNetProfit]=useState("");
  const [constitution,setConstitution]=useState("");

  async function reload(){
    const {data,error}=await supabase
      .from("scp_loan_applications")
      .select("id,application_no,customer_id,product_type,requested_amount,stage,lead_id,created_at,scp_customers(full_name,business_name,constitution)")
      .eq("id",applicationId).maybeSingle();
    if(error||!data){setMessage(error?.message||"Application not found.");return;}
    setApp({
      id:data.id,applicationNo:data.application_no,customerId:data.customer_id,
      customerName:(data as any).scp_customers?.full_name||"Customer",
      businessName:(data as any).scp_customers?.business_name||"",
      productType:data.product_type,requestedAmount:Number(data.requested_amount||0),
      stage:data.stage,leadId:data.lead_id,createdAt:data.created_at
    });
    setConstitution((data as any).scp_customers?.constitution||"");

    const [credit,fin,matchRows,subRows]=await Promise.all([
      supabase.from("scp_credit_analyses").select("bureau_score").eq("application_id",applicationId).maybeSingle(),
      supabase.from("scp_msme_financial_profiles").select("annual_turnover,net_profit").eq("application_id",applicationId).maybeSingle(),
      supabase.from("scp_lender_matches").select("id,match_score,matched_amount,status,reasons,lender_product_id,scp_lender_products(product_name,lender_id,scp_lenders(name))").eq("application_id",applicationId).order("match_score",{ascending:false}),
      supabase.from("scp_lender_submissions").select("id,status,submitted_at,external_reference,lender_id,scp_lenders(name)").eq("application_id",applicationId).order("created_at",{ascending:false})
    ]);
    if(credit.data?.bureau_score!=null) setBureau(String(credit.data.bureau_score));
    if(fin.data?.annual_turnover!=null) setTurnover(String(fin.data.annual_turnover));
    if(fin.data?.net_profit!=null) setNetProfit(String(fin.data.net_profit));
    if(matchRows.data) setMatches((matchRows.data as any[]).map(r=>({
      id:r.id,score:Number(r.match_score||0),amount:Number(r.matched_amount||0),status:r.status,
      reasons:Array.isArray(r.reasons)?r.reasons:[],productId:r.lender_product_id,
      productName:r.scp_lender_products?.product_name||"Product",
      lenderId:r.scp_lender_products?.lender_id||"",
      lenderName:r.scp_lender_products?.scp_lenders?.name||"Lender"
    })));
    if(subRows.data) setSubmissions((subRows.data as any[]).map(r=>({
      id:r.id,lenderName:r.scp_lenders?.name||"Lender",status:r.status,
      submittedAt:r.submitted_at,externalReference:r.external_reference
    })));
  }

  useEffect(()=>{reload();},[applicationId]);

  async function saveCredit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!app) return; setBusy(true);setMessage("");
    try{
      const creditPayload={
        application_id:app.id,bureau_score:bureau?Number(bureau):null,
        status:"submitted",recommendation:"proceed"
      };
      const {error:cErr}=await supabase.from("scp_credit_analyses").upsert(creditPayload,{onConflict:"application_id"});
      if(cErr) throw cErr;
      const finPayload={
        application_id:app.id,annual_turnover:turnover?Number(turnover):null,
        net_profit:netProfit?Number(netProfit):null
      };
      const {error:fErr}=await supabase.from("scp_msme_financial_profiles").upsert(finPayload,{onConflict:"application_id"});
      if(fErr) throw fErr;
      if(constitution){
        const {error:uErr}=await supabase.from("scp_customers").update({constitution}).eq("id",app.customerId);
        if(uErr) throw uErr;
      }
      await supabase.from("scp_loan_applications").update({stage:"credit_analysis"}).eq("id",app.id);
      setMessage("Credit and financial profile saved.");
      await reload();
    }catch(err:any){setMessage(err?.message||"Could not save credit profile.");}
    finally{setBusy(false);}
  }

  async function runMatching(){
    setBusy(true);setMessage("");
    try{
      const {data,error}=await supabase.rpc("scp_generate_lender_matches",{p_application_id:applicationId});
      if(error) throw error;
      setMessage(Number(data||0)>0?data+" lender product match(es) found.":"No configured lender product currently matches this application.");
      await reload();
    }catch(err:any){setMessage(err?.message||"Lender matching failed.");}
    finally{setBusy(false);}
  }

  async function submitToLender(match:MatchRow){
    if(!app) return; setBusy(true);setMessage("");
    try{
      const {data,error}=await supabase.from("scp_lender_submissions").insert({
        application_id:app.id,lender_id:match.lenderId,lender_product_id:match.productId,
        submitted_amount:app.requestedAmount,status:"submitted",submitted_at:new Date().toISOString()
      }).select("id").single();
      if(error) throw error;
      await supabase.from("scp_lender_matches").update({status:"selected"}).eq("id",match.id);
      await supabase.from("scp_loan_applications").update({stage:"lender_submitted"}).eq("id",app.id);
      setMessage("Application submitted to "+match.lenderName+". Submission ID: "+data.id);
      await reload();
    }catch(err:any){setMessage(err?.message||"Submission failed.");}
    finally{setBusy(false);}
  }

  if(!app) return <CrmShell active="Applications" role="owner"><main className="application-detail-page"><div className="app-loading">{message||"Loading application..."}</div></main></CrmShell>;

  return <CrmShell active="Applications" role="owner">
    <main className="application-detail-page">
      <div className="app-detail-head">
        <div>
          <Link href="/crm/applications" className="module-back"><ArrowLeft size={14}/> Applications</Link>
          <h1>{app.applicationNo}</h1>
          <p>{app.customerName}{app.businessName?" · "+app.businessName:""} · Created {new Date(app.createdAt).toLocaleDateString("en-IN")}</p>
        </div>
        {app.leadId&&<Link className="app-lead-link" href={"/crm/leads/"+app.leadId}>Open Source Lead</Link>}
      </div>

      {message&&<div className="lead-detail-alert">{message}</div>}

      <section className="app-summary-grid">
        <article><FileSearch size={20}/><span>Stage</span><strong>{app.stage.replaceAll("_"," ")}</strong></article>
        <article><BadgeIndianRupee size={20}/><span>Requested Amount</span><strong>₹ {app.requestedAmount.toLocaleString("en-IN")}</strong></article>
        <article><ClipboardCheck size={20}/><span>Loan Product</span><strong>{app.productType}</strong></article>
        <article><Landmark size={20}/><span>Lender Submissions</span><strong>{submissions.length}</strong></article>
      </section>

      <div className="app-workflow-grid">
        <section className="app-main-column">
          <article className="app-card">
            <div className="app-card-head"><div><h2><TrendingUp size={17}/> Credit & Financial Analysis</h2><p>Save borrower metrics used by lender eligibility rules.</p></div></div>
            <form className="credit-form" onSubmit={saveCredit}>
              <label><span>Bureau Score</span><input type="number" min="0" max="1000" value={bureau} onChange={e=>setBureau(e.target.value)} placeholder="750"/></label>
              <label><span>Annual Turnover (₹)</span><input type="number" value={turnover} onChange={e=>setTurnover(e.target.value)} placeholder="80000000"/></label>
              <label><span>Net Profit (₹)</span><input type="number" value={netProfit} onChange={e=>setNetProfit(e.target.value)} placeholder="8000000"/></label>
              <label><span>Constitution</span><select value={constitution} onChange={e=>setConstitution(e.target.value)}><option value="">Select</option><option>Individual</option><option>Proprietor</option><option>Partnership</option><option>LLP</option><option>Private Limited</option><option>Public Limited</option></select></label>
              <button type="submit" disabled={busy}>Save Credit Profile</button>
            </form>
          </article>

          <article className="app-card">
            <div className="app-card-head">
              <div><h2><Landmark size={17}/> Lender Matching</h2><p>Matches only against lender products configured in Lender Master.</p></div>
              <button className="app-primary" onClick={runMatching} disabled={busy}><ShieldCheck size={14}/> Run Criteria Match</button>
            </div>
            <div className="lender-match-list">
              {matches.length===0?<div className="app-empty"><Building2 size={22}/><strong>No lender matches yet</strong><span>Save credit data and run criteria matching. If no products are configured, add criteria in Lender Master.</span></div>:
              matches.map(m=><div className="lender-match-row" key={m.id}>
                <div className="match-score"><strong>{Math.round(m.score)}%</strong><span>Match</span></div>
                <div><strong>{m.lenderName}</strong><span>{m.productName}</span><small>{m.reasons.join(" · ")}</small></div>
                <div className="match-amount">₹ {m.amount.toLocaleString("en-IN")}</div>
                <button onClick={()=>submitToLender(m)} disabled={busy||m.status==="selected"}><Send size={13}/> {m.status==="selected"?"Selected":"Submit"}</button>
              </div>)}
            </div>
          </article>
        </section>

        <aside className="app-side-column">
          <article className="app-card">
            <h2><Send size={16}/> Lender Submission Tracking</h2>
            <div className="submission-list">
              {submissions.length===0?<div className="app-empty small">No lender submission yet.</div>:
              submissions.map(s=><div key={s.id}><CheckCircle2 size={15}/><p><strong>{s.lenderName}</strong><span>{s.status}{s.externalReference?" · "+s.externalReference:""}</span></p><small>{s.submittedAt?new Date(s.submittedAt).toLocaleString("en-IN"):""}</small></div>)}
            </div>
          </article>

          <article className="app-card app-next-steps">
            <h2>Processing Sequence</h2>
            <ol><li className="done">Lead documents verified</li><li className="done">Application created</li><li>Credit analysis</li><li>Lender criteria match</li><li>Lender submission</li><li>Sanction</li><li>Finance verified disbursement</li></ol>
          </article>
        </aside>
      </div>
    </main>
  </CrmShell>;
}
