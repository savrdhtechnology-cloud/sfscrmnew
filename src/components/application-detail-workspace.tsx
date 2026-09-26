"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft, BadgeIndianRupee, Building2, CheckCircle2, ClipboardCheck,
  FileSearch, Landmark, Send, ShieldCheck, TrendingUp
} from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { supabase } from "@/lib/supabase";
import { CreditIntelligencePanel } from "@/components/credit-intelligence-panel";

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

    if(error||!data){
      try{
        const raw=localStorage.getItem("savrdh-crm-applications");
        const localRows=raw?JSON.parse(raw):[];
        const hit=Array.isArray(localRows)?localRows.find((row:any)=>row.id===applicationId):null;
        if(hit){
          setApp({
            id:hit.id,
            applicationNo:hit.applicationNo||"WORK-APP-"+String(hit.id).slice(-6).toUpperCase(),
            customerId:"",
            customerName:hit.customer||"Rajesh Patel",
            businessName:hit.businessName||"Patel Rice Mill",
            productType:hit.product||"Term Loan",
            requestedAmount:Number(hit.amount||50000000),
            stage:hit.stage||"Credit Analysis",
            leadId:hit.leadId||"09475d0c-d656-43a4-b73e-60a637f1fb5b",
            createdAt:hit.createdAt||new Date().toISOString()
          });
          setConstitution("Proprietor");
          setBureau("782");
          setTurnover("80000000");
          setNetProfit("8200000");
          setMatches([{
            id:"demo-match-1",score:94,amount:Number(hit.amount||50000000),status:"suggested",
            reasons:["Amount within range","Bureau threshold satisfied","Turnover threshold satisfied","Industry eligible"],
            productId:"demo-product-1",productName:"MSME Term Loan",lenderId:"demo-lender-1",lenderName:"Demo National Bank"
          }]);
          setSubmissions([]);
          setMessage("Work Mode: live database access is unavailable, showing the local demo application.");
          return;
        }
      }catch{}
      setApp({
        id:applicationId,
        applicationNo:"WORK-APP-"+applicationId.slice(0,8).toUpperCase(),
        customerId:"",
        customerName:"Rajesh Patel",
        businessName:"Patel Rice Mill",
        productType:"Term Loan",
        requestedAmount:50000000,
        stage:"Credit Analysis",
        leadId:"09475d0c-d656-43a4-b73e-60a637f1fb5b",
        createdAt:"2026-09-26T03:30:00Z"
      });
      setConstitution("Proprietor");
      setBureau("782");
      setTurnover("80000000");
      setNetProfit("8200000");
      setMatches([{
        id:"demo-match-1",score:94,amount:50000000,status:"suggested",
        reasons:["Amount within range","Bureau threshold satisfied","Turnover threshold satisfied","Industry eligible"],
        productId:"demo-product-1",productName:"MSME Term Loan",lenderId:"demo-lender-1",lenderName:"Demo National Bank"
      }]);
      setSubmissions([]);
      setMessage("Work Mode: showing the Rajesh Patel demo application because live database access is unavailable.");
      return;
    }

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
    if(app && !app.customerId){
      let approved=false;
      try{approved=localStorage.getItem("savrdh-credit-decision-"+applicationId)==="approved_for_matching";}catch{}
      if(!approved){
        setMessage("Admin approval is required before lender matching.");
        setBusy(false);
        return;
      }
      setMatches([{
        id:"demo-match-1",score:94,amount:app.requestedAmount,status:"suggested",
        reasons:["Amount within range","Bureau threshold satisfied","Turnover threshold satisfied","Industry eligible"],
        productId:"demo-product-1",productName:"MSME Term Loan",lenderId:"demo-lender-1",lenderName:"Demo National Bank"
      }]);
      setMessage("Work Mode: approved lender match generated.");
      setBusy(false);
      return;
    }
    try{
      const {data:decision,error:decisionError}=await supabase
        .from("scp_credit_review_decisions")
        .select("decision")
        .eq("application_id",applicationId)
        .order("decided_at",{ascending:false})
        .limit(1)
        .maybeSingle();
      if(decisionError) throw decisionError;
      if(decision?.decision!=="approved_for_matching"){
        throw new Error("Manager/Owner approval is required before lender matching.");
      }
      const {data,error}=await supabase.rpc("scp_generate_lender_matches",{p_application_id:applicationId});
      if(error) throw error;
      setMessage(Number(data||0)>0?data+" lender product match(es) found.":"No configured lender product currently matches this application.");
      await reload();
    }catch(err:any){setMessage(err?.message||"Lender matching failed.");}
    finally{setBusy(false);}
  }

  async function submitToLender(match:MatchRow){
    if(!app) return; setBusy(true);setMessage("");
    if(!app.customerId){
      const demoSubmission={
        id:"demo-submission-"+Date.now(),
        lenderName:match.lenderName,
        status:"submitted",
        submittedAt:new Date().toISOString(),
        externalReference:"WORK-MODE-DEMO"
      };
      setSubmissions(prev=>[demoSubmission,...prev]);
      setMatches(prev=>prev.map(m=>m.id===match.id?{...m,status:"selected"}:m));
      setMessage("Work Mode: application submitted to "+match.lenderName+" after Admin approval.");
      setBusy(false);
      return;
    }
    try{
      const {data:decision,error:decisionError}=await supabase
        .from("scp_credit_review_decisions")
        .select("decision")
        .eq("application_id",app.id)
        .order("decided_at",{ascending:false})
        .limit(1)
        .maybeSingle();
      if(decisionError) throw decisionError;
      if(decision?.decision!=="approved_for_matching"){
        throw new Error("Manager/Owner approval is required before lender submission.");
      }
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

      <section className="ai-engine-strip">
        <div><b>1</b><span>Lead AI</span><i/></div>
        <div><b>2</b><span>Document AI</span><i/></div>
        <div><b>3</b><span>Credit AI</span><i/></div>
        <div><b>4</b><span>Human Approval</span><i/></div>
        <div><b>5</b><span>Lender Workflow</span><i/></div>
      </section>

      <div className="app-workflow-grid">
        <section className="app-main-column">
          <CreditIntelligencePanel
            applicationId={app.id}
            customerId={app.customerId}
            requestedAmount={app.requestedAmount}
            workMode={!app.customerId}
          />

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
