"""Run only against the disposable local PostgreSQL cluster, never production."""
import subprocess
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import json
BASE=['psql','-h','/tmp','-p','55439','-d','agrofarm_default_grants_test','-v','ON_ERROR_STOP=1','-At']
def sql(statement): return subprocess.run(BASE+['-c',statement],capture_output=True,text=True)
b,p,q=map(lambda _:str(uuid4()),range(3))
r=sql(f"INSERT INTO farm_batches(id,batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('{b}','TEST competing allocations','Broiler',200,200,current_date); INSERT INTO farm_partners(id,full_name,phone,username,passcode_hash) VALUES('{p}','TEST A','08000000000','qa-{p}','not-a-login'),('{q}','TEST B','08000000000','qa-{q}','not-a-login');")
assert r.returncode==0,r.stderr
def attempt(partner):
    allocation=json.dumps([{'partnerId':partner,'birds':150,'profitSharePercentage':70,'lossSharePercentage':100}])
    return sql(f"BEGIN; SELECT allocate_batch_investors('{b}',7000,'{allocation}',0); SELECT pg_sleep(0.2); COMMIT;")
with ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(attempt,[p,q]))
assert sum(r.returncode==0 for r in results)==1,'Only one competing roster may be accepted'
r=sql(f"SELECT sum(birds),count(*) FROM batch_bird_allocations WHERE batch_id='{b}'")
assert r.stdout.strip()=='150|1',r.stdout
print('Concurrent allocation saves: one accepted, stale competitor rejected, capacity preserved')
