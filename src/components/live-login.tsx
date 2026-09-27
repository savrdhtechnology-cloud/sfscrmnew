"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function LiveLogin({role}:{role:string}) {
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  return <form className="login-form" onSubmit={async(e)=>{
    e.preventDefault();
    setBusy(true);setMessage("");
    const fd=new FormData(e.currentTarget);
    const email=String(fd.get("email")||"").trim();
    const password=String(fd.get("password")||"");

    try{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      const user=data.user;
      if(!user) throw new Error("Login failed.");

      const {data:profile,error:profileError}=await supabase
        .from("scp_profiles")
        .select("role,is_active")
        .eq("id",user.id)
        .maybeSingle();

      if(profileError) throw profileError;
      if(!profile) throw new Error("No CRM role is assigned to this account.");
      if(profile.is_active===false) throw new Error("This account is inactive.");

      const actualRole=String(profile.role||"");
      if(actualRole!==role){
        await supabase.auth.signOut();
        throw new Error(
          "This account is authorised for the "+actualRole+" portal, not the "+role+" portal."
        );
      }

      window.location.href="/portal/"+actualRole;
    }catch(err:any){
      setMessage(err?.message||"Could not sign in.");
    }finally{
      setBusy(false);
    }
  }}>
    <label><span>Email</span><div className="input-wrap"><input name="email" type="email" placeholder="Enter registered email" required/></div></label>
    <label><span>Password</span><div className="input-wrap"><input name="password" type="password" placeholder="Enter password" required minLength={8}/></div></label>
    <div className="login-options">
      <label className="remember"><input type="checkbox"/> <span>Remember this device</span></label>
      <button type="button" className="text-button">Forgot password?</button>
    </div>
    {message&&<div className="login-error">{message}</div>}
    <button className="login-submit live" type="submit" disabled={busy}>{busy?"Signing in...":"Secure Sign In"}</button>
  </form>;
}
