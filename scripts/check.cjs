const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),tests=fs.readdirSync(path.join(root,'tests')).filter(p=>p.endsWith('.test.js')).map(p=>path.join(root,'tests',p));
if(!tests.length)throw Error('No tests found');
for(const args of [['--test',...tests],[path.join(root,'scripts/validate-pwa.cjs')]]){const r=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
