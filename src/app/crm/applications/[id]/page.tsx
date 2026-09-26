import { ApplicationDetailWorkspace } from "@/components/application-detail-workspace";

export default async function ApplicationDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <ApplicationDetailWorkspace applicationId={id}/>;
}
