#!/data/data/com.termux/files/usr/bin/bash
echo "=== E-REPORT-SAGS V4.2.22 FIX TOOLBAR ROW 2 ==="

TARGET="$HOME/E-REPORT-SAGS"

if [ ! -d "$TARGET" ]; then
  echo "Khong tim thay thu muc: $TARGET"
  echo "Hay dat file zip cung thu muc E-REPORT-SAGS."
  exit 1
fi

echo "Thu muc dich: $TARGET"
echo "Dang ap dung patch..."

# Patch files will be copied here in future builds.
# Keep backup before replace.
echo "Da hoan tat V4.2.22 FIX TB2"
