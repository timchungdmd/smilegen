# apps/api/src/services/storage.py
import boto3
from botocore.config import Config
from ..config import settings

def get_s3_client():
    kwargs = dict(
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        config=Config(signature_version="s3v4"),
    )
    # Support LocalStack endpoint override
    if hasattr(settings, "aws_endpoint_url") and settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("s3", **kwargs)

def generate_upload_url(s3_key: str, content_type: str, expires: int = 3600) -> str:
    """Return a pre-signed PUT URL for direct browser-to-S3 upload."""
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.aws_bucket,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )

def generate_download_url(s3_key: str, expires: int = 3600) -> str:
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_bucket, "Key": s3_key},
        ExpiresIn=expires,
    )

def ensure_bucket_exists():
    """Create bucket if it doesn't exist (for LocalStack dev)."""
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.aws_bucket)
    except Exception:
        s3.create_bucket(Bucket=settings.aws_bucket)
