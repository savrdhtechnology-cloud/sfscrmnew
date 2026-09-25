export type CrmModuleKey =
  | "leads" | "applications" | "pipeline" | "customers" | "partners"
  | "lenders" | "payments" | "commissions" | "documents" | "reports"
  | "team" | "settings" | "audit" | "notifications" | "communications" | "search";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "select" | "date" | "file";
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

export type ModuleDef = {
  key: CrmModuleKey;
  title: string;
  subtitle: string;
  singular: string;
  primaryAction?: string;
  fields?: FieldDef[];
  columns?: { key: string; label: string }[];
};

export const CRM_MODULES: Record<CrmModuleKey, ModuleDef> = {
  leads: {
    key:"leads", title:"Leads", singular:"Lead",
    subtitle:"Capture, assign and follow up prospective borrowers.",
    primaryAction:"Add Lead",
    fields:[
      {key:"name",label:"Lead Name",required:true,placeholder:"Full name"},
      {key:"mobile",label:"Mobile",type:"tel",required:true,placeholder:"+91"},
      {key:"business",label:"Business / Firm",placeholder:"Business name"},
      {key:"source",label:"Lead Source",type:"select",options:["Partner","Website","Direct","WhatsApp","Referral","Other"]},
      {key:"loanNeed",label:"Loan Requirement (₹)",type:"number",placeholder:"5000000"},
      {key:"assignedTo",label:"Assigned To",placeholder:"Employee / Team"}
    ],
    columns:[{key:"name",label:"Name"},{key:"business",label:"Business"},{key:"loanNeed",label:"Loan Need"},{key:"source",label:"Source"},{key:"assignedTo",label:"Assigned To"}]
  },
  applications: {
    key:"applications", title:"Applications", singular:"Application",
    subtitle:"Create and manage credit applications through the full workflow.",
    primaryAction:"New Application",
    fields:[
      {key:"customer",label:"Customer",required:true,placeholder:"Customer / Business"},
      {key:"product",label:"Loan Product",type:"select",options:["Term Loan","Working Capital","Business Loan","Machinery Loan","OD/CC","Project Finance"]},
      {key:"amount",label:"Requested Amount (₹)",type:"number",required:true},
      {key:"tenure",label:"Tenure (Months)",type:"number"},
      {key:"stage",label:"Stage",type:"select",options:["New Application","KYC / Documents","Credit Analysis","Bank Assigned","Sanctioned","Disbursement Pending"]},
      {key:"assignedTo",label:"Assigned To",placeholder:"Team member"}
    ],
    columns:[{key:"customer",label:"Customer"},{key:"product",label:"Product"},{key:"amount",label:"Amount"},{key:"stage",label:"Stage"},{key:"assignedTo",label:"Assigned To"}]
  },
  pipeline: {
    key:"pipeline", title:"Loan Pipeline", singular:"Pipeline Item",
    subtitle:"Track every application from lead through verified disbursement.",
    primaryAction:"Add Application",
    fields:[],
    columns:[]
  },
  customers: {
    key:"customers", title:"Customers", singular:"Customer",
    subtitle:"Maintain borrower profiles, business details and KYC readiness.",
    primaryAction:"Add Customer",
    fields:[
      {key:"name",label:"Customer / Business Name",required:true},
      {key:"mobile",label:"Mobile",type:"tel",required:true},
      {key:"email",label:"Email",type:"email"},
      {key:"pan",label:"PAN"},
      {key:"gstin",label:"GSTIN"},
      {key:"constitution",label:"Constitution",type:"select",options:["Individual","Proprietor","Partnership","LLP","Private Limited","Public Limited","Other"]}
    ],
    columns:[{key:"name",label:"Customer"},{key:"mobile",label:"Mobile"},{key:"pan",label:"PAN"},{key:"gstin",label:"GSTIN"},{key:"constitution",label:"Constitution"}]
  },
  partners: {
    key:"partners", title:"Partners", singular:"Partner",
    subtitle:"Manage referral partners, codes and verified commission visibility.",
    primaryAction:"Add Partner",
    fields:[
      {key:"name",label:"Partner Name",required:true},
      {key:"mobile",label:"Mobile",type:"tel",required:true},
      {key:"email",label:"Email",type:"email"},
      {key:"partnerCode",label:"Partner Code",placeholder:"Auto / manual code"},
      {key:"status",label:"Status",type:"select",options:["Active","Inactive","Pending Verification"]}
    ],
    columns:[{key:"name",label:"Partner"},{key:"mobile",label:"Mobile"},{key:"partnerCode",label:"Code"},{key:"status",label:"Status"}]
  },
  lenders: {
    key:"lenders", title:"Lenders", singular:"Lender",
    subtitle:"Maintain lender master, products and future API connectivity.",
    primaryAction:"Add Lender",
    fields:[
      {key:"name",label:"Lender Name",required:true},
      {key:"type",label:"Lender Type",type:"select",options:["Bank","NBFC","Fintech","Co-operative Bank","Other"]},
      {key:"contact",label:"Relationship Contact"},
      {key:"email",label:"Email",type:"email"},
      {key:"status",label:"Status",type:"select",options:["Active","Inactive"]}
    ],
    columns:[{key:"name",label:"Lender"},{key:"type",label:"Type"},{key:"contact",label:"Contact"},{key:"status",label:"Status"}]
  },
  payments: {
    key:"payments", title:"Payments", singular:"Payment",
    subtitle:"Record payment/disbursement references for Finance verification.",
    primaryAction:"Record Transaction",
    fields:[
      {key:"application",label:"Application No.",required:true},
      {key:"type",label:"Transaction Type",type:"select",options:["Customer Payment","Lender Disbursement","Refund","Adjustment"]},
      {key:"amount",label:"Amount (₹)",type:"number",required:true},
      {key:"utr",label:"UTR / Transaction ID",required:true},
      {key:"date",label:"Transaction Date",type:"date"},
      {key:"status",label:"Status",type:"select",options:["Pending Finance Verification"]}
    ],
    columns:[{key:"application",label:"Application"},{key:"type",label:"Type"},{key:"amount",label:"Amount"},{key:"utr",label:"UTR"},{key:"status",label:"Status"}]
  },
  commissions: {
    key:"commissions", title:"Commission Ledger", singular:"Commission Entry",
    subtitle:"Commission entries are controlled and calculated only from verified transactions.",
    fields:[],
    columns:[{key:"beneficiary",label:"Beneficiary"},{key:"application",label:"Application"},{key:"basis",label:"Verified Basis"},{key:"rate",label:"Rate"},{key:"amount",label:"Commission"},{key:"status",label:"Status"}]
  },
  documents: {
    key:"documents", title:"Documents", singular:"Document",
    subtitle:"Upload and track customer/application documents and verification status.",
    primaryAction:"Upload Document",
    fields:[
      {key:"owner",label:"Customer / Application",required:true},
      {key:"documentType",label:"Document Type",type:"select",options:["PAN","Aadhaar","GST","ITR","Bank Statement","Financials","Sanction Letter","Other"]},
      {key:"file",label:"Select File",type:"file",required:true},
      {key:"status",label:"Verification Status",type:"select",options:["Pending","Verified","Rejected"]}
    ],
    columns:[{key:"owner",label:"Customer / Application"},{key:"documentType",label:"Type"},{key:"fileName",label:"File"},{key:"status",label:"Status"}]
  },
  reports: { key:"reports",title:"Reports & Analytics",singular:"Report",subtitle:"Operational, credit, lender and finance reporting.",fields:[],columns:[] },
  team: {
    key:"team",title:"Team Management",singular:"Team Member",subtitle:"Manage operational assignments and team access.",primaryAction:"Add Team Member",
    fields:[
      {key:"name",label:"Name",required:true},{key:"email",label:"Email",type:"email",required:true},
      {key:"role",label:"Role",type:"select",options:["Employee","Credit","Manager","Finance"]},
      {key:"status",label:"Status",type:"select",options:["Active","Inactive"]}
    ],
    columns:[{key:"name",label:"Name"},{key:"email",label:"Email"},{key:"role",label:"Role"},{key:"status",label:"Status"}]
  },
  settings: { key:"settings",title:"Settings",singular:"Setting",subtitle:"Configure CRM workflow preferences and business rules.",fields:[],columns:[] },
  audit: { key:"audit",title:"Audit & Controls",singular:"Audit Event",subtitle:"Review sensitive workflow and financial action logs.",fields:[],columns:[] },
  notifications: { key:"notifications",title:"Notifications",singular:"Notification",subtitle:"Review workflow alerts and pending actions.",fields:[],columns:[] },
  communications: { key:"communications",title:"Communications",singular:"Conversation",subtitle:"WhatsApp and customer communication integration workspace.",fields:[],columns:[] },
  search: { key:"search",title:"CRM Search",singular:"Result",subtitle:"Search leads, customers, applications, partners and transaction references.",fields:[],columns:[] }
};

export function isCrmModule(value:string): value is CrmModuleKey {
  return value in CRM_MODULES;
}
