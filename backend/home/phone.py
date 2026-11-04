import re
from rest_framework.exceptions import ValidationError


def normalize_phone(value):
    """Accept Afghan local/E.164 numbers, including Dari/Pashto numerals."""
    value = str(value).translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
    value = re.sub(r'[\s()\-]', '', value)
    if value.startswith('0093'):
        value = '+' + value[2:]
    elif value.startswith('0'):
        value = '+93' + value[1:]
    elif re.fullmatch(r'7\d{8}', value):
        value = '+93' + value
    elif value.startswith('93'):
        value = '+' + value
    if not re.fullmatch(r'\+937\d{8}', value):
        raise ValidationError('Enter an Afghan mobile number, for example 0701234567 or +93701234567.')
    return value
