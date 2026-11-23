# To-do

## Playback → Lambda
- [ ] Create secret `securelearn/playback`
- [x] Pass S3 bucket/region env vars to the function (S3_BUCKET_NAME in Globals; region defaults to ap-southeast-1)
- [ ] Check key/segment bytes arrive intact through API Gateway
- [ ] Check largest segment fits Lambda's 6 MB response limit (after base64, ~4.5 MB raw)
- [ ] Manifest URLs point at API Gateway, not localhost
- [ ] Frontend: playback routes + `buildManifestUrl` → Lambda
- [ ] Redeploy template (playback route GET → ANY so the CORS preflight reaches Spring)
- [ ] Test enrolled / unenrolled / expired token

## Payment → Lambda
- [ ] Create secret `securelearn/momo`
- [ ] Use MoMo test endpoint (paySandbox unreachable from Lambda)
- [ ] IPN/redirect URLs → API Gateway URL
- [ ] Frontend: `POST /enrollment/{courseId}` → Lambda
- [ ] Test payment → IPN → enrollment in RDS

## Upload → Lambda
- [ ] FFmpeg layer (or MediaConvert)
- [ ] Make `/process` async (30 s API Gateway limit)
- [ ] IAM covers all S3 paths it writes
- [ ] Frontend: `/upload/` → Lambda
- [ ] Test upload → HLS in S3 → lesson in RDS → plays

## After
- [ ] Secure `/ai/dynamo` (currently public)
- [ ] LogInterceptor: drop per-request `AdminGetUser`; fix fire-and-forget AI send
- [ ] Commit everything

## Other
- [ ] Free courses: add enrollment path that skips MoMo for price 0
