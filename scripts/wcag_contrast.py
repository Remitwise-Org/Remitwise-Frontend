# Simple WCAG contrast checker
# Usage: python3 scripts/wcag_contrast.py

from typing import Tuple

colors = {
    "background": "#141414",
    "gradient1": "#0f0f0f",
    "gradient2": "#0a0a0a",
    "surface": "#1a1a1a",
    "border": "#2a2a2a",
    "brand_red": "#D72323",
    "white": "#ffffff",
    "gray400": "#9CA3AF",  # Tailwind gray-400
}

pairs = [
    ("white", "background"),
    ("gray400", "background"),
    ("white", "gradient2"),
    ("brand_red", "background"),
    ("brand_red", "surface"),
    ("white", "brand_red"),
]


def hex_to_rgb(h: str) -> Tuple[float, float, float]:
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255.0 for i in (0, 2, 4))


def linearize(c: float) -> float:
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def luminance(hexcolor: str) -> float:
    r, g, b = hex_to_rgb(hexcolor)
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def contrast_ratio(hex1: str, hex2: str) -> float:
    l1 = luminance(hex1)
    l2 = luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


if __name__ == '__main__':
    print("WCAG contrast report:\n")
    for a, b in pairs:
        c = contrast_ratio(colors[a], colors[b])
        print(f"{a} ({colors[a]}) on {b} ({colors[b]}) -> {c:.2f}: ", end='')
        if c >= 7:
            print("AAA\n")
        elif c >= 4.5:
            print("AA\n")
        elif c >= 3:
            print("AA Large (>=3)\n")
        else:
            print("Fail\n")
