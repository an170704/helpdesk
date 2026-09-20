CATEGORIES = ("Network", "Hardware", "Software", "Account", "Printer", "Other")

KEYWORDS = {
    "Network": [
        "connect", "connection", "internet", "lan", "network", "offline",
        "router", "switch", "vpn", "wi-fi", "wifi",
    ],
    "Hardware": [
        "battery", "boot", "broken", "computer", "cpu", "dead", "device", "disk",
        "hard drive", "hardware", "keyboard", "laptop", "monitor", "mouse",
        "power", "ram", "screen", "startup",
    ],
    "Software": [
        "app", "application", "browser", "bug", "crash", "error", "excel", "freeze",
        "install", "operating system", "outlook", "software", "update", "windows", "word",
    ],
    "Account": [
        "access", "account", "credentials", "email", "forgot", "locked",
        "login", "password", "permission", "reset", "sign in", "username",
    ],
    "Printer": [
        "cartridge", "ink", "jam", "paper", "photocopy", "print", "printer",
        "printing", "scan", "scanner", "toner",
    ],
}

DEFAULT_CATEGORY = "Other"


def _count_matches(text: str, keywords: list[str]) -> int:
    words = set(text.split())

    matches = 0
    for keyword in keywords:
        if " " in keyword:
            if keyword in text:
                matches += 1
        elif keyword in words:
            matches += 1

    return matches


def predict(subject: str, description: str) -> dict:
    text = f"{subject} {description}".lower()

    scores = {
        category: _count_matches(text, keywords)
        for category, keywords in KEYWORDS.items()
    }

    total = sum(scores.values())
    if total == 0:
        return {"category": DEFAULT_CATEGORY, "confidence": 0.0}

    category = max(scores, key=scores.get)
    confidence = round(scores[category] / total, 3)
    return {"category": category, "confidence": confidence}
