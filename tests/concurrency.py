"""Run only against the isolated local test cluster, never production."""
import subprocess
from concurrent.futures import ThreadPoolExecutor

BASE = ['psql', '-h', '/tmp', '-p', '55439', '-d', 'agrofarm_final_test', '-v', 'ON_ERROR_STOP=1', '-At']
def sql(statement):
    return subprocess.run(BASE + ['-c', statement], capture_output=True, text=True)
seed = sql("WITH b AS (INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST concurrent payments','Broiler',10,10,current_date) RETURNING id) INSERT INTO farm_financials(batch_id,type,category,amount,amount_paid,description,payment_method,transaction_date,approval_status) SELECT id,'income','Bird Sales',100,0,'TEST concurrency','Cash',current_date,'approved' FROM b RETURNING id,batch_id")
assert seed.returncode == 0, seed.stderr
financial_id, batch_id = seed.stdout.splitlines()[0].split('|')
try:
    statement = f"BEGIN; INSERT INTO farm_financial_payments(financial_id,amount,approval_status) VALUES('{financial_id}',70,'approved'); SELECT pg_sleep(0.2); COMMIT;"
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: sql(statement), range(2)))
    assert sum(r.returncode == 0 for r in results) == 1, 'Exactly one competing payment must succeed'
    total = sql(f"SELECT amount_paid FROM farm_financials WHERE id='{financial_id}'")
    assert float(total.stdout.strip()) == 70, 'Approved balance was lost or doubled'
    count = sql(f"SELECT count(*) FROM farm_financial_payments WHERE financial_id='{financial_id}' AND approval_status='approved'")
    assert count.stdout.strip() == '1'
    print('Concurrent payments: one accepted, one rejected; balance correct')
finally:
    cleanup = sql(f"DELETE FROM farm_financial_payments WHERE financial_id='{financial_id}'; DELETE FROM farm_financials WHERE id='{financial_id}'; DELETE FROM farm_batches WHERE id='{batch_id}';")
    assert cleanup.returncode == 0, cleanup.stderr

seed = sql("INSERT INTO farm_batches(batch_name,batch_type,initial_headcount,current_headcount,start_date) VALUES('TEST concurrent bird sales','Broiler',10,10,current_date) RETURNING id")
assert seed.returncode == 0, seed.stderr
batch_id = seed.stdout.splitlines()[0]
try:
    statement = f"BEGIN; INSERT INTO farm_financials(batch_id,type,category,amount,description,payment_method,transaction_date,approval_status,birds_sold) VALUES('{batch_id}','income','Bird Sales',70,'TEST sale of 7 birds','Cash',current_date,'approved',7); SELECT pg_sleep(0.2); COMMIT;"
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: sql(statement), range(2)))
    assert sum(r.returncode == 0 for r in results) == 1, 'Exactly one competing bird sale must succeed'
    count = sql(f"SELECT live_birds FROM batch_stock_summary(ARRAY['{batch_id}'::uuid])")
    assert float(count.stdout.strip()) == 3, 'Physical stock oversold or deduction lost'
    print('Concurrent bird sales: one accepted, one rejected; physical stock correct')
finally:
    cleanup = sql(f"DELETE FROM farm_financials WHERE batch_id='{batch_id}'; DELETE FROM farm_batches WHERE id='{batch_id}';")
    assert cleanup.returncode == 0, cleanup.stderr
