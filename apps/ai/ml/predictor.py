CATEGORIES = (
    "WiFi", "VPN", "Internet",
    "PC/Laptop", "Monitor", "Printer", "Peripherals",
    "Windows/OS", "Office/Applications",
    "Password", "Permissions",
    "Other",
)

KEYWORDS = {
    "WiFi": ["wifi", "wi-fi", "wireless", "access point", "signal"],
    "VPN": ["vpn", "remote access", "tunnel"],
    "Internet": ["internet", "connect", "connection", "network", "lan", "router", "switch", "offline", "web"],
    "PC/Laptop": [
        "computer", "laptop", "pc", "desktop", "boot", "startup", "power",
        "cpu", "ram", "disk", "hard drive", "battery", "dead", "broken", "device",
    ],
    "Monitor": ["monitor", "screen", "display"],
    "Printer": [
        "printer", "print", "printing", "scan", "scanner", "paper", "jam",
        "ink", "toner", "cartridge", "photocopy",
    ],
    "Peripherals": ["keyboard", "mouse", "headset", "webcam", "usb", "dock", "charger", "speaker"],
    "Windows/OS": ["windows", "operating system", "os", "blue screen", "update", "install"],
    "Office/Applications": [
        "excel", "word", "outlook", "teams", "browser", "app", "application",
        "software", "crash", "freeze", "bug", "error",
    ],
    "Password": ["password", "login", "sign in", "forgot", "reset", "locked", "username", "credentials"],
    "Permissions": ["permission", "access", "rights", "role", "shared folder"],
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
