const $ = (s) => document.querySelector(s);
const state = { token: null, user: null, portfolio: null, projects: [], authMode: "signup" };
const escapeHTML = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(path, options={}) {
  const headers = {"Content-Type":"application/json", ...(options.headers||{})};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`/api${path}`, {...options, headers});
  const body = await response.json().catch(()=>({error:"The server returned an unreadable response."}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}
function showOnly(id) {
  ["hero","how","workspace","public-page","admin-panel"].forEach(x => $("#"+x).classList.toggle("hidden", x!==id));
  if(id==="hero") $("#how").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
function openAuth(mode) {
  state.authMode=mode; $("#auth-panel").classList.remove("hidden");
  const signup=mode==="signup"; $("#auth-title").textContent=signup?"Create your account":"Welcome back";
  $("#auth-subtitle").textContent=signup?"Build a portfolio that opens doors.":"Sign in to continue building your portfolio.";
  $("#name-label").classList.toggle("hidden",!signup); $("#auth-name").classList.toggle("hidden",!signup);
  $("#auth-name").required=signup; $("#auth-password").autocomplete=signup?"new-password":"current-password";
  $("#auth-submit").textContent=signup?"Create account":"Sign in";
  $("#auth-switch").innerHTML=signup?'Already have an account? <button id="switch-auth">Sign in</button>':'New here? <button id="switch-auth">Create account</button>';
  $("#auth-message").textContent="";
  $("#switch-auth").addEventListener("click",()=>openAuth(signup?"signin":"signup"));
}
function hideAuth(){ $("#auth-panel").classList.add("hidden"); }
["nav-signin"].forEach(id=>$("#"+id).addEventListener("click",()=>openAuth("signin")));
["nav-signup","hero-start"].forEach(id=>$("#"+id).addEventListener("click",()=>openAuth("signup")));
$("#close-auth").addEventListener("click",hideAuth);
$("#auth-panel").addEventListener("click",e=>{if(e.target===$("#auth-panel"))hideAuth();});
$("#auth-form").addEventListener("submit",async e=>{
  e.preventDefault(); const button=$("#auth-submit"); button.disabled=true; $("#auth-message").textContent="Please wait…";
  try {
    const signup=state.authMode==="signup";
    const payload={email:$("#auth-email").value.trim(),password:$("#auth-password").value};
    if(signup)payload.name=$("#auth-name").value.trim();
    const result=await api(`/auth/${signup?"signup":"signin"}`,{method:"POST",body:JSON.stringify(payload)});
    state.token=result.token; state.user=result.user; hideAuth(); await loadWorkspace();
  } catch(err){$("#auth-message").textContent=err.message;} finally{button.disabled=false;}
});
function projectEditor(project={},index=0){
  return `<div class="project-item" data-project><div class="project-item-top"><strong>Project ${index+1}</strong><button type="button" class="remove-project">Remove</button></div><input data-field="title" maxlength="120" required placeholder="Project title" value="${escapeHTML(project.title||"")}"><input data-field="description" maxlength="500" placeholder="What did you build?" value="${escapeHTML(project.description||"")}"><input data-field="url" maxlength="500" type="url" placeholder="https://project-link.example (optional)" value="${escapeHTML(project.url||"")}"></div>`;
}
function readProjects(){return [...$("#projects-list").querySelectorAll("[data-project]")].map(el=>({title:el.querySelector('[data-field="title"]').value.trim(),description:el.querySelector('[data-field="description"]').value.trim(),url:el.querySelector('[data-field="url"]').value.trim()})).filter(p=>p.title);}
function bindProjectButtons(){
  $("#projects-list").querySelectorAll(".remove-project").forEach(b=>b.onclick=()=>{b.closest("[data-project]").remove();renumberProjects();renderPreview();});
  $("#projects-list").querySelectorAll("input").forEach(i=>i.addEventListener("input",renderPreview));
}
function renumberProjects(){ $("#projects-list").querySelectorAll(".project-item-top strong").forEach((el,i)=>el.textContent=`Project ${i+1}`); }
$("#add-project").addEventListener("click",()=>{if($("#projects-list").children.length>=8){$("#save-message").textContent="You can add up to 8 projects.";return;}$("#projects-list").insertAdjacentHTML("beforeend",projectEditor({},$("#projects-list").children.length));bindProjectButtons();renderPreview();});
async function loadWorkspace(){
  try{
    const result=await api("/portfolio/me"); state.portfolio=result.portfolio; state.projects=result.projects||[];
    if(state.user.role==="admin"){showOnly("admin-panel");await loadAdmin();return;}
    showOnly("workspace"); fillEditor(); 
  }catch(err){state.token=null;state.user=null;openAuth("signin");$("#auth-message").textContent=err.message;}
}
function fillEditor(){
  const p=state.portfolio||{};
  $("#full-name").value=p.display_name||state.user.name||"";$("#headline").value=p.headline||"";$("#bio").value=p.bio||"";$("#location").value=p.location||"";$("#contact-email").value=p.contact_email||"";$("#skills").value=(p.skills||[]).join(", ");$("#education").value=p.education||"";
  $("#projects-list").innerHTML=(state.projects.length?state.projects:[{}]).map(projectEditor).join("");bindProjectButtons();renderPreview();updatePublishedLink();
}
function portfolioPayload(){return {display_name:$("#full-name").value.trim(),headline:$("#headline").value.trim(),bio:$("#bio").value.trim(),location:$("#location").value.trim(),contact_email:$("#contact-email").value.trim(),skills:$("#skills").value.split(",").map(s=>s.trim()).filter(Boolean),education:$("#education").value.trim(),projects:readProjects()};}
function renderPreview(){
 const p=portfolioPayload();$("#live-preview").innerHTML=`<div class="pv-name">${escapeHTML(p.display_name||"Your name")}</div><p class="pv-headline">${escapeHTML(p.headline||"Your headline goes here")}</p><p class="pv-bio">${escapeHTML(p.bio||"Write a short introduction to help people get to know you.")}</p><div class="skill-list">${p.skills.map(s=>`<span>${escapeHTML(s)}</span>`).join("")}</div>${p.education?`<p class="pv-headline">${escapeHTML(p.education)}</p>`:""}<h4>Selected projects</h4>${p.projects.map(x=>`<div class="pv-project"><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.description)}</small></div>`).join("")}`;
}
$("#portfolio-form").addEventListener("input",renderPreview);
$("#portfolio-form").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;$("#save-message").textContent="Saving…";
 try{const p=portfolioPayload();const result=await api("/portfolio/me",{method:"PUT",body:JSON.stringify(p)});state.portfolio=result.portfolio;state.projects=result.projects;$("#save-message").textContent="Your changes have been saved.";updatePublishedLink();}
 catch(err){$("#save-message").textContent=err.message;}finally{button.disabled=false;}
});
function updatePublishedLink(){
 const url=state.portfolio?.is_published&&state.portfolio?.slug?`${location.origin}/?portfolio=${encodeURIComponent(state.portfolio.slug)}`:"";
 $("#public-url").textContent=url||"Save and publish to create your shareable link.";$("#copy-link").disabled=!url;$("#copy-link").dataset.url=url;
}
$("#publish").addEventListener("click",async()=>{
 $("#publish").disabled=true;$("#save-message").textContent="Publishing…";
 try{const p=portfolioPayload();await api("/portfolio/me",{method:"PUT",body:JSON.stringify(p)});const r=await api("/portfolio/me/publish",{method:"POST"});state.portfolio=r.portfolio;updatePublishedLink();$("#save-message").textContent="Published! Your portfolio is now publicly viewable."; }
 catch(err){$("#save-message").textContent=err.message;}finally{$("#publish").disabled=false;}
});
$("#copy-link").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#copy-link").dataset.url);$("#save-message").textContent="Public link copied.";}catch{$("#save-message").textContent=$("#copy-link").dataset.url;}});
$("#logout").addEventListener("click",()=>{state.token=null;state.user=null;state.portfolio=null;state.projects=[];showOnly("hero");});
async function loadPublic(slug){
 try{const r=await api(`/public/${encodeURIComponent(slug)}`);const p=r.portfolio;showOnly("public-page");$("#public-page").innerHTML=`<a class="back-link" href="/">← Portfolio Generator</a><section class="public-hero"><p class="eyebrow">PERSONAL PORTFOLIO</p><h1>${escapeHTML(p.display_name)}</h1><p><strong>${escapeHTML(p.headline||"")}</strong></p><p>${escapeHTML(p.bio||"")}</p><p>${escapeHTML([p.location,p.education].filter(Boolean).join(" · "))}</p>${p.contact_email?`<a class="button button-dark" href="mailto:${encodeURIComponent(p.contact_email)}">Contact me ↗</a>`:""}</section><section class="public-section"><h2>Skills</h2><div class="skill-list">${(p.skills||[]).map(s=>`<span>${escapeHTML(s)}</span>`).join("")||"Skills coming soon"}</div></section><section class="public-section"><h2>Selected projects</h2><div class="public-projects">${(r.projects||[]).map(x=>`<article class="public-project"><strong>${escapeHTML(x.title)}</strong><p>${escapeHTML(x.description||"")}</p>${x.url?`<a class="text-link" href="${escapeHTML(x.url)}" target="_blank" rel="noopener noreferrer">View project ↗</a>`:""}</article>`).join("")||"<p>Projects coming soon.</p>"}</div></section>`;
 }catch(err){showOnly("public-page");$("#public-page").innerHTML=`<h1>Portfolio not found</h1><p class="muted">This portfolio may be unpublished or the link may be incorrect.</p><a class="button button-dark" href="/">Go home</a>`;}
}
async function loadAdmin(){
 try{const r=await api("/admin/overview");$("#admin-stats").innerHTML=[["Users",r.stats.users],["Portfolios",r.stats.portfolios],["Published",r.stats.published]].map(s=>`<div class="stat"><span>${s[0]}</span><strong>${s[1]}</strong></div>`).join("");
 $("#admin-rows").innerHTML=r.portfolios.map(p=>`<tr><td>${escapeHTML(p.owner_email)}</td><td>${escapeHTML(p.display_name||"Untitled")}</td><td>${p.is_published?"Published":"Draft"}</td><td>${new Date(p.created_at).toLocaleDateString()}</td><td><button class="button button-outline" data-toggle="${escapeHTML(p.id)}" data-published="${p.is_published}">${p.is_published?"Unpublish":"Publish"}</button></td></tr>`).join("")||'<tr><td colspan="5">No portfolios yet.</td></tr>';
 $("#admin-rows").querySelectorAll("[data-toggle]").forEach(b=>b.onclick=async()=>{try{await api(`/admin/portfolios/${b.dataset.toggle}/visibility`,{method:"PATCH",body:JSON.stringify({published:b.dataset.published!=="true"})});await loadAdmin();}catch(e){alert(e.message);}});
 }catch(err){$("#admin-rows").innerHTML=`<tr><td colspan="5">${escapeHTML(err.message)}</td></tr>`;}
}
$("#admin-refresh").addEventListener("click",loadAdmin);
async function boot(){
 try{const health=await fetch("/api/health");if(!health.ok)throw new Error("Backend unavailable");}catch{console.warn("Could not reach the backend.");}
 const slug=new URLSearchParams(location.search).get("portfolio");if(slug){await loadPublic(slug);return;}
 showOnly("hero");
}
boot();
