"""
Secoria Demo Sample 2 — Moderate Complexity & Code Smells
Expected Result:
- Code Health Score: ~70 / 100
- Total Findings: 2-3 Code Quality Findings
- Severity: MEDIUM
"""

class OrderProcessor:
    """
    Demonstrates code smells: High Cyclomatic Complexity and Deep Nesting.
    """
    def __init__(self):
        self.orders = []

    # High Complexity & Long Method Code Smell
    def process_complex_shipping(self, user_role, is_active, is_verified, access_level, region_code, department):
        if is_active:
            if is_verified:
                if user_role == "admin":
                    if access_level > 5:
                        if region_code == "US" or region_code == "EU":
                            if department == "IT" or department == "Security":
                                return "Full Expedited Shipping"
                            else:
                                return "Standard Admin Shipping"
                        else:
                            return "Regional Restrict Shipping"
                    else:
                        return "Basic Admin Shipping"
                elif user_role == "manager":
                    if access_level > 3:
                        return "Manager Level 2 Shipping"
                    else:
                        return "Manager Level 1 Shipping"
                else:
                    return "Regular User Shipping"
            else:
                return "Unverified Shipping"
        else:
            return "Inactive User Order"

    # Dead / Unused code path
    def unused_helper_method(self):
        pass
