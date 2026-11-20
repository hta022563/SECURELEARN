# Triển khai Lambda Anomaly Detection lên AWS

Hướng dẫn này đưa model `isolation_forest_securelearn_v1.pkl` lên cloud theo đúng kiến trúc trong proposal:
**R2 (lưu model) → Lambda container (chạy model) ← EventBridge 5 phút/lần → DynamoDB AnomalyAlert + SNS email.**

Các lệnh viết cho **PowerShell trên Windows**. Region dùng xuyên suốt: `ap-southeast-1` (Singapore).

## Danh sách file

| File | Mô tả |
|---|---|
| `handler.py` | Code Lambda chính — đọc log, tính feature, chấm điểm, ghi alert, gửi email |
| `Dockerfile` | Build container image cho Lambda (Python 3.12) |
| `requirements.txt` | Dependencies: scikit-learn 1.9.1, numpy, pandas, joblib |
| `lambda-env.json` | Biến môi trường cho Lambda (bảng, bucket, ngưỡng, v.v.) |
| `lambda-policy.json` | IAM policy — least privilege (chỉ cấp đúng quyền cần thiết) |
| `trust-policy.json` | Trust policy cho Lambda assume role |
| `r2-secret.example.json` | Template credential để truy cập Cloudflare R2 |
| `seed_test_logs.py` | Script bơm 3 user giả lập (bình thường, crawler, chia sẻ TK) để test |
| `README.md` | Hướng dẫn triển khai 9 bước, từ upload model đến setup EventBridge |

---

## Chuẩn bị

Bạn cần ba thứ:

- **AWS CLI v2** đã cài và đã chạy `aws configure`, dùng tài khoản có quyền admin để triển khai.
- **Docker Desktop** đang chạy.
- **Python 3 kèm boto3** (`pip install boto3`), để chạy script bơm log test.

Mở PowerShell trong thư mục `anomaly-lambda`, rồi đặt sẵn các biến dùng chung:

```powershell
$REGION  = "ap-southeast-1"
$ACCOUNT = aws sts get-caller-identity --query Account --output text
$REPO    = "securelearn-anomaly"
$IMAGE   = "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/${REPO}:v1"
$FUNC    = "securelearn-anomaly-detection"
$ROLE    = "securelearn-anomaly-lambda-role"
echo $ACCOUNT
```

Mở ba file `lambda-policy.json`, `lambda-env.json` và `seed_test_logs.py`. Trong hai file JSON, thay mọi chỗ `ACCOUNT_ID` bằng số tài khoản vừa in ra.

---

## Bước 1: Đưa model lên Cloudflare R2

1. Vào Cloudflare Dashboard → **R2** → **Create bucket** → đặt tên `securelearn-models`.
2. Mở bucket → **Upload**. Tạo thư mục `models` và upload `isolation_forest_securelearn_v1.pkl` vào đó.
   Đường dẫn cuối cùng phải là `models/isolation_forest_securelearn_v1.pkl`.

   "continue here"
3. Vào **R2** → **Manage R2 API Tokens** → **Create API token**:
   - Permission: **Object Read only**
   - Specify bucket: chỉ chọn `securelearn-models`
4. Sau khi tạo token, copy ba giá trị: **Access Key ID**, **Secret Access Key** và **endpoint** (`https://<account_id>.r2.cloudflarestorage.com`).

## Bước 2: Lưu credential R2 vào Secrets Manager

Copy `r2-secret.example.json` thành `r2-secret.json` rồi điền ba giá trị vừa lấy ở bước 1. Sau đó chạy:

```powershell
aws secretsmanager create-secret --name securelearn/r2-model-reader `
  --secret-string file://r2-secret.json --region $REGION

