# Page snapshot

```yaml
- generic [ref=e6]:
  - heading "PixLink" [level=1] [ref=e7]
  - heading "注册" [level=2] [ref=e8]
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]: 邮箱
      - textbox "邮箱" [ref=e12]:
        - /placeholder: 请输入邮箱
    - generic [ref=e13]:
      - generic [ref=e14]: 昵称
      - textbox "昵称" [ref=e15]:
        - /placeholder: 请输入昵称
    - generic [ref=e16]:
      - generic [ref=e17]: 密码
      - textbox "密码" [ref=e18]:
        - /placeholder: 请输入密码（至少6位）
    - button "注册" [ref=e19] [cursor=pointer]
  - paragraph [ref=e21]:
    - text: 已有账号？
    - link "立即登录" [ref=e22] [cursor=pointer]:
      - /url: "#"
```