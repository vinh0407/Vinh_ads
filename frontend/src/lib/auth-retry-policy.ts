export function shouldAttemptRefresh(status:number|undefined,url:string|undefined,alreadyRetried:boolean){
  if(status!==401||alreadyRetried)return false;
  return !url?.includes('/auth/login')&&!url?.includes('/auth/register')&&!url?.includes('/auth/refresh');
}
