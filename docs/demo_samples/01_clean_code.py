"""
Secoria Demo Sample 1 — Clean, Secure Python Code
Expected Result:
- Code Health Score: 100 / 100
- Total Findings: 0
- Severity: LOW (Clean)
"""

from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class UserProfileService:
    """A well-structured user profile service adhering to clean code standards."""
    
    def __init__(self, database_connection):
        self.db = database_connection

    def get_user_profile(self, user_id: int) -> Optional[Dict[str, str]]:
        """Retrieves user profile using safe parameterized database queries."""
        if user_id <= 0:
            logger.warning("Invalid user ID provided: %s", user_id)
            return None

        # Safe parameterized query avoiding SQL injection
        query = "SELECT id, username, email FROM users WHERE id = ?"
        cursor = self.db.cursor()
        cursor.execute(query, (user_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
            
        return {
            "id": row[0],
            "username": row[1],
            "email": row[2]
        }

    def calculate_discount(self, order_amount: float, loyalty_tier: str) -> float:
        """Calculates order discount using clean, low-complexity decision logic."""
        if order_amount <= 0:
            return 0.0

        tier_discounts = {
            "gold": 0.20,
            "silver": 0.10,
            "bronze": 0.05
        }
        
        rate = tier_discounts.get(loyalty_tier.lower(), 0.0)
        return round(order_amount * rate, 2)
