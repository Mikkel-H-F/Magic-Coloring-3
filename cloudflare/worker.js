// Magic Coloring 3 – Cloudflare Worker (not deployed automatically).
// Requires secrets OPENAI_API_KEY and PARENT_PASSPHRASE, plus KV binding LIMITS.
// No API requests are sent unless all protections are configured.
const ORIGIN='https://mikkel-h-f.github.io';
const allowed=['unicorn','princess','cat','rabbit','butterfly'];
const places=['castle','rainbow','meadow','clouds','snow'];
const extras=['hearts','stars','flowers','magic','butterflies'];
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':ORIGIN,'vary':'Origin'}});
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export default {async fetch(request,env){
 const origin=request.headers.get('origin');
 if(origin!==ORIGIN)return json({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST, GET, OPTIONS','access-control-allow-headers':'content-type, x-parent-passphrase','access-control-max-age':'3600'}});
 const url=new URL(request.url);
 if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,ready:!!(env.OPENAI_API_KEY&&env.PARENT_PASSPHRASE&&env.LIMITS)});
 if(url.pathname!=='/generate'||request.method!=='POST')return json({error:'Not found'},404);
 if(!env.OPENAI_API_KEY||!env.PARENT_PASSPHRASE||!env.LIMITS)return json({error:'Server not configured'},503);
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const day=new Date().toISOString().slice(0,10);
 const key='attempt:'+day+':'+ip;
 const attempts=Number(await env.LIMITS.get(key)||0);
 if(attempts>=20)return json({error:'Too many requests today'},429);
 await env.LIMITS.put(key,String(attempts+1),{expirationTtl:86400});
 if(!equal(request.headers.get('x-parent-passphrase'),env.PARENT_PASSPHRASE))return json({error:'Parent access required'},401);
 const dailyKey='daily:'+day;
 const used=Number(await env.LIMITS.get(dailyKey)||0);
 if(used>=5)return json({error:'Daily generation limit reached'},429);
 let data;try{data=await request.json()}catch{return json({error:'Invalid JSON'},400)}
 if(!allowed.includes(data.character)||!places.includes(data.place)||!extras.includes(data.extra))return json({error:'Invalid choices'},400);
 // Note: KV read-then-write is not atomic; for a strict cost cap use a Durable Object.
 await env.LIMITS.put(dailyKey,String(used+1),{expirationTtl:86400});
 const prompt='Black and white coloring page for a 4-year-old child. One cute '+data.character+' in '+data.place+' with a few '+data.extra+'. Bold clean fully enclosed black outlines with medium detail: a few charming decorative features on the character, some simple background objects and playful details related to the chosen setting and extras. Keep large, easy-to-color enclosed regions suitable for a 4-year-old, and avoid tiny intricate patterns. Friendly expressive face, pure white background, no grayscale, no shading, no texture, no text. Square composition. Make a new unique drawing.';
 try{
  const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{authorization:'Bearer '+env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:'gpt-image-1-mini',prompt,size:'1024x1024',quality:'low',n:1})});
  const result=await response.json();
  if(!response.ok)return json({error:'Image generation unavailable',details:result.error?.message||'API error'},502);
  const b64=result.data?.[0]?.b64_json;
  if(!b64)return json({error:'Image data missing'},502);
  return json({image:'data:image/png;base64,'+b64});
 }catch{return json({error:'Image generation failed'},502)}
}};