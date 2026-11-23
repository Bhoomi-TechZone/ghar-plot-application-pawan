import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/**
 * Formats a Date object or timestamp string to DD-MM-YYYY HH:mm
 */
export const formatCommentDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : parseCustomDateStr(date);
  if (isNaN(d.getTime())) return String(date);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Safely parses date strings including DD-MM-YYYY and DD-MM-YYYY HH:mm
 */
export const parseCustomDateStr = (dateStr, fallbackDate = new Date()) => {
  if (!dateStr) return fallbackDate;
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = dmyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const standardParsed = new Date(str);
  return isNaN(standardParsed.getTime()) ? fallbackDate : standardParsed;
};

/**
 * Parses comment items from item object (commentHistory array or formatted string)
 */
export const parseCommentHistory = (item) => {
  if (!item) return [];

  // 1. If item itself is an array of comment objects
  if (Array.isArray(item)) {
    return item.filter(c => c && (c.text || typeof c === 'string'));
  }

  // 2. If commentHistory array is present on item
  if (Array.isArray(item.commentHistory) && item.commentHistory.length > 0) {
    return item.commentHistory
      .filter(c => c && (c.text || '').trim())
      .map(c => ({
        text: (c.text || '').trim(),
        authorName: (c.authorName || '').trim(),
        authorRole: (c.authorRole || 'employee').toLowerCase(),
        createdAt: c.createdAt || new Date(),
      }));
  }

  // 3. Fallback: Parse from reason / comment / note formatted string
  const raw = item.reason || item.comment || item.note || (typeof item === 'string' ? item : '');
  if (!raw || typeof raw !== 'string') return [];

  const defaultAuthor = item.authorName || item.employeeName || (item.employee ? item.employee.name : '') || item.clientName || 'Employee';
  const defaultRole = (item.authorRole || 'employee').toLowerCase();
  const defaultDate = item.createdAt || new Date();

  const delimiterRegex = /(?:\r?\n)?-{3,}(?:\r?\n)?/;
  const sections = raw.split(delimiterRegex).map(s => s.trim()).filter(Boolean);
  if (sections.length === 0) return [];

  return sections.map((sec) => {
    const match = sec.match(/^([\s\S]*?)(?:\r?\n)?by:\s*([^(:\n]+?)(?:\s*\(([^)]+)\))?\s*(?:date\s*:?\s*([^\n\r]+))?$/i);
    if (match) {
      const text = match[1].trim();
      const roleRaw = (match[2] || '').trim().toLowerCase();
      const role = roleRaw.includes('admin') ? 'admin' : 'employee';
      const name = (match[3] || match[2] || defaultAuthor).trim();
      const dateStr = (match[4] || '').trim();
      return {
        text: text || sec,
        authorRole: role,
        authorName: name,
        createdAt: parseCustomDateStr(dateStr, defaultDate),
      };
    }

    return {
      text: sec,
      authorRole: defaultRole,
      authorName: defaultAuthor,
      createdAt: defaultDate,
    };
  });
};

/**
 * Reusable Threaded Comments Display Component
 * Displays up to 2 comments at a time with a vertical scroller for 3+ comments
 */
export const CommentThreadView = ({ comments, style, maxHeight = 165 }) => {
  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return null;
  }

  const hasMoreThanTwo = comments.length > 2;

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        style={[styles.scrollView, hasMoreThanTwo ? { maxHeight } : null]}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={hasMoreThanTwo}
      >
        {comments.map((comment, index) => {
          const text = typeof comment === 'string' ? comment : (comment.text || '');
          const role = typeof comment === 'object' ? (comment.authorRole || 'employee').toLowerCase() : 'employee';
          const isAdmin = role.includes('admin');
          const authorName = typeof comment === 'object' ? (comment.authorName || (isAdmin ? 'Admin' : 'Employee')) : 'Employee';
          const dateStr = typeof comment === 'object' ? formatCommentDate(comment.createdAt) : '';

          return (
            <View key={index} style={styles.commentBlock}>
              {index > 0 && (
                <View style={styles.dividerWrapper}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>
                    --------------------------------------
                  </Text>
                </View>
              )}

              {/* Comment Message Text */}
              <Text style={styles.messageText}>{text}</Text>

              {/* Author Attribution and Date */}
              <View style={styles.metaRow}>
                <View style={[styles.authorBadge, isAdmin ? styles.adminBadge : styles.employeeBadge]}>
                  <Text style={[styles.authorBadgeText, isAdmin ? styles.adminBadgeText : styles.employeeBadgeText]}>
                    by : {isAdmin ? 'admin' : 'employ'} {authorName ? `(${authorName})` : ''}
                  </Text>
                </View>

                {dateStr ? (
                  <Text style={styles.dateText}>
                    date : {dateStr}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Helper scroller badge when there are more than 2 comments */}
      {hasMoreThanTwo && (
        <View style={styles.scrollHintRow}>
          <Text style={styles.scrollHintText}>
            ↕️ Scroll to view all ({comments.length}) comments
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginVertical: 6,
  },
  commentBlock: {
    marginVertical: 2,
  },
  dividerWrapper: {
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  dividerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  dividerText: {
    fontSize: 11,
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    letterSpacing: -0.5,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  authorBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  adminBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  employeeBadge: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  authorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adminBadgeText: {
    color: '#1d4ed8',
  },
  employeeBadgeText: {
    color: '#15803d',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollHintRow: {
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 4,
  },
  scrollHintText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
});

export default {
  formatCommentDate,
  parseCommentHistory,
  CommentThreadView,
};
