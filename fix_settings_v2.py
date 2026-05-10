import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Fix CardHeader at 743
lines[743] = '              <CardHeader className="bg-zinc-900 border-b border-zinc-800">\n'

# Fix redundant tags at 1115
lines[1114] = '\n'
lines[1115] = '\n'

# Fix redundant tags at 1344
lines[1343] = '\n'
lines[1344] = '\n'
lines[1345] = '\n'

# The line numbers might have shifted, but let's see.
# Wait, I'll just use string matching to be safer.

content = "".join(lines)

# Fix Social Proof Header
content = content.replace(
    '<Card className="border-zinc-200 shadow-sm md:col-span-2 overflow-hidden">\n                <CardTitle',
    '<Card className="border-zinc-200 shadow-sm md:col-span-2 overflow-hidden">\n              <CardHeader className="bg-zinc-900 border-b border-zinc-800">\n                <CardTitle'
)

# Fix redundant closings after Social Proof
content = content.replace(
    '                  </div>\n               </CardContent>\n             </Card>\n\n             <Card className="border-zinc-200 shadow-sm md:col-span-2">',
    '                  </div>\n             </Card>\n\n             <Card className="border-zinc-200 shadow-sm md:col-span-2">'
)

# Fix duplicate TabsContent closing
# content = content.replace('            </TabsContent>\n          </div>\n        </TabsContent>', '          </div>\n        </TabsContent>')

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.write(content)

