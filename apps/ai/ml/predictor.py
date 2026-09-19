CATEGORIES = ("Network", "Hardware", "Software", "Account", "Printer")

KEYWORDS = {
    "Network": [
        "mạng", "mang", "network", "wifi", "wi-fi", "internet", "kết nối", "ket noi",
        "lan", "vpn", "mất mạng", "mat mang", "router", "switch", "không vào được web",
    ],
    "Hardware": [
        "máy tính", "may tinh", "hardware", "màn hình", "man hinh", "bàn phím", "ban phim",
        "chuột", "chuot", "ram", "cpu", "ổ cứng", "o cung", "pin", "nguồn", "nguon",
        "laptop", "khởi động", "khoi dong", "hỏng", "hong", "cháy", "chay", "treo máy", "treo may",
    ],
    "Software": [
        "phần mềm", "phan mem", "software", "ứng dụng", "ung dung", "hệ điều hành", "he dieu hanh",
        "windows", "excel", "word", "outlook", "cài đặt", "cai dat", "update", "crash",
        "lỗi phần mềm", "loi phan mem", "browser", "trình duyệt", "trinh duyet",
    ],
    "Account": [
        "tài khoản", "tai khoan", "account", "mật khẩu", "mat khau", "password",
        "login", "đăng nhập", "dang nhap", "quyền", "quyen", "email", "khóa tài khoản", "khoa tai khoan",
    ],
    "Printer": [
        "máy in", "may in", "printer", "scan", "in ấn", "in an", "giấy", "giay",
        "mực", "muc", "kẹt giấy", "ket giay", "toner", "photocopy",
    ],
}

DEFAULT_CATEGORY = "Software"


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
