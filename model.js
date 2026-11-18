'use strict';
(function(root) {
  const KEY = 'fitd.animals.demo.v2';
  const eligible = {adult:'yes', student:'yes', chinese:'yes', independent:'yes', prior:'no', designer:'no', hypothesis:'no', comfortable:'yes'};
  function analysisFields(record) {
    const included = record.status === 'completed' ? 1 : 0;
    const reason = {technical_missing:'technical_problem', incomplete:'incomplete', active:'unconfirmed'};
    return {
      include_in_analysis: record.include_in_analysis ?? included,
      exclusion_reason: record.exclusion_reason ?? reason[record.status] ?? ''
    };
  }
  class Store {
    constructor(storage, config, clock=Date.now, id=()=>crypto.randomUUID()) { Object.assign(this,{storage,config,clock,id}); }
    read() { const raw=this.storage.getItem(KEY); const d=raw ? JSON.parse(raw) : {schema:2,current:null,records:[]}; if(d.schema!==2 || !Array.isArray(d.records)) throw Error('本地数据格式无法读取，请先备份，勿清除浏览器数据。'); return d; }
    write(d) { this.storage.setItem(KEY, JSON.stringify(d)); }
    event(p,name,detail={}, at=this.clock()) { p.events.push({id:this.id(),name,detail,stage:p.stage,at:new Date(at).toISOString(),dwell_ms:Math.max(0,at-p.stageAt),condition:p.condition,channel:p.channel,version:p.version}); }
    expire(d) { let changed=false; for(const p of d.records) if(p.status==='active' && this.clock()-p.lastInteraction>=this.config.timeoutMs) { const at=p.lastInteraction+this.config.timeoutMs; this.event(p,'inactivity_timeout',{},at); p.status='incomplete'; p.endedAt=at; p.stage='debrief'; p.stageAt=at; changed=true; } if(changed)this.write(d); return d; }
    load() { return this.expire(this.read()); }
    current(d=this.load()) { return d.records.find(p=>p.id===d.current); }
    enroll(answers, mode, channel, consentAt, entryAt, deferred=false) {
      const d=this.load(); if(this.current(d))return this.current(d);
      if(!deferred&&!this.isEligible(answers))return null;
      if(!['random','fitd','control'].includes(mode)) throw Error('无效的演示路径');
      const t=this.clock(); const condition=mode==='random' ? (crypto.getRandomValues(new Uint32Array(1))[0]<2147483648?'fitd':'control') : mode;
      const screening=deferred?null:{...eligible};
      const p={id:this.id(),mode:'demo',version:this.config.version,condition,assignment:mode,channel:this.config.channels.includes(channel)?channel:'direct',consentAt,entryAt,screening,stage:'home',createdAt:t,stageAt:t,lastInteraction:t,status:'active',endedAt:null,missingReason:'',support:false,events:[]};
      this.event(p,'enrolled',{screening,consent_at:consentAt}); d.records.push(p); d.current=p.id; this.write(d); return p;
    }
    isEligible(answers){return !!answers&&Object.keys(eligible).every(k=>answers[k]===eligible[k]);}
    confirmEligibility(answers){const d=this.load(),p=this.current(d);if(!p||p.stage!=='debrief'||!this.isEligible(answers))return false;p.screening={...eligible};this.event(p,'eligibility_confirmed',{screening:p.screening});this.write(d);return true;}
    act(action, expected, detail={}) {
      const d=this.load(), p=this.current(d); if(!p || p.stage!==expected || p.status!=='active')return false;
      let next=p.stage;
      if(action==='continue' && p.stage==='home') { this.event(p,'introduction_continue'); next=p.condition==='fitd'?'petition':'request'; }
      else if(action==='sign' && p.stage==='petition') { this.event(p,'petition_submitted',{support:true}); p.support=true; next='request'; }
      else if(action==='options' && p.stage==='request') { this.event(p,'donation_options_opened'); next='options'; }
      else if(action==='support' && p.stage==='petition') { p.support=detail.support===true; this.event(p,'support_changed',{support:p.support}); }
      else if(action==='outbound' && p.stage==='options' && this.config.charities.some(c=>c.id===detail.charity)) { this.event(p,'charity_outbound_clicked',{charity:detail.charity}); }
      else if(action==='finish') { this.event(p, {home:'introduction_declined',petition:'petition_declined',request:'donation_information_declined',options:'finished'}[p.stage]); next='debrief'; p.status='completed'; p.endedAt=this.clock(); }
      else if(action==='technical') { this.event(p,'technical_problem_reported'); next='debrief'; p.status='technical_missing'; p.missingReason='participant_reported'; p.endedAt=this.clock(); }
      else if(action==='visible') { this.event(p,'page_visible'); this.write(d); return true; }
      else return false;
      p.lastInteraction=this.clock(); if(next!==p.stage) {p.stage=next;p.stageAt=this.clock();} this.write(d); return true;
    }
    summary(p) {
      const names=new Set(p.events.map(e=>e.name));
      const metric=k=>p.summaryOnly||p.status==='technical_missing'?null:Number(names.has(k));
      const timestamp=t=>t==null?'':new Date(t).toISOString();
      return {id:p.id,mode:p.mode,version:p.version,condition:p.condition,assignment:p.assignment,channel:p.channel,status:p.status,stage:p.stage,created_at:timestamp(p.createdAt),consent_at:p.consentAt,entry_at:p.entryAt,last_interaction:timestamp(p.lastInteraction),ended_at:timestamp(p.endedAt),screening:p.screening?JSON.stringify(p.screening):'',petition_submitted:metric('petition_submitted'),donation_options_opened:metric('donation_options_opened'),charity_outbound_clicked:metric('charity_outbound_clicked'),missing_reason:p.missingReason,...analysisFields(p)};
    }
    resume(id) { const d=this.load(); if(!d.records.some(p=>p.id===id&&!p.summaryOnly))return false; d.current=id;this.write(d);return true; }
    reset() { const d=this.load(),p=this.current(d); if(p?.status==='active') { this.event(p,'demo_restart');p.status='incomplete';p.endedAt=this.clock();p.stage='debrief'; } d.current=null;this.write(d); }
    withdraw(id) { const d=this.read();d.records=d.records.filter(p=>p.id!==id);if(d.current===id)d.current=null;this.write(d); }
  }
  // The initial 0 row survives a refresh or close; the detailed draft stays in memory.
  class ConsentStorage {
    constructor(storage,key='fitd.animals.demo.v3'){this.storage=storage;this.key=key;this.pending=false;this.memory=null;}
    readSaved() {
      const raw=this.storage.getItem(this.key);
      const saved=raw?JSON.parse(raw):{schema:2,current:null,records:[]};
      if(saved.schema!==2||!Array.isArray(saved.records))throw Error('本地数据格式无法读取。');
      saved.records=saved.records.map(record=>({...record,...analysisFields(record)}));
      return saved;
    }
    getItem(){return this.pending?this.memory:JSON.stringify(this.readSaved());}
    setItem(key,value){if(this.pending)this.memory=value;else this.storage.setItem(this.key,value);}
    begin(){this.pending=true;this.memory=JSON.stringify({schema:2,current:null,records:[]});}
    upsert(record,activate=false) {
      const saved=this.readSaved();
      const index=saved.records.findIndex(item=>item.id===record.id);
      if(index===-1)saved.records.push(record);
      else saved.records[index]=record;
      if(activate)saved.current=record.id;
      this.storage.setItem(this.key,JSON.stringify(saved));
    }
    markExcluded(reason) {
      if(!this.pending)throw Error('没有待确认的数据');
      const {records:[record]}=JSON.parse(this.memory);
      if(!record)throw Error('没有待确认的体验');
      const {id,mode,version,condition,assignment,channel,createdAt}=record;
      this.upsert({id,mode,version,condition,assignment,channel,createdAt,status:'excluded',events:[],summaryOnly:true,include_in_analysis:0,exclusion_reason:reason});
    }
    accept() {
      if(!this.pending)throw Error('没有待确认的数据');
      const {records:[record]}=JSON.parse(this.memory);
      if(record?.stage!=='debrief'||record.dataConsent!=='accepted'||!record.screening)throw Error('请先确认参与条件及数据用途。');
      this.upsert({...record,...analysisFields(record)},true);
      this.cancelDraft();
    }
    decline(reason='declined') {
      this.markExcluded(reason);
      this.cancelDraft();
    }
    cancelDraft(){this.pending=false;this.memory=null;}
  }
  root.FitdModel={Store,KEY,eligible,ConsentStorage};
  if(typeof module!=='undefined')module.exports=root.FitdModel;
})(typeof window!=='undefined'?window:globalThis);
