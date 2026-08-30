/* Havenly data helpers. Supabase is the source of truth for signed-in user activity. */
window.havenlyDataReady=(async()=>{
  const client=await window.havenlySupabaseReady;
  return client||null;
})();

window.havenlyData={
  async client(){return window.havenlyDataReady},
  async user(){const c=await window.havenlyDataReady;if(!c)return null;const {data}=await c.auth.getUser();return data?.user||null},
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
  async myViewings(){const c=await window.havenlyDataReady,u=c?await this.user():null;if(!c||!u)return null;const {data,error}=await c.from('viewing_requests').select('*').eq('buyer_id',u.id).order('created_at',{ascending:false});if(error)throw error;return data||[]}
};
