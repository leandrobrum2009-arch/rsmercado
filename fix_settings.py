import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Chunks (1-based line numbers to 0-based indices)
logic = lines[0:397]
geral = lines[397:577]
social_proof_raw = lines[577:951]
pagamentos = lines[951:1113]
social_rest = lines[1113:1345]
notificacoes = lines[1345:1518]
footer = lines[1518:]

# Repair Social Proof
social_proof = [
    '            {/* Efeitos e Prova Social */}\n',
    '            <Card className="border-zinc-200 shadow-sm md:col-span-2 overflow-hidden">\n'
] + social_proof_raw

new_content = logic + geral + pagamentos

# Construct new Social tab
new_social = [
    '        <TabsContent value="social" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">\n',
    '          <div className="space-y-6">\n'
]
new_social += social_proof
# social_rest already contains the opening div and cards, but we want to merge them
# lines 1114-1115 are the opening tags, let's skip them if they are there
social_rest_clean = lines[1116:1344]
new_social += social_rest_clean
new_social += [
    '          </div>\n',
    '        </TabsContent>\n'
]

new_content += new_social + notificacoes + footer

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(new_content)

