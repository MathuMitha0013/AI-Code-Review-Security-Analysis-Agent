# Common Bug Patterns (Non-Security)

Reference material covering frequently occurring bug patterns that are not
primarily security vulnerabilities (those are covered separately in
`owasp_top10.md`), but still represent common sources of defects.

## Off-by-One Errors

Incorrect boundary conditions in loops or array/list indexing — e.g.,
using `<=` instead of `<` in a loop condition, causing an extra iteration
or an out-of-bounds access.

```python
# BUGGY — iterates one time too many, IndexError on the last iteration
for i in range(len(items) + 1):
    process(items[i])

# CORRECT
for i in range(len(items)):
    process(items[i])
```

## Null / None Reference Errors

Accessing a method or attribute on a value that may be `null`/`None`
without first checking.

```python
# BUGGY
user = find_user(user_id)
print(user.name)  # crashes if find_user returns None

# CORRECT
user = find_user(user_id)
if user is not None:
    print(user.name)
```

## Mutable Default Arguments (Python-specific)

A classic Python pitfall: using a mutable object (list, dict) as a
default parameter value. Because default values are evaluated ONCE at
function definition time, the same mutable object is shared across every
call that doesn't explicitly pass its own.

```python
# BUGGY — the same list persists and grows across every call
def add_item(item, items=[]):
    items.append(item)
    return items

# CORRECT
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

## Resource Leaks

Failing to close file handles, database connections, or network sockets,
especially when an exception occurs mid-operation.

```java
// BUGGY — connection leaks if an exception is thrown before close()
Connection conn = dataSource.getConnection();
conn.executeQuery(query);
conn.close();

// CORRECT — try-with-resources guarantees closure even on exception
try (Connection conn = dataSource.getConnection()) {
    conn.executeQuery(query);
}
```

## Comparing Floating-Point Numbers for Exact Equality

Floating-point arithmetic is not exact; comparing floats with `==` can
fail unexpectedly due to representation error.

```python
# BUGGY
if 0.1 + 0.2 == 0.3:  # False! floating point representation error
    ...

# CORRECT
import math
if math.isclose(0.1 + 0.2, 0.3):
    ...
```

## Catching Overly Broad Exceptions

Catching `Exception` (Java/Python) or a bare `except:` silently swallows
unrelated errors, including bugs that should have crashed loudly during
development.

```python
# BUGGY — hides programming errors, not just the expected failure case
try:
    result = risky_operation()
except Exception:
    result = None

# CORRECT — catch only the specific exception you expect and can handle
try:
    result = risky_operation()
except ValueError:
    result = None
```

## Integer Division Confusion

In languages where `/` performs integer division between two integers
(e.g., Java, and Python 2), an unintended truncation can silently produce
wrong results.

```java
// BUGGY — integer division truncates: 5 / 2 == 2, not 2.5
double average = totalScore / numberOfPlayers;

// CORRECT — cast at least one operand to a floating type first
double average = (double) totalScore / numberOfPlayers;
```
