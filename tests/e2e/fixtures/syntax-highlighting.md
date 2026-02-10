# Syntax Highlighting Test

このファイルは、シンタックスハイライトが正しく機能するかテストします。

## PHP

```php
// PHP（ExpEditor）
$max_level = max($item['max_level'], 1);
$need_lvup_exp = $next ? intval(($next['need_exp'] - $item['need_exp']) / $max_level) : 0;
$lv = ($lv_exp > 0 && $need_lvup_exp > 0) ? min(intval($lv_exp / $need_lvup_exp), $max_level - 1) : 0;

function calculateExperience($item, $next, $lv_exp) {
    $max_level = max($item['max_level'], 1);
    $need_lvup_exp = $next ? intval(($next['need_exp'] - $item['need_exp']) / $max_level) : 0;
    return ($lv_exp > 0 && $need_lvup_exp > 0) ? min(intval($lv_exp / $need_lvup_exp), $max_level - 1) : 0;
}
```

## C++

```cpp
// C++（ゲームサーバ）
int lv_exp = (danni_exp_result_next - danni_exp_result_base) / danni_result_danni_lv_max;
int lv = (danni_exp_result - danni_exp_result_base) / lv_exp;
danni_result_danni_lv = Min(lv, danni_result_danni_lv_max - 1);

class ExperienceCalculator {
public:
    int calculateLevel(int exp_result, int exp_base, int lv_max) {
        int lv_exp = (exp_result_next - exp_base) / lv_max;
        int lv = (exp_result - exp_base) / lv_exp;
        return Min(lv, lv_max - 1);
    }
};
```

## JavaScript

```javascript
function hello() {
  console.log("Hello, World!");
  const items = [1, 2, 3];
  return items.map((x) => x * 2);
}
```

## Python

```python
def calculate_experience(item, next_item, lv_exp):
    max_level = max(item['max_level'], 1)
    need_lvup_exp = int((next_item['need_exp'] - item['need_exp']) / max_level) if next_item else 0
    return min(int(lv_exp / need_lvup_exp), max_level - 1) if lv_exp > 0 and need_lvup_exp > 0 else 0
```

## TypeScript

```typescript
interface Item {
  max_level: number;
  need_exp: number;
}

function calculateExperience(
  item: Item,
  next: Item | null,
  lv_exp: number,
): number {
  const max_level = Math.max(item.max_level, 1);
  const need_lvup_exp = next
    ? Math.floor((next.need_exp - item.need_exp) / max_level)
    : 0;
  return (lv_exp > 0 && need_lvup_exp > 0)
    ? Math.min(Math.floor(lv_exp / need_lvup_exp), max_level - 1)
    : 0;
}
```

## Rust

```rust
fn calculate_experience(max_level: i32, need_exp: i32, lv_exp: i32) -> i32 {
    let max_level = max_level.max(1);
    let need_lvup_exp = need_exp / max_level;
    if lv_exp > 0 && need_lvup_exp > 0 {
        (lv_exp / need_lvup_exp).min(max_level - 1)
    } else {
        0
    }
}
```
