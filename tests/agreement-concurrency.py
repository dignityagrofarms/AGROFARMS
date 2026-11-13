"""Agreement race test. Run ONLY on the disposable local PostgreSQL test cluster."""
import subprocess
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

BASE = ['psql', '-h', '/tmp', '-p', '55439', '-d', 'agrofarm_default_grants_test', '-v', 'ON_ERROR_STOP=1', '-At']
def sql(statement):
    return subprocess.run(BASE + ['-c', statement], capture_output=True, text=True)

partner, agreement = str(uuid4()), str(uuid4())
seed = sql(f"""INSERT INTO farm_partners(id,full_name,phone,username,passcode_hash) VALUES('{partner}','TEST race investor','08000000000','test-race-{partner}','not-a-login');
INSERT INTO official_agreements(id,partner_id,cycle_name,template_version,snapshot,content_hash,created_by) VALUES('{agreement}','{partner}','Cycle 1','TEST','{{"partnerName":"TEST Investor","deal":{{"representative":"TEST Company","witnessName":"TEST Witness"}}}}',repeat('a',64),'test-owner');
SELECT sign_official_agreement('{agreement}','company','TEST Company','test png',repeat('a',64),'Test explicit consent');
SELECT sign_official_agreement('{agreement}','partner','TEST Investor','test png',repeat('a',64),'Test explicit consent');
UPDATE official_agreements SET witness_token_hash=repeat('b',64),witness_expires_at=now()+interval '1 hour' WHERE id='{agreement}';""")
assert seed.returncode == 0, seed.stderr
# Retain test evidence in this isolated disposable cluster; production is never touched.
statement = f"BEGIN; SELECT sign_official_agreement('{agreement}','witness','TEST Witness','test png',repeat('a',64),'Test explicit consent',repeat('b',64)); SELECT pg_sleep(0.2); COMMIT;"
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(lambda _: sql(statement), range(2)))
assert sum(r.returncode == 0 for r in results) == 1, 'Only one competing witness signature may succeed'
state = sql(f"SELECT status,(SELECT count(*) FROM official_agreement_signatures WHERE agreement_id='{agreement}'),witness_token_hash IS NULL FROM official_agreements WHERE id='{agreement}'")
assert state.stdout.strip() == 'witness_signed|3|t', state.stdout
print('Concurrent witness signing: exactly one accepted, three signatures retained, invitation consumed')
