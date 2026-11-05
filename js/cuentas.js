const codec=new TextEncoder();
const encode=buf=>btoa(Array.from(new Uint8Array(buf),x=>String.fromCharCode(x)).join(''));
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const session='nn.customer.session';
const storage=email=>'nn.customer.'+email;
async function derive(password,salt){
 const material=await crypto.subtle.importKey('raw',codec.encode(password),'PBKDF2',false,['deriveBits']);
 return crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,256);
}
async function cipherKey(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt'])}
async function read(email,raw){
 const record=JSON.parse(localStorage.getItem(storage(email)));
 if(!record)throw Error('Revisa tu correo y contraseña.');
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv)},await cipherKey(raw),decode(record.data));
 return JSON.parse(new TextDecoder().decode(plain));
}
async function write(email,raw,profile,salt){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipherKey(raw),codec.encode(JSON.stringify(profile)));
 localStorage.setItem(storage(email),JSON.stringify({salt,iv:encode(iv),data:encode(data)}));
}
export function logout(){sessionStorage.removeItem(session)}
export async function current(){
 const token=JSON.parse(sessionStorage.getItem(session)||'null');
 if(!token)return null;
 try{return await read(token.email,decode(token.key))}catch{logout();return null}
}
export async function access(email,password,name){
 email=email.trim().toLowerCase();
 return navigator.locks.request(storage(email),async()=>{
 const existing=JSON.parse(localStorage.getItem(storage(email)));
 if(name&&existing)throw Error('Este correo ya tiene una cuenta en este navegador.');
 if(!name&&!existing)throw Error('Revisa tu correo y contraseña.');
 const salt=existing?decode(existing.salt):crypto.getRandomValues(new Uint8Array(16));
 const raw=await derive(password,salt);
 if(name)await write(email,raw,{email,name,orders:[],notify:true},encode(salt));
 else try{await read(email,raw)}catch{throw Error('Revisa tu correo y contraseña.')}
 sessionStorage.setItem(session,JSON.stringify({email,key:encode(raw)}));
 });
}
export async function update(fn){
 const token=JSON.parse(sessionStorage.getItem(session));
 if(!token)throw Error('Inicia sesión para continuar.');
 return navigator.locks.request(storage(token.email),async()=>{
 const raw=decode(token.key),profile=await read(token.email,raw);fn(profile);
 await write(token.email,raw,profile,JSON.parse(localStorage.getItem(storage(token.email))).salt);
 });
}
