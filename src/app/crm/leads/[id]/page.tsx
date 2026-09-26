import { LeadDetailWorkspace } from "@/components/lead-detail-workspace";

export default async function LeadDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <LeadDetailWorkspace leadId={id}/>;
}
