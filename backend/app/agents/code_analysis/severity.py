"""
Severity scoring — Stage 5 of the Code Analysis Agent pipeline.

WHY A SEPARATE FILE FOR THRESHOLDS INSTEAD OF INLINING THEM IN EACH ANALYZER?
    Severity thresholds are a POLICY decision (what counts as "bad"), not a
    detection mechanism. Keeping them in one file means:
      1. Adjusting a threshold (e.g., "actually 40 lines is fine for a
         method") is a one-line change, not a hunt through multiple files.
      2. Both the Python and Java analyzers score consistently using the
         SAME policy — a 25-line method is judged the same way regardless
         of language.
"""

from app.models.analysis_schema import Severity

# Each threshold list is ordered from most severe to least severe.
# The first (metric, severity) pair whose condition is met wins.
_LONG_METHOD_THRESHOLDS = [(50, "high"), (30, "medium"), (20, "low")]
_TOO_MANY_PARAMS_THRESHOLDS = [(7, "high"), (5, "medium"), (4, "low")]
_DEEP_NESTING_THRESHOLDS = [(5, "high"), (4, "medium"), (3, "low")]
_LARGE_CLASS_THRESHOLDS = [(20, "critical"), (15, "high"), (10, "medium")]
_CYCLOMATIC_COMPLEXITY_THRESHOLDS = [(20, "critical"), (10, "high"), (5, "medium")]


def _score(value: int, thresholds: list[tuple[int, Severity]]) -> Severity | None:
    """
    Returns the severity for `value` given a threshold table, or None if
    the value doesn't meet even the lowest threshold (i.e., not worth
    flagging at all).
    """
    for min_value, severity in thresholds:
        if value >= min_value:
            return severity
    return None


def score_long_method(line_count: int) -> Severity | None:
    return _score(line_count, _LONG_METHOD_THRESHOLDS)


def score_too_many_params(param_count: int) -> Severity | None:
    return _score(param_count, _TOO_MANY_PARAMS_THRESHOLDS)


def score_deep_nesting(depth: int) -> Severity | None:
    return _score(depth, _DEEP_NESTING_THRESHOLDS)


def score_large_class(method_count: int) -> Severity | None:
    return _score(method_count, _LARGE_CLASS_THRESHOLDS)


def score_cyclomatic_complexity(cc: int) -> Severity | None:
    return _score(cc, _CYCLOMATIC_COMPLEXITY_THRESHOLDS)
