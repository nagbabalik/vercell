const {read,write,json,authorized,signed,url}=require('./_store');const crypto=require('crypto');
const types={save:'channels',delete:'channels',radio_save:'radio_stations',radio_delete:'radio_stations',movie_save:'movie_streams',movie_delete:'movie_streams',category_add:'categories',category_delete:'categories'};
const ident=()=>crypto.randomBytes(12).toString('hex');
module.exports=async(req,res)=>{try{if(req.method==='GET')return json(res,{admin:authorized(req)});if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
const b=req.body||{},action=b.action;
if(action==='login'){const user=process.env.ADMIN_USER||'admin',pass=process.env.ADMIN_PASSWORD||'admin';if(b.username!==user||b.password!==pass)return json(res,{error:'Incorrect credentials'},401);const exp=String(Date.now()+86400000);res.setHeader('Set-Cookie',`tamj_auth=${exp}.${signed(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);return json(res,{ok:true})}
if(action==='logout'){res.setHeader('Set-Cookie','tamj_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return json(res,{ok:true})}
if(!authorized(req))return json(res,{error:'Admin login required'},403);
const type=types[action];if(!type)return json(res,{error:'Unsupported action'},400);
let items=await read(type);if(!Array.isArray(items))items=[];
if(action==='category_add'){const name=String(b.name||'').trim().slice(0,80);if(name&&!items.includes(name))items.push(name)}
else if(action==='category_delete'){items=items.filter(x=>x!==b.name)}
else if(action.endsWith('_delete')||action==='delete'){const key=type==='movie_streams'?'key':'id';items=items.filter(x=>x[key]!==b[key])}
else{let record;if(type==='channels'){record={id:b.id||ident(),name:String(b.name||'').trim(),url:url(b.url),logo:url(b.logo,true),category:String(b.category||'Uncategorized'),drm_type:b.drm_type||'none',drm_kid:b.drm_kid||'',drm_key:b.drm_key||'',drm_license_url:url(b.drm_license_url,true)}}
else if(type==='radio_stations'){record={id:b.id||ident(),name:String(b.name||'').trim(),url:url(b.url),logo:url(b.logo,true),category:String(b.category||'Music'),country:String(b.country||''),enabled:b.enabled!==false}}
else{record={key:b.key||ident(),kind:b.kind||'movie',tmdb_id:Number(b.tmdb_id)||0,title:String(b.title||'').trim(),description:String(b.description||''),poster:url(b.poster,true),genre:String(b.genre||''),year:String(b.year||''),url:url(b.url,true),drm_type:b.drm_type||'none',drm_kid:b.drm_kid||'',drm_key:b.drm_key||'',drm_license_url:url(b.drm_license_url,true)}}
if(!record.name&&!record.title)throw Error('Name or title required');if(record.drm_type==='clearkey'&&(!/^[0-9a-f]{32}$/i.test(record.drm_kid)||!/^[0-9a-f]{32}$/i.test(record.drm_key)))throw Error('ClearKey KID and key must be 32 hex characters');if(record.drm_type==='widevine'&&!record.drm_license_url)throw Error('Widevine license URL required');const key=type==='movie_streams'?'key':'id';const i=items.findIndex(x=>x[key]===record[key]);if(i<0)items.push(record);else items[i]=record;}
await write(type,items);json(res,{ok:true})}catch(e){json(res,{error:e.message},400)}};