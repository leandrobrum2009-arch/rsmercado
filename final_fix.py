import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Fix Social Proof closing at 1115
lines[1115] = '                  </div>\n                </CardContent>\n              </Card>\n'

# Fix redundant div at 1347
lines[1346] = '\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

