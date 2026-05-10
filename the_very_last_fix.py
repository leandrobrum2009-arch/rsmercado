import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Line 1351 and 1354 have duplicate TabsContent opening
lines[1353] = '\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

