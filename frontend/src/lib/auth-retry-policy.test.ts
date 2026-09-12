import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAttemptRefresh } from './auth-retry-policy.ts';

test('refreshes an expired access-token request once',()=>assert.equal(shouldAttemptRefresh(401,'/posts',false),true));
test('does not refresh an unauthorized login request',()=>assert.equal(shouldAttemptRefresh(401,'/auth/login',false),false));
test('does not loop after a failed retry',()=>assert.equal(shouldAttemptRefresh(401,'/posts',true),false));
