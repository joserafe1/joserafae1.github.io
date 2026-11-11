import {access,current,updateProfile,placeOrder,register,recover,resend,logout,watchSession} from './cuentas.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'RD$ '+v.toLocaleString('es-DO');
const cartKey='nn.cart.items';
function cart(){return JSON.parse(localStorage.getItem(cartKey)||'[]')}
const total=items=>items.reduce((v,p)=>v+p.price*p.qty,0);
const count=items=>items.reduce((v,p)=>v+p.qty,0);
function dialog(cls,label){
 const d=document.createElement('dialog');d.className='nn-dialog '+cls;d.setAttribute('aria-label',label);document.body.append(d);
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
 return d;
}
const drawer=dialog('nn-drawer','Carrito'),account=dialog('nn-account','Mi cuenta');
const close='<button class="nn-close" type="button" data-close aria-label="Cerrar">×</button>';
const empty='<p class="nn-empty">Tu carrito está vacío.</p><a href="camisetas.html">Explorar camisetas →</a>';
function lines(items){return items.map((p,i)=>`<article class="nn-line"><img src="${esc(p.img)}" alt=""><div><strong>${esc(p.name)}</strong><p>${money(p.price)} · Talla ${esc(p.size)}</p><div class="nn-qty"><button data-change="-1" data-index="${i}" aria-label="Restar una unidad">−</button><b>${p.qty}</b><button data-change="1" data-index="${i}" aria-label="Sumar una unidad">+</button><button data-change="0" data-index="${i}" aria-label="Eliminar producto">Quitar</button></div></div></article>`).join('')}
function refresh(){
 const items=cart(),n=count(items),list=items.length?lines(items):empty;
 for(const id of ['#navCartCount','#cartCount'])if($(id))$(id).textContent=n;
 $('#cartIcon')?.setAttribute('aria-label','Abrir carrito, '+n+' unidades');
 drawer.innerHTML=`<div class="nn-drawer-content"><header><h2>Carrito <sup>${n}</sup></h2>${close}</header><section>${list}</section><footer><a href="politicas.html">Envíos y devoluciones ↗</a>${n?`<a class="nn-primary" href="checkout.html">Finalizar pedido <b>${money(total(items))}</b></a>`:''}</footer></div>`;
 if($('#orderSummary'))$('#orderSummary').innerHTML=list+(n?'<div class="nn-total">Total <b>'+money(total(items))+'</b></div>':'');
 if($('#checkoutForm'))$('#checkoutForm button[type=submit]').disabled=!n;
}
function save(items){localStorage.setItem(cartKey,JSON.stringify(items));refresh()}
function changeItem(e){
 const b=e.target.closest('[data-change]');if(!b)return;
 const items=cart(),i=Number(b.dataset.index),change=Number(b.dataset.change);if(!items[i])return;
 if(!change||items[i].qty+change<1)items.splice(i,1);else items[i].qty+=change;
 save(items);
}
drawer.onclick=e=>{if(e.target.closest('[data-close]'))drawer.close();else changeItem(e)};
$('#orderSummary')?.addEventListener('click',changeItem);
$('#cartIcon')?.addEventListener('click',e=>{e.preventDefault();refresh();drawer.showModal()});
let selected;
$('#modalProducto')?.addEventListener('show.bs.modal',e=>{const d=e.relatedTarget.dataset;selected={name:d.producto,img:d.img,price:Number(d.precio.replace(/[^0-9.]/g,''))};$('#nn-size').value='M'});
$('#addToCartBtn')?.insertAdjacentHTML('beforebegin','<label class="nn-size">Talla <select id="nn-size"><option>XS</option><option>S</option><option selected>M</option><option>L</option><option>XL</option></select></label>');
$('#addToCartBtn')?.addEventListener('click',()=>{
 if(!selected)return;const size=$('#nn-size').value,items=cart(),p=items.find(x=>x.img===selected.img&&x.size===size);
 if(p)p.qty++;else items.push({...selected,size,qty:1});save(items);
 const modal=$('#modalProducto');modal.addEventListener('hidden.bs.modal',()=>drawer.showModal(),{once:true});bootstrap.Modal.getInstance(modal).hide();
});
window.addEventListener('storage',e=>{if(e.key===cartKey)refresh()});window.addEventListener('pageshow',refresh);refresh();
const sections={'Panel':'speedometer2','Mis pedidos':'box-seam','Mi información':'pencil-square','Notificaciones':'bell','Lista de notificaciones':'list-stars','Tarjetas de regalo':'gift'};
let profile=null,destination='Panel',emailDraft='';
try { profile=await current(); } catch { /* El formulario muestra los errores del servicio. */ }
function accountLabel() {
 const button=$('#profileIcon');
 button.setAttribute('aria-label',profile?'Mi cuenta':'Iniciar sesión');
 button.innerHTML='<i class="bi bi-person-circle" aria-hidden="true"></i> <span>'+(profile?'Mi cuenta':'Iniciar sesión')+'</span>';
}
accountLabel();
watchSession(async()=>{
 try {
  profile=await current();
  accountLabel();
  if(!profile && account.open)auth();
 } catch { /* Conserva el mensaje del formulario ante errores de red. */ }
}).catch(()=>{});
function display(html,menu=false){
 account.classList.toggle('nn-menu',menu);account.innerHTML=close+html;
 if(!account.open)account.showModal();
}
const brand='<div class="nn-brand">NO<span>·</span>NAME</div>';
function menu(){
 display((profile?'<h2>'+esc(profile.name)+'</h2><p>'+esc(profile.email)+'</p>':'<h2>Inicia sesión o regístrate</h2><form id="nn-email"><label>Correo electrónico<input required type="email" name="email" autocomplete="email"></label><button class="nn-primary">Continuar</button></form><button data-mode="register">Registrarse</button>')+'<div class="nn-options">'+Object.entries(sections).map(([s,i])=>'<button data-page="'+s+'"><i class="bi bi-'+i+'"></i>'+s+'</button>').join('')+'</div>'+(profile?'<button data-exit>Cerrar sesión</button>':''),true);
}
function auth(isRegistration=false){
 const fields=isRegistration
  ? '<label>Nombre<input name="name" required maxlength="80" autocomplete="given-name"></label><label>Apellido<input name="lastName" required maxlength="80" autocomplete="family-name"></label><label>Teléfono (opcional)<input name="phone" type="tel" maxlength="40" autocomplete="tel"></label>'
  : '';
 const confirm=isRegistration?'<label>Confirmar contraseña<input type="password" name="confirm" required autocomplete="new-password"></label>':'';
 display(brand+'<h2>'+(isRegistration?'Crea tu cuenta':'Iniciar sesión')+'</h2><form id="nn-auth" data-register="'+isRegistration+'">'+fields+
  '<label>Correo electrónico<input type="email" name="email" required autocomplete="username" value="'+esc(emailDraft)+'"></label>'+
  '<label>Contraseña<input type="password" name="password" required '+(isRegistration?'minlength="8" autocomplete="new-password"':'autocomplete="current-password"')+'></label>'+
  (isRegistration?'<small>Mínimo 8 caracteres, una letra y un número.</small>':'')+confirm+
  '<p role="alert"></p><button class="nn-primary">'+(isRegistration?'Crear cuenta':'Entrar')+'</button></form>'+
  (isRegistration?'':'<button data-recover>¿Olvidaste tu contraseña?</button><br>')+
  '<button data-mode="'+(isRegistration?'login':'register')+'">'+(isRegistration?'Ya tengo cuenta':'Registrarse')+'</button>'+
  '<p class="nn-note">Tu información se guarda de forma segura en tu cuenta de NO NAME. <a href="politicas.html">Política de privacidad</a></p>');
}
function emailForm(){
 display(brand+'<h2>Recuperar contraseña</h2><form id="nn-recover"><label>Correo electrónico<input type="email" name="email" required value="'+esc(emailDraft)+'"></label><p role="alert"></p><button class="nn-primary">Enviar enlace</button></form><button data-mode="login">Volver a iniciar sesión</button>');
}
function verification(){
 display(brand+'<h2>Confirma tu correo</h2><p>Revisa tu bandeja de entrada y abre el enlace de NO NAME para verificar tu cuenta. Revisa también la carpeta de spam.</p><form id="nn-resend"><input type="hidden" name="email" value="'+esc(emailDraft)+'"><p role="alert"></p><button class="nn-primary">Reenviar correo</button></form><button data-mode="login">Iniciar sesión</button>');
}
function section(s){
 destination=s;if(!profile)return auth();let body='';
 if(s==='Panel')body='<h3>'+esc(profile.name)+'</h3><p>'+esc(profile.email)+'</p><button data-page="Mis pedidos">Ver mis pedidos ('+profile.orders.length+')</button>';
 if(s==='Mis pedidos')body=profile.orders.length?profile.orders.map(o=>'<article><strong>Pedido '+esc(o.id)+'</strong><p>'+esc(o.date)+' · '+money(o.total)+'</p>'+o.items.map(p=>esc(p.name)+' · '+esc(p.size)+' × '+p.qty).join('<br>')+'</article>').join(''):'<p>Aún no tienes pedidos.</p>';
 if(s==='Mi información')body='<form id="nn-info"><label>Nombre<input name="name" required maxlength="80" value="'+esc(profile.name)+'"></label><p>'+esc(profile.email)+'</p><button class="nn-primary">Guardar cambios</button></form>';
 if(s==='Notificaciones')body='<form id="nn-notify"><label><input name="enabled" type="checkbox" '+(profile.notify?'checked':'')+'> Guardar avisos de nuevos pedidos</label><button class="nn-primary">Guardar preferencia</button></form>';
 if(s==='Lista de notificaciones')body=profile.orders.filter(o=>o.notice).map(o=>'<p>Pedido '+esc(o.id)+' registrado el '+esc(o.date)+'.</p>').join('')||'<p>Sin avisos de pedidos.</p>';
 if(s==='Tarjetas de regalo')body='<p>No tienes tarjetas de regalo asignadas.</p>';
 display(brand+'<button data-menu>← Mi cuenta</button><h2>'+s+'</h2>'+body);
}
$('#profileIcon').onclick=async()=>{
 try{profile=await current();accountLabel();destination='Panel';if(profile)menu();else auth()}
 catch(err){auth();account.querySelector('[role=alert]').textContent=err.message}
};
account.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-close'))account.close();
 else if(b.dataset.mode){emailDraft=account.querySelector('[name=email]')?.value || emailDraft;auth(b.dataset.mode==='register')}
 else if(b.hasAttribute('data-recover')){emailDraft=account.querySelector('[name=email]')?.value || '';emailForm()}
 else if(b.hasAttribute('data-verify'))verification();
 else if(b.dataset.page)section(b.dataset.page);
 else if(b.hasAttribute('data-menu'))menu();
 else if(b.hasAttribute('data-exit')){try{await logout();profile=null;emailDraft='';accountLabel();auth()}catch(err){alert(err.message)}}
};
account.onsubmit=async e=>{
 e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f));
 if(f.id==='nn-email'){emailDraft=v.email;auth();return}
 const button=f.querySelector('button');button.disabled=true;
 try{
 if(f.id==='nn-auth'){
  emailDraft=v.email;
  if(f.dataset.register==='true'){await register(v);verification();return}
  profile=await access(v.email,v.password);
  if(profile?.rol==='admin'){location.assign('admin.html');return}
 }
 else if(f.id==='nn-recover'){
  await recover(v.email);
  f.querySelector('[role=alert]').textContent='Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.';
  return;
 }
 else if(f.id==='nn-resend'){
  await resend(v.email);
  f.querySelector('[role=alert]').textContent='Revisa tu bandeja de entrada para confirmar tu cuenta.';
  return;
 }
 else if(f.id==='nn-info')await updateProfile({nombre:v.name.trim()});
 else await updateProfile({notificaciones:!!v.enabled});
 profile=await current();accountLabel();section(f.id==='nn-auth'?destination:'Panel');
 }catch(err){const msg=f.querySelector('[role=alert]');if(msg){
 msg.textContent=err.message;
 if(err.message.includes('Confirma tu correo'))msg.insertAdjacentHTML('afterend','<button type="button" data-verify>Reenviar verificación</button>');
 }else alert(err.message)}finally{button.disabled=false}
};
if(location.hash==='#registro')auth(true);
if(location.hash==='#login')auth();
let pendingOrder=null;
$('#checkoutForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,items=cart();if(!items.length)return;
 if(!f.checkValidity()){f.classList.add('was-validated');f.reportValidity();return}
 const button=f.querySelector('[type=submit]');button.disabled=true;
 try{
  profile=await current();
  if(!profile){auth();button.disabled=false;return}
  const delivery=Object.fromEntries(["firstName","lastName","address","address2","country","province","zip","email"].map(id=>[id,document.getElementById(id).value]));
  const payload=JSON.stringify({items,delivery});
  if(pendingOrder?.payload!==payload)pendingOrder={id:crypto.randomUUID(),payload};
  await placeOrder(items,delivery,pendingOrder.id);
  pendingOrder=null;
  save([]);f.reset();f.classList.remove('was-validated');
  alert('Pedido guardado en tu cuenta. Puedes consultarlo en Mis pedidos.');
 }catch(err){alert(err.message);refresh()}
});
