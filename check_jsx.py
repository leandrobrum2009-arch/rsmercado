import re

def check_tags(content):
    # Match the whole tag name
    tags = re.findall(r'<([a-zA-Z]+)|</([a-zA-Z]+)>', content)
    stack = []
    # Filter only relevant tags
    relevant = {'div', 'Card', 'CardContent', 'CardHeader', 'CardTitle', 'CardDescription', 'CardFooter'}
    
    for open_tag, close_tag in tags:
        if open_tag in relevant:
            stack.append(open_tag)
        elif close_tag in relevant:
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
    content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
    check_tags(content)
