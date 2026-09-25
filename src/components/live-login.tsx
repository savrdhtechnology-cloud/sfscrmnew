"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function LiveLogin({role}:{role:string}) {
  const [message,setMessage]=useState("");
  return <form className="login-form" onSubmit={async(e)=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const email=String(fd.get("email")||"");
    const password=String(fd.get("password")||"");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMessage(error.message);return;}
    window.location.href="/portal/"+role;
  }}>
    <label><span>Email</span><div className="input-wrap"><input name="email" type="email" required/></div></label>
    <label><span>Password</span><div className="input-wrap"><input name="password" type="password" required minLength={8}/></div></label>
    {message&&<div className="login-error">{message}</div>}
    <button className="login-submit live" type="submit">Secure Sign In</button>
  </form>;
}
