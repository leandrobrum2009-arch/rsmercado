import re

def check_tags(content):
    tags = re.findall(r'<(div|Card|CardContent|CardHeader|CardTitle|CardDescription)|</(div|Card|CardContent|CardHeader|CardTitle|CardDescription)>', content)
    stack = []
    for open_tag, close_tag in tags:
        if open_tag:
            stack.append(open_tag)
        else:
            if not stack:
                print(f"Extra closing tag: </{close_tag}>")
                continue
            last = stack.pop()
            if last != close_tag:
                print(f"Mismatched tag: Expected </{last}>, found </{close_tag}>")
    
    if stack:
        print(f"Unclosed tags: {stack}")

with open('src/components/admin/StoreSettingsManager.tsx', 'r') as f:
    content = f.read()
    # Strip comments to avoid false positives
    content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
    check_tags(content)
