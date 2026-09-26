"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, AlertTriangle, Sparkles, ClipboardCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type LeadInput={
  id:string; name:string; businessName:string; businessType:string; source:string;
  requestedAmount:number; productInterest:string; mobile:string; email:string;
};

type LeadAssessment={
  id?:string;
  completeness:number;
  outcome:"ready_for_documents"|"needs_more_data"|"manual_review";
  confidence:number;
  strengths:string[];
  riskFlags:string[];
  missingItems:string[];
  actions:string[];
  narrative:string;
};

export function LeadAiPanel({lead,workMode}:{lead:LeadInput;workMode:boolean}){
  const [assessment,setAssessment]=useState<LeadAssessment|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    (async()=>{
      if(workMode) return;
      try{
        const {data}=await supabase.from("scp_ai_lead_assessments")
          .select("*").eq("lead_id",lead.id).order("generated_at",{ascending:false}).limit(1).maybeSingle();
        if(data){
          setAssessment({
            id:data.id,
            completeness:Number(data.completeness||0),
            outcome:data.outcome,
            confidence:Number(data.confidence||0),
            strengths:Array.isArray(data.strengths)?data.strengths:[],
            riskFlags:Array.isArray(data.risk_flags)?data.risk_flags:[],
            missingItems:Array.isArray(data.missing_items)?data.missing_items:[],
            actions:Array.isArray(data.recommended_actions)?data.recommended_actions:[],
            narrative:data.narrative||""
          });
        }
      }catch{}
    })();
  },[lead.id,workMode]);

  const snapshot=useMemo(()=>({
    name:lead.name,businessName:lead.businessName,businessType:lead.businessType,
    source:lead.source,requestedAmount:lead.requestedAmount,productInterest:lead.productInterest,
    mobile:lead.mobile,email:lead.email
  }),[lead]);

  function build():LeadAssessment{
    const missing:string[]=[];
    const strengths:string[]=[];
    const risks:string[]=[];
    const actions:string[]=[];

    if(!lead.mobile) missing.push("Mobile number");
    if(!lead.businessName) missing.push("Business / firm name");
    if(!lead.businessType) missing.push("Business type");
    if(!lead.productInterest) missing.push("Loan product");
    if(!lead.requestedAmount) missing.push("Loan requirement");
    if(!lead.email) actions.push("Collect email for document communication");

    if(lead.businessName) strengths.push("Business identified");
    if(lead.requestedAmount>0) strengths.push("Loan requirement captured");
    if(lead.productInterest) strengths.push("Loan product identified");
    if(lead.source) strengths.push("Lead source captured");

    if(lead.requestedAmount>=50000000) risks.push("High-value case: detailed financial and lender review required");
    if(!lead.businessType) risks.push("Business classification is incomplete");

    const total=6;
    const present=[lead.mobile,lead.businessName,lead.businessType,lead.productInterest,lead.requestedAmount,lead.source].filter(Boolean).length;
    const completeness=Math.round(present/total*100);
    let outcome:LeadAssessment["outcome"]="ready_for_documents";
    if(missing.length>=2) outcome="needs_more_data";
    else if(risks.length>=2) outcome="manual_review";

    actions.push("Collect KYC and business registration");
    actions.push("Collect bank statements and ITR / financials");
    actions.push("Collect GST documents where applicable");
    actions.push("Convert to application after required documents are verified");

    const confidence=Math.max(40,Math.min(95,55+completeness*.35));
    const narrative=[
      "AI-assisted lead triage based on captured CRM information.",
      missing.length?("Missing: "+missing.join(", ")+"."):"Core lead details are available.",
      risks.length?("Review flags: "+risks.join("; ")+"."):"",
      "Next step is document collection and verification before credit appraisal."
    ].filter(Boolean).join(" ");

    return {completeness,outcome,confidence,strengths,riskFlags:risks,missingItems:missing,actions,narrative};
  }

  async function run(){
    setBusy(true);setMessage("");
    const next=build();setAssessment(next);
    try{
      if(!workMode){
        const {data:{user}}=await supabase.auth.getUser();
        const {data,error}=await supabase.from("scp_ai_lead_assessments").insert({
          lead_id:lead.id,analysis_version:"v1",completeness:next.completeness,
          classification:{business_type:lead.businessType,product_interest:lead.productInterest,source:lead.source},
          missing_items:next.missingItems,strengths:next.strengths,risk_flags:next.riskFlags,
          recommended_actions:next.actions,outcome:next.outcome,confidence:next.confidence,
          narrative:next.narrative,source_snapshot:snapshot,generated_by:user?.id||null
        }).select("id").single();
        if(error) throw error;
        setAssessment({...next,id:data.id});
      }
      setMessage("Lead AI analysis generated.");
    }catch(err:any){setMessage(err?.message||"Lead AI analysis could not be saved.");}
    finally{setBusy(false);}
  }

  return <section className="lead-ai-panel">
    <div className="lead-ai-head">
      <div><span><Sparkles size={12}/> Lead AI</span><h2>Lead Intelligence & Readiness</h2><p>Classifies the lead, finds missing information and recommends the next CRM actions.</p></div>
      <button onClick={run} disabled={busy}><BrainCircuit size={14}/> {assessment?"Re-run Lead AI":"Run Lead AI"}</button>
    </div>
    {message&&<div className="lead-ai-message">{message}</div>}
    {assessment?<div className="lead-ai-result">
      <div className="lead-ai-score"><strong>{assessment.completeness}%</strong><span>Complete</span></div>
      <div className="lead-ai-summary">
        <div className="lead-ai-state"><b>{assessment.outcome==="ready_for_documents"?"Ready for Documents":assessment.outcome==="needs_more_data"?"Needs More Data":"Manual Review"}</b><span>{Math.round(assessment.confidence)}% confidence</span></div>
        <p>{assessment.narrative}</p>
        <div className="lead-ai-columns">
          <div><h4><CheckCircle2 size={12}/> Strengths</h4>{assessment.strengths.map(x=><span key={x}>{x}</span>)}</div>
          <div><h4><AlertTriangle size={12}/> Missing / Flags</h4>{[...assessment.missingItems,...assessment.riskFlags].map(x=><span key={x}>{x}</span>)}</div>
          <div><h4><ClipboardCheck size={12}/> Recommended Actions</h4>{assessment.actions.map(x=><span key={x}>{x}</span>)}</div>
        </div>
      </div>
    </div>:<div className="lead-ai-empty">Run Lead AI to generate a lead-readiness summary.</div>}
  </section>;
}
