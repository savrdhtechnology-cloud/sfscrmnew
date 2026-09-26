import { CustomerProfileWorkspace } from "@/components/customer-profile-workspace";

export default async function CustomerProfilePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <CustomerProfileWorkspace customerId={id}/>;
}
