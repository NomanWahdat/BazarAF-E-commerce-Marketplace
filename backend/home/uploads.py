from pathlib import Path
from rest_framework.exceptions import ValidationError
from PIL import Image


def validate_document(upload):
    if upload.size > 5 * 1024 * 1024:
        raise ValidationError('Documents must be at most 5 MB.')
    extension = Path(upload.name).suffix.lower()
    header = upload.read(8)
    upload.seek(0)
    if extension == '.pdf' and header.startswith(b'%PDF-'):
        return upload
    if extension not in {'.jpg', '.jpeg', '.png'}:
        raise ValidationError('Upload a PDF, JPEG or PNG document.')
    return validate_image(upload)


def validate_image(upload):
    if upload.size > 5 * 1024 * 1024:
        raise ValidationError('Images must be at most 5 MB.')
    try:
        with Image.open(upload) as image:
            if image.format not in {'JPEG', 'PNG', 'WEBP'} or image.width * image.height > 25_000_000:
                raise ValueError
            image.verify()
    except Exception:
        raise ValidationError('Upload a valid JPEG, PNG or WebP image under 25 megapixels.')
    finally:
        upload.seek(0)
    return upload
