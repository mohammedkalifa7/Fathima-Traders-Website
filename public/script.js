const S=window.SITE;
function wa(message='Hello Fathima Traders, I would like to know more about your agricultural commodities.') { window.open(`https://wa.me/${S.whatsapp}?text=${encodeURIComponent(message)}`,'_blank'); }
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelectorAll('[data-phone]').forEach(e=>e.textContent=S.phone);
 document.querySelectorAll('[data-email]').forEach(e=>e.textContent=S.email);
 document.querySelectorAll('[data-wa]').forEach(e=>e.addEventListener('click',()=>wa(e.dataset.wa||undefined)));
 document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
 const form=document.querySelector('#quoteForm');
 if(form){form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Sending...';const data=Object.fromEntries(new FormData(form));try{const r=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error);document.querySelector('#success').style.display='block';document.querySelector('#success').textContent=`Thank you. Your enquiry #${j.enquiryId} has been received. We will contact you soon.`;form.reset();}catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent='Submit Enquiry';}})}
});
