'use strict';
const $=s=>document.querySelector(s);
const pages={panel:'Panel Principal',clientes:'Clientes',productos:'Productos',pedidos:'Pedidos',facturas:'Facturas',pagos:'Pagos',configuracion:'Configuración'};
const titles={...pages,clientes:'Gestión de Clientes',productos:'Inventario de Productos',pedidos:'Pedidos y Ventas',facturas:'Facturación',pagos:'Pagos y Cobros'};
const icons=['⊞','♙','◇','🛒','▤','▭','⚙'];
const money=n=>'RD$ '+Number(n).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base=b=>btoa(Array.from(new Uint8Array(b),c=>String.fromCharCode(c)).join(''));
const store='no-name.admin.v1',today=()=>new Date().toLocaleDateString('sv-SE');
let key,db,envelope,page,query='',filter='';
$('#access').onsubmit=async e=>{
 e.preventDefault();const f=e.target,btn=f.querySelector('button');btn.disabled=true;
 try{
 const saved=localStorage.getItem(store);
 envelope=saved?JSON.parse(saved):await (await fetch('admin-inicial.json')).json();
 const raw=new TextEncoder().encode(f.email.value.trim().toLowerCase()+'\0'+f.password.value);
 const material=await crypto.subtle.importKey('raw',raw,'PBKDF2',false,['deriveKey']);
 const derived=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(envelope.salt),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv)},derived,bytes(envelope.data));
 db=JSON.parse(new TextDecoder().decode(plain));key=derived;f.reset();$('#login').hidden=true;$('#shell').hidden=false;route();
 }catch(err){$('#error').textContent=err.name==='OperationError'?'Correo o contraseña incorrectos.':'No se pudo abrir el panel. Recarga la página e inténtalo de nuevo.'}finally{btn.disabled=false}
};
$('#logout').onclick=()=>location.replace('admin.html');
window.addEventListener('storage',e=>{if(key&&(e.key===store||e.key===null))location.reload()});
async function persist(){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(db)));
 localStorage.setItem(store,JSON.stringify({salt:envelope.salt,iv:base(iv),data:base(data)}));
}
function route(){if(!db)return;page=location.hash.slice(1);if(!Object.hasOwn(pages,page))page='panel';query='';filter='';render()}
window.onhashchange=route;
const next=(rows,prefix)=>prefix+'-'+String(1+Math.max(0,...rows.map(r=>Number(r.id.split('-')[1])))).padStart(4,'0');
const paid=o=>db.payments.filter(p=>p.invoice===o.invoice).reduce((n,p)=>n+p.cents,0);
const balance=o=>o.total-paid(o);
const status=o=>balance(o)===0?'Pagada':paid(o)?'Parcial':'Pendiente';
const table=(heads,rows)=>'<div class="table"><table><thead><tr>'+heads.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join(''):'<tr><td class="empty" colspan="'+heads.length+'">Sin registros</td></tr>')+'</tbody></table></div>';
const btn=(action,label,id='')=>'<button data-action="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';
const badge=s=>'<span class="badge">'+esc(s)+'</span>';
const select=(items,selected)=>items.map(x=>'<option '+(x===selected?'selected':'')+'>'+esc(x)+'</option>').join('');
const card=(title,body)=>'<article class="card"><h2>'+title+'</h2>'+body+'</article>';
function dashboard(){
 const invoices=db.orders.filter(o=>o.invoice),low=db.products.filter(p=>p.stock<=4),months=[];
 for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const month=d.toLocaleDateString('sv-SE').slice(0,7);months.push([month,invoices.filter(o=>o.issued.startsWith(month)).reduce((a,o)=>a+o.total,0)])}
 const sums=['Efectivo','Tarjeta','Transferencia'].map(m=>[m,db.payments.filter(p=>p.method===m).reduce((a,p)=>a+p.cents,0)]);
 const stats=[['Ventas totales',money(invoices.reduce((a,o)=>a+o.total,0)/100),'Según facturas emitidas'],['Facturas pendientes',invoices.filter(o=>balance(o)>0).length,'Por cobrar: '+money(invoices.reduce((a,o)=>a+balance(o),0)/100)],['Alertas de stock bajo',low.length,'Productos por reponer'],['Clientes activos',db.clients.length,'En directorio']];
 return '<div class="stats">'+stats.map(([s,n,h])=>'<article class="card"><small>'+s+'</small><strong>'+n+'</strong><small>'+h+'</small></article>').join('')+'</div><div class="panels">'+card('Ventas por mes (DOP)','<p>Últimos 6 meses según facturas emitidas</p><div class="bars">'+months.map(([m,n])=>'<div title="'+money(n/100)+'"><i style="height:'+150*n/Math.max(1,...months.map(x=>x[1]))+'px"></i><small>'+m+'</small></div>').join('')+'</div>')+card('Cobros por método',sums.map(([m,n])=>m+' · '+money(n/100)+'<progress value="'+n+'" max="'+Math.max(1,sums.reduce((a,x)=>a+x[1],0))+'"></progress>').join(''))+card('Pedidos recientes',table(['Pedido','Cliente','Total'],db.orders.slice(-5).reverse().map(o=>[o.id,esc(o.client),money(o.total/100)])))+card('Stock bajo',table(['Producto','Existencia'],low.slice(0,5).map(p=>[esc(p.name),p.stock])))+'</div>';
}
function field(name,label,value='',type='text',attrs='required'){return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+attrs+'></label>'}
function choice(name,label,items){return '<label>'+label+'<select required name="'+name+'">'+items.map(([v,t])=>'<option value="'+esc(v)+'">'+esc(t)+'</option>').join('')+'</select></label>'}
function settings(){const c=db.company;return '<div class="panels">'+card('Datos de la empresa','<p>Esta información aparece en el encabezado de las facturas.</p><form id="company">'+field('name','Nombre de la empresa',c.name)+['Documento fiscal','Teléfono','Correo','Dirección'].map((l,i)=>field('info'+i,l,c['info'+i],i===2?'email':'text','')).join('')+field('tax','IVA por defecto (%)',c.tax,'number','required min="0" max="100" step=".01"')+field('note','Nota al pie de la factura',c.note,'text','')+'<button>Guardar cambios</button></form>')+card('Roles y permisos','<h3>Administrador</h3><p>Acceso a clientes, inventario, pedidos, facturación, cobros y configuración.</p><small>Los registros se guardan cifrados en este navegador.</small>')+'</div>'}
function listing(){
 let tools='',heads,rows;
 const search=placeholder=>'<input id="search" aria-label="Buscar" placeholder="'+placeholder+'" value="'+esc(query)+'">';
 const matches=(...parts)=>parts.join(' ').toLowerCase().includes(query.toLowerCase());
 if(page==='clientes'){
 tools=search('Buscar nombre, documento o correo')+btn('client','＋ Nuevo cliente');heads=['Cliente','Documento','Contacto','Dirección','Registrado','Acciones'];
 rows=db.clients.filter(c=>matches(c.name,c.doc,c.email)).map(c=>[esc(c.name),esc(c.doc),esc(c.email)+'<small>'+esc(c.phone)+'</small>',esc(c.address),c.date,btn('client','Editar',c.id)+btn('deleteClient','Eliminar',c.id)]);
 }else if(page==='productos'){
 tools=search('Buscar producto o código')+'<select id="filter" aria-label="Categoría">'+select(['Todas las categorías',...new Set(db.products.map(p=>p.category))],filter)+'</select>'+btn('product','＋ Nuevo producto');heads=['Producto','Categoría','Precio (DOP)','Existencia','Estado de stock','Acciones'];
 rows=db.products.filter(p=>matches(p.name,p.id)&&(!filter||filter==='Todas las categorías'||p.category===filter)).map(p=>[esc(p.name)+'<small>'+p.id+'</small>',esc(p.category),money(p.price),p.stock,badge(p.stock<=4?'Stock bajo':'Disponible'),btn('product','Editar / Stock',p.id)+btn('deleteProduct','Eliminar',p.id)]);
 }else if(page==='pedidos'){
 tools='IVA aplicado: '+esc(db.company.tax)+'%'+btn('order','＋ Nuevo pedido');heads=['Pedido','Cliente','Ítems','Fecha','Estado','Total','Acciones'];
 rows=db.orders.map(o=>[o.id,esc(o.client),o.qty,o.date,badge(o.invoice?'Facturado':'Pendiente'),money(o.total/100),o.invoice?'':btn('invoice','Facturar',o.id)]);
 }else if(page==='facturas'){
 tools='Las facturas se generan desde un pedido.'+'<select id="filter" aria-label="Estado">'+select(['Todas','Pendiente','Parcial','Pagada'],filter)+'</select>';heads=['Factura','Cliente','Fecha','Total','Pagado','Saldo','Estado','Acciones'];
 rows=db.orders.filter(o=>o.invoice&&(!filter||filter==='Todas'||status(o)===filter)).map(o=>[o.invoice,esc(o.client),o.issued,money(o.total/100),money(paid(o)/100),money(balance(o)/100),badge(status(o)),btn('view','Ver',o.id)]);
 }else{
 tools='Registra cobros contra facturas pendientes o parciales.'+btn('payment','＋ Registrar pago');heads=['Pago','Factura','Cliente','Método','Referencia','Fecha','Monto','Acciones'];
 rows=db.payments.map(p=>[p.id,p.invoice,esc(db.orders.find(o=>o.invoice===p.invoice).client),badge(p.method),esc(p.ref),p.date,money(p.cents/100),btn('deletePayment','Eliminar',p.id)]);
 }
 return '<div class="toolbar">'+tools+'</div>'+table(heads,rows);
}
function render(){
 $('nav').innerHTML=Object.entries(pages).map(([id,name],i)=>'<a class="'+(page===id?'active':'')+'" href="#'+id+'"><span aria-hidden="true">'+icons[i]+'</span>'+name+'</a>').join('');
 $('#title').textContent=titles[page];$('#content').innerHTML=page==='panel'?dashboard():page==='configuracion'?settings():listing();
 if($('#search'))$('#search').oninput=e=>{query=e.target.value;const pos=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(pos,pos)};
 if($('#filter'))$('#filter').onchange=e=>{filter=e.target.value;render()};
 if($('#company'))$('#company').onsubmit=async e=>{e.preventDefault();await change(()=>db.company=Object.fromEntries(new FormData(e.target)));alert('Configuración guardada.')};
}
async function change(fn){const before=structuredClone(db);try{fn();await persist();render()}catch(err){db=before;throw err}}

