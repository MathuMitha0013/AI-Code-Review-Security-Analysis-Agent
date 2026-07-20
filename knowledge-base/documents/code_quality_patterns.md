# Code Quality Patterns and Code Smells

Reference material for the Code Analysis Agent's detection rules — explains
*why* each pattern is flagged, not just that it was flagged.

## Long Method

A function or method that has grown too large to understand at a glance.
Long methods typically try to do too many things, making them hard to
test, reuse, and reason about.

**Why it matters:** Every additional line increases the number of
execution paths a reader must mentally track. Long methods are strongly
correlated with higher defect rates in empirical software engineering
studies.

**Fix:** Extract cohesive blocks of logic into well-named helper
functions/methods (the "Extract Method" refactoring). Each function
should ideally do one thing.

## Too Many Parameters

A function/method signature with an excessive number of parameters
(commonly flagged above 4-5).

**Why it matters:** High parameter counts make call sites error-prone
(easy to pass arguments in the wrong order) and signal that the function
may be handling too many unrelated concerns.

**Fix:** Group related parameters into a single object/struct/dataclass
("Introduce Parameter Object" refactoring), or split the function.

## Deep Nesting

Multiple levels of nested `if`/`for`/`while`/`try` blocks within a single
function.

**Why it matters:** Each nesting level forces the reader to hold an
additional conditional context in working memory. Cognitive Complexity
research treats nesting as a stronger predictor of comprehension
difficulty than raw branch count (Cyclomatic Complexity) alone.

**Fix:** Use early returns / guard clauses to flatten conditional logic,
or extract nested blocks into their own named functions.

## God Object / God Class

A class that has accumulated an excessive number of responsibilities —
too many methods, too many fields, or both.

**Why it matters:** Violates the Single Responsibility Principle. God
Objects become a magnet for further complexity (developers add "just one
more method" since it's already the class that does everything), and
changes to one responsibility risk breaking unrelated ones.

**Fix:** Identify the distinct responsibilities the class is handling and
extract each into its own focused class.

## Cyclomatic Complexity

A metric (originated by Thomas McCabe, 1976) counting the number of
linearly independent paths through a function's control flow. Formula:
`complexity = decision points + 1`, where a "decision point" is any `if`,
`for`, `while`, `case`, `catch`, or boolean operator (`&&`/`||`) that
creates a branch.

**Why it matters:** Directly correlates with the minimum number of test
cases needed for full branch coverage. High cyclomatic complexity (>10)
signals code that is difficult to test thoroughly and more likely to
contain untested edge cases.

## Cognitive Complexity

A newer metric (SonarSource, 2016) designed to better reflect how
difficult code is for a HUMAN to understand, as opposed to Cyclomatic
Complexity's focus on testability. Key difference: Cognitive Complexity
penalizes NESTED control flow more heavily than sequential control flow,
and does not penalize simple, non-nested short-circuit patterns as
harshly.

**Why both metrics matter together:** A function can have low cyclomatic
complexity but still be hard to read if its branches are deeply nested —
tracking both gives a fuller picture than either alone.

## Naming Convention Violations

Code that doesn't follow the idiomatic naming convention of its language
(e.g., `snake_case` for Python functions per PEP 8, `camelCase` for Java
methods).

**Why it matters:** Consistent naming reduces cognitive load when reading
unfamiliar code and signals attention to detail — small, but a genuine
maintainability signal, especially in team codebases.
