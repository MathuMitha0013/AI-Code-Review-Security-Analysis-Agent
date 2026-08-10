"""
Java Code Analyzer — mirrors python_analyzer.py's structure and thresholds,
but walks javalang's AST instead of Python's `ast` module.

WHY MIRROR THE STRUCTURE EXACTLY?
    Consistency matters more than language-specific cleverness here. A
    reviewer (or future teammate) who understands python_analyzer.py should
    be able to read this file and immediately recognize the same four
    analyses, the same severity module, the same Finding shape — just
    walking a different tree. This is intentional design, not
    coincidence.
"""

import logging

import javalang
from javalang.tree import (
    BinaryOperation,
    ClassDeclaration,
    DoStatement,
    ForStatement,
    IfStatement,
    MethodDeclaration,
    SwitchStatementCase,
    TernaryExpression,
    WhileStatement,
)

from app.agents.code_analysis import severity
from app.models.analysis_schema import Finding

logger = logging.getLogger(__name__)

# Node types that each represent one McCabe "decision point".
# Cyclomatic complexity = 1 + number of decision points in a method body.
_DECISION_NODE_TYPES = (
    IfStatement,
    ForStatement,
    WhileStatement,
    DoStatement,
    SwitchStatementCase,
    TernaryExpression,
)

# Nesting-relevant node types, mirroring Python's If/For/While/Try set.
_NESTING_NODE_TYPES = (IfStatement, ForStatement, WhileStatement, DoStatement)


def _walk(node):
    """javalang nodes don't expose a uniform `ast.walk`-style helper, so
    we provide one: yields every descendant node via its own `.children`."""
    if node is None:
        return
    yield node
    children = getattr(node, "children", [])
    for child in children:
        if isinstance(child, (list, tuple)):
            for item in child:
                if hasattr(item, "children") or isinstance(item, tuple(_DECISION_NODE_TYPES) + (BinaryOperation,)):
                    yield from _walk(item)
        elif hasattr(child, "children"):
            yield from _walk(child)


def _count_decision_points(method_node: MethodDeclaration) -> int:
    count = 0
    for node in _walk(method_node):
        if isinstance(node, _DECISION_NODE_TYPES):
            count += 1
        elif isinstance(node, BinaryOperation) and node.operator in ("&&", "||"):
            count += 1
    return count


def _max_nesting_depth(node, current_depth: int = 0) -> int:
    deepest = current_depth
    for child in _walk(node) if current_depth == 0 else [node]:
        if child is node and current_depth > 0:
            pass
        children = getattr(child, "children", [])
        for c in children:
            items = c if isinstance(c, (list, tuple)) else [c]
            for item in items:
                if isinstance(item, _NESTING_NODE_TYPES):
                    deepest = max(deepest, _max_nesting_depth(item, current_depth + 1))
                elif hasattr(item, "children"):
                    deepest = max(deepest, _max_nesting_depth(item, current_depth))
        break  # only process top-level call; recursion handles the rest
    return deepest


def _count_method_lines(method_node: MethodDeclaration) -> int:
    """
    javalang doesn't track end-line numbers directly, so we approximate
    line count by finding the min/max line among all descendant tokens'
    positions. This is a reasonable approximation for Milestone 2 —
    documented as a known limitation in the Decision Log.
    """
    positions = [n.position.line for n in _walk(method_node) if getattr(n, "position", None)]
    if not positions:
        return 0
    return max(positions) - min(positions) + 1


def _analyze_method(method_node: MethodDeclaration) -> list[Finding]:
    findings: list[Finding] = []
    name = method_node.name
    line = method_node.position.line if method_node.position else None

    # --- Code Smell: Long Method ---
    line_count = _count_method_lines(method_node)
    sev = severity.score_long_method(line_count)
    if sev:
        findings.append(
            Finding(
                category="code_smell",
                rule="LONG_METHOD",
                message=f"Method '{name}' spans approximately {line_count} lines. Consider breaking it into smaller methods.",
                severity=sev,
                function_name=name,
                line=line,
                metric_value=line_count,
            )
        )

    # --- Code Smell: Too Many Parameters ---
    param_count = len(method_node.parameters)
    sev = severity.score_too_many_params(param_count)
    if sev:
        findings.append(
            Finding(
                category="code_smell",
                rule="TOO_MANY_PARAMETERS",
                message=f"Method '{name}' has {param_count} parameters. Consider grouping related parameters into an object.",
                severity=sev,
                function_name=name,
                line=line,
                metric_value=param_count,
            )
        )

    # --- Code Smell: Deep Nesting ---
    depth = _max_nesting_depth(method_node)
    sev = severity.score_deep_nesting(depth)
    if sev:
        findings.append(
            Finding(
                category="code_smell",
                rule="DEEP_NESTING",
                message=f"Method '{name}' has {depth} levels of nested control flow. Consider extracting nested logic into helper methods.",
                severity=sev,
                function_name=name,
                line=line,
                metric_value=depth,
            )
        )

    # --- Complexity: Cyclomatic Complexity (custom McCabe calculation) ---
    cc = 1 + _count_decision_points(method_node)
    sev = severity.score_cyclomatic_complexity(cc)
    if sev:
        findings.append(
            Finding(
                category="complexity",
                rule="HIGH_CYCLOMATIC_COMPLEXITY",
                message=(
                    f"Method '{name}' has a cyclomatic complexity of {cc}. "
                    f"High complexity increases the risk of bugs and makes thorough testing harder."
                ),
                severity=sev,
                function_name=name,
                line=line,
                metric_value=cc,
            )
        )

    # --- Best Practice: Naming Convention (Java — camelCase) ---
    if name and (name[0].isupper() or "_" in name):
        findings.append(
            Finding(
                category="best_practice",
                rule="NAMING_CONVENTION_VIOLATION",
                message=f"Method '{name}' does not follow Java camelCase naming convention.",
                severity="low",
                function_name=name,
                line=line,
            )
        )

    return findings


def _analyze_design_issues(tree) -> list[Finding]:
    """Design Issue Detection — God Object: a class with too many methods."""
    findings: list[Finding] = []
    for _, node in tree.filter(ClassDeclaration):
        method_count = sum(1 for m in node.body if isinstance(m, MethodDeclaration))
        sev = severity.score_large_class(method_count)
        if sev:
            line = node.position.line if node.position else None
            findings.append(
                Finding(
                    category="design_issue",
                    rule="GOD_OBJECT",
                    message=(
                        f"Class '{node.name}' has {method_count} methods, suggesting it may have too "
                        f"many responsibilities. Consider splitting it following the Single Responsibility Principle."
                    ),
                    severity=sev,
                    function_name=node.name,
                    line=line,
                    metric_value=method_count,
                )
            )
    return findings


def analyze_java(code: str) -> list[Finding]:
    """
    Entry point for Java code analysis. Mirrors analyze_python()'s
    responsibility and return shape.

    ASSUMES the code has already passed syntax validation.
    """
    tree = javalang.parse.parse(code)
    findings: list[Finding] = []

    for _, method_node in tree.filter(MethodDeclaration):
        findings.extend(_analyze_method(method_node))

    findings.extend(_analyze_design_issues(tree))

    logger.info("Java analysis complete: %d findings", len(findings))
    return findings
