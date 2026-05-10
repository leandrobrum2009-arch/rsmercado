import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Fix Social Proof redundant div
lines[1115] = '\n'

# Fix Social redundant div at 1347
# Wait, let's see line 1345-1350 again
# 1345: </div>
# 1346: \n
# 1347: </div>
lines[1346] = '\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

