import re
from typing import Optional

# Mar 23 07:10:08 ILO123456789 svcsHost[449]: hostService_VC : DPLL module not installed.
LOG_PATTERN = re.compile(
    r'^(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+'
    r'(\S+)\s+'
    r'(\w+)\[(\d+)\]:\s+'
    r'(\S+)\s+:\s+'
    r'(.+)$'
)

_ERROR_KW = {'failed', 'error', 'invalid', 'cannot', 'unable', 'fault', 'critical', 'denied', 'exception'}
_WARN_KW = {'not installed', 'not available', 'warning', 'warn', 'defaulting', 'attempt failed', 'zero', 'not active'}


def infer_severity(message: str) -> str:
    msg = message.lower()
    if any(kw in msg for kw in _ERROR_KW):
        return 'ERROR'
    if any(kw in msg for kw in _WARN_KW):
        return 'WARNING'
    return 'INFO'


def parse_line(line: str, line_number: int) -> Optional[dict]:
    line = line.strip()
    if not line:
        return None

    match = LOG_PATTERN.match(line)
    if not match:
        return {
            'line_number': line_number,
            'raw': line,
            'timestamp_str': None,
            'hostname': None,
            'service': 'unknown',
            'pid': None,
            'component': None,
            'message': line,
            'severity': infer_severity(line),
        }

    timestamp_str, hostname, service, pid, component, message = match.groups()
    message = message.strip()
    return {
        'line_number': line_number,
        'raw': line,
        'timestamp_str': timestamp_str,
        'hostname': hostname,
        'service': service,
        'pid': int(pid),
        'component': component,
        'message': message,
        'severity': infer_severity(message),
    }
