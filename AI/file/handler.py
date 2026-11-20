"""
SecureLearn - Lambda Anomaly Detection
Chạy mỗi 5 phút (EventBridge): đọc access log mức chunk từ DynamoDB,
tính 12 feature cho từng user, chấm điểm bằng Isolation Forest (tải từ R2),
ghi AnomalyAlert và gửi email qua SNS.
"""
import io
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3
import joblib
import numpy as np
import pandas as pd
from boto3.dynamodb.conditions import Key

_model = None
_features = None


def env(name, default=None):
    value = os.environ.get(name, default)
    if value is None:
        raise RuntimeError(f"Thiếu biến môi trường {name}")
    return value


def iso(dt):
    """Định dạng giống backend ghi: 2026-11-10T08:30:00.000Z"""
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# ---------------------------------------------------------------- model
def load_model():
    """Tải model từ R2 một lần, giữ lại cho các lần gọi sau (warm start)."""
    global _model, _features
    if _model is None:
        secret = json.loads(
            boto3.client("secretsmanager")
            .get_secret_value(SecretId=env("R2_SECRET_ID"))["SecretString"]
        )
        r2 = boto3.client(
            "s3",
            endpoint_url=secret["endpoint"],
            aws_access_key_id=secret["accessKeyId"],
            aws_secret_access_key=secret["secretAccessKey"],
            region_name="auto",
        )
        key = env("MODEL_KEY", "models/isolation_forest_securelearn_v1.pkl")
        body = r2.get_object(Bucket=env("R2_BUCKET"), Key=key)["Body"].read()
        _model = joblib.load(io.BytesIO(body))
        _features = list(_model.feature_names_in_)
        print(f"Loaded model {key} with {len(_features)} features")
    return _model, _features


# ---------------------------------------------------------------- logs
# Backend AccessLog (Java): PK userEmail, SK logId, GSI LogInADay = actionType + accessedTime.
# accessedTime là LocalDateTime (không có timezone), ví dụ "2026-11-20T08:30:00.123456".
# Backend chạy trên Lambda nên LocalDateTime.now() là UTC; chạy local thì đặt LOG_TIMEZONE.
VIDEO_ACTIONS = {"MANIFEST_REQUEST": "MANIFEST", "SEGMENT_REQUEST": "CHUNK"}


def local_time_str(dt):
    """Đổi datetime có timezone sang chuỗi LocalDateTime theo giờ backend."""
    name = env("LOG_TIMEZONE", "UTC")
    tz = timezone.utc if name == "UTC" else ZoneInfo(name)
    return dt.astimezone(tz).replace(tzinfo=None).isoformat(timespec="microseconds")


def fetch_logs(now, lookback_min):
    """Query GSI LogInADay cho từng actionType video trong khoảng [now - lookback, now]."""
    table = boto3.resource("dynamodb").Table(env("ACCESS_LOG_TABLE", "AccessLog"))
    start, end = local_time_str(now - timedelta(minutes=lookback_min)), local_time_str(now)
    items = []
    for action in VIDEO_ACTIONS:
        kwargs = {
            "IndexName": env("ACCESS_LOG_INDEX", "LogInADay"),
            "KeyConditionExpression": Key("actionType").eq(action)
            & Key("accessedTime").between(start, end),
        }
        while True:
            resp = table.query(**kwargs)
            items.extend(resp["Items"])
            if "LastEvaluatedKey" not in resp:
                break
            kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
    return items


def to_frame(items):
    """Đổi tên cột backend sang tên cột lúc train model."""
    df = pd.DataFrame(items)
    for col in ["segmentCount", "statusCode", "ipAddress", "device_fingerprint"]:
        if col not in df.columns:
            df[col] = None
    df["userId"] = df["userEmail"]
    ts = pd.to_datetime(df["accessedTime"]).dt.tz_localize(env("LOG_TIMEZONE", "UTC"))
    df["ts_ms"] = (ts - pd.Timestamp("1970-01-01", tz="UTC")) / pd.Timedelta(milliseconds=1)
    status = pd.to_numeric(df["statusCode"], errors="coerce").fillna(200)
    df["action"] = df["actionType"].map(VIDEO_ACTIONS).where(status < 400, "ERROR")
    df["chunkIndex"] = pd.to_numeric(df["segmentCount"], errors="coerce")  # backend lưu index segment ở đây
    df["totalChunks"] = None  # backend chưa ghi tổng số segment -> coverage_ratio = 1.0
    df["ip"] = df["ipAddress"]
    df["deviceId"] = df["device_fingerprint"]
    return df


