const express=require("express");
const crypto=require("crypto");
const supabase=require("../supabase");
const {requireAuth}=require("../middleware/auth");
const {validatePortfolio}=require("../utils/validation");
const router=express.Router();
router.use(requireAuth);
async function getOwnedPortfolio(userId){
 const {data,error}=await supabase.from("portfolios").select("*").eq("user_id",userId).maybeSingle();
 if(error)throw error;
 if(data)return data;
 const {data:created,error:createError}=await supabase.from("portfolios").insert({user_id:userId}).select("*").single();
 if(createError)throw createError;return created;
}
router.get("/me",async(req,res,next)=>{
 try{
  const portfolio=await getOwnedPortfolio(req.auth.sub);
  const {data:projects,error}=await supabase.from("portfolio_projects").select("id,title,description,url,position").eq("portfolio_id",portfolio.id).order("position");
  if(error)throw error;
  res.json({portfolio,projects});
 }catch(e){next(e);}
});
router.put("/me",async(req,res,next)=>{
 try{
  const valid=validatePortfolio(req.body);if(typeof valid==="string")return res.status(400).json({error:valid});
  const existing=await getOwnedPortfolio(req.auth.sub);
  const updates={display_name:valid.display_name,headline:valid.headline,bio:valid.bio,location:valid.location,contact_email:valid.contact_email,education:valid.education,skills:valid.skills,updated_at:new Date().toISOString()};
  const {data:portfolio,error}=await supabase.from("portfolios").update(updates).eq("id",existing.id).eq("user_id",req.auth.sub).select("*").single();
  if(error)throw error;
  // Replace project rows only after validating the complete request.
  const {error:deleteError}=await supabase.from("portfolio_projects").delete().eq("portfolio_id",portfolio.id);
  if(deleteError)throw deleteError;
  let projects=[];
  if(valid.projects.length){
   const rows=valid.projects.map((p,i)=>({portfolio_id:portfolio.id,title:p.title,description:p.description,url:p.url||null,position:i}));
   const {data,error:insertError}=await supabase.from("portfolio_projects").insert(rows).select("id,title,description,url,position");
   if(insertError)throw insertError;projects=rows; // replaced with authoritative database rows below
   const {data:listed,error:listError}=await supabase.from("portfolio_projects").select("id,title,description,url,position").eq("portfolio_id",portfolio.id).order("position");
   if(listError)throw listError;projects=listed;
  }
  res.json({portfolio,projects});
 }catch(e){next(e);}
});
router.post("/me/publish",async(req,res,next)=>{
 try{
  const portfolio=await getOwnedPortfolio(req.auth.sub);
  if(!portfolio.display_name||portfolio.display_name.trim().length<2)return res.status(400).json({error:"Add a display name before publishing."});
  let slug=portfolio.slug;
  if(!slug){slug=crypto.randomBytes(9).toString("hex");}
  const {data:updated,error}=await supabase.from("portfolios").update({slug,is_published:true,updated_at:new Date().toISOString()}).eq("id",portfolio.id).eq("user_id",req.auth.sub).select("*").single();
  if(error)throw error;
  res.json({portfolio:updated});
 }catch(e){next(e);}
});
router.post("/me/unpublish",async(req,res,next)=>{
 try{const p=await getOwnedPortfolio(req.auth.sub);const {data,error}=await supabase.from("portfolios").update({is_published:false,updated_at:new Date().toISOString()}).eq("id",p.id).select("*").single();if(error)throw error;res.json({portfolio:data});}catch(e){next(e);}
});
module.exports=router;
