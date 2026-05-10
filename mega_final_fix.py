import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Social tab starts at 740. Div starts at 741.
# It should end before the next TabsContent (1351).
lines[1349] = '          </div>\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

