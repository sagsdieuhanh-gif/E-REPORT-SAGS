/* Isolated Supabase data gateway. DO NOT wire into Firebase production bootstrap. */
const RNS_PROJECT="ivixjhwghprfxdtaupxc";
const must=result=>{if(result?.error)throw result.error;return result?.data??null;};
export function assertSupabaseConfig(cfg){
 if(cfg?.backend!=="supabase")throw Error("Expected isolated Supabase backend");
 let url;try{url=new URL(cfg.url);}catch(_){throw Error("Missing Supabase URL");}
 if(url.protocol!=="https:"||!url.hostname.endsWith(".supabase.co"))throw Error("Invalid Supabase project URL");
 if(url.hostname.startsWith(RNS_PROJECT+"."))throw Error("Cannot reuse the SAGS-RNS production backend");
 if(!String(cfg.publishableKey||"").startsWith("sb_publishable_"))throw Error("Publishable key required; no service-role key in browser");
 return true;
}
export function createEReportGateway(client){
 if(!client?.from||!client?.auth?.getUser)throw Error("Supabase client unavailable");
 async function currentUserId(){const v=must(await client.auth.getUser());if(!v?.user?.id)throw Error("Not authenticated");return v.user.id;}
 return Object.freeze({
  async profile(){const uid=await currentUserId();return must(await client.from("e_report_profiles").select("*").eq("user_id",uid).single());},
  async myFlights(){return must(await client.from("e_report_flights").select("*").order("flight_date",{ascending:false}));},
  async assignments(flightId){return must(await client.from("e_report_assignments").select("*").eq("flight_id",flightId));},
  async forms(flightId){return must(await client.from("e_report_documents").select("*").eq("flight_id",flightId));},
  async saveDraft({flightId,formCode,draftKey,payload,atMs=0,counter=0,writerId=""}){
   const uid=await currentUserId();if(!flightId||!formCode||!draftKey)throw Error("Missing draft identity");
   return must(await client.from("e_report_drafts").upsert({
    owner_id:uid,flight_id:flightId,form_code:formCode,draft_key:draftKey,
    payload:payload??{},hlc_at_ms:atMs,hlc_counter:counter,writer_id:writerId,
    updated_at:new Date().toISOString()
   },{onConflict:"owner_id,flight_id,form_code,draft_key"}).select());
  },
  subscribeAssignments(listener){const ch=client.channel("e-report-assignments")
   .on("postgres_changes",{event:"*",schema:"public",table:"e_report_assignments"},listener).subscribe();
   return ()=>client.removeChannel(ch);}
 });
}
