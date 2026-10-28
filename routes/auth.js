const express=require("express");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const supabase=require("../supabase");
const {cleanString,emailPattern}=require("../utils/validation");
const router=express.Router();
function issueToken(user){return jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:"8h",issuer:"portfolio-generator"});}
router.post("/signup",async(req,res,next)=>{
 try{
  const name=cleanString(req.body?.name,80),email=cleanString(req.body?.email,254).toLowerCase(),password=req.body?.password;
  if(name.length<2)return res.status(400).json({error:"Name must contain at least 2 characters."});
  if(!emailPattern.test(email))return res.status(400).json({error:"Enter a valid email address."});
  if(typeof password!=="string"||password.length<8||password.length>72)return res.status(400).json({error:"Password must be between 8 and 72 characters."});
  const password_hash=await bcrypt.hash(password,12);
  const {data:user,error}=await supabase.from("app_users").insert({name,email,password_hash,role:"user"}).select("id,name,email,role").single();
  if(error){if(error.code==="23505")return res.status(409).json({error:"An account with this email already exists."});throw error;}
  const {error:portfolioError}=await supabase.from("portfolios").insert({user_id:user.id,display_name:name,slug:null});
  if(portfolioError)throw portfolioError;
  return res.status(201).json({token:issueToken(user),user});
 }catch(e){next(e);}
});
router.post("/signin",async(req,res,next)=>{
 try{
  const email=cleanString(req.body?.email,254).toLowerCase(),password=req.body?.password;
  if(!emailPattern.test(email)||typeof password!=="string")return res.status(400).json({error:"Enter your email and password."});
  const {data:user,error}=await supabase.from("app_users").select("id,name,email,role,password_hash").eq("email",email).maybeSingle();
  if(error)throw error;
  if(!user||!(await bcrypt.compare(password,user.password_hash)))return res.status(401).json({error:"Email or password is incorrect."});
  const safeUser={id:user.id,name:user.name,email:user.email,role:user.role};
  return res.json({token:issueToken(safeUser),user:safeUser});
 }catch(e){next(e);}
});
module.exports=router;
