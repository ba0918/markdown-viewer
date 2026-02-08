# GitHub Flavored Markdown (GFM) Test

This file tests all GFM features.

## Strikethrough

This is ~~strikethrough~~ text.

Normal text with ~~deleted~~ and ~~removed~~ parts.

## Task Lists

### Todo List

- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task
- [ ] Another incomplete task

### Mixed List

- Regular list item
- [x] Task item (done)
- Another regular item
- [ ] Task item (todo)

## Tables

| Feature         | Status        | Priority |
| --------------- | ------------- | -------- |
| Strikethrough   | ✅ Working    | High     |
| Task Lists      | ✅ Working    | High     |
| Tables          | ✅ Working    | Medium   |
| ~~Old Feature~~ | ❌ Deprecated | Low      |

## Autolinks

Visit https://example.com for more info.

Check out https://github.com and https://google.com for resources.

## Combined GFM Features

Here's a complex example:

- [x] ~~Complete~~ this **important** task
- [ ] Visit https://example.com and read the _documentation_
- [x] Review the table above
- [ ] Test ~~old~~ new features

### Table with GFM

| Task       | Link                        | Status        |
| ---------- | --------------------------- | ------------- |
| Setup      | https://setup.example.com   | [x] Done      |
| ~~Deploy~~ | ~~https://old.example.com~~ | [x] Cancelled |
| Test       | https://test.example.com    | [ ] Todo      |

## Code Block with GFM

```javascript
// Testing strikethrough in comments
// ~~This is not strikethrough in code~~
const task = {
  completed: true, // [x]
  url: "https://example.com",
};
```

End of GFM Test.
