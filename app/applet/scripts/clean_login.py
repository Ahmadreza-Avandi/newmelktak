import re

files = [
    "/app/applet/public/assets/index-app.js",
    "/app/applet/public/assets/index-C5RZm4w3.js"
]

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = re.sub(r"useState\([`\"\']DEMO01[`\"\']\)", "useState(``)", content)
    content = re.sub(r"useState\([`\"\']agent[`\"\']\)", "useState(``)", content)
    content = re.sub(r"useState\([`\"\']DemoPassword123![`\"\']\)", "useState(``)", content)
    
    content = content.replace("کد آژانس: DEMO01 | رمز عبور: DemoPassword123!", "")
    content = content.replace("placeholder:`DEMO01`", "placeholder:``")
    content = content.replace("placeholder:\"DEMO01\"", "placeholder:\"\"")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Cleaned {path}")
