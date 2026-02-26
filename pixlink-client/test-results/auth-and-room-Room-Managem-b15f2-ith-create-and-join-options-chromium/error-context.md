# Page snapshot

```yaml
- generic [ref=e6]:
  - heading "PixLink" [level=1] [ref=e7]
  - heading "登录" [level=2] [ref=e8]
  - generic [ref=e9]: User not found
  - generic [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]: 邮箱
      - textbox "邮箱" [ref=e13]:
        - /placeholder: 请输入邮箱
        - text: test1772073793719@example.com
    - generic [ref=e14]:
      - generic [ref=e15]: 密码
      - textbox "密码" [ref=e16]:
        - /placeholder: 请输入密码
        - text: test123456
    - button "登录" [ref=e17] [cursor=pointer]
  - paragraph [ref=e19]:
    - text: 还没有账号？
    - link "立即注册" [ref=e20] [cursor=pointer]:
      - /url: "#"
```