import { beforeEach, describe, expect, it, vi } from 'vitest';
const { insert }=vi.hoisted(()=>({insert:vi.fn()}));
vi.mock('../src/platform/supabase',()=>({getSupabase:()=>({from:()=>({insert})})}));
import { sendFeedback } from '../src/platform/feedback';

beforeEach(()=>insert.mockReset());
describe('feedback snapshot transport',()=>{
  it('preserves the report when an older database explicitly rejects the larger context',async()=>{
    insert.mockResolvedValueOnce({error:{code:'42501',message:'Legacy context policy'}}).mockResolvedValueOnce({error:null});
    await sendFeedback('bug','Range issue',{version:'0.4.2',characterId:'test',snapshot:{log:['Last action']}});
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0]).toMatchObject({message:'Range issue',context:{version:'0.4.2',characterId:'test'}});
    expect(insert.mock.calls[1][0].context.snapshot).toBeUndefined();
  });
  it('does not retry an ambiguous network failure and risk duplicating the report',async()=>{
    insert.mockResolvedValueOnce({error:{message:'Network unavailable'}});
    await expect(sendFeedback('bug','Report',{version:'0.4.2',snapshot:{log:[]}})).rejects.toMatchObject({message:'Network unavailable'});
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
