import re
from dataclasses import dataclass

import asyncpg

# Each rule's free-text "category" is matched against these keyword groups to
# decide which pattern actually scans the prompt, and which placeholder label
# replaces a match during sanitization. A rule whose category doesn't match
# any recognized keyword is configured but not yet enforceable — this is a
# known limitation of keyword-based detection (see the "how could we detect
# risk" discussion: a real system would layer an LLM-based semantic check on
# top for exactly this gap).
_CATEGORY_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    (
        "pii",
        re.compile(
            r"\b[STFG]\d{7}[A-Z]\b"  # Singapore-style NRIC
            r"|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"  # phone number
            r"|[\w.+-]+@[\w-]+\.[\w.-]+",  # email
            re.IGNORECASE,
        ),
        "[MASKED_PII]",
    ),
    (
        "personal",
        re.compile(r"\b[STFG]\d{7}[A-Z]\b|[\w.+-]+@[\w-]+\.[\w.-]+", re.IGNORECASE),
        "[MASKED_PII]",
    ),
    (
        "ic",
        re.compile(r"\b[STFG]\d{7}[A-Z]\b|\b\d{6}-\d{2}-\d{4}\b", re.IGNORECASE),
        "[MASKED_IC]",
    ),
    (
        "financial",
        re.compile(r"(?:RM|\$)\s?[\d,]+(?:\.\d+)?|\b(?:\d[ -]*?){13,19}\b", re.IGNORECASE),
        "[MASKED_FINANCIAL]",
    ),
    (
        "salary",
        re.compile(r"(?:RM|\$)\s?[\d,]+(?:\.\d+)?", re.IGNORECASE),
        "[MASKED_SALARY]",
    ),
    (
        "credit card",
        re.compile(r"\b(?:\d[ -]*?){13,19}\b"),
        "[MASKED_CARD]",
    ),
    (
        "credential",
        re.compile(r"\bsk-\w+|\bAKIA\w+|\bghp_\w+|password\s*[:=]\s*\S+", re.IGNORECASE),
        "[MASKED_CREDENTIAL]",
    ),
    (
        "api key",
        re.compile(r"\bsk-\w+|\bAKIA\w+|\bghp_\w+", re.IGNORECASE),
        "[MASKED_CREDENTIAL]",
    ),
    (
        "source code",
        re.compile(r"\bdef\s+\w+\(|\bfunction\s+\w+\(|\bclass\s+\w+|\bimport\s+\w+"),
        "[MASKED_CODE]",
    ),
    (
        "name",
        re.compile(r"\b[A-Z][a-z]+\s[A-Z][a-z]+\b"),
        "[MASKED_NAME]",
    ),
    (
        "employee",
        re.compile(r"\b[A-Z][a-z]+\s[A-Z][a-z]+\b"),
        "[MASKED_NAME]",
    ),
]

_RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
# REQUIRE_APPROVAL sits between SANITIZE and BLOCK: unlike SANITIZE it never
# auto-forwards anything, but unlike BLOCK it isn't a hard, permanent refusal
# — a human can still let it through.
_ACTION_ORDER = {"ALLOW": 0, "WARN": 1, "SANITIZE": 2, "REQUIRE_APPROVAL": 3, "BLOCK": 4}


@dataclass
class RuleMatch:
    rule_id: str
    category: str
    risk_level: str
    action: str
    matched_text: str
    placeholder: str


@dataclass
class SanitizationChange:
    original: str
    replacement: str


def detect(prompt_text: str, active_rules: list[asyncpg.Record]) -> list[RuleMatch]:
    matches: list[RuleMatch] = []
    seen_spans: set[tuple[int, int]] = set()

    for rule in active_rules:
        category_lower = rule["category"].lower()
        # A composite category like "IC and Credit Card Submission" can
        # legitimately match multiple keyword groups — check all of them,
        # not just the first (a single `next()` pick previously meant "ic"
        # matching first could steal the category away from "credit card"
        # and silently miss real card numbers).
        matching_entries = [
            (pattern, placeholder)
            for keyword, pattern, placeholder in _CATEGORY_PATTERNS
            if keyword in category_lower
        ]

        for pattern, placeholder in matching_entries:
            for found in pattern.finditer(prompt_text):
                span = found.span()
                if span in seen_spans:
                    continue  # another rule already claimed this exact snippet
                seen_spans.add(span)
                matches.append(
                    RuleMatch(
                        rule_id=rule["id"],
                        category=rule["category"],
                        risk_level=rule["riskLevel"],
                        action=rule["action"],
                        matched_text=found.group(0),
                        placeholder=placeholder,
                    )
                )
    return matches


def most_restrictive(actions: list[str]) -> str:
    """The most restrictive action among independently-resolved actions wins
    — e.g. combining a sensitive-data-rule action with a use-case-policy
    action for the same prompt."""
    if not actions:
        return "ALLOW"
    return max(actions, key=lambda a: _ACTION_ORDER[a])


def resolve_action(matches: list[RuleMatch]) -> str:
    """The most restrictive action among all matches wins."""
    return most_restrictive([m.action for m in matches])


def sanitize(
    prompt_text: str, matches: list[RuleMatch]
) -> tuple[str, list[SanitizationChange]]:
    sanitized = prompt_text
    changes: list[SanitizationChange] = []
    for match in matches:
        if match.matched_text and match.matched_text in sanitized:
            sanitized = sanitized.replace(match.matched_text, match.placeholder)
            changes.append(SanitizationChange(original=match.matched_text, replacement=match.placeholder))
    return sanitized, changes