Remove-Item r2-secret.json   # xoá file chứa key sau khi tạo xong
```

Secret được mã hoá bằng KMS key mặc định của AWS (`aws/secretsmanager`), nên không phát sinh thêm phí CMK.

## Bước 3: Tạo bảng AnomalyAlert

Bỏ qua phần này nếu bảng `AccessLog` (kèm GSI `byDate`) đã có từ trước. Nếu chưa có, tạo cả hai bảng:

```powershell
aws dynamodb create-table --table-name AccessLog `
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=accessTime,AttributeType=S AttributeName=logDate,AttributeType=S `
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=accessTime,KeyType=RANGE `
  --global-secondary-indexes "IndexName=byDate,KeySchema=[{AttributeName=logDate,KeyType=HASH},{AttributeName=accessTime,KeyType=RANGE}],Projection={ProjectionType=ALL}" `
  --billing-mode PAY_PER_REQUEST --region $REGION

aws dynamodb create-table --table-name AnomalyAlert `
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=alertTime,AttributeType=S `
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=alertTime,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST --region $REGION
```

## Bước 4: Tạo SNS topic để gửi email cảnh báo

```powershell
$TOPIC = aws sns create-topic --name securelearn-anomaly-alerts --region $REGION --query TopicArn --output text
aws sns subscribe --topic-arn $TOPIC --protocol email --notification-endpoint "email-admin@gmail.com" --region $REGION
```

Mở hộp thư và bấm **Confirm subscription**. Nếu không xác nhận, bạn sẽ không nhận được email cảnh báo nào.

## Bước 5: Build image và đẩy lên Amazon ECR

```powershell
aws ecr create-repository --repository-name $REPO --region $REGION

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

docker buildx build --platform linux/amd64 --provenance=false --sbom=false -t $IMAGE --push .
```

Bắt buộc phải có hai flag `--provenance=false --sbom=false`. Docker Desktop của team đang mặc định gắn *attestation manifest* (thấy trong log build backend), và Lambda sẽ từ chối image có kèm manifest này với lỗi "image manifest is not supported".

## Bước 6: Tạo IAM Role cho Lambda

```powershell
aws iam create-role --role-name $ROLE --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy --role-name $ROLE `
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy --role-name $ROLE --policy-name securelearn-anomaly-access `
  --policy-document file://lambda-policy.json

$ROLE_ARN = aws iam get-role --role-name $ROLE --query Role.Arn --output text
Start-Sleep -Seconds 15   # chờ IAM role có hiệu lực
```

Role chỉ được cấp đúng các quyền nó cần: Query log, ghi alert, publish SNS và đọc một secret duy nhất. Đây là nguyên tắc Least Privilege trong trụ cột Security.

## Bước 7: Tạo Lambda từ image

```powershell
aws lambda create-function --function-name $FUNC `
  --package-type Image --code ImageUri=$IMAGE `
  --role $ROLE_ARN --architectures x86_64 `
  --memory-size 1024 --timeout 120 `
  --environment file://lambda-env.json --region $REGION

