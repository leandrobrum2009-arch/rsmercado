import sys
import re

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    content = f.read()

# Fix Social Proof Header
content = re.sub(
    r'<CardHeader className="bg-zinc-900 border-b border-zinc-800">\n\s+<CardTitle className="flex items-center gap-2 text-white">\n\s+<TrendingUp className="h-5 w-5" />\n\s+</div>',
    '<CardHeader className="bg-zinc-900 border-b border-zinc-800">\n                <CardTitle className="flex items-center gap-2 text-white">\n                  <div className="p-2 bg-yellow-400 rounded-lg text-black">\n                    <TrendingUp className="h-5 w-5" />\n                  </div>',
    content
)

# Fix duplicate TabsContent and extra closings
# Search for the end of a card that is followed by misaligned tags
content = re.sub(
    r'</div>\s+</div>\s+</div>\s+</div>\s+</div>\s+</CardContent>\s+</Card>\s+</TabsContent>',
    '</div></div></div></div></div></CardContent></Card>',
    content
)

# Clean up the whole return structure by looking for key patterns
# This is a bit risky but we need a clean slate

# Fix the end of the Social tab and start of Notificações
content = re.sub(
    r'</Card>\s+</div>\s+</TabsContent>\s+</div>\s+</TabsContent>\s+<TabsContent value="notificacoes"',
    '</Card>\n          </div>\n        </TabsContent>\n\n        <TabsContent value="notificacoes"',
    content
)

# Fix the very end of the file
content = re.sub(
    r'</Card>\s+</div>\s+</TabsContent>\s+</Tabs>\s+<div className="flex',
    '</Card>\n           </TabsContent>\n         </Tabs>\n\n         <div className="flex',
    content
)

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.write(content)

