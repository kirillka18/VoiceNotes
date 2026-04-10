import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import NoteCard from '../components/NoteCard';
import CustomModal from '../components/CustomModal';
import { Note } from '../services/storageService';
import { colors, radius, spacing, typography } from '../theme';

export default function NotesScreen() {
  const { notes, deleteNote, deleteAllNotes } = useApp();
  const [query, setQuery] = useState('');
  const [clearModalVisible, setClearModalVisible] = useState(false);

  const filtered = query.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.summary.toLowerCase().includes(query.toLowerCase()) ||
          n.transcript.toLowerCase().includes(query.toLowerCase()),
      )
    : notes;

  const handleDeleteAll = useCallback(() => {
    if (notes.length === 0) return;
    setClearModalVisible(true);
  }, [notes.length]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard note={item} onDelete={deleteNote} />
    ),
    [deleteNote],
  );

  const keyExtractor = useCallback((item: Note) => item.id, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomModal
        visible={clearModalVisible}
        title="Удалить все заметки?"
        message={`Будет удалено ${notes.length} заметок. Это действие необратимо.`}
        onClose={() => setClearModalVisible(false)}
        buttons={[
          { label: 'Удалить все', style: 'destructive', onPress: () => { setClearModalVisible(false); deleteAllNotes(); } },
          { label: 'Отмена', style: 'cancel', onPress: () => setClearModalVisible(false) },
        ]}
      />
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Заметки</Text>
          <Text style={styles.headerSubtitle}>
            {notes.length === 0
              ? 'Пока пусто'
              : `${notes.length} ${plural(notes.length, 'заметка', 'заметки', 'заметок')}`}
          </Text>
        </View>
        {notes.length > 0 && (
          <Pressable
            style={styles.clearBtn}
            onPress={handleDeleteAll}
            android_ripple={{ color: colors.errorBg, borderless: true }}
          >
            <Text style={styles.clearBtnText}>Очистить</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      {notes.length > 2 && (
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>○</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по заметкам..."
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClear}>✕</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* List */}
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>≡</Text>
          </View>
          <Text style={styles.emptyTitle}>Нет заметок</Text>
          <Text style={styles.emptyText}>
            Запишите разговор на главной странице.{'\n'}
            AI автоматически создаст заметки.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Ничего не найдено по запросу «{query}»</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
    backgroundColor: colors.errorBg,
  },
  clearBtnText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  searchIcon: {
    fontSize: 16,
    color: colors.textMuted,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 10,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClear: {
    color: colors.textMuted,
    fontSize: 12,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: 28,
    color: colors.textMuted,
    opacity: 0.4,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  noResults: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
