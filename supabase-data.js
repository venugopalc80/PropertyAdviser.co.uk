/* Havenly data helpers. Supabase is the source of truth for signed-in user activity. */
window.havenlyDataReady=(async()=>{
  const client=await window.havenlySupabaseReady;
  return client||null;
})();

window.havenlyData={
  async client(){return window.havenlyDataReady},
  async user(){const c=await window.havenlyDataReady;if(!c)return null;const {data}=await c.auth.getUser();return data?.user||null},
  async profile(){const c=await window.havenlyDataReady,u=c?await this.user():null;if(!c||!u)return null;const {data,error}=await c.from('profiles').select('id,role,full_name').eq('id',u.id).maybeSingle();if(error)throw error;return data||null},
  async savedPropertyIds(){
    const c=await window.havenlyDataReady;if(!c)return null;
    const u=await this.user();if(!u)return null;
    const {data,error}=await c.from('saved_properties').select('property_id').eq('user_id',u.id);
    if(error)throw error;
    const dbIds=(data||[]).map(x=>x.property_id);
    return (window.HAVENLY_PROPERTIES||[]).filter(p=>dbIds.includes(p.dbId)).map(p=>p.id);
  },
  async saveProperty(property){
    const c=await window.havenlyDataReady;if(!c)return false;
    const u=await this.user();if(!u||!property?.dbId)return false;
    const {error}=await c.from('saved_properties').upsert({user_id:u.id,property_id:property.dbId},{onConflict:'user_id,property_id'});
    if(error)throw error;return true;
  },
  async unsaveProperty(property){
    const c=await window.havenlyDataReady;if(!c)return false;
    const u=await this.user();if(!u||!property?.dbId)return false;
    const {error}=await c.from('saved_properties').delete().eq('user_id',u.id).eq('property_id',property.dbId);
    if(error)throw error;return true;
  },
  async submitEnquiry(property,form,type){
    const c=await window.havenlyDataReady;
    const u=c?await this.user():null;
    if(!c||!u||!property?.dbId)return false;
    const payload={property_id:property.dbId,buyer_id:u.id,name:form.name,email:form.email,phone:form.phone,message:form.message,interest:form.interest,status:'new'};
    const {error}=await c.from('enquiries').insert(payload);
    if(error)throw error;return true;
  },
  async submitViewing(property,form){
    const c=await window.havenlyDataReady;
    const u=c?await this.user():null;
    if(!c||!u||!property?.dbId)return false;
    const payload={property_id:property.dbId,buyer_id:u.id,name:form.name,email:form.email,phone:form.phone,message:form.message,status:'requested'};
    const {error}=await c.from('viewing_requests').insert(payload);
    if(error)throw error;return true;
  },
  async myEnquiries(){const c=await window.havenlyDataReady,u=c?await this.user():null;if(!c||!u)return null;const {data,error}=await c.from('enquiries').select('*').eq('buyer_id',u.id).order('created_at',{ascending:false});if(error)throw error;return data||[]},
  async myViewings(){const c=await window.havenlyDataReady,u=c?await this.user():null;if(!c||!u)return null;const {data,error}=await c.from('viewing_requests').select('*').eq('buyer_id',u.id).order('created_at',{ascending:false});if(error)throw error;return data||[]},
  async agentPropertyIds(){
    const c=await window.havenlyDataReady,u=c?await this.user():null;
    if(!c||!u)return null;
    const profile=await this.profile();
    if(!profile||!['agent','admin'].includes(profile.role))return null;
    const {data,error}=await c.from('properties').select('id').eq('agent_id',u.id);
    if(error)throw error;
    return (data||[]).map(x=>x.id);
  },
  async agentProperties(){
    const c=await window.havenlyDataReady;
    const ids=await this.agentPropertyIds();
    if(!c||!ids?.length)return [];
    const {data,error}=await c.from('properties').select('*').in('id',ids).order('created_at',{ascending:false});
    if(error)throw error;return data||[];
  },
  async saveListingDraft(draft,id=null){
    const c=await window.havenlyDataReady,u=c?await this.user():null;
    if(!c||!u)return null;
    const profile=await this.profile();
    if(!profile||!['agent','admin'].includes(profile.role))return null;
    const payload={
      agent_id:u.id,title:draft.title,location:draft.location,price:Number(draft.price),bedrooms:Number(draft.bedrooms),bathrooms:Number(draft.bathrooms),
      floor_area_sqft:draft.floor_area_sqft?Number(draft.floor_area_sqft):null,property_type:draft.property_type,tenure:draft.tenure,
      epc_rating:draft.epc_rating||null,parking:draft.parking||null,description:draft.description||null,status:'draft',
      facts_confirmed:!!draft.facts_confirmed,material_info_confirmed:!!draft.material_info_confirmed
    };
    let result;
    if(id){
      result=await c.from('properties').update(payload).eq('id',id).eq('agent_id',u.id).eq('status','draft').select('id').maybeSingle();
    }else{
      result=await c.from('properties').insert(payload).select('id').single();
    }
    if(result.error)throw result.error;
    return result.data?.id||null;
  },
  async getListingDraft(id){
    const c=await window.havenlyDataReady,u=c?await this.user():null;
    if(!c||!u||!id)return null;
    const profile=await this.profile();
    if(!profile||!['agent','admin'].includes(profile.role))return null;
    const {data,error}=await c.from('properties').select('*').eq('id',id).eq('agent_id',u.id).eq('status','draft').maybeSingle();
    if(error)throw error;return data||null;
  },
  async agentEnquiries(){
    const c=await window.havenlyDataReady;if(!c)return null;
    const ids=await this.agentPropertyIds();
    if(!ids?.length)return [];
    const {data,error}=await c.from('enquiries').select('*').in('property_id',ids).order('created_at',{ascending:false});
    if(error)throw error;return data||[];
  },
  async agentViewings(){
    const c=await window.havenlyDataReady;if(!c)return null;
    const ids=await this.agentPropertyIds();
    if(!ids?.length)return [];
    const {data,error}=await c.from('viewing_requests').select('*').in('property_id',ids).order('created_at',{ascending:false});
    if(error)throw error;return data||[];
  }
};
