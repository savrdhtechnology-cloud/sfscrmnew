"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

type DocItem={
  id:string;
  documentType:string;
  label:string;
  required:boolean;
  status:string;
  documentId:string|null;
};

type Extraction={
  id?:string;
  documentId:string;
  status:string;
  fields:Record<string,string|number>;
  notes:string;
  verified:boolean;
};

function demoFields(type:string){
  const key=type.toLowerCase();
  if(key.includes("bank")) return {
    account_holder:"Rajesh Patel / Patel Rice Mill",
    statement_period:"6 Months",
    banking_turnover:76000000,
    average_monthly_balance:1840000,
    bounce_count:0
  };
  if(key.includes("itr")) return {
    financial_year:"FY 2025-26",
    gross_receipts:80000000,
    net_profit:8200000,
    depreciation:2100000
  };
  if(key.includes("gst")) return {
    gst_turnover:79000000,
    filing_status:"Regular",
    mismatch_flag:"No material mismatch"
  };
  if(key.includes("pan")) return {
    name_match:"Matched",
    pan_status:"Available for manual verification"
  };
  if(key.includes("aadhaar")) return {
    kyc_name_match:"Matched",
    address_match:"Review required"
  };
  if(key.includes("business")) return {
    business_name:"Patel Rice Mill",
    constitution:"Proprietorship",
    registration_status:"Available"
  };
  return {extraction_summary:"Document received. Manual field mapping required."};
}

export function DocumentAiPanel({
  applicationId,
  leadId,
  items,
  workMode
}:{
  applicationId?:string|null;
  leadId?:string|null;
  items:DocItem[];
  workMode:boolean;
}){
  const [extractions,setExtractions]=useState<Record<string,Extraction>>({});
  const [busy,setBusy]=useState<string>("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    (async()=>{
      if(workMode) return;
      const docIds=items.map(i=>i.documentId).filter(Boolean) as string[];
      if(!docIds.length) return;
      try{
        const {data}=await supabase
          .from("scp_document_extractions")
          .select("id,document_id,extraction_status,extracted_fields,extraction_notes,verified_at")
          .in("document_id",docIds);
        if(data){
          const next:Record<string,Extraction>={};
          for(const row of data as any[]){
            next[row.document_id]={
              id:row.id,documentId:row.document_id,status:row.extraction_status,
              fields:row.extracted_fields||{},notes:row.extraction_notes||"",
              verified:Boolean(row.verified_at)
            };
          }
          setExtractions(next);
        }
      }catch{}
    })();
  },[items,workMode]);

  const stats=useMemo(()=>{
    const uploaded=items.filter(i=>i.documentId||i.status==="uploaded"||i.status==="verified").length;
    const extracted=items.filter(i=>i.documentId&&extractions[i.documentId]?.status==="completed").length;
    const verified=items.filter(i=>i.documentId&&extractions[i.documentId]?.verified).length;
    return {uploaded,extracted,verified};
  },[items,extractions]);

  async function analyze(item:DocItem){
    if(!item.documentId){
      setMessage("Upload the document first.");
      return;
    }
    setBusy(item.id);setMessage("");
    try{
      if(workMode){
        const ext:Extraction={
          documentId:item.documentId,status:"completed",fields:demoFields(item.documentType),
          notes:"Work Mode demo extraction. Human verification required.",verified:false
        };
        setExtractions(prev=>({...prev,[item.documentId!]:ext}));
        setMessage(item.label+" demo extraction generated.");
        return;
      }

      const {data:{user}}=await supabase.auth.getUser();
      if(!user) throw new Error("Sign in is required to run document extraction.");

      const {data,error}=await supabase.from("scp_document_extractions").upsert({
        document_id:item.documentId,
        application_id:applicationId||null,
        extraction_status:"pending",
        extracted_fields:{},
        extraction_notes:"Queued for Document AI provider. Human verification required before use.",
        provider:"document-ai-adapter",
        model_name:"provider-pending"
      },{onConflict:"document_id"}).select("id,document_id,extraction_status,extracted_fields,extraction_notes,verified_at").single();

      if(error) throw error;
      setExtractions(prev=>({...prev,[item.documentId!]:{
        id:data.id,documentId:data.document_id,status:data.extraction_status,
        fields:data.extracted_fields||{},notes:data.extraction_notes||"",
        verified:Boolean(data.verified_at)
      }}));
      setMessage(item.label+" queued for Document AI extraction.");
    }catch(err:any){
      setMessage(err?.message||"Document analysis failed.");
    }finally{setBusy("");}
  }

  async function verify(item:DocItem){
    if(!item.documentId) return;
    const ext=extractions[item.documentId];
    if(!ext) return;
    setBusy(item.id);setMessage("");
    try{
      if(workMode){
        setExtractions(prev=>({...prev,[item.documentId!]:{...ext,verified:true,status:"completed"}}));
        setMessage(item.label+" extraction verified in Work Mode.");
        return;
      }
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) throw new Error("Sign in is required to verify extracted data.");
      const {error}=await supabase.from("scp_document_extractions").update({
        extraction_status:"completed",
        verified_by:user.id,
        verified_at:new Date().toISOString()
      }).eq("id",ext.id);
      if(error) throw error;
      setExtractions(prev=>({...prev,[item.documentId!]:{...ext,verified:true,status:"verified"}}));
      setMessage(item.label+" extracted data verified.");
    }catch(err:any){
      setMessage(err?.message||"Verification failed.");
    }finally{setBusy("");}
  }

  return <section className="document-ai-panel">
    <div className="document-ai-head">
      <div>
        <span><Sparkles size={12}/> Document AI</span>
        <h3>Document Extraction & Verification</h3>
        <p>Extract structured data from KYC, bank statements, ITR/GST and financial documents, then require human verification before credit use.</p>
      </div>
      <div className="document-ai-stats">
        <b>{stats.uploaded}<small>Uploaded</small></b>
        <b>{stats.extracted}<small>Extracted</small></b>
        <b>{stats.verified}<small>Verified</small></b>
      </div>
    </div>

    {message&&<div className="document-ai-message">{message}</div>}

    <div className="document-ai-list">
      {items.map(item=>{
        const ext=item.documentId?extractions[item.documentId]:undefined;
        return <article key={item.id}>
          <div className="document-ai-icon"><FileSearch size={16}/></div>
          <div className="document-ai-name">
            <strong>{item.label}</strong>
            <span>{item.documentId?"Document linked":"Upload required"} · {ext?.status||"not analyzed"}</span>
          </div>
          <div className="document-ai-fields">
            {ext&&Object.keys(ext.fields).length?
              Object.entries(ext.fields).slice(0,4).map(([k,v])=><span key={k}><small>{k.replaceAll("_"," ")}</small><b>{typeof v==="number"?"₹ "+Number(v).toLocaleString("en-IN"):String(v)}</b></span>):
              <em>No extracted fields yet</em>}
          </div>
          <button onClick={()=>analyze(item)} disabled={busy===item.id||!item.documentId}><BrainCircuit size={13}/> {ext?"Re-analyze":"Analyze"}</button>
          <button className="document-ai-verify" onClick={()=>verify(item)} disabled={!ext||ext.verified||busy===item.id}><ShieldCheck size={13}/> {ext?.verified?"Verified":"Verify Data"}</button>
        </article>;
      })}
    </div>

    <div className="document-ai-note"><CheckCircle2 size={14}/><span>Only human-verified extracted values should feed the final credit appraisal and lender submission pack.</span></div>
  </section>;
}
