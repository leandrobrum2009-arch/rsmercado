import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Social tab ends before Notificações
# Line 1350 has </div>. We need </TabsContent> after it.
lines[1351] = '        </TabsContent>\n\n        <TabsContent value="notificacoes" className="animate-in fade-in slide-in-from-left-4 duration-300">\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

