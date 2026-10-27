#!/usr/bin/env bash
# Build GitHub release notes from git log between tags.
# Usage: scripts/release-notes.sh VERSION [PREV]
# Writes notes to stdout. When PREV is omitted, uses:
#   git describe --tags --abbrev=0 "${VERSION}^"
set -euo pipefail

VERSION="${1:-}"
if [ -z "${VERSION}" ]; then
  echo "Usage: $0 VERSION [PREV]" >&2
  exit 1
fi

PREV="${2:-}"
if [ -z "${PREV}" ]; then
  PREV="$(git describe --tags --abbrev=0 "${VERSION}^" 2>/dev/null || true)"
fi

if [ -n "${PREV}" ]; then
  RANGE="${PREV}..${VERSION}"
else
  RANGE="${VERSION}"
fi

feat_file="$(mktemp)"
fix_file="$(mktemp)"
other_file="$(mktemp)"
merge_file="$(mktemp)"
trap 'rm -f "${feat_file}" "${fix_file}" "${other_file}" "${merge_file}"' EXIT

classify() {
  subject="$1"
  if printf '%s' "${subject}" | grep -Eq '^feat(\([^)]+\))?(!)?:'; then
    echo feat
  elif printf '%s' "${subject}" | grep -Eq '^fix(\([^)]+\))?(!)?:'; then
    echo fix
  else
    echo other
  fi
}

# Non-merge commits (pipefail: empty log is fine)
git log "${RANGE}" --no-merges --pretty=format:'%s%x09%h' 2>/dev/null |
  while IFS= read -r row || [ -n "${row}" ]; do
    [ -z "${row}" ] && continue
    subject="${row%%	*}"
    sha="${row#*	}"
    case "${subject}" in
      *"[skip version]"*) continue ;;
    esac
    line="- ${subject} (${sha})"
    kind="$(classify "${subject}")"
    case "${kind}" in
      feat) printf '%s\n' "${line}" >> "${feat_file}" ;;
      fix) printf '%s\n' "${line}" >> "${fix_file}" ;;
      *) printf '%s\n' "${line}" >> "${other_file}" ;;
    esac
  done

git log "${RANGE}" --merges --pretty=format:'%s%x09%h' 2>/dev/null |
  while IFS= read -r row || [ -n "${row}" ]; do
    [ -z "${row}" ] && continue
    subject="${row%%	*}"
    sha="${row#*	}"
    printf '%s\n' "- ${subject} (${sha})" >> "${merge_file}"
  done

has_any=0
if [ -s "${feat_file}" ] || [ -s "${fix_file}" ] || [ -s "${other_file}" ]; then
  has_any=1
fi

if [ "${has_any}" -eq 0 ]; then
  echo "- 无代码变更"
else
  if [ -s "${feat_file}" ]; then
    echo "## ✨ 新功能"
    cat "${feat_file}"
    echo
  fi
  if [ -s "${fix_file}" ]; then
    echo "## 🐛 修复"
    cat "${fix_file}"
    echo
  fi
  if [ -s "${other_file}" ]; then
    echo "## 🔧 其他"
    cat "${other_file}"
    echo
  fi
fi

if [ -s "${merge_file}" ]; then
  echo "## 🔀 合并的 PR"
  cat "${merge_file}"
  echo
fi

if [ -n "${PREV}" ]; then
  repo="${GITHUB_REPOSITORY:-}"
  if [ -z "${repo}" ]; then
    origin="$(git remote get-url origin 2>/dev/null || true)"
    case "${origin}" in
      *github.com[:/]*)
        repo="$(printf '%s' "${origin}" | sed -E 's#.*github.com[:/]##; s#\.git$##')"
        ;;
    esac
  fi
  if [ -n "${repo}" ]; then
    echo "**Full Changelog**: https://github.com/${repo}/compare/${PREV}...${VERSION}"
  fi
fi
