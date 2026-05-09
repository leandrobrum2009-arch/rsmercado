import sys

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    lines = f.readlines()

# Social Proof card starts at 743.
# It should end before the next card (1118).

# Let's find the line with "agora mesmo" followed by divs.
for i in range(1110, 1116):
    if 'agora mesmo' in lines[i]:
        # We found the end of the preview.
        # Now we need to close all divs and then CardContent and Card.
        # Original Social Proof card had many nested divs.
        
        # Line 1115 currently has </div></div></div></div></div>
        # Let's just append the missing ones.
        lines[1115] = lines[1115].strip() + '\n              </CardContent>\n            </Card>\n'

with open('src/components/admin/StoreSettingsManager.tsx', 'w') as f:
    f.writelines(lines)

