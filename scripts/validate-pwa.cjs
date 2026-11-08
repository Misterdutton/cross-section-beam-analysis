const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),sw=fs.readFileSync(path.join(dist,'sw.js'),'utf8'),client=fs.readFileSync(path.join(dist,'mobile.js'),'utf8');
const version=sw.match(/const VERSION='([^']+)'/)[1];
if(!html.includes('name="sdm-app-version" content="'+version+'"')||!client.includes("MOBILE_VERSION='"+version+"'"))throw Error('PWA versions do not match');
const list=vm.runInNewContext(sw.match(/const SHELL_FILES=(\[[^;]+\]);/)[1]);
for(const file of list){const name=file==='./'?'index.html':file;if(!fs.existsSync(path.join(dist,name)))throw Error('Missing offline asset '+name);}
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const url=match[1];if(/^(https?:|#)/.test(url))continue;const file=url.replace(/^\.\//,'');if(!fs.existsSync(path.join(dist,file)))throw Error('Missing referenced file '+file);if(!list.includes(file)&&!list.includes('./'+file))throw Error('Referenced file is not cached: '+file);}
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.webmanifest'),'utf8'));
if(manifest.start_url!=='./'||manifest.scope!=='./')throw Error('GitHub Pages requires relative PWA scope');
for(const icon of manifest.icons){const p=path.join(dist,icon.src);if(!fs.existsSync(p))throw Error('Missing app icon');const bytes=fs.readFileSync(p),size=Number(icon.sizes.split('x')[0]);if(bytes.readUInt32BE(16)!==size||bytes.readUInt32BE(20)!==size)throw Error('Incorrect icon dimensions');}
console.log(`PWA ${version}: ${list.length} offline assets and relative paths verified.`);
