#!/usr/bin/env python3
"""SMTP dispatcher. Internal SAGS recipients only; CSV without signatures."""
import csv
import html
import io
import json
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage

RECIPIENTS = ("HUNGHT-CXR@SAGS.VN", "XUANDT-CXR@SAGS.VN", "MANAGERONDUTY-CXR@SAGS.VN")
HEADERS = ["time","code","action","actor","actorUid","shift","from","to","reason","details","related"]

def cleaned(value):
    text = str(value if value is not None else "")
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text

def attachment(report):
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["Thời gian","Máy","Tác vụ","Người thực hiện","UID","Ca","Trước","Sau","Lý do","Chi tiết","Máy liên quan"])
    for event in report["rows"]:
        writer.writerow([cleaned(event.get(k, "")) for k in HEADERS])
    return ("\ufeff" + out.getvalue()).encode("utf-8")

def html_table(rows, columns, limit=70):
    if not rows:
        return "<p>Không có.</p>"
    lines = ["<table border='1' cellspacing='0' cellpadding='6'><tbody>"]
    for row in rows[:limit]:
        lines.append("<tr>" + "".join("<td>" + html.escape(str(row.get(k, ""))) + "</td>" for k in columns) + "</tr>")
    lines.append("</tbody></table>")
    return "".join(lines)

def render(report):
    statuses = "".join("<li>" + html.escape(k) + ": <b>" + str(int(v)) + "</b></li>" for k,v in report["status"].items())
    return (
        "<html lang='vi'><meta charset='utf-8'><body style='font:14px Arial,sans-serif;color:#1b3548'>"
        "<h2>E-REPORT SAGS · BÁO CÁO BỘ ĐÀM</h2>"
        "<p>Kỳ: " + html.escape(report["from"]) + " đến " + html.escape(report["to"]) + " (giờ Việt Nam)</p>"
        "<p>Tổng thiết bị: <b>" + str(int(report["totalDevices"])) + "</b> · Tổng sự kiện: <b>" + str(int(report["totalEvents"])) + "</b></p>"
        "<h3>Tình trạng máy hiện tại</h3><ul>" + statuses + "</ul>"
        "<h3>Chưa trả quá 12 giờ</h3>" + html_table(report["overdue"], ["code","holder"]) +
        "<h3>Cần sạc / kiểm tra / bảo trì</h3>" + html_table(report["unresolved"], ["code","status","reason"]) +
        "<h3>Sự cố trong kỳ</h3>" + html_table(report["problems"], ["code","time","reason","actor","details"]) +
        "<h3>Lỗi lặp lại trong kỳ (2 lần trở lên)</h3>" + html_table(report["recurring"], ["code","count"]) +
        "<p>Tệp CSV đính kèm chứa lịch sử chi tiết của kỳ. Chữ ký không được gửi qua email.</p>"
        "<p><small>Hệ thống E-REPORT SAGS · Email tự động</small></p></body></html>"
    )

def send(report):
    host=os.environ["SAGS_SMTP_HOST"]
    user=os.environ["SAGS_SMTP_USER"]
    password=os.environ["SAGS_SMTP_PASSWORD"]
    sender=os.environ["SAGS_SMTP_FROM"]
    port=int(os.getenv("SAGS_SMTP_PORT") or "465")
    if "\r" in sender or "\n" in sender or "@" not in sender:
        raise RuntimeError("Invalid SMTP sender identity")
    msg=EmailMessage()
    msg["From"]=sender
    msg["To"]=", ".join(RECIPIENTS)
    label="NGÀY" if report["period"]=="daily" else "TUẦN"
    msg["Subject"]=f'[E-REPORT SAGS] BÁO CÁO BỘ ĐÀM {label} {report["from"]} - {report["to"]}'
    msg.set_content("E-REPORT SAGS radio asset report. See HTML and attached CSV.")
    msg.add_alternative(render(report),subtype="html")
    msg.add_attachment(attachment(report),maintype="application",subtype="octet-stream",
                       filename=f'radio-{report["period"]}-{report["from"]}.csv')
    ctx=ssl.create_default_context()
    if port==465:
        with smtplib.SMTP_SSL(host,port,context=ctx,timeout=30) as c:
            c.login(user,password)
            c.send_message(msg)
    else:
        with smtplib.SMTP(host,port,timeout=30) as c:
            c.starttls(context=ctx)
            c.login(user,password)
            c.send_message(msg)

if __name__=="__main__":
    with open(sys.argv[1],encoding="utf-8") as f:
        report=json.load(f)
    send(report)
    print("Report delivered to three SAGS distribution addresses")
