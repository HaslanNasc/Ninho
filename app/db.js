// ============================================================
// NINHO — Camada de dados (Supabase real OU modo demonstração local)
// ============================================================
(function(){
  const cfg = window.NINHO_CONFIG || {};
  const hasSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  // login por telefone -> e-mail sintético interno (alternativa de baixo custo ao SMS)
  const phoneToEmail = p => 'u' + String(p||'').replace(/\D/g,'') + '@ninho.app';

  // ---------------- MODO SUPABASE ----------------
  function supaLayer(){
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    let hh = null; // household atual em cache
    return {
      mode:'supabase',
      async signUp({phone,password,display_name}){
        const email = phoneToEmail(phone);
        const {data,error} = await sb.auth.signUp({email,password,
          options:{data:{display_name,phone}}});
        if(error) throw error;
        return data.user;
      },
      async signIn({phone,password}){
        const {data,error} = await sb.auth.signInWithPassword({email:phoneToEmail(phone),password});
        if(error) throw error; return data.user;
      },
      async signOut(){ await sb.auth.signOut(); hh=null; },
      async currentUser(){ const {data} = await sb.auth.getUser(); return data.user||null; },
      onAuth(cb){ sb.auth.onAuthStateChange((_e,s)=>cb(s&&s.user||null)); },

      async myProfile(){
        const u = await this.currentUser(); if(!u) return null;
        let {data} = await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();
        if(!data){ await sb.from('profiles').insert({id:u.id,display_name:(u.user_metadata&&u.user_metadata.display_name)||'Usu\u00e1ria',phone:u.user_metadata&&u.user_metadata.phone});
          data=(await sb.from('profiles').select('*').eq('id',u.id).maybeSingle()).data; }
        return data;
      },
      async saveProfile(patch){ const u=await this.currentUser();
        const {error}=await sb.from('profiles').update(patch).eq('id',u.id); if(error) throw error; },

      async myHousehold(){
        if(hh) return hh;
        const u = await this.currentUser(); if(!u) return null;
        let {data:m} = await sb.from('household_members').select('household_id').eq('profile_id',u.id).limit(1);
        if(m&&m.length){ hh=(await sb.from('households').select('*').eq('id',m[0].household_id).maybeSingle()).data; return hh; }
        // cria household padr\u00e3o
        const {data:h,error} = await sb.from('households').insert({name:'Nosso Ninho',created_by:u.id}).select().single();
        if(error) throw error;
        await sb.from('household_members').insert({household_id:h.id,profile_id:u.id,role:'owner'});
        hh=h; return hh;
      },
      async members(){ const h=await this.myHousehold();
        const {data}=await sb.from('household_members').select('profile_id, role, profiles(display_name,username,avatar_url)').eq('household_id',h.id);
        return (data||[]).map(r=>({id:r.profile_id,role:r.role,...(r.profiles||{})})); },
      async createInvite(){ const h=await this.myHousehold(); const u=await this.currentUser();
        const code = Math.random().toString(36).slice(2,8).toUpperCase();
        await sb.from('household_invites').insert({household_id:h.id,code,created_by:u.id}); return code; },
      async joinInvite(code){ const u=await this.currentUser();
        const {data:inv}=await sb.from('household_invites').select('*').eq('code',code.toUpperCase()).maybeSingle();
        if(!inv) throw new Error('C\u00f3digo inv\u00e1lido ou expirado.');
        await sb.from('household_members').insert({household_id:inv.household_id,profile_id:u.id,role:'member'});
        await sb.from('household_invites').update({used_by:u.id}).eq('id',inv.id); hh=null; },

      async list(table,opts){ opts=opts||{};
        let q=sb.from(table).select('*');
        if(opts.eq) for(const k in opts.eq) q=q.eq(k,opts.eq[k]);
        if(opts.order) q=q.order(opts.order,{ascending:opts.asc!==false});
        const {data,error}=await q; if(error) throw error; return data||[]; },
      async insert(table,row){ const h=await this.myHousehold();
        if('household_id' in (row||{}) === false) row.household_id=h.id;
        const {data,error}=await sb.from(table).insert(row).select().single(); if(error) throw error; return data; },
      async update(table,id,patch){ const u=await this.currentUser(); patch.updated_at=new Date().toISOString(); patch.updated_by=u.id;
        const {data,error}=await sb.from(table).update(patch).eq('id',id).select().maybeSingle(); if(error) throw error; return data; },
      async remove(table,id){ const {error}=await sb.from(table).delete().eq('id',id); if(error) throw error; },
      subscribe(cb){ const ch=sb.channel('ninho-sync');
        ['accounts','debts','goals','payments','inventory_items','reforms','reform_items','events','pets','pet_care','purchases']
          .forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},()=>cb(t)));
        ch.subscribe(); return ()=>sb.removeChannel(ch); },
      async upload(file){ const u=await this.currentUser();
        const path=u.id+'/'+Date.now()+'_'+file.name.replace(/[^\w.\-]/g,'_');
        const {error}=await sb.storage.from('ninho').upload(path,file,{upsert:true}); if(error) throw error;
        const {data}=sb.storage.from('ninho').createSignedUrl?await sb.storage.from('ninho').createSignedUrl(path,60*60*24*365):{data:null};
        return (data&&data.signedUrl)|| (await sb.storage.from('ninho').getPublicUrl(path)).data.publicUrl; }
    };
  }

  // ---------------- MODO DEMONSTRAÇÃO (localStorage) ----------------
  function demoLayer(){
    const K='ninho_demo';
    const load=()=>JSON.parse(localStorage.getItem(K)||'{}');
    const save=s=>localStorage.setItem(K,JSON.stringify(s));
    let st=load();
    st.users=st.users||{}; st.session=st.session||null; st.hh=st.hh||{id:'hh-demo',name:'Nosso Ninho'};
    st.members=st.members||{}; st.tables=st.tables||{};
    const uid=()=>'id-'+Math.random().toString(36).slice(2,10);
    const persist=()=>save(st);
    const listeners=[];
    const fire=t=>listeners.forEach(cb=>cb(t));
    return {
      mode:'demo',
      async signUp({phone,password,display_name}){ const key=String(phone).replace(/\D/g,'');
        if(st.users[key]) throw new Error('J\u00e1 existe conta com esse telefone.');
        const id=uid(); st.users[key]={id,password,phone,display_name};
        st.members[id]={id,display_name,username:'',avatar_url:'',role:Object.keys(st.members).length?'member':'owner'};
        st.session=id; persist(); return {id}; },
      async signIn({phone,password}){ const key=String(phone).replace(/\D/g,''); const u=st.users[key];
        if(!u||u.password!==password) throw new Error('Telefone ou senha incorretos.');
        st.session=u.id; persist(); return {id:u.id}; },
      async signOut(){ st.session=null; persist(); },
      async currentUser(){ return st.session?{id:st.session}:null; },
      onAuth(){},
      async myProfile(){ return st.session?st.members[st.session]:null; },
      async saveProfile(patch){ Object.assign(st.members[st.session],patch); persist(); },
      async myHousehold(){ return st.hh; },
      async members(){ return Object.values(st.members); },
      async createInvite(){ return 'DEMO01'; },
      async joinInvite(){ throw new Error('Convites s\u00f3 funcionam com o Supabase configurado.'); },
      async list(table,opts){ opts=opts||{}; let rows=(st.tables[table]||[]).slice();
        if(opts.eq) for(const k in opts.eq) rows=rows.filter(r=>r[k]===opts.eq[k]);
        if(opts.order) rows.sort((a,b)=>{const x=a[opts.order],y=b[opts.order];return (opts.asc!==false?1:-1)*((x>y)-(x<y));});
        return rows; },
      async insert(table,row){ row=Object.assign({id:uid(),owner_id:st.session,household_id:st.hh.id,created_by:st.session,created_at:new Date().toISOString()},row);
        (st.tables[table]=st.tables[table]||[]).push(row); persist(); fire(table); return row; },
      async update(table,id,patch){ const r=(st.tables[table]||[]).find(x=>x.id===id); if(r){Object.assign(r,patch,{updated_at:new Date().toISOString(),updated_by:st.session});} persist(); fire(table); return r; },
      async remove(table,id){ st.tables[table]=(st.tables[table]||[]).filter(x=>x.id!==id); persist(); fire(table); },
      subscribe(cb){ listeners.push(cb); return ()=>{}; },
      async upload(file){ return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(file);}); }
    };
  }

  window.DB = hasSupabase ? supaLayer() : demoLayer();
  window.DB.hasSupabase = hasSupabase;
})();
