require("dotenv").config({path:require("path").join(__dirname,".env")});
const path=require("path");
const express=require("express");
const helmet=require("helmet");
const compression=require("compression");
const rateLimit=require("express-rate-limit");
const bcrypt=require("bcryptjs");
const supabase=require("./supabase");
const authRoutes=require("./routes/auth");
const portfolioRoutes=require("./routes/portfolio");
const publicRoutes=require("./routes/public");
const adminRoutes=require("./routes/admin");
const app=express();
const PORT=Number(process.env.PORT)||3000;
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new Error("JWT_SECRET must be at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
app.disable("x-powered-by");
app.use(helmet({contentSecurityPolicy:{directives:{"default-src":["'self'"],"script-src":["'self'"],"style-src":["'self'","'unsafe-inline'","https://fonts.googleapis.com"],"font-src":["'self'","https://fonts.gstatic.com","data:"],"img-src":["'self'","data:"],"connect-src":["'self'"],"object-src":["'none'"],"frame-ancestors":["'none'"]}}}));
app.use(compression());app.use(express.json({limit:"100kb"}));
const authLimiter=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false,message:{error:"Too many authentication attempts. Try again in 15 minutes."}});
app.get("/api/health",async(_req,res)=>{try{const {error}=await supabase.from("app_users").select("id",{head:true,limit:1});if(error)throw error;res.json({status:"ok",database:"connected"});}catch{res.status(503).json({status:"error",database:"unavailable"});}});
app.use("/api/auth",authLimiter,authRoutes);
app.use("/api/portfolio",portfolioRoutes);
app.use("/api/public",publicRoutes);
app.use("/api/admin",adminRoutes);
app.use(express.static(path.join(__dirname,"..","frontend")));
app.use("/api",(req,res)=>res.status(404).json({error:"API endpoint not found."}));
app.use((err,req,res,_next)=>{console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`,err.message);if(res.headersSent)return;res.status(500).json({error:"Something went wrong. Check server configuration and logs."});});
async function ensureAdmin(){
 const email=(process.env.ADMIN_EMAIL||"mrec@gmail.com").trim().toLowerCase();
 const password=process.env.ADMIN_PASSWORD;
 if(!password||password==="CHANGE_THIS_DEMO_PASSWORD"){console.warn("ADMIN_PASSWORD is not set to a private value; skipping admin bootstrap.");return;}
 if(password.length<8)throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
 const {data:existing,error}=await supabase.from("app_users").select("id,role").eq("email",email).maybeSingle();
 if(error)throw error;
 const password_hash=await bcrypt.hash(password,12);
 if(!existing){
  const {error:insertError}=await supabase.from("app_users").insert({name:"MREC Administrator",email,password_hash,role:"admin"});
  if(insertError)throw insertError;
  console.log(`Bootstrapped administrator account: ${email}`);
 }else if(existing.role!=="admin"){
  const {error:updateError}=await supabase.from("app_users").update({role:"admin",password_hash,name:"MREC Administrator"}).eq("id",existing.id);
  if(updateError)throw updateError;
  console.log(`Promoted configured administrator account: ${email}`);
 }
}
ensureAdmin().then(()=>app.listen(PORT,()=>console.log(`Portfolio Website Generator running at http://localhost:${PORT}`))).catch(err=>{console.error("Startup failed:",err.message);process.exit(1);});