function modal(title,html,submit){
 const dlg=$('dialog');$('#editor h2').textContent=title;$('#fields').innerHTML=html;$('#feedback').textContent='';$('#save').hidden=!submit;$('#cancel').textContent=submit?'Cancelar':'Cerrar';
 $('#editor').onsubmit=async e=>{e.preventDefault();if(!submit)return;const values=Object.fromEntries(new FormData(e.target));$('#save').disabled=true;
 try{await change(()=>submit(values));dlg.close()}catch(err){$('#feedback').textContent=err.message}finally{$('#save').disabled=false}};
 dlg.showModal();
}
$('#cancel').onclick=()=>$('dialog').close();
$('#content').onclick=e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const {action,id}=b.dataset;
 if(action==='client'){
 const c=db.clients.find(x=>x.id===id)||{};
 modal(id?'Editar cliente':'Nuevo cliente',field('name','Nombre',c.name)+field('doc','Documento',c.doc,'text','')+field('email','Correo',c.email,'email','')+field('phone','Teléfono',c.phone,'tel','')+field('address','Dirección',c.address,'text',''),v=>{if(!id)db.clients.push(c);Object.assign(c,v,{id:id||next(db.clients.filter(x=>x!==c),'CLI'),date:c.date||today()})});
 }else if(action==='product'){
 const p=db.products.find(x=>x.id===id)||{};
 modal(id?'Editar producto y existencia':'Nuevo producto',field('name','Producto',p.name)+field('category','Categoría',p.category)+field('price','Precio (DOP)',p.price,'number','required min=".01" step=".01"')+field('stock','Existencia',p.stock??0,'number','required min="0" step="1"'),v=>{if(!id)db.products.push(p);Object.assign(p,v,{price:Number(v.price),stock:Number(v.stock),id:id||next(db.products.filter(x=>x!==p),'PRO')})});
 }else if(action==='order'){
 const available=db.products.filter(p=>p.stock>0);
 if(!db.clients.length||!available.length)return modal('Nuevo pedido','<p>Registra un cliente y asigna existencias a por lo menos un producto para crear un pedido.</p>');
 modal('Nuevo pedido',choice('client','Cliente',db.clients.map(c=>[c.id,c.name]))+choice('product','Producto',available.map(p=>[p.id,p.name+' · '+money(p.price)]))+field('qty','Cantidad',1,'number','required min="1" step="1"'),v=>{
 const p=db.products.find(x=>x.id===v.product),qty=Number(v.qty);
 if(!Number.isSafeInteger(qty)||qty<1||qty>p.stock)throw Error('La cantidad supera las existencias disponibles.');
 const subtotal=Math.round(p.price*100)*qty,tax=Number(db.company.tax);
 db.orders.push({id:next(db.orders,'PED'),client:db.clients.find(c=>c.id===v.client).name,product:p.name,qty,date:today(),subtotal,tax,total:subtotal+Math.round(subtotal*tax/100)});p.stock-=qty});
 }else if(action==='invoice'){
 const o=db.orders.find(x=>x.id===id);modal('Emitir factura','<p>'+esc(o.client)+' · '+money(o.total/100)+'</p>',()=>{o.invoice=next(db.orders.filter(x=>x.invoice).map(x=>({id:x.invoice})),'FAC');o.issued=today();o.company={...db.company}});
 }else if(action==='view'){
 const o=db.orders.find(x=>x.id===id);modal(o.invoice,'<h3>'+esc(o.company.name)+'</h3><p>'+[0,1,2,3].map(i=>esc(o.company['info'+i])).filter(Boolean).join(' · ')+'</p><p>'+esc(o.client)+' · '+o.issued+'</p><p>'+o.qty+' × '+esc(o.product)+'</p><p>Subtotal '+money(o.subtotal/100)+'<br>IVA ('+o.tax+'%) '+money((o.total-o.subtotal)/100)+'<br>Total '+money(o.total/100)+'<br>Saldo '+money(balance(o)/100)+'</p>'+esc(o.company.note));
 }else if(action==='payment'){
 const pending=db.orders.filter(o=>o.invoice&&balance(o)>0);if(!pending.length)return modal('Registrar pago','<p>No hay facturas con saldo pendiente.</p>');
 modal('Registrar pago',choice('invoice','Factura',pending.map(o=>[o.invoice,o.invoice+' · '+o.client+' · '+money(balance(o)/100)]))+choice('method','Método',['Efectivo','Tarjeta','Transferencia'].map(x=>[x,x]))+field('amount','Monto (DOP)','','number','required min=".01" step=".01"')+field('ref','Referencia','','text',''),v=>{
 const cents=Math.round(Number(v.amount)*100);if(cents<=0||cents>balance(pending.find(o=>o.invoice===v.invoice)))throw Error('Ingresa un monto dentro del saldo pendiente.');
 db.payments.push({id:next(db.payments,'PAG'),invoice:v.invoice,method:v.method,ref:v.ref,cents,date:today()})});
 }else{
 const list={deletePayment:'payments',deleteClient:'clients',deleteProduct:'products'}[action];
 if(list)modal('Eliminar registro','<p>¿Eliminar '+esc(id)+'?</p>',()=>{db[list]=db[list].filter(x=>x.id!==id)});
 }
};
