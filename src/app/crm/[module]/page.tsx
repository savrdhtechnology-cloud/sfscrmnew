import { notFound } from "next/navigation";
import { CRM_MODULES, isCrmModule } from "@/lib/crm-modules";
import { CrmModuleWorkspace } from "@/components/crm-module-workspace";

export default async function CrmModulePage({
  params,
  searchParams
}:{
  params:Promise<{module:string}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
}){
  const {module}=await params;
  if(!isCrmModule(module)) notFound();
  const query=await searchParams;
  return <CrmModuleWorkspace definition={CRM_MODULES[module]} initialAction={typeof query.action==="string"?query.action:undefined} initialQuery={typeof query.q==="string"?query.q:undefined}/>;
}
