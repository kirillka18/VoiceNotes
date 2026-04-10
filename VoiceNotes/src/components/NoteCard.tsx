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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.dot} />
            <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
              {note.title}
            </Text>
          </View>

          {/* Кнопка трёх точек */}
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
          <Text style={styles.metaText}>{formatDate(note.createdAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatDuration(note.duration)}</Text>
          {note.wordCount > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{note.wordCount} сл.</Text>
            </>
          )}
        </View>

        {/* AI Summary */}
        <View style={styles.summaryBlock}>
          <Text style={styles.blockLabel}>AI ЗАМЕТКИ</Text>
          <Text style={styles.summaryText} numberOfLines={expanded ? undefined : 4}>
            {note.summary}
          </Text>
        </View>

        {/* Оригинальная расшифровка — только в развёрнутом виде */}
        {expanded && note.transcript.length > 0 && (
          <View style={styles.transcriptBlock}>
            <Text style={styles.blockLabel}>РАСШИФРОВКА</Text>
            <View style={styles.quoteBar} />
            <Text style={styles.transcriptText}>{note.transcript}</Text>
          </View>
        )}

        {!expanded && (
          <Text style={styles.expandHint}>
            {note.transcript.length > 0 ? 'Нажми чтобы раскрыть расшифровку' : 'Нажми чтобы свернуть'}
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
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    flexShrink: 0,
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
    paddingLeft: 15,
  },
  metaText: { ...typography.caption, color: colors.textMuted },
  metaDot: { color: colors.border, fontSize: 12 },

  summaryBlock: { gap: 6 },
  blockLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1.2,
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
    backgroundColor: colors.borderLight,
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
