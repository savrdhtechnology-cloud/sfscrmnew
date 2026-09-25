import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BadgeIndianRupee, Building2, Eye,
  FileCheck2, Handshake, Landmark, LockKeyhole, Mail, ShieldCheck,
  Users, WalletCards
} from "lucide-react";
import { ROLES, type Role } from "@/lib/rbac";

const meta:Record<Role,{title:string;subtitle:string;icon:any;active:string}>={
  customer:{title:"Customer Portal",subtitle:"Applications, documents, offers and loan status.",icon:Users,active:"Customer access"},
  partner:{title:"Partner Portal",subtitle:"Referrals, applications and verified commission visibility.",icon:Handshake,active:"Partner access"},
  employee:{title:"Employee Portal",subtitle:"Assigned leads, applications, follow-ups and documents.",icon:FileCheck2,active:"Employee access"},
  credit:{title:"Credit Portal",subtitle:"Credit review, financial analysis and lender matching.",icon:BadgeIndianRupee,active:"Credit access"},
  manager:{title:"Manager Portal",subtitle:"Pipeline, assignments, approvals and team controls.",icon:Building2,active:"Manager access"},
  finance:{title:"Finance Portal",subtitle:"Transaction verification, disbursement and reconciliation.",icon:WalletCards,active:"Finance access"},
  owner:{title:"Owner Portal",subtitle:"Executive control, analytics, audit and access management.",icon:ShieldCheck,active:"Owner access"},
  lender:{title:"Lender Portal",subtitle:"Assigned applications, queries, sanctions and updates.",icon:Landmark,active:"Lender access"}
};

export default async function LoginPage({params}:{params:Promise<{role:string}>}){
  const {role}=await params;
  if(!ROLES.includes(role as Role)) notFound();
  const typedRole=role as Role;
  const item=meta[typedRole];
  const Icon=item.icon;

  return (
    <main className="login-shell">
      <section className="login-visual">
        <Link href="/" className="login-back"><ArrowLeft size={15}/> Back to portal selection</Link>
        <div className="login-brand">
          <span className="landing-logo">S</span>
          <span><strong>Savrdh Credit</strong><small>Financial Services</small></span>
        </div>
        <div className="login-visual-content">
          <div className="login-role-icon"><Icon size={28}/></div>
          <span className="login-eyebrow">{item.active}</span>
          <h1>{item.title}</h1>
          <p>{item.subtitle}</p>
          <div className="login-control-list">
            <span><ShieldCheck size={16}/> Role-based permission controls</span>
            <span><LockKeyhole size={16}/> Protected financial workflow</span>
            <span><FileCheck2 size={16}/> Sensitive actions audited</span>
          </div>
        </div>
        <div className="login-visual-foot">Savrdh Credit Platform · Secure Workspace</div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-head">
            <span>SECURE SIGN IN</span>
            <h2>Welcome back</h2>
            <p>Enter your authorised credentials to continue to the {item.title.toLowerCase()}.</p>
          </div>

          <form className="login-form">
            <label>
              <span>Email / User ID</span>
              <div className="input-wrap"><Mail size={17}/><input type="text" placeholder="Enter registered email or user ID"/></div>
            </label>
            <label>
              <span>Password</span>
              <div className="input-wrap"><LockKeyhole size={17}/><input type="password" placeholder="Enter password"/><Eye size={16}/></div>
            </label>
            <div className="login-options">
              <label className="remember"><input type="checkbox"/> <span>Remember this device</span></label>
              <button type="button" className="text-button">Forgot password?</button>
            </div>
            <button type="button" className="login-submit" disabled>
              Secure Sign In <ArrowRight size={16}/>
            </button>
          </form>

          <div className="login-preview-note">
            Authentication activates with the Cloudflare D1 user store.
            <Link href={`/portal/${typedRole}`}> Preview workspace <ArrowRight size={13}/></Link>
          </div>
          <div className="login-security"><ShieldCheck size={15}/> Finance-controlled workflow · Audit enabled</div>
        </div>
      </section>
    </main>
  );
}
