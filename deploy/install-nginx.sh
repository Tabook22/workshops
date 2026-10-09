#!/bin/sh
set -eu
if [ "$(id -u)" -ne 0 ]; then
    echo 'Run this script with sudo.' >&2
    exit 1
fi
config=/etc/nginx/sites-available/nasserdiary.conf
snippet=/etc/nginx/snippets/workshops.conf
release=/home/nasser/apps/workshops/current/deploy/workshops.nginx.conf
backup="$config.workshops-backup-$(date +%Y%m%d%H%M%S)"
test -f "$config"
test -f "$release"
if grep -Eq 'location[^\n]*/workshops' "$config"; then
    echo 'An existing workshop route requires review before installation.' >&2
    exit 1
fi
cp -p "$config" "$backup"
previous=""
if [ -f "$snippet" ]; then
    previous="$snippet.backup-$(date +%Y%m%d%H%M%S)"
    cp -p "$snippet" "$previous"
fi
install -o root -g root -m 644 "$release" "$snippet"
python3 - "$config" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
line = '    include /etc/nginx/snippets/workshops.conf;'
if line not in text:
    anchor = '    server_name nasserdiary.com www.nasserdiary.com;'
    if anchor not in text:
        raise SystemExit('Expected domain server block missing')
    text = text.replace(anchor, anchor + '\n' + line, 1)
    path.write_text(text)
PY
if ! /usr/sbin/nginx -t; then
    cp -p "$backup" "$config"
    if [ -n "$previous" ]; then cp -p "$previous" "$snippet"; else rm -f "$snippet"; fi
    echo "Configuration restored from $backup" >&2
    exit 1
fi
/usr/bin/systemctl reload nginx
echo "Workshop route installed. Original configuration backup: $backup"
