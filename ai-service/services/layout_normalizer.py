import logging
from typing import Any

from schemas.layout import LayoutSchema

logger = logging.getLogger(__name__)


class LayoutNormalizationError(Exception):
    pass


def validate_and_normalize(raw: dict[str, Any]) -> LayoutSchema:
    """Validate and normalize a raw layout dict into a LayoutSchema."""

    # Parse via Pydantic (handles type coercion and basic validation)
    layout = LayoutSchema.model_validate(raw)

    errors: list[str] = []

    # Check for duplicate row labels within each section
    for section in layout.sections:
        row_labels = [r.label for r in section.rows]
        duplicates = [l for l in row_labels if row_labels.count(l) > 1]
        if duplicates:
            errors.append(
                f"Section '{section.name}' has duplicate row labels: {set(duplicates)}"
            )

    # Check all seat counts are positive (already enforced by Pydantic, but double-check)
    for section in layout.sections:
        for row in section.rows:
            if row.seat_count <= 0:
                errors.append(
                    f"Section '{section.name}', row '{row.label}' has invalid seat_count: {row.seat_count}"
                )

    # Calculate and verify total capacity
    total = sum(row.seat_count for section in layout.sections for row in section.rows)
    layout.metadata["total_capacity"] = total

    if errors:
        raise LayoutNormalizationError("; ".join(errors))

    return layout
