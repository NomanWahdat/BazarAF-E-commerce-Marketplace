"""Private seller documents never share the public product-media namespace."""
from django.conf import settings
from django.core import signing
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from urllib.parse import quote


@deconstructible
class PrivateDocumentStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.BASE_DIR / 'private_documents')

    def url(self, name):
        ticket = signing.dumps({'name': name}, salt='private-document')
        return '/api/documents/download/?ticket=' + quote(ticket)


def private_document_storage():
    if getattr(settings, 'PRIVATE_DOCUMENT_BUCKET', ''):
        from storages.backends.s3 import S3Storage
        return S3Storage(bucket_name=settings.PRIVATE_DOCUMENT_BUCKET,
                         default_acl=None, querystring_auth=True,
                         querystring_expire=60, custom_domain=None,
                         file_overwrite=False)
    return PrivateDocumentStorage()
