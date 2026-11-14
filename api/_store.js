const fs=require('fs');const path=require('path');const crypto=require('crypto');
const allowed=['channels','categories','movie_streams','radio_stations'];
const local=n=>JSON.parse(fs.readFileSync(path.join(process.cwd(),'data',n+'.json'),'utf8'));
async function github(n){const repo=process.env.GITHUB_REPO,token=process.env.GITHUB_TOKEN;if(!repo||!token)return null;
const branch=process.env.GITHUB_BRANCH||'main';const endpoint=`https://api.github.com/repos/${repo}/contents/data/${n}.json?ref=${encodeURIComponent(branch)}`;
const r=await fetch(endpoint,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'tamj-iptv'}});
if(!r.ok)throw Error('GitHub read '+r.status);const d=await r.json();return {data:JSON.parse(Buffer.from(d.content.replace(/\s/g,''),'base64').toString()),sha:d.sha};}
async function read(n){if(!allowed.includes(n))throw Error('Unknown collection');const remote=await github(n);return remote?remote.data:local(n)}
async function write(n,data){if(!allowed.includes(n))throw Error('Unknown collection');const repo=process.env.GITHUB_REPO,token=process.env.GITHUB_TOKEN,branch=process.env.GITHUB_BRANCH||'main';if(!repo||!token)throw Error('Admin saving requires GITHUB_REPO and GITHUB_TOKEN environment variables');
const current=await github(n);const endpoint=`https://api.github.com/repos/${repo}/contents/data/${n}.json`;
const r=await fetch(endpoint,{method:'PUT',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'tamj-iptv'},body:JSON.stringify({message:`TAMJ: update ${n}`,content:Buffer.from(JSON.stringify(data,null,2)).toString('base64'),sha:current.sha,branch})});if(!r.ok)throw Error('GitHub write '+r.status+' (check token permissions and branch)');}
function json(res,data,code=200){res.status(code).setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
function secret(){return process.env.ADMIN_SECRET||'TEST_ONLY_CHANGE_ME_2026'}
function signed(value){return crypto.createHmac('sha256',secret()).update(value).digest('hex')}
function authorized(req){const m=(req.headers.cookie||'').match(/(?:^|;\s*)tamj_auth=([^;]+)/);if(!m)return false;const [value,sig]=decodeURIComponent(m[1]).split('.');if(!value||!sig||sig.length!==64)return false;const expected=signed(value);return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))&&Number(value)>Date.now()}
function url(x,optional=false){if(optional&&!x)return '';const u=new URL(String(x||''));if(!['http:','https:'].includes(u.protocol)||String(x).length>8000)throw Error('Valid HTTP(S) URL required');return u.href}
module.exports={read,write,json,authorized,signed,url};