# ---------------------------------------------------------------- features
def compute_features(g, window):
    """
    Tính 12 feature trên `window` request gần nhất của 1 user.
    QUAN TRỌNG: định nghĩa ở đây phải KHỚP với notebook train.
    Nếu notebook tính khác (ví dụ sequential_ratio), sửa hàm này cho giống.
    """
    g = g.sort_values("ts_ms").tail(window)
    chunks = g[g["action"] == "CHUNK"]
    t = chunks["ts_ms"].to_numpy(dtype=float)
    iv = np.diff(t) if len(t) > 1 else np.array([0.0])
    idx = chunks["chunkIndex"].dropna().astype(int).to_numpy()
    total_chunks = chunks["totalChunks"].dropna()
    n_total = len(g)
    n_chunks = max(len(chunks), 1)

    return {
        "avg_download_interval": float(iv.mean()),
        "median_download_interval": float(np.median(iv)),
        "std_download_interval": float(iv.std()),
        "min_download_interval": float(iv.min()),
        "total_requests": float(n_total),
        "unique_chunk_count": float(len(set(idx))),
        "sequential_ratio": float(np.mean(np.diff(idx) == 1)) if len(idx) > 1 else 0.0,
        "coverage_ratio": float(len(set(idx)) / total_chunks.max())
        if len(total_chunks) and total_chunks.max() > 0 else 1.0,
        "error_rate": float((g["action"] == "ERROR").sum() / n_total),
        "manifest_to_chunk_ratio": float((g["action"] == "MANIFEST").sum() / n_chunks),
        "unique_ip_count": float(g["ip"].dropna().nunique()),
        "unique_device_count": float(g["deviceId"].dropna().nunique()),
    }


def score_users(df, model, features, window, min_requests):
    rows, users = [], []
    for user_id, g in df.groupby("userId"):
        if len(g) < min_requests:  # quá ít dữ liệu -> bỏ qua, tránh báo nhầm
            continue
        rows.append(compute_features(g, window))
        users.append(user_id)
    if not rows:
        return pd.DataFrame()
    X = pd.DataFrame(rows, index=users)[features]
    X["score"] = model.decision_function(X[features])
    return X


# ---------------------------------------------------------------- alerts
def recently_alerted(table, user_id, now, minutes):
    resp = table.query(
        KeyConditionExpression=Key("userId").eq(user_id)
        & Key("alertTime").gte(iso(now - timedelta(minutes=minutes))),
        Limit=1,
    )
    return resp["Count"] > 0


def save_and_notify(anomalies, now, features):
    table = boto3.resource("dynamodb").Table(env("ALERT_TABLE", "AnomalyAlert"))
    dedup_min = int(env("DEDUP_MINUTES", "30"))
    new_alerts = []
    for user_id, row in anomalies.iterrows():
        if recently_alerted(table, user_id, now, dedup_min):
            continue
        feats = {f: round(float(row[f]), 4) for f in features}
        table.put_item(Item={
            "userId": user_id,
            "alertTime": iso(now),
            "alertId": str(uuid.uuid4()),
            "score": Decimal(str(round(float(row["score"]), 4))),
            "status": "OPEN",
            "modelKey": env("MODEL_KEY", "models/isolation_forest_securelearn_v1.pkl"),
            "features": json.loads(json.dumps(feats), parse_float=Decimal),
        })
        new_alerts.append((user_id, float(row["score"]), feats))

    if new_alerts:
        lines = [f"Phát hiện {len(new_alerts)} tài khoản có hành vi bất thường lúc {iso(now)}:\n"]
        for user_id, score, f in new_alerts:
            lines.append(
                f"- User {user_id} | score={score:.3f} | requests={f['total_requests']:.0f} "
                f"| avg_interval={f['avg_download_interval']:.0f}ms "
                f"| IPs={f['unique_ip_count']:.0f} | devices={f['unique_device_count']:.0f}"
            )
        boto3.client("sns").publish(
            TopicArn=env("SNS_TOPIC_ARN"),
            Subject=f"[SecureLearn] {len(new_alerts)} canh bao bat thuong",
            Message="\n".join(lines),
        )
    return new_alerts


# ---------------------------------------------------------------- entry
def lambda_handler(event, context):
    now = datetime.now(timezone.utc)
    lookback = int(env("LOOKBACK_MINUTES", "5"))
    window = int(env("WINDOW_SIZE", "50"))
    min_requests = int(env("MIN_REQUESTS", "10"))
    threshold = float(env("SCORE_THRESHOLD", "0"))  # 0 = ngưỡng mặc định của model

    model, features = load_model()
    items = fetch_logs(now, lookback)
    print(f"Fetched {len(items)} log items from last {lookback} minutes")
    if not items:
        return {"logs": 0, "users_scored": 0, "anomalies": 0}

    scored = score_users(to_frame(items), model, features, window, min_requests)
    if scored.empty:
        return {"logs": len(items), "users_scored": 0, "anomalies": 0}

    print(scored[["score"]].to_string())
    anomalies = scored[scored["score"] < threshold]
    new_alerts = save_and_notify(anomalies, now, features) if not anomalies.empty else []
    return {
        "logs": len(items),
        "users_scored": len(scored),
        "anomalies": len(anomalies),
        "new_alerts": len(new_alerts),
    }
