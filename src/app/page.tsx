import Link from "next/link";
import {
  ArrowRight, BadgeIndianRupee, Building2, CheckCircle2, FileCheck2,
  Handshake, Landmark, LockKeyhole, ShieldCheck, Sparkles, Users, WalletCards
} from "lucide-react";

const portals = [
  { role:"customer", title:"Customer", desc:"Applications, documents, offers and loan status.", icon:Users },
  { role:"partner", title:"Partner", desc:"Referrals, applications and verified referral ledger.", icon:Handshake },
  { role:"employee", title:"Employee", desc:"Assigned leads, follow-ups, documents and tasks.", icon:FileCheck2 },
  { role:"credit", title:"Credit", desc:"Credit review, financial analysis and lender matching.", icon:BadgeIndianRupee },
  { role:"manager", title:"Manager", desc:"Pipeline, team assignments, approvals and escalations.", icon:Building2 },
  { role:"finance", title:"Finance", desc:"Disbursement verification, reconciliation and payouts.", icon:WalletCards },
  { role:"owner", title:"Owner", desc:"Executive dashboard, controls, audit and analytics.", icon:ShieldCheck },
  { role:"lender", title:"Lender", desc:"Assigned applications, sanctions and status updates.", icon:Landmark }
] as const;

export default function HomePage(){
  return (
    <main className="landing" data-ui-version="premium-v2">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="landing-logo">S</span>
          <span>
            <strong>Savrdh Credit</strong>
            <small>Financial Services</small>
          </span>
        </Link>
        <div className="landing-nav-right">
          <span className="secure-badge"><LockKeyhole size={14}/> Secure Credit Operations</span>
          <a href="#portals" className="nav-login">Portal Login <ArrowRight size={14}/></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-glow hero-glow-a"/>
        <div className="hero-glow hero-glow-b"/>
        <div className="hero-content">
          <div className="hero-kicker"><Sparkles size={15}/> Enterprise Credit Operating System</div>
          <h1>One intelligent platform for the complete <span>credit lifecycle.</span></h1>
          <p>
            Savrdh Credit Platform connects customer onboarding, credit analysis, lender matching,
            finance-controlled disbursement, partner commissions and audit into one secure operating layer.
          </p>
          <div className="hero-actions">
            <a href="#portals" className="hero-primary">Access your portal <ArrowRight size={17}/></a>
            <div className="hero-note"><ShieldCheck size={16}/> Role-controlled · Finance verified · Audit ready</div>
          </div>
        </div>

        <div className="hero-console">
          <div className="console-top">
            <div>
              <small>CONTROL CENTER</small>
              <strong>Credit Operations</strong>
            </div>
            <span className="console-live"><i/> Production</span>
          </div>
          <div className="console-grid">
            <div className="console-card">
              <div className="console-icon"><FileCheck2 size={18}/></div>
              <span>Applications</span>
              <strong>Controlled</strong>
            </div>
            <div className="console-card">
              <div className="console-icon"><BadgeIndianRupee size={18}/></div>
              <span>Credit Review</span>
              <strong>Role Based</strong>
            </div>
            <div className="console-card">
              <div className="console-icon"><WalletCards size={18}/></div>
              <span>Disbursement</span>
              <strong>Finance Only</strong>
            </div>
            <div className="console-card">
              <div className="console-icon"><ShieldCheck size={18}/></div>
              <span>Audit Trail</span>
              <strong>Protected</strong>
            </div>
          </div>
          <div className="console-rule">
            <CheckCircle2 size={16}/>
            <span>Verified financial records cannot be edited by Employee or Partner users.</span>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div><ShieldCheck size={18}/><span><strong>Finance Verified</strong><small>Controlled disbursement workflow</small></span></div>
        <div><LockKeyhole size={18}/><span><strong>Transaction Protected</strong><small>Duplicate UTR prevention</small></span></div>
        <div><BadgeIndianRupee size={18}/><span><strong>Commission Controlled</strong><small>Verified basis only</small></span></div>
        <div><FileCheck2 size={18}/><span><strong>Audit Ready</strong><small>Sensitive action traceability</small></span></div>
      </section>

      <section className="portal-section" id="portals">
        <div className="section-heading">
          <div>
            <span>ROLE-BASED ACCESS</span>
            <h2>Choose your workspace</h2>
            <p>Each portal is isolated by responsibility, permission and workflow.</p>
          </div>
          <div className="section-security"><LockKeyhole size={15}/> Secure sign-in required</div>
        </div>

        <div className="portal-login-grid">
          {portals.map(({role,title,desc,icon:Icon})=>(
            <Link href={`/login/${role}`} className="portal-login-card" key={role}>
              <div className="portal-login-top">
                <div className="portal-login-icon"><Icon size={20}/></div>
                <ArrowRight className="portal-arrow" size={17}/>
              </div>
              <h3>{title} Portal</h3>
              <p>{desc}</p>
              <div className="portal-signin">Sign in to {title} <ArrowRight size={14}/></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="platform-band">
        <div>
          <span className="band-kicker">BUILT FOR CONTROLLED CREDIT OPERATIONS</span>
          <h2>From lead to verified disbursement — without breaking financial controls.</h2>
        </div>
        <div className="band-points">
          <span><CheckCircle2 size={15}/> Modular CRM architecture</span>
          <span><CheckCircle2 size={15}/> Future lender API ready</span>
          <span><CheckCircle2 size={15}/> Bureau / GST / KYC ready</span>
          <span><CheckCircle2 size={15}/> Cloudflare native infrastructure</span>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-brand">
          <span className="landing-logo small">S</span>
          <span><strong>Savrdh Credit Platform</strong><small>by Savrdh Financial Services</small></span>
        </div>
        <span>Secure modular credit operations platform</span>
      </footer>
    </main>
  );
}
