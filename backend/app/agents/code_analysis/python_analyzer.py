"""
Python Code Analyzer — implements the "Parallel Analyses" stage of the
Code Analysis Agent pipeline for Python source code:
    Code Smells Detection | Complexity Analysis | Design Issue Detection | Best Practice Validation

WHY ONE FILE FOR ALL FOUR ANALYSES INSTEAD OF FOUR SEPARATE FILES?
    All four analyses share the SAME AST walk (Python's `ast` module) over
    the SAME parsed tree. Splitting them into separate files would mean
    re-parsing the code four times, or passing a shared tree between files
    awkwardly. Grouping by "what tree am I walking" (Python's AST) rather
    than "which pipeline stage is this" keeps the code efficient and
    cohesive. The Java analyzer mirrors this same structure for the same
    reason with `javalang`'s tree.
"""

import ast
import logging

from radon.complexity import cc_visit

from app.agents.code_analysis import severity
from app.models.analysis_schema import Finding

logger = logging.getLogger(__name__)


def _max_nesting_depth(node: ast.AST, current_depth: int = 0) -> int:
    """
    Recursively computes the deepest level of nested control-flow blocks
    (if/for/while/try) inside a function body.

    WHY DOES DEEP NESTING MATTER AS A CODE SMELL?
        Each level of nesting adds a mental "stack frame" a reader must
        hold while understanding the code. Research on cognitive
        complexity (distinct from cyclomatic complexity) treats nesting
        depth as a stronger predictor of how hard code is to understand
        than raw branch count alone.
    """
    nesting_node_types = (ast.If, ast.For, ast.While, ast.Try)
    deepest = current_depth
    for child in ast.iter_child_nodes(node):
        if isinstance(child, nesting_node_types):
            deepest = max(deepest, _max_nesting_depth(child, current_depth + 1))
        else:
            deepest = max(deepest, _max_nesting_depth(child, current_depth))
    return deepest


def _analyze_function(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[Finding]:
    """Runs code-smell and complexity checks on a single function/method."""
    findings: list[Finding] = []
    name = func_node.name
    line = func_node.lineno

    # --- Code Smell: Long Method ---
    if hasattr(func_node, "end_lineno") and func_node.end_lineno:
        line_count = func_node.end_lineno - func_node.lineno + 1
        sev = severity.score_long_method(line_count)
        if sev:
            findings.append(
                Finding(
                    category="code_smell",
                    rule="LONG_METHOD",
                    message=f"Function '{name}' is {line_count} lines long. Consider breaking it into smaller functions.",
                    severity=sev,
                    function_name=name,
                    line=line,
                    metric_value=line_count,
                )
            )

    # --- Code Smell: Too Many Parameters ---
    param_count = len(func_node.args.args)
    sev = severity.score_too_many_params(param_count)
    if sev:
        findings.append(
            Finding(
                category="code_smell",
                rule="TOO_MANY_PARAMETERS",
                message=f"Function '{name}' has {param_count} parameters. Consider grouping related parameters into an object.",
                severity=sev,
                function_name=name,
                line=line,
                metric_value=param_count,
            )
        )

    # --- Code Smell: Deep Nesting ---
    depth = _max_nesting_depth(func_node)
    sev = severity.score_deep_nesting(depth)
    if sev:
        findings.append(
            Finding(
                category="code_smell",
                rule="DEEP_NESTING",
                message=f"Function '{name}' has {depth} levels of nested control flow. Consider extracting nested logic into helper functions.",
                severity=sev,
                function_name=name,
                line=line,
                metric_value=depth,
            )
        )

    # --- Best Practice: Naming Convention (PEP 8 — snake_case) ---
    if not name.startswith("_") and (name != name.lower() or " " in name):
        findings.append(
            Finding(
                category="best_practice",
                rule="NAMING_CONVENTION_VIOLATION",
                message=f"Function '{name}' does not follow PEP 8 snake_case naming convention.",
                severity="low",
                function_name=name,
                line=line,
            )
        )

    return findings


def _analyze_complexity(code: str) -> list[Finding]:
    """
    Complexity Analysis stage — uses `radon` to compute McCabe cyclomatic
    complexity per function, exactly as your mentor's tool list specifies.
    """
    findings: list[Finding] = []
    try:
        blocks = cc_visit(code)
    except SyntaxError:
        # Should not happen — syntax is validated before this is called —
        # but defended against defensively rather than crashing the agent.
        return findings

    for block in blocks:
        sev = severity.score_cyclomatic_complexity(block.complexity)
        if sev:
            findings.append(
                Finding(
                    category="complexity",
                    rule="HIGH_CYCLOMATIC_COMPLEXITY",
                    message=(
                        f"Function '{block.name}' has a cyclomatic complexity of {block.complexity}. "
                        f"High complexity increases the risk of bugs and makes thorough testing harder."
                    ),
                    severity=sev,
                    function_name=block.name,
                    line=block.lineno,
                    metric_value=block.complexity,
                )
            )
    return findings


def _analyze_design_issues(tree: ast.Module) -> list[Finding]:
    """
    Design Issue Detection stage — detects the "God Object" anti-pattern:
    a class with an excessive number of methods, indicating it's taking on
    too many responsibilities (violates Single Responsibility Principle).
    """
    findings: list[Finding] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            method_count = sum(
                1 for item in node.body if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
            )
            sev = severity.score_large_class(method_count)
            if sev:
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
                        line=node.lineno,
                        metric_value=method_count,
                    )
                )
    return findings


def analyze_python(code: str) -> list[Finding]:
    """
    Entry point for Python code analysis. Orchestrates all four parallel
    analyses (code smells, complexity, design issues, best practices) and
    returns a single flat list of findings.

    ASSUMES the code has already passed syntax validation (Milestone 1's
    syntax_validator.py) — this function does not re-validate syntax.
    """
    tree = ast.parse(code)
    findings: list[Finding] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            findings.extend(_analyze_function(node))

    findings.extend(_analyze_complexity(code))
    findings.extend(_analyze_design_issues(tree))

    logger.info("Python analysis complete: %d findings", len(findings))
    return findings