aws lambda wait function-active-v2 --function-name $FUNC --region $REGION
```

## Bước 8: Test với log giả lập

Script `seed_test_logs.py` bơm 3 user giả lập vào `AccessLog`:

| User | Hành vi | Kết quả mong đợi |
|---|---|---|
| `user-normal-001` | Xem bình thường, khoảng 3,9 giây/chunk | Không báo |
| `user-crawler-002` | Tải dồn dập, khoảng 50 ms/chunk | **Báo bất thường** |
| `user-sharing-003` | 8 IP, 6 thiết bị | Không báo (model v1 chưa học được kiểu này) |

Log được ghi trong khoảng 4 phút gần nhất, còn Lambda chỉ đọc 5 phút gần nhất. Vì vậy hãy chạy lệnh invoke **trong vòng 1 phút** sau khi seed:

```powershell
python seed_test_logs.py
aws lambda invoke --function-name $FUNC --region $REGION out.json
Get-Content out.json
```

Kết quả mong đợi có dạng: `{"logs": 150, "users_scored": 3, "anomalies": 1, "new_alerts": 1}`.

Kiểm tra lại ở ba nơi:

- **Email:** nhận được mail "[SecureLearn] 1 canh bao bat thuong" nhắc tới `user-crawler-002`.
- **DynamoDB:** vào `AnomalyAlert` → **Explore table items**, thấy bản ghi có `status = OPEN` và đủ 12 feature.
- **Log của Lambda:** xem bằng lệnh:
  ```powershell
  aws logs tail /aws/lambda/$FUNC --since 10m --region $REGION
  ```

Lần chạy đầu sẽ chậm khoảng 5–10 giây vì cold start và tải model từ R2. Các lần sau nhanh hơn nhiều vì model đã được giữ trong bộ nhớ.

## Bước 9: Cho Lambda tự chạy mỗi 5 phút bằng EventBridge

```powershell
$RULE_ARN = aws events put-rule --name securelearn-anomaly-every-5min `
  --schedule-expression "rate(5 minutes)" --region $REGION --query RuleArn --output text

aws lambda add-permission --function-name $FUNC --statement-id eventbridge-5min `
  --action lambda:InvokeFunction --principal events.amazonaws.com `
  --source-arn $RULE_ARN --region $REGION

$FUNC_ARN = aws lambda get-function --function-name $FUNC --region $REGION --query Configuration.FunctionArn --output text
aws events put-targets --rule securelearn-anomaly-every-5min --targets "Id=1,Arn=$FUNC_ARN" --region $REGION
```

Từ đây Lambda chạy 24/7 trên cloud. Mỗi tháng khoảng 8.640 lần gọi, vẫn nằm trong Free Tier.

---

## Cập nhật khi có model hoặc code mới

**Khi có model mới**, ví dụ v2: upload file lên R2, rồi đổi biến `MODEL_KEY` của Lambda.

```powershell
aws lambda update-function-configuration --function-name $FUNC --environment file://lambda-env.json --region $REGION
```

Lệnh này dùng lại toàn bộ `lambda-env.json`, nên hãy sửa `MODEL_KEY` trong file trước khi chạy. Nếu model mới train bằng phiên bản scikit-learn khác, sửa cả `requirements.txt` và build lại image.

**Khi sửa `handler.py`:**

```powershell
docker buildx build --platform linux/amd64 --provenance=false --sbom=false -t $IMAGE --push .
aws lambda update-function-code --function-name $FUNC --image-uri $IMAGE --region $REGION
```

## Định dạng log mà backend cần ghi vào AccessLog

Lambda đọc các trường dưới đây. Backend Spring Boot (hoặc player gửi về backend) cần ghi đúng định dạng này:

| Trường | Ví dụ | Ghi chú |
|---|---|---|
| `userId` | `user-123` | Partition key |
| `accessTime` | `2026-11-10T08:30:00.123Z` | Sort key, ISO UTC, có mili-giây |
| `logDate` | `2026-11-10` | Partition key của GSI `byDate` |
| `action` | `MANIFEST` / `CHUNK` / `ERROR` | |
| `videoId` | `video-demo-01` | |
| `chunkIndex` | `42` | Chỉ có khi `action = CHUNK` |
| `totalChunks` | `600` | Tổng số chunk của video |
| `ip` | `14.161.20.5` | |
| `deviceId` | `dev-a` | |

## Dọn dẹp sau workshop

```powershell
aws events remove-targets --rule securelearn-anomaly-every-5min --ids 1 --region $REGION
aws events delete-rule --name securelearn-anomaly-every-5min --region $REGION
aws lambda delete-function --function-name $FUNC --region $REGION
aws ecr delete-repository --repository-name $REPO --force --region $REGION
aws iam delete-role-policy --role-name $ROLE --policy-name securelearn-anomaly-access
aws iam detach-role-policy --role-name $ROLE --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name $ROLE
aws sns delete-topic --topic-arn $TOPIC --region $REGION
aws secretsmanager delete-secret --secret-id securelearn/r2-model-reader --force-delete-without-recovery --region $REGION
aws dynamodb delete-table --table-name AnomalyAlert --region $REGION
aws logs delete-log-group --log-group-name /aws/lambda/$FUNC --region $REGION
```
