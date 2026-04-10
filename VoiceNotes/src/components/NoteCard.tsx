import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Note, formatDate, formatDuration } from '../services/storageService';
import { colors, radius, spacing, typography } from '../theme';
import NoteContextMenu from './NoteContextMenu';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setExpanded((e) => !e)}
        onLongPress={() => setMenuVisible(true)}
        android_ripple={{ color: colors.primaryGlow }}
      >
        {/* Accent bar */}
        <View style={styles.accentBar} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
              {note.title}
            </Text>
          </View>

          <Pressable
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ color: colors.primaryGlow, borderless: true, radius: 18 }}
          >
            <Text style={styles.menuBtnText}>⋮</Text>
          </Pressable>
        </View>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{formatDate(note.createdAt)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{formatDuration(note.duration)}</Text>
          </View>
          {note.wordCount > 0 && (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{note.wordCount} сл.</Text>
            </View>
          )}
        </View>

        {/* AI Summary */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryLabelRow}>
            <View style={styles.summaryDot} />
            <Text style={styles.blockLabel}>AI ЗАМЕТКИ</Text>
          </View>
          <Text style={styles.summaryText} numberOfLines={expanded ? undefined : 4}>
            {note.summary}
          </Text>
        </View>

        {/* Transcript — only when expanded */}
        {expanded && note.transcript.length > 0 && (
          <View style={styles.transcriptBlock}>
            <View style={styles.summaryLabelRow}>
              <View style={styles.transcriptDot} />
              <Text style={[styles.blockLabel, styles.blockLabelMuted]}>РАСШИФРОВКА</Text>
            </View>
            <View style={styles.quoteBar} />
            <Text style={styles.transcriptText}>{note.transcript}</Text>
          </View>
        )}

        {!expanded && (
          <Text style={styles.expandHint}>
            {note.transcript.length > 0 ? '↓ раскрыть расшифровку' : '↑ свернуть'}
          </Text>
        )}
      </Pressable>

      <NoteContextMenu
        note={note}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onDelete={onDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  titleRow: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  menuBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  menuBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaText: { ...typography.caption, color: colors.textMuted },

  summaryBlock: { gap: 6 },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  transcriptDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  blockLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  blockLabelMuted: {
    color: colors.textMuted,
  },
  summaryText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  transcriptBlock: { gap: 6, position: 'relative' },
  quoteBar: {
    position: 'absolute',
    left: 0,
    top: 22,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  transcriptText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
    paddingLeft: spacing.sm,
    fontStyle: 'italic',
  },

  expandHint: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingTop: 2,
  },
});
