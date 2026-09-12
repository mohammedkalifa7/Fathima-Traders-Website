const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'fathima.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, tamil_name TEXT, category TEXT,
 description TEXT, image TEXT, packaging TEXT, availability TEXT DEFAULT 'Contact for availability',
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS customers (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, phone TEXT NOT NULL,
 email TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS enquiries (
 id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
 customer_id INTEGER, name TEXT NOT NULL, company TEXT, phone TEXT NOT NULL, email TEXT,
 product TEXT NOT NULL, quantity TEXT, destination TEXT, delivery TEXT, message TEXT,
 status TEXT NOT NULL DEFAULT 'New',
 FOREIGN KEY(customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, enquiry_id INTEGER, customer_id INTEGER, product TEXT NOT NULL,
 quantity TEXT, price TEXT, destination TEXT, status TEXT NOT NULL DEFAULT 'New',
 notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
 FOREIGN KEY(enquiry_id) REFERENCES enquiries(id), FOREIGN KEY(customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS quotations (
 id INTEGER PRIMARY KEY AUTOINCREMENT, enquiry_id INTEGER, customer_id INTEGER, quote_no TEXT UNIQUE NOT NULL,
 product TEXT NOT NULL, quantity TEXT, price TEXT, packaging TEXT, delivery TEXT, validity TEXT,
 notes TEXT, status TEXT NOT NULL DEFAULT 'Draft', created_at TEXT NOT NULL DEFAULT (datetime('now')),
 FOREIGN KEY(enquiry_id) REFERENCES enquiries(id), FOREIGN KEY(customer_id) REFERENCES customers(id)
);
`);

const seed = [
['Groundnut','மணிலா / வேர்க்கடலை','Oilseeds','Groundnut commodities for wholesale and bulk requirements.','https://images.unsplash.com/photo-1549301014-15d797bdd0a2?auto=format&fit=crop&w=900&q=85','25 kg / 50 kg / Bulk'],
['Black Pepper','கருமிளகு','Spices','Black pepper for commercial and wholesale sourcing.','https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&w=900&q=85','As discussed'],
['Cardamom','ஏலக்காய்','Spices','Cardamom sourcing subject to grade and availability.','https://images.unsplash.com/photo-1642255486695-a52c59347cfa?auto=format&fit=crop&w=900&q=85','As discussed'],
['Dry Chilli','காய்ந்த மிளகாய்','Spices','Dry chilli for wholesale sourcing and trading.','https://images.unsplash.com/photo-1602237514002-c2d8ae2da393?auto=format&fit=crop&w=900&q=85','As discussed'],
['Black Gram','உளுந்து','Pulses','Black gram for bulk buyer requirements.','https://images.unsplash.com/photo-1763368392508-3d4bddfdd20a?auto=format&fit=crop&w=900&q=85','25 kg / 50 kg / Bulk'],
['Green Gram','பாசிப்பயறு','Pulses','Green gram subject to season and availability.','https://images.unsplash.com/photo-1577110563838-e408b455c91d?auto=format&fit=crop&w=900&q=85','25 kg / 50 kg / Bulk'],
['Sesame','எள்','Oilseeds','Sesame and oilseed sourcing for commercial buyers.','https://images.unsplash.com/photo-1778048840964-d221d23b86ee?auto=format&fit=crop&w=900&q=85','25 kg / 50 kg / Bulk'],
['Maize','மக்காச்சோளம்','Grains','Maize for wholesale and commercial requirements.','https://images.unsplash.com/photo-1770617475595-f80b09cbbecd?auto=format&fit=crop&w=900&q=85','Bulk']
];
if (db.prepare('SELECT COUNT(*) c FROM products').get().c === 0) {
 const st=db.prepare('INSERT INTO products(name,tamil_name,category,description,image,packaging) VALUES (?,?,?,?,?,?)');
 const tx=db.transaction(()=>seed.forEach(x=>st.run(...x))); tx();
}

const sessions = new Map();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Fathima@Admin2026';
const rate = new Map();
app.use(express.json({limit:'100kb'}));
app.use(express.urlencoded({extended:true}));
app.use((req,res,next)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','SAMEORIGIN');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 next();
});
function parseCookies(req){const out={};(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>-1)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1));});return out;}
function isAuthed(req){const t=parseCookies(req).admin_session,e=sessions.get(t);if(!t||!e||e<Date.now()){if(t)sessions.delete(t);return false;}return true;}
function requireAdmin(req,res,next){if(!isAuthed(req))return res.status(401).json({error:'Admin authentication required.'});next();}
function clean(v){return String(v??'').trim().slice(0,2000);}
function customerFor(data){
 let c=db.prepare('SELECT * FROM customers WHERE phone=?').get(data.phone);
 if(c){db.prepare('UPDATE customers SET name=?,company=?,email=? WHERE id=?').run(data.name,data.company,data.email,c.id);return c.id;}
 return db.prepare('INSERT INTO customers(name,company,phone,email) VALUES(?,?,?,?)').run(data.name,data.company,data.phone,data.email).lastInsertRowid;
}

app.post('/api/admin/login',(req,res)=>{
 const ip=req.ip||'local', now=Date.now(), arr=(rate.get(ip)||[]).filter(t=>now-t<10*60*1000);
 if(arr.length>=10)return res.status(429).json({error:'Too many login attempts. Try again later.'});
 arr.push(now);rate.set(ip,arr);
 if(String(req.body.password||'')!==ADMIN_PASSWORD)return res.status(401).json({error:'Incorrect admin password.'});
 const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*60*60*1000);
 res.setHeader('Set-Cookie',`admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
 res.json({ok:true});
});
app.post('/api/admin/logout',requireAdmin,(req,res)=>{sessions.delete(parseCookies(req).admin_session);res.setHeader('Set-Cookie','admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');res.json({ok:true});});
app.get('/api/admin/session',(req,res)=>res.json({authenticated:isAuthed(req)}));

app.get('/api/products',(req,res)=>res.json(db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all()));
app.get('/api/admin/products',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all()));
app.post('/api/admin/products',requireAdmin,(req,res)=>{
 const d={name:clean(req.body.name),tamil_name:clean(req.body.tamil_name),category:clean(req.body.category),description:clean(req.body.description),image:clean(req.body.image),packaging:clean(req.body.packaging),availability:clean(req.body.availability)||'Contact for availability'};
 if(!d.name)return res.status(400).json({error:'Product name is required.'});
 const id=db.prepare('INSERT INTO products(name,tamil_name,category,description,image,packaging,availability) VALUES(?,?,?,?,?,?,?)').run(...Object.values(d)).lastInsertRowid;
 res.status(201).json({ok:true,id});
});
app.patch('/api/admin/products/:id',requireAdmin,(req,res)=>{
 const fields=['name','tamil_name','category','description','image','packaging','availability','active'];
 const d=req.body; const set=fields.filter(k=>d[k]!==undefined); if(!set.length)return res.json({ok:true});
 const sql=`UPDATE products SET ${set.map(k=>`${k}=?`).join(',')} WHERE id=?`;
 const info=db.prepare(sql).run(...set.map(k=>k==='active'?Number(d[k]):clean(d[k])),req.params.id);res.json({ok:info.changes>0});
});
app.delete('/api/admin/products/:id',requireAdmin,(req,res)=>{const i=db.prepare('UPDATE products SET active=0 WHERE id=?').run(req.params.id);res.json({ok:i.changes>0});});

app.post('/api/enquiries',(req,res)=>{
 const data={name:clean(req.body.name),company:clean(req.body.company),phone:clean(req.body.phone),email:clean(req.body.email),product:clean(req.body.product),quantity:clean(req.body.quantity),destination:clean(req.body.destination),delivery:clean(req.body.delivery),message:clean(req.body.message)};
 if(!data.name||!data.phone||!data.product)return res.status(400).json({error:'Name, phone and product are required.'});
 const customer_id=customerFor(data);
 const id=db.prepare(`INSERT INTO enquiries(customer_id,name,company,phone,email,product,quantity,destination,delivery,message) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(customer_id,...Object.values(data)).lastInsertRowid;
 res.status(201).json({ok:true,enquiryId:id});
});
app.get('/api/admin/enquiries',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all()));
app.patch('/api/admin/enquiries/:id',requireAdmin,(req,res)=>{const a=['New','Contacted','Quoted','Won','Closed'];if(!a.includes(req.body.status))return res.status(400).json({error:'Invalid status.'});const i=db.prepare('UPDATE enquiries SET status=? WHERE id=?').run(req.body.status,req.params.id);res.json({ok:i.changes>0});});

app.get('/api/admin/customers',requireAdmin,(req,res)=>res.json(db.prepare(`SELECT c.*,COUNT(e.id) enquiries,MAX(e.created_at) last_enquiry FROM customers c LEFT JOIN enquiries e ON e.customer_id=c.id GROUP BY c.id ORDER BY c.id DESC`).all()));

app.get('/api/admin/orders',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC').all()));
app.post('/api/admin/orders',requireAdmin,(req,res)=>{const d=req.body;const i=db.prepare('INSERT INTO orders(enquiry_id,customer_id,product,quantity,price,destination,status,notes) VALUES(?,?,?,?,?,?,?,?)').run(d.enquiry_id||null,d.customer_id||null,clean(d.product),clean(d.quantity),clean(d.price),clean(d.destination),clean(d.status)||'New',clean(d.notes));res.status(201).json({ok:true,id:i.lastInsertRowid});});
app.patch('/api/admin/orders/:id',requireAdmin,(req,res)=>{const allowed=['New','Quoted','Order Confirmed','Payment Pending','Processing','Dispatched','Delivered','Cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid order status.'});const i=db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id);res.json({ok:i.changes>0});});

app.get('/api/admin/quotations',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM quotations ORDER BY id DESC').all()));
app.post('/api/admin/quotations',requireAdmin,(req,res)=>{
 const d=req.body, quoteNo='FT-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6);
 const i=db.prepare('INSERT INTO quotations(enquiry_id,customer_id,quote_no,product,quantity,price,packaging,delivery,validity,notes,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(d.enquiry_id||null,d.customer_id||null,quoteNo,clean(d.product),clean(d.quantity),clean(d.price),clean(d.packaging),clean(d.delivery),clean(d.validity),clean(d.notes),'Issued');
 res.status(201).json({ok:true,id:i.lastInsertRowid,quoteNo});
});

app.get('/admin',(req,res)=>{res.sendFile(path.join(ROOT,'public',isAuthed(req)?'admin.html':'admin-login.html'));});
app.use(express.static(path.join(ROOT,'public')));
app.listen(PORT,()=>console.log(`Fathima Traders server running on http://localhost:${PORT}`));
