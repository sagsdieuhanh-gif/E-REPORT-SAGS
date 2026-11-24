/* Auth-only Supabase password recovery; never call Firebase or SAGS-RNS. */
const HOST="wggirxzdcfnxyjgjvpgh.supabase.co";
const mail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function ok(result){if(result?.error)throw result.error;return result?.data??null;}
export function validateConfig(cfg){
 let url;try{url=new URL(cfg.url)}catch(_){throw Error("Chưa cấu hình Supabase E-REPORT.");}
 if(url.protocol!=="https:"||url.hostname!==HOST||url.pathname!=="/")throw Error("Không được kết nối vào backend khác hoặc SAGS-RNS.");
 if(!String(cfg.publishableKey||"").startsWith("sb_publishable_"))throw Error("Thiếu khóa public Supabase.");
 return cfg;
}
export function validatePassword(password,confirm){
 const p=String(password??"");
 if(p!==confirm)throw Error("Mật khẩu nhập lại chưa trùng.");
 if(p.length<12||p.length>128||!/[A-Za-z]/.test(p)||!/\d/.test(p))throw Error("Mật khẩu cần 12–128 ký tự, gồm chữ và số.");
 return p;
}
export function makePasswordService(supabase,redirectTo){
 const auth=supabase?.auth;
 if(!auth?.updateUser||!auth?.getUser||!auth?.resetPasswordForEmail)throw Error("Supabase Auth chưa sẵn sàng.");
 if(!/^https:\/\//.test(redirectTo))throw Error("URL khôi phục phải dùng HTTPS.");
 return {
  async login(email,password){
   const address=String(email||"").trim().toLowerCase();
   if(!mail.test(address)||!String(password||""))throw Error("Nhập email và mật khẩu.");
   return ok(await auth.signInWithPassword({email:address,password:String(password)}));
  },
  async user(){return ok(await auth.getUser())?.user??null;},
  async forgot(email){
   const address=String(email||"").trim().toLowerCase();
   if(!mail.test(address))throw Error("Nhập email hợp lệ.");
   const r=await auth.resetPasswordForEmail(address,{redirectTo});
   if(r?.error){
    if(r.error.status===429)throw Error("Gửi quá nhiều yêu cầu. Hãy thử lại sau.");
    throw Error("Không gửi được email. Kiểm tra SMTP hoặc thử lại sau.");
   }
   return "Nếu email đã đăng ký, hệ thống sẽ gửi liên kết khôi phục. Hãy kiểm tra hộp thư và thư rác.";
  },
  async change({password,confirm,currentPassword,recovery=false}){
   const p=validatePassword(password,confirm);
   const user=ok(await auth.getUser())?.user;
   if(!user?.id)throw Error("Chưa đăng nhập hoặc liên kết khôi phục đã hết hạn.");
   if(!recovery&&!currentPassword)throw Error("Cần nhập mật khẩu hiện tại.");
   const patch=recovery?{password:p}:{password:p,current_password:String(currentPassword)};
   ok(await auth.updateUser(patch));
   ok(await auth.signOut({scope:"global"}));
   return "Đã đổi mật khẩu. Vui lòng đăng nhập lại.";
  },
  onAuth(listener){
   const {data}=auth.onAuthStateChange((event,session)=>listener(event,session));
   return ()=>data?.subscription?.unsubscribe?.();
  },
  async signOut(){ok(await auth.signOut({scope:"global"}));}
 };
}
