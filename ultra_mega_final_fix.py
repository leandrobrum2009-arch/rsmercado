import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Search for TabsContent opening near 1350
for i in range(1345, 1355):
    if '<TabsContent value="notificacoes"' in lines[i]:
        # Found it. Let's make sure it's correct.
        break

# Let's check if there is an extra opening.
# I'll just rewrite the whole section from 1345 to 1355.
lines[1350] = '        <TabsContent value="notificacoes" className="animate-in fade-in slide-in-from-left-4 duration-300">\n'
lines[1351] = '             {/* Notificações (SMS e Ligações) */}\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

