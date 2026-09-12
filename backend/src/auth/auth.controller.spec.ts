import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController cookie sessions',()=>{
  const tokens={user:{id:'u'},accessToken:'access.jwt',refreshToken:'refresh.jwt'};
  const setup=()=>{const auth:any={login:jest.fn().mockResolvedValue(tokens),register:jest.fn().mockResolvedValue(tokens),refresh:jest.fn().mockResolvedValue(tokens),logoutByRefreshToken:jest.fn().mockResolvedValue({success:true})};const config:any={get:jest.fn((key:string)=>key==='app.env'?'production':undefined)};const controller=new AuthController(auth,config);const response:any={cookie:jest.fn(),clearCookie:jest.fn()};return{controller,auth,response};};
  it('login sets HttpOnly Secure SameSite cookies and does not return tokens',async()=>{const{controller,response}=setup();const result=await controller.login({email:'user@example.com',password:'password'} as any,response);expect(result).toEqual({user:tokens.user});expect(response.cookie).toHaveBeenCalledWith('refresh_token','refresh.jwt',expect.objectContaining({httpOnly:true,secure:true,sameSite:'lax'}));});
  it('refresh reads the HttpOnly cookie and rotates both cookies',async()=>{const{controller,auth,response}=setup();await controller.refresh({headers:{cookie:'refresh_token=old.jwt'}} as any,response);expect(auth.refresh).toHaveBeenCalledWith('old.jwt');expect(response.cookie).toHaveBeenCalledTimes(2);});
  it('rejects refresh without a cookie',async()=>{const{controller,response}=setup();await expect(controller.refresh({headers:{}} as any,response)).rejects.toBeInstanceOf(UnauthorizedException);});
  it('logout revokes the cookie session and clears cookies',async()=>{const{controller,auth,response}=setup();await controller.logout({headers:{cookie:'refresh_token=old.jwt'}} as any,response);expect(auth.logoutByRefreshToken).toHaveBeenCalledWith('old.jwt');expect(response.clearCookie).toHaveBeenCalledTimes(2);});
});
