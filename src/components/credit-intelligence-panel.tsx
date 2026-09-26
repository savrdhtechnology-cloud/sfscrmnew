"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, FileCheck2, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Assessment={
  id?:string;
  documentCompleteness:number;
  outcome:"ready_for_review"|"needs_more_data"|"manual_review";
  confidence:number;
  suggestedEligibleAmount:number;
  strengths:string[];
  riskFlags:string[];
  missingItems:string[];
  narrative:string;
};

export function CreditIntelligencePanel({
  applicationId,
  customerId,
  requestedAmount,
  workMode
}:{
  applicationId:string;
  customerId:string;
  requestedAmount:number;
  workMode:boolean;
}){
  const [bureau,setBureau]=useState("782");
  const [turnover,setTurnover]=useState("80000000");
  const [netProfit,setNetProfit]=useState("8200000");
  const [bankingTurnover,setBankingTurnover]=useState("76000000");
  const [gstTurnover,setGstTurnover]=useState("79000000");
  const [netWorth,setNetWorth]=useState("37000000");
  const [liabilities,setLiabilities]=useState("28000000");
  const [existingEmi,setExistingEmi]=useState("250000");
  const [dscr,setDscr]=useState("1.72");
  const [foir,setFoir]=useState("31.5");
  const [bounceCount,setBounceCount]=useState("0");
  const [docCompleteness,setDocCompleteness]=useState(100);
  const [assessment,setAssessment]=useState<Assessment|null>(null);
  const [decision,setDecision]=useState("");
  const [decisionNotes,setDecisionNotes]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const {data:checklist}=await supabase
          .from("scp_document_checklist")
          .select("required,status")
          .eq("application_id",applicationId);
        if(checklist?.length){
          const required=checklist.filter((x:any)=>x.required);
          const complete=required.filter((x:any)=>x.status==="verified"||x.status==="waived");
          setDocCompleteness(required.length?Math.round(complete.length/required.length*100):100);
        }

        const {data:credit}=await supabase
          .from("scp_credit_analyses")
          .select("bureau_score,foir,dscr")
          .eq("application_id",applicationId)
          .maybeSingle();
        if(credit){
          if(credit.bureau_score!=null) setBureau(String(credit.bureau_score));
          if(credit.foir!=null) setFoir(String(credit.foir));
          if(credit.dscr!=null) setDscr(String(credit.dscr));
        }

        const {data:fin}=await supabase
          .from("scp_msme_financial_profiles")
          .select("annual_turnover,net_profit,banking_turnover,gst_turnover,net_worth,total_liabilities,existing_emi")
          .eq("application_id",applicationId)
          .maybeSingle();
        if(fin){
          if(fin.annual_turnover!=null) setTurnover(String(fin.annual_turnover));
          if(fin.net_profit!=null) setNetProfit(String(fin.net_profit));
          if(fin.banking_turnover!=null) setBankingTurnover(String(fin.banking_turnover));
          if(fin.gst_turnover!=null) setGstTurnover(String(fin.gst_turnover));
          if(fin.net_worth!=null) setNetWorth(String(fin.net_worth));
          if(fin.total_liabilities!=null) setLiabilities(String(fin.total_liabilities));
          if(fin.existing_emi!=null) setExistingEmi(String(fin.existing_emi));
        }

        const {data:ai}=await supabase
          .from("scp_ai_credit_assessments")
          .select("*")
          .eq("application_id",applicationId)
          .order("generated_at",{ascending:false})
          .limit(1)
          .maybeSingle();
        if(ai){
          setAssessment({
            id:ai.id,
            documentCompleteness:Number(ai.document_completeness||0),
            outcome:ai.outcome,
            confidence:Number(ai.confidence||0),
            suggestedEligibleAmount:Number(ai.suggested_eligible_amount||0),
            strengths:Array.isArray(ai.strengths)?ai.strengths:[],
            riskFlags:Array.isArray(ai.risk_flags)?ai.risk_flags:[],
            missingItems:Array.isArray(ai.missing_items)?ai.missing_items:[],
            narrative:ai.narrative||""
          });
        }

        const {data:lastDecision}=await supabase
          .from("scp_credit_review_decisions")
          .select("decision,notes")
          .eq("application_id",applicationId)
          .order("decided_at",{ascending:false})
          .limit(1)
          .maybeSingle();
        if(lastDecision){
          setDecision(lastDecision.decision);
          setDecisionNotes(lastDecision.notes||"");
        }
      }catch{}
    })();
  },[applicationId]);

  const metrics=useMemo(()=>{
    const t=Number(turnover||0),p=Number(netProfit||0),nw=Number(netWorth||0),liab=Number(liabilities||0);
    return {
      netMargin:t>0?p/t*100:0,
      debtEquity:nw>0?liab/nw:0,
      bankingCoverage:t>0?Number(bankingTurnover||0)/t*100:0,
      gstCoverage:t>0?Number(gstTurnover||0)/t*100:0
    };
  },[turnover,netProfit,netWorth,liabilities,bankingTurnover,gstTurnover]);

  function buildAssessment():Assessment{
    const score=Number(bureau||0);
    const t=Number(turnover||0);
    const p=Number(netProfit||0);
    const d=Number(dscr||0);
    const f=Number(foir||0);
    const bounces=Number(bounceCount||0);
    const missing:string[]=[];
    if(!score) missing.push("Bureau / CIBIL score");
    if(!t) missing.push("Annual turnover");
    if(docCompleteness<100) missing.push("Required verified documents");

    const risks:string[]=[];
    const strengths:string[]=[];
    if(score && score<700) risks.push("Bureau score below common MSME lender thresholds");
    else if(score>=750) strengths.push("Strong bureau profile");

    if(d && d<1.25) risks.push("DSCR below 1.25x");
    else if(d>=1.5) strengths.push("Healthy DSCR");

    if(f>50) risks.push("FOIR above 50%");
    else if(f>0 && f<=40) strengths.push("Comfortable FOIR");

    if(metrics.netMargin>0 && metrics.netMargin<3) risks.push("Low net profit margin");
    else if(metrics.netMargin>=8) strengths.push("Healthy profitability");

    if(bounces>=3) risks.push("Multiple banking bounces reported");
    else if(bounces===0) strengths.push("No reported banking bounce");

    if(metrics.bankingCoverage>=80) strengths.push("Banking turnover supports declared turnover");
    if(metrics.gstCoverage>=80) strengths.push("GST turnover broadly supports declared turnover");
    if(docCompleteness===100) strengths.push("Required documents verified");

    let outcome:Assessment["outcome"]="ready_for_review";
    if(missing.length) outcome="needs_more_data";
    else if(risks.length>=2) outcome="manual_review";

    const base=Math.min(requestedAmount,t>0?t*0.6:requestedAmount);
    const bureauFactor=score>=750?1:score>=700?.85:.65;
    const dscrFactor=d>=1.5?1:d>=1.25?.85:.65;
    const suggested=Math.max(0,Math.round(base*bureauFactor*dscrFactor/100000)*100000);
    const confidence=Math.max(35,Math.min(95,55+(docCompleteness*.25)+(score?10:0)+(t?5:0)+(d?5:0)));

    const narrative=[
      "AI-assisted review based on currently entered and verified CRM data.",
      missing.length?("Missing: "+missing.join(", ")+"."):"Core inputs are available.",
      strengths.length?("Strengths: "+strengths.join("; ")+"."):"",
      risks.length?("Review flags: "+risks.join("; ")+"."):"No major rule flags from the available inputs.",
      "This is an advisory summary; a Manager/Owner must approve before lender submission."
    ].filter(Boolean).join(" ");

    return {
      documentCompleteness:docCompleteness,outcome,confidence,
      suggestedEligibleAmount:suggested,strengths,riskFlags:risks,missingItems:missing,narrative
    };
  }

  async function generateAssessment(){
    setBusy(true);setMessage("");
    const next=buildAssessment();
    setAssessment(next);
    try{
      if(!workMode){
        const {data:{user}}=await supabase.auth.getUser();
        const {data,error}=await supabase.from("scp_ai_credit_assessments").insert({
          application_id:applicationId,
          analysis_version:"v1",
          document_completeness:next.documentCompleteness,
          bureau_summary:{score:Number(bureau||0)},
          banking_summary:{
            banking_turnover:Number(bankingTurnover||0),
            bounce_count:Number(bounceCount||0),
            existing_emi:Number(existingEmi||0)
          },
          financial_summary:{
            annual_turnover:Number(turnover||0),
            net_profit:Number(netProfit||0),
            net_worth:Number(netWorth||0),
            liabilities:Number(liabilities||0),
            dscr:Number(dscr||0),
            foir:Number(foir||0)
          },
          gst_summary:{gst_turnover:Number(gstTurnover||0)},
          derived_metrics:{
            net_margin_pct:Number(metrics.netMargin.toFixed(2)),
            debt_equity:Number(metrics.debtEquity.toFixed(2)),
            banking_coverage_pct:Number(metrics.bankingCoverage.toFixed(2)),
            gst_coverage_pct:Number(metrics.gstCoverage.toFixed(2))
          },
          strengths:next.strengths,
          risk_flags:next.riskFlags,
          missing_items:next.missingItems,
          outcome:next.outcome,
          confidence:next.confidence,
          suggested_eligible_amount:next.suggestedEligibleAmount,
          narrative:next.narrative,
          provider:"savrdh-rule-ai",
          model_name:"credit-assessment-v1",
          source_snapshot:{requested_amount:requestedAmount},
          generated_by:user?.id||null
        }).select("id").single();
        if(error) throw error;
        setAssessment({...next,id:data.id});
      }
      setMessage("AI-assisted credit assessment generated.");
    }catch(err:any){
      setMessage(err?.message||"Assessment could not be saved.");
    }finally{setBusy(false);}
  }

  async function saveFinancialProfile(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage("");
    try{
      if(workMode){
        setMessage("Work Mode: financial profile saved locally for review.");
        setBusy(false);return;
      }
      const creditPayload={
        application_id:applicationId,
        bureau_score:Number(bureau||0)||null,
        banking_score:null,
        gst_score:null,
        internal_score:null,
        risk_grade:null,
        assessed_eligibility:assessment?.suggestedEligibleAmount||null,
        foir:Number(foir||0)||null,
        dscr:Number(dscr||0)||null,
        risk_flags:assessment?.riskFlags||[],
        analysis_notes:assessment?.narrative||null,
        recommendation:"needs_review",
        status:"submitted"
      };
      const {error:creditError}=await supabase.from("scp_credit_analyses").upsert(creditPayload,{onConflict:"application_id"});
      if(creditError) throw creditError;

      const finPayload={
        application_id:applicationId,
        annual_turnover:Number(turnover||0)||null,
        net_profit:Number(netProfit||0)||null,
        total_liabilities:Number(liabilities||0)||null,
        net_worth:Number(netWorth||0)||null,
        existing_emi:Number(existingEmi||0)||null,
        banking_turnover:Number(bankingTurnover||0)||null,
        gst_turnover:Number(gstTurnover||0)||null,
        ratios:{
          net_margin_pct:Number(metrics.netMargin.toFixed(2)),
          debt_equity:Number(metrics.debtEquity.toFixed(2)),
          dscr:Number(dscr||0)||null,
          foir:Number(foir||0)||null
        }
      };
      const {error:finError}=await supabase.from("scp_msme_financial_profiles").upsert(finPayload,{onConflict:"application_id"});
      if(finError) throw finError;
      setMessage("Financial and credit profile saved.");
    }catch(err:any){setMessage(err?.message||"Could not save financial profile.");}
    finally{setBusy(false);}
  }

  async function approveForMatching(){
    if(!assessment){setMessage("Generate the AI-assisted assessment first.");return;}
    if(assessment.missingItems.length){setMessage("Complete missing data before approval.");return;}
    setBusy(true);setMessage("");
    try{
      if(workMode){
        setDecision("approved_for_matching");
        setMessage("Work Mode: approved for lender matching by Admin.");
        setBusy(false);return;
      }
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) throw new Error("Sign in as Manager/Owner to approve.");
      const {error}=await supabase.from("scp_credit_review_decisions").insert({
        application_id:applicationId,
        assessment_id:assessment.id||null,
        decision:"approved_for_matching",
        notes:decisionNotes||"Approved by Admin after review of AI-assisted assessment.",
        decided_by:user.id
      });
      if(error) throw error;
      await supabase.from("scp_loan_applications").update({stage:"lender_matching"}).eq("id",applicationId);
      setDecision("approved_for_matching");
      setMessage("Admin approval recorded. Lender matching/submission is now enabled.");
    }catch(err:any){setMessage(err?.message||"Approval failed.");}
    finally{setBusy(false);}
  }

  return <section className="credit-intel">
    <div className="credit-intel-head">
      <div>
        <span className="credit-ai-kicker"><Sparkles size={13}/> AI-assisted, human-approved</span>
        <h2>Credit Intelligence & Borrower Profile</h2>
        <p>Combine bureau, bank-statement, GST, ITR/financials and verified documents into one admin review.</p>
      </div>
      <div className={"credit-review-state "+(decision==="approved_for_matching"?"approved":"pending")}>
        {decision==="approved_for_matching"?<CheckCircle2 size={16}/>:<ShieldCheck size={16}/>}
        <div><small>Admin Decision</small><strong>{decision==="approved_for_matching"?"Approved for Lender Matching":"Review Pending"}</strong></div>
      </div>
    </div>

    {message&&<div className="credit-intel-message">{message}</div>}

    <div className="credit-intel-grid">
      <form className="credit-profile-form" onSubmit={saveFinancialProfile}>
        <div className="credit-section-title"><BrainCircuit size={16}/><div><strong>Credit & Financial Inputs</strong><span>Values may come from bureau/GST/banking APIs later; currently they can be entered or extracted from documents.</span></div></div>
        <div className="credit-input-grid">
          <label><span>CIBIL / Bureau Score</span><input type="number" min="0" max="1000" value={bureau} onChange={e=>setBureau(e.target.value)}/></label>
          <label><span>Annual Turnover ₹</span><input type="number" value={turnover} onChange={e=>setTurnover(e.target.value)}/></label>
          <label><span>Net Profit ₹</span><input type="number" value={netProfit} onChange={e=>setNetProfit(e.target.value)}/></label>
          <label><span>Banking Turnover ₹</span><input type="number" value={bankingTurnover} onChange={e=>setBankingTurnover(e.target.value)}/></label>
          <label><span>GST Turnover ₹</span><input type="number" value={gstTurnover} onChange={e=>setGstTurnover(e.target.value)}/></label>
          <label><span>Net Worth ₹</span><input type="number" value={netWorth} onChange={e=>setNetWorth(e.target.value)}/></label>
          <label><span>Total Liabilities ₹</span><input type="number" value={liabilities} onChange={e=>setLiabilities(e.target.value)}/></label>
          <label><span>Existing EMI ₹/month</span><input type="number" value={existingEmi} onChange={e=>setExistingEmi(e.target.value)}/></label>
          <label><span>DSCR</span><input type="number" step="0.01" value={dscr} onChange={e=>setDscr(e.target.value)}/></label>
          <label><span>FOIR %</span><input type="number" step="0.1" value={foir} onChange={e=>setFoir(e.target.value)}/></label>
          <label><span>Banking Bounce Count</span><input type="number" value={bounceCount} onChange={e=>setBounceCount(e.target.value)}/></label>
          <label><span>Verified Documents</span><input readOnly value={docCompleteness+"% complete"}/></label>
        </div>
        <div className="credit-derived-metrics">
          <Metric label="Net Margin" value={metrics.netMargin.toFixed(1)+"%"}/>
          <Metric label="Debt / Equity" value={metrics.debtEquity.toFixed(2)+"x"}/>
          <Metric label="Banking vs Turnover" value={metrics.bankingCoverage.toFixed(0)+"%"}/>
          <Metric label="GST vs Turnover" value={metrics.gstCoverage.toFixed(0)+"%"}/>
        </div>
        <div className="credit-form-actions">
          <button type="submit" disabled={busy}>Save Profile</button>
          <button type="button" className="ai-generate" onClick={generateAssessment} disabled={busy}><BrainCircuit size={14}/> Generate AI Credit Assessment</button>
        </div>
      </form>

      <aside className="credit-profile-side">
        <div className="credit-doc-health">
          <FileCheck2 size={17}/><div><small>Document Readiness</small><strong>{docCompleteness}%</strong></div>
          <div className="credit-progress"><i style={{width:docCompleteness+"%"}}/></div>
        </div>

        {assessment?<div className="ai-assessment-card">
          <div className="ai-assessment-top">
            <div><span>AI Assessment</span><strong>{assessment.outcome==="ready_for_review"?"Ready for Admin Review":assessment.outcome==="needs_more_data"?"Needs More Data":"Manual Review"}</strong></div>
            <div className="ai-confidence"><b>{Math.round(assessment.confidence)}%</b><span>Confidence</span></div>
          </div>
          <div className="ai-eligible"><small>Indicative amount from available data</small><strong>₹ {assessment.suggestedEligibleAmount.toLocaleString("en-IN")}</strong><span>Advisory only — not a sanction or approval.</span></div>
          <p>{assessment.narrative}</p>
          <div className="assessment-lists">
            <div><h4><CheckCircle2 size={13}/> Strengths</h4>{assessment.strengths.length?assessment.strengths.map(x=><span key={x}>{x}</span>):<span>No strengths derived yet.</span>}</div>
            <div><h4><AlertTriangle size={13}/> Review Flags</h4>{assessment.riskFlags.length?assessment.riskFlags.map(x=><span key={x}>{x}</span>):<span>No rule flags from available data.</span>}</div>
          </div>
          {assessment.missingItems.length>0&&<div className="missing-data-box"><strong>Missing before approval</strong>{assessment.missingItems.map(x=><span key={x}>{x}</span>)}</div>}
        </div>:<div className="ai-assessment-empty"><BrainCircuit size={25}/><strong>No AI assessment yet</strong><span>Save/verify inputs, then generate an advisory credit summary.</span></div>}
      </aside>
    </div>

    <div className="admin-credit-approval">
      <div>
        <Landmark size={18}/>
        <div><strong>Admin Credit Review</strong><span>Bank/NBFC submission stays locked until Manager/Owner approves this case for lender matching.</span></div>
      </div>
      <textarea value={decisionNotes} onChange={e=>setDecisionNotes(e.target.value)} placeholder="Admin review notes / conditions before lender matching..."/>
      <button onClick={approveForMatching} disabled={busy||decision==="approved_for_matching"||!assessment}>
        {decision==="approved_for_matching"?"Approved":"Approve for Lender Matching"}
      </button>
    </div>
  </section>;
}

function Metric({label,value}:{label:string;value:string}){
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
