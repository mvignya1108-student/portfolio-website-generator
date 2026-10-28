const express=require("express");
const supabase=require("../supabase");
const router=express.Router();
router.get("/:slug",async(req,res,next)=>{
 try{
  const {data:portfolio,error}=await supabase.from("portfolios").select("id,display_name,headline,bio,location,contact_email,education,skills,slug,updated_at").eq("slug",req.params.slug).eq("is_published",true).maybeSingle();
  if(error)throw error;if(!portfolio)return res.status(404).json({error:"Published portfolio not found."});
  const {data:projects,error:projectError}=await supabase.from("portfolio_projects").select("title,description,url,position").eq("portfolio_id",portfolio.id).order("position");
  if(projectError)throw projectError;res.json({portfolio,projects});
 }catch(e){next(e);}
});
module.exports=router;
