"""Production-shape regression, only against the disposable local test cluster."""
from pathlib import Path
import subprocess
statement=Path('tests/allocation-undo.sql').read_text().replace('BEGIN;\n','BEGIN;\nALTER TABLE public.farm_partners DROP COLUMN agreement_signed;\n',1)
result=subprocess.run(['psql','-h','/tmp','-p','55439','-d','agrofarm_default_grants_test','-v','ON_ERROR_STOP=1'],input=statement,capture_output=True,text=True)
assert result.returncode==0,result.stderr
print('Undo restoration and signature/payout safeguards passed without the optional legacy agreement column')
