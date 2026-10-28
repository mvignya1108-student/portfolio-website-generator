const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function cleanString(value,max=500){return typeof value==="string"?value.trim().slice(0,max):"";}
function validatePortfolio(body){
  if(!body||typeof body!=="object"||Array.isArray(body))return "Send portfolio details as a JSON object.";
  const display_name=cleanString(body.display_name,100);
  if(display_name.length<2)return "Display name must contain at least 2 characters.";
  const contact_email=cleanString(body.contact_email,254);
  if(contact_email&&!emailPattern.test(contact_email))return "Enter a valid public contact email.";
  if(!Array.isArray(body.skills)||body.skills.length>30)return "Skills must be a list of up to 30 items.";
  const skills=body.skills.map(s=>cleanString(s,40)).filter(Boolean);
  if(skills.length>30)return "You can add up to 30 skills.";
  if(!Array.isArray(body.projects)||body.projects.length>8)return "Add no more than 8 projects.";
  const projects=[];
  for(const p of body.projects){
    if(!p||typeof p!=="object")return "Each project must be an object.";
    const title=cleanString(p.title,120),description=cleanString(p.description,500),url=cleanString(p.url,500);
    if(!title)return "Every project needs a title.";
    if(url){try{const parsed=new URL(url);if(!["http:","https:"].includes(parsed.protocol))throw new Error();}catch{return "Project links must be valid http or https URLs.";}}
    projects.push({title,description,url});
  }
  return {display_name,headline:cleanString(body.headline,140),bio:cleanString(body.bio,1000),location:cleanString(body.location,100),contact_email,education:cleanString(body.education,180),skills:[...new Set(skills)],projects};
}
module.exports={cleanString,validatePortfolio,emailPattern};
