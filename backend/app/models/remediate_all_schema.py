from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RemediateAllRequest(BaseModel):
    """Request model for auto-remediating an entire codebase based on findings."""
    full_code: str = Field(..., description="The complete raw source code submitted for review")
    language: str = Field(..., description="Programming language: 'python' or 'java'")
    findings: List[Dict[str, Any]] = Field(default_factory=list, description="List of detected findings from inspection")
    health_score: Optional[int] = Field(default=100, description="Current health score of the un-remediated code")


class RemediateAllResponse(BaseModel):
    """Response model returning the fully patched, clean source code and audit trail."""
    remediated_code: str = Field(..., description="Complete, vulnerability-free, refactored source code")
    changelog: List[str] = Field(default_factory=list, description="List of specific security and quality fixes applied")
    original_score: int = Field(..., description="Health score before remediation")
    projected_score: int = Field(default=100, description="Projected health score after remediation")
    fixed_count: int = Field(..., description="Number of issues resolved")
    summary: str = Field(..., description="Executive summary of the remediation actions")
