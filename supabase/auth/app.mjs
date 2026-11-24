import{validateConfig,makePasswordService}from "./password-service.mjs";
const el=id=>document.getElementById(id);
const banner=el("message");
let svc,recovery=false,busy=false;
function msg(s="",type="info"){banner.textContent=String(s);banner.dataset.type=type;}
function show(screen){document.body.dataset.screen=screen;document.querySelectorAll("[data-screen]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.screen===screen)));msg();}
function working(v){busy=v;document.querySelectorAll("button,input").forEach(n=>n.disabled=v);}
function sync(){el("currentBox").hidden=recovery;el("changeHelp").textContent=recovery?"Liên kết khôi phục đã được xác nhận. Nhập mật khẩu mới.":"Đổi mật khẩu đang dùng bằng mật khẩu mới.";}
async function identity(){const u=await svc.user().catch(()=>null);el("identity").textContent=u?.email?"Đang đăng nhập: "+u.email:"Chưa đăng nhập";el("logout").hidden=!u;return u;}
async function act(name){if(busy)return;working(true);msg();try{
 if(name==="login"){await svc.login(el("email").value,el("loginPassword").value);el("loginPassword").value="";await identity();show("change");msg("Đăng nhập thành công.","success");}
 if(name==="forgot"){msg(await svc.forgot(el("forgotEmail").value),"success");}
 if(name==="change"){msg();const done=await svc.change({password:el("newPass").value,confirm:el("confirmPass").value,currentPassword:el("currentPass").value,recovery});for(const id of ["newPass","confirmPass","currentPass"])el(id).value="";recovery=false;sync();show("login");msg(done,"success");await identity();if(location.hash)history.replaceState(null,"",location.pathname+location.search);}
 if(name==="logout"){await svc.signOut();recovery=false;sync();show("login");await identity();msg("Đã đăng xuất.","success");}
 }catch(e){msg(e?.message||"Có lỗi xảy ra.","error");}finally{working(false);}}
async function start(){try{
 validateConfig(window.E_REPORT_SUPABASE_CONFIG);
 if(!window.supabase?.createClient)throw Error("Không tải được thư viện Supabase.");
 const url=location.origin+location.pathname;if(!url.startsWith("https://"))throw Error("Trang này yêu cầu kết nối HTTPS.");
 const client=window.supabase.createClient(window.E_REPORT_SUPABASE_CONFIG.url,window.E_REPORT_SUPABASE_CONFIG.publishableKey,{auth:{flowType:"implicit",detectSessionInUrl:true,persistSession:true,storageKey:"ereport-supabase-auth-v1"}});
 svc=makePasswordService(client,url);
 recovery=new URLSearchParams(location.hash.slice(1)).get("type")==="recovery"||new URLSearchParams(location.search).get("type")==="recovery";
 sync();
 svc.onAuth(event=>{if(event==="PASSWORD_RECOVERY"){recovery=true;sync();show("change");msg("Đã xác nhận email. Hãy đặt mật khẩu mới.","success");}});
 const u=await identity();show(u?"change":"login");if(recovery&&u){show("change");msg("Hãy đặt mật khẩu mới.","success");}
 document.querySelectorAll("form[data-action]").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();void act(f.dataset.action);}));
 document.querySelectorAll("button[data-screen]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.screen)));
 el("logout").addEventListener("click",()=>void act("logout"));
 }catch(e){msg(e.message,"error");document.querySelectorAll("button,input").forEach(n=>n.disabled=true);}}
void start();
