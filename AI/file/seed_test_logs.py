"""
Bơm log giả lập vào bảng AccessLog để test Lambda trước khi web ghi log thật.
Tạo 3 user: xem bình thường, crawler tải dồn dập, và chia sẻ tài khoản.
Chạy: python seed_test_logs.py   (cần AWS CLI đã `aws configure`)
"""
import random
import uuid
from datetime import datetime, timedelta, timezone

TABLE = "AccessLog"
REGION = "ap-southeast-1"
LESSON_ID = "00000000-0000-0000-0000-000000000001"  # lesson giả, chỉ để test


def local_time(dt):
    """Giống LocalDateTime của backend (UTC, không có timezone): 2026-11-20T08:30:00.123456"""
    return dt.astimezone(timezone.utc).replace(tzinfo=None).isoformat(timespec="microseconds")


def make_user(email, start, intervals_ms, ips, devices):
    """Ghi item đúng schema bảng AccessLog của backend (Model/AccessLog.java)."""
    items, t = [], start
    first = random.randint(0, 200)
    items.append(dict(action="MANIFEST_REQUEST", t=t, segment=None))
    for i, gap in enumerate(intervals_ms):
        t = t + timedelta(milliseconds=gap)
        items.append(dict(action="SEGMENT_REQUEST", t=t, segment=first + i))
    out = []
    for k, it in enumerate(items):
        out.append({
            "userEmail": email,                       # partition key
            "logId": "VID" + str(uuid.uuid4()),       # sort key, cùng kiểu prefix với LogService
            "actionType": it["action"],               # GSI LogInADay partition key
            "accessedTime": local_time(it["t"]),      # GSI LogInADay sort key
            "lessonId": LESSON_ID,
            "statusCode": 200,
            "ipAddress": ips[k % len(ips)],
            "userAgent": "seed-test-script",
            "device_fingerprint": devices[k % len(devices)],
            **({"segmentCount": it["segment"]} if it["segment"] is not None else {}),
        })
    return out


def generate_items(now=None):
    now = now or datetime.now(timezone.utc)
    start = now - timedelta(minutes=4)
    random.seed(7)
    # Phân phối gần với dữ liệu train: ~3.9s/chunk, 1 lần buffer nhanh lúc đầu
    # gap đầu = manifest -> chunk đầu; gap thứ 2 = 1 lần buffer nhanh
    normal_gaps = [300, 60] + [max(1500, random.gauss(3980, 760)) for _ in range(47)]
    crawler_gaps = [max(8, random.gauss(50, 20)) for _ in range(49)]
    return (
        make_user("user-normal-001@test.local", start, normal_gaps, ["14.161.20.5"], ["dev-a"])
        + make_user("user-crawler-002@test.local", start, crawler_gaps, ["113.22.8.9"], ["dev-b"])
        + make_user("user-sharing-003@test.local", start, normal_gaps,
                    [f"171.24.0.{i}" for i in range(8)], [f"dev-s{i}" for i in range(6)])
    )


if __name__ == "__main__":
    import boto3
    table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE)
    items = generate_items()
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
    print(f"Đã ghi {len(items)} log giả lập vào {TABLE}")
