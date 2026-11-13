"""Run only against the disposable local PostgreSQL test cluster."""
import subprocess,json
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
BASE=['psql','-h','/tmp','-p','55439','-d','agrofarm_default_grants_test','-v','ON_ERROR_STOP=1','-At']
def sql(s):return subprocess.run(BASE+['-c',s],capture_output=True,text=True)
for competitor in ['payout','signing','duplicate undo']:
 b,p,a=map(lambda _:str(uuid4()),range(3))
 seed=sql(f"INSERT INTO farm_batches(id,batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('{b}','TEST undo race','Broiler',200,200,current_date); INSERT INTO farm_partners(id,full_name,phone,username,passcode_hash,initial_investment) VALUES('{p}','TEST Investor','08000000000','qa-{p}','not-a-login',1000); SELECT allocate_batch_investors('{b}',7000,'[{{\"partnerId\":\"{p}\",\"birds\":50,\"profitSharePercentage\":70,\"lossSharePercentage\":100}}]',0);")
 assert seed.returncode==0,seed.stderr
 if competitor=='signing':
  r=sql(f"INSERT INTO official_agreements(id,partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES('{a}','{p}','Cycle 1','TEST','{{\"partnerName\":\"TEST Investor\",\"deal\":{{\"representative\":\"TEST Company\",\"witnessName\":\"TEST Witness\"}}}}',repeat('a',64),'test-owner');")
  assert r.returncode==0,r.stderr
 preview=sql(f"SELECT partner_undo_preview('{p}')");v=json.loads(preview.stdout)
 undo=f"SELECT undo_partner_allocation('{p}','{v['changeId']}',{v['allocationVersion']},{v['batchRevision']},NULL,'TEST race undo');"
 other=undo if competitor=='duplicate undo' else f"SELECT record_partner_payout('{p}',{v['allocationVersion']},'{{\"amount\":1,\"category\":\"Payout\",\"description\":\"TEST payout\",\"payment_method\":\"Cash\",\"transaction_date\":\"2026-11-13\"}}');" if competitor=='payout' else f"SELECT sign_official_agreement('{a}','company','TEST Company','TEST PNG',repeat('a',64),'TEST explicit consent');"
 def attempt(statement):return sql('BEGIN; '+statement+' SELECT pg_sleep(0.2); COMMIT;')
 with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(attempt,[undo,other]))
 assert sum(r.returncode==0 for r in results)==1,[(r.returncode,r.stderr) for r in results]
 print(f'Undo versus {competitor}: exactly one accepted; conflicting request rejected')
