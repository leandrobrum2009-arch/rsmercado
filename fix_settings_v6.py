import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Let's fix line 1344
lines[1344] = '          </div>\n'

# Fix line 1516-1518
# We need to close TabsContent and then Tabs
# Wait, let's see line 1515 onwards
for i in range(1510, len(lines)):
    if '            </Card>' in lines[i]:
        # Card closed. Now close TabsContent and Tabs.
        # But wait, does Notificacoes have a div wrapper?
        # Opening was: <TabsContent value="notificacoes" ...> (no div)
        lines[i+1] = '          </TabsContent>\n'
        lines[i+2] = '        </Tabs>\n'
        lines[i+3] = '\n'
        break

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

