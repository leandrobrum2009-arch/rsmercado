import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Fix redundant </Card> at 1116
# Search for it near 1115-1116
for i in range(1110, 1120):
    if '</Card>' in lines[i] and '</Card>' in lines[i+1]:
        lines[i+1] = '\n'
        break

# Fix missing </div> at 1344
# Search for </TabsContent> near 1348
for i in range(1340, 1350):
    if '</TabsContent>' in lines[i]:
        # Insert </div> before it
        lines[i-1] = '            </div>\n'
        break

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

