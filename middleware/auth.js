const jwt = require("jsonwebtoken");
function requireAuth(req,res,next){
  const header=req.get("authorization")||"";
  const match=header.match(/^Bearer\s+(.+)$/i);
  if(!match)return res.status(401).json({error:"Please sign in to continue."});
  try{req.auth=jwt.verify(match[1],process.env.JWT_SECRET);next();}
  catch{return res.status(401).json({error:"Your session is invalid or expired. Please sign in again."});}
}
function requireAdmin(req,res,next){
  if(req.auth?.role!=="admin")return res.status(403).json({error:"Administrator access is required."});
  next();
}
module.exports={requireAuth,requireAdmin};
