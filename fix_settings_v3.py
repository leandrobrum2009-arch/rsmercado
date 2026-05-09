import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Fix CardTitle opening
lines[743] = '              <CardHeader className="bg-zinc-900 border-b border-zinc-800">\n'
lines[744] = '                <CardTitle className="flex items-center gap-2 text-white">\n'

# Fix end of file and tab closings
content = "".join(lines)

# Fix Social Proof Header again (safely)
if '<CardHeader className="bg-zinc-900 border-b border-zinc-800">\n                  <div' in content:
    content = content.replace(
        '<CardHeader className="bg-zinc-900 border-b border-zinc-800">\n                  <div',
        '<CardHeader className="bg-zinc-900 border-b border-zinc-800">\n                <CardTitle className="flex items-center gap-2 text-white">\n                  <div'
    )

# Fix duplicate/misaligned TabsContent and div at the end of Social tab
content = content.replace(
    '          </TabsContent>\n          </div>\n        </TabsContent>\n           <TabsContent value="notificacoes"',
    '          </div>\n        </TabsContent>\n\n        <TabsContent value="notificacoes"'
)

# Fix end of file
content = content.replace(
    '             </Card>\n             </div>\n           </TabsContent>\n         </Tabs>\n\n         <div className="flex',
    '             </Card>\n           </TabsContent>\n         </Tabs>\n\n         <div className="flex'
)

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.write(content)

