const express=require("express");
const supabase=require("../supabase");
const {requireAuth,requireAdmin}=require("../middleware/auth");
const router=express.Router();router.use(requireAuth,requireAdmin);
router.get("/overview",async(req,res,next)=>{
 try{
  const [users,portfolios,published]=await Promise.all([
   supabase.from("app_users").select("id",{count:"exact",head:true}),
   supabase.from("portfolios").select("id",{count:"exact",head:true}),
   supabase.from("portfolios").select("id",{count:"exact",head:true}).eq("is_published",true)
  ]);
  for(const r of [users,portfolios,published])if(r.error)throw r.error;
  const {data,error}=await supabase.from("portfolios").select("id,user_id,display_name,is_published,created_at,app_users(email)").order("created_at",{ascending:false}).limit(100);
  if(error)throw error;
  res.json({stats:{users:users.count||0,portfolios:portfolios.count||0,published:published.count||0},portfolios:(data||[]).map(p=>({id:p.id,display_name:p.display_name,is_published:p.is_published,created_at:p.created_at,owner_email:p.app_users?.email||"Unknown"}))});
 }catch(e){next(e);}
});
router.patch("/portfolios/:id/visibility",async(req,res,next)=>{
 try{
  if(typeof req.body?.published!=="boolean")return res.status(400).json({error:"published must be true or false."});
  const {data,error}=await supabase.from("portfolios").update({is_published:req.body.published,updated_at:new Date().toISOString()}).eq("id",req.params.id).select("id,is_published").maybeSingle();
  if(error)throw error;if(!data)return res.status(404).json({error:"Portfolio not found."});res.json({portfolio:data});
 }catch(e){next(e);}
});
module.exports=router;